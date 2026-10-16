package com.saralgati.app.services.fraud

import android.content.Context
import android.util.Log
import org.json.JSONArray
import org.json.JSONObject
import java.text.Normalizer
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
 * Includes SOTA Unicode NFKC normalization, zero-width format character
 * stripping, Cyrillic/Greek homograph defanging, and pre-compiled regex +
 * per-fragment courtesy-warning memoization for sub-millisecond on-device CPU
 * and battery efficiency.
 */
object OfflineFraudSentinel {

    private const val TAG = "OfflineFraud"
    private const val ASSET_NAME = "offline_fraud_rules.json"

    data class Verdict(
        val ruleId: String,
        val level: String,
        val category: String,
        val title: String,
        val titleEn: String,
        val messageHi: String,
        val messageEn: String,
        val safeAdvice: String,
        val safeAdviceHi: String,
    )

    private class Rule(
        val id: String,
        val category: String,
        val level: String,
        val stripSafeWarnings: Boolean,
        val patterns: List<Regex>,
        val requires: List<Regex>,
        val title: String,
        val titleEn: String,
        val messageHi: String,
        val messageEn: String,
        val safeAdvice: String,
        val safeAdviceHi: String,
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

    private val INVISIBLE_FORMAT_CHARS = Regex("[\\u00ad\\u200b-\\u200f\\u202a-\\u202e\\u2060-\\u206f\\ufeff]")
    private val WHITESPACE_REGEX = Regex("\\s+")

    private val HOMOGRAPH_MAP = mapOf(
        '\u0430' to 'a',
        '\u0435' to 'e',
        '\u0456' to 'i',
        '\u0458' to 'j',
        '\u043e' to 'o',
        '\u0440' to 'p',
        '\u0441' to 'c',
        '\u0443' to 'y',
        '\u0445' to 'x',
        '\u0455' to 's',
        '\u0432' to 'b',
        '\u044c' to 'b',
        '\u0442' to 't',
        '\u03b1' to 'a',
        '\u03b5' to 'e',
        '\u03bf' to 'o',
        '\u03c1' to 'p',
        '\u03ba' to 'k',
        '\u03bd' to 'v',
        '\u03c4' to 't',
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
                        titleEn = obj.optString("title_en", obj.getString("title")),
                        messageHi = obj.getString("message_hi"),
                        messageEn = obj.optString("message_en", obj.getString("safe_advice")),
                        safeAdvice = obj.getString("safe_advice"),
                        safeAdviceHi = obj.optString("safe_advice_hi", obj.getString("safe_advice")),
                    ),
                )
            }
            rules = parsed
            Log.i(TAG, "Loaded ${parsed.size} offline fraud rules")
        } catch (e: Exception) {
            Log.e(TAG, "Failed to load offline fraud rules: ${e.message}")
            rules = emptyList()
        }
    }

    fun analyze(context: Context, elements: List<String>): Verdict? {
        ensureLoaded(context)
        if (rules.isEmpty()) return null

        var best: Verdict? = null
        var bestRank = -1
        var bestPriority = Int.MAX_VALUE

        for (fragment in normalize(elements)) {
            var strippedFragment: String? = null
            for (rule in rules) {
                val text = if (rule.stripSafeWarnings) {
                    strippedFragment ?: stripCourtesyWarnings(fragment).also { strippedFragment = it }
                } else {
                    fragment
                }
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
                    titleEn = rule.titleEn,
                    messageHi = rule.messageHi,
                    messageEn = rule.messageEn,
                    safeAdvice = rule.safeAdvice,
                    safeAdviceHi = rule.safeAdviceHi,
                )
            }
        }

        return best
    }

    fun findSafeActionIndex(elements: List<String>): Int? {
        elements.forEachIndexed { index, element ->
            if (SAFE_ESCAPE.containsMatchIn(element)) return index
        }
        return null
    }

    private fun defangHomographs(input: String): String {
        val sb = StringBuilder(input.length)
        for (ch in input) {
            sb.append(HOMOGRAPH_MAP[ch] ?: ch)
        }
        return sb.toString()
    }

    private fun normalize(elements: Iterable<String>): List<String> {
        val fragments = mutableListOf<String>()
        for (element in elements) {
            for (line in element.split("\n")) {
                val nfkc = Normalizer.normalize(line, Normalizer.Form.NFKC)
                val text = defangHomographs(
                    nfkc
                        .replace(INVISIBLE_FORMAT_CHARS, "")
                        .replace('\u00a0', ' ')
                        .lowercase(Locale.ROOT),
                )
                    .replace(WHITESPACE_REGEX, " ")
                    .trim()
                if (text.isNotEmpty()) fragments.add(text)
            }
        }
        return fragments
    }

    private fun stripCourtesyWarnings(text: String): String {
        var result = text
        for (pattern in safeWarningStrips) result = result.replace(pattern, " ")
        return result.replace(WHITESPACE_REGEX, " ").trim()
    }

    private fun JSONArray.toStringList(): List<String> =
        (0 until length()).mapNotNull { index -> if (isNull(index)) null else getString(index) }
}
