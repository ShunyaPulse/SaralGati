package com.saralgati.app.data.model

import com.squareup.moshi.Json
import com.squareup.moshi.JsonClass

/**
 * One real-time anti-fraud scan. The companion sends the screen text it already
 * reads for guidance; the sentinel never gets anything the app does not have.
 */
@JsonClass(generateAdapter = true)
data class FraudCheckRequest(
    @Json(name = "app_package") val appPackage: String,
    @Json(name = "ui_elements") val uiElements: List<String>
)

/** Anti-fraud verdict; /fraud-check returns this object as the whole body. */
@JsonClass(generateAdapter = true)
data class FraudVerdict(
    @Json(name = "threat_level") val threatLevel: String,
    @Json(name = "threat_category") val threatCategory: String,
    val confidence: Double = 0.0,
    @Json(name = "detected_triggers") val detectedTriggers: List<String> = emptyList(),
    @Json(name = "action_decision") val actionDecision: FraudActionDecision,
    @Json(name = "user_alert") val userAlert: FraudUserAlert,
    @Json(name = "risk_reasoning") val riskReasoning: String = ""
) {
    /** DANGEROUS and CRITICAL are the levels the companion must interrupt for. */
    val isDangerous: Boolean
        get() = threatLevel == "DANGEROUS" || threatLevel == "CRITICAL"
}

@JsonClass(generateAdapter = true)
data class FraudActionDecision(
    val action: String,
    @Json(name = "target_element_to_block") val targetElementToBlock: Int? = null,
    @Json(name = "safe_action_index") val safeActionIndex: Int? = null,
    @Json(name = "safe_advice") val safeAdvice: String = "",
    /** Devanagari advice; null only against an older server build. */
    @Json(name = "safe_advice_hi") val safeAdviceHi: String? = null
)

@JsonClass(generateAdapter = true)
data class FraudUserAlert(
    /** Hindi title; `titleEn` is the same alert in English. */
    val title: String,
    @Json(name = "message_en") val messageEn: String,
    @Json(name = "message_hi") val messageHi: String,
    @Json(name = "title_en") val titleEn: String? = null
)
