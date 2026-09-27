package com.saralgati.app.services.fraud

import android.content.Context
import android.util.Log
import org.json.JSONArray
import org.json.JSONObject
import java.util.Locale

/**
 * Instant, network-free anti-fraud check for the companion.
 *
 * The authoritative engine is server-side (`src/lib/fraudSentinel.ts`, reached
 * via `/api/v1/agent/fraud-check`), but an elder with no data, a slow link, or a
 * Cloud Run cold start would otherwise get no warning at all. This object mirrors
 * a deliberately small, high-confidence subset of the direct theft vectors,
 * bundled as `assets/offline_fraud_rules.json` and generated from
 * `src/lib/offlineFraudRules.ts` (`npm run rules:export`), so the warning can be
 * spoken the moment the scam appears - and keeps working with the radio off.
 *
 * It only ever returns DANGEROUS / CRITICAL for unambiguous combinations, and
 * returning null simply leaves the server as the sole judge. Matching mirrors
 * the TypeScript matcher exactly: per line, lower-cased, with courtesy warnings
 * ("never share this OTP") stripped for the rules that opt in.
 */
object OfflineFraudSentinel {

    private const val TAG = "OfflineFraud"
    private const val ASSET_NAME = "offline_fraud_rules.json"

    /** The offline verdict, shaped so the overlay can warn without the network. */
    data class Verdict(
        val ruleId: String,
        val level: String,
        val category: String,
        val title: String,
        val messageHi: String,
        val safeAdvice: String,
    )

    private class Rule(
        val id: String,
        val category: String,
        val level: String,
        val stripSafeWarnings: Boolean,
        val patterns: List<Regex>,
        val requires: List<Regex>,
        val title: String,
        val messageHi: String,
        val safeAdvice: String,
    )

    private val LEVEL_RANK = mapOf("DANGEROUS" to 3, "CRITICAL" to 4)

    /** Mirrors the server tie-break: the money / code vectors win. */
    private val CATEGORY_PRIORITY = listOf(
        "OTP_THEFT",
        "PAYMENT_FRAUD",
        "REMOTE_ACCESS",
        "PHISHING_IMPERSONATION",
        "MALICIOUS_APK",
    )

    /** Anything an elder can safely press to get out of a trap. */
    private val SAFE_ESCAPE = Regex(
        "\\b(cancel|close|decline|reject|deny|dismiss|ignore|no thanks|not now|back|exit|report|block)\\b|नहीं|बंद|वापस|रद्द|अस्वीकार|छोड़ें",
        RegexOption.IGNORE_CASE,
    )

    @Volatile
    private var loaded = false
    private var rules: List<Rule> = emptyList()
    private var safeWarningStrips: List<Regex> = emptyList()

    @Synchronized
    private fun ensureLoaded(context: Context) {
        if (loaded) return
        loaded = true
        try {
            val json = context.assets.open(ASSET_NAME).bufferedReader().use { it.readText() }
            val root = JSONObject(json)

            safeWarningStrips = root.optJSONArray("safe_warning_patterns")?.toStringList()
                ?.map { Regex(it, RegexOption.IGNORE_CASE) }
                ?: emptyList()

            val ruleArray = root.optJSONArray("rules") ?: return
            val parsed = mutableListOf<Rule>()
            for (index in 0 until ruleArray.length()) {
                val obj = ruleArray.getJSONObject(index)
                parsed.add(
                    Rule(
                        id = obj.getString("id"),
                        category = obj.getString("category"),
                        level = obj.getString("level"),
                        stripSafeWarnings = obj.optBoolean("strip_safe_warnings", false),
                        patterns = obj.optJSONArray("patterns")?.toStringList()
                            ?.map { Regex(it, RegexOption.IGNORE_CASE) }
                            ?: emptyList(),
                        requires = obj.optJSONArray("requires")?.toStringList()
                            ?.map { Regex(it, RegexOption.IGNORE_CASE) }
                            ?: emptyList(),
                        title = obj.getString("title"),
                        messageHi = obj.getString("message_hi"),
                        safeAdvice = obj.getString("safe_advice"),
                    ),
                )
            }
            rules = parsed
            Log.i(TAG, "Loaded ${parsed.size} offline fraud rules")
        } catch (e: Exception) {
            // A missing or corrupt asset must never crash the elder's phone; the
            // server verdict still protects them.
            Log.e(TAG, "Failed to load offline fraud rules: ${e.message}")
            rules = emptyList()
        }
    }

    /**
     * The instant verdict for one screen, or null when nothing high-confidence
     * matched (leaving the server as the only judge).
     */
    fun analyze(context: Context, elements: List<String>): Verdict? {
        ensureLoaded(context)
        if (rules.isEmpty()) return null

        var best: Verdict? = null
        var bestRank = -1
        var bestPriority = Int.MAX_VALUE

        for (fragment in normalize(elements)) {
            for (rule in rules) {
                val text = if (rule.stripSafeWarnings) stripCourtesyWarnings(fragment) else fragment
                if (text.isEmpty()) continue
                if (!rule.patterns.any { it.containsMatchIn(text) }) continue
                if (!rule.requires.all { it.containsMatchIn(text) }) continue

                val rank = LEVEL_RANK[rule.level] ?: continue
                val priorityIndex = CATEGORY_PRIORITY.indexOf(rule.category)
                val priority = if (priorityIndex < 0) Int.MAX_VALUE else priorityIndex
                if (rank < bestRank || (rank == bestRank && priority >= bestPriority)) continue

                bestRank = rank
                bestPriority = priority
                best = Verdict(
                    ruleId = rule.id,
                    level = rule.level,
                    category = rule.category,
                    title = rule.title,
                    messageHi = rule.messageHi,
                    safeAdvice = rule.safeAdvice,
                )
            }
        }

        return best
    }

    /**
     * First element an elder can safely tap (Cancel / Decline / ...), so the
     * spotlight can point at the way out even without the server's answer.
     */
    fun findSafeActionIndex(elements: List<String>): Int? {
        elements.forEachIndexed { index, element ->
            if (SAFE_ESCAPE.containsMatchIn(element)) return index
        }
        return null
    }

    private fun normalize(elements: Iterable<String>): List<String> {
        val fragments = mutableListOf<String>()
        for (element in elements) {
            for (line in element.split("\n")) {
                val text = line
                    .replace('\u00a0', ' ')
                    .replace(Regex("\\s+"), " ")
                    .trim()
                    .lowercase(Locale.ROOT)
                if (text.isNotEmpty()) fragments.add(text)
            }
        }
        return fragments
    }

    private fun stripCourtesyWarnings(text: String): String {
        var result = text
        for (pattern in safeWarningStrips) result = result.replace(pattern, " ")
        return result.replace(Regex("\\s+"), " ").trim()
    }

    private fun JSONArray.toStringList(): List<String> =
        (0 until length()).mapNotNull { index -> if (isNull(index)) null else getString(index) }
}
