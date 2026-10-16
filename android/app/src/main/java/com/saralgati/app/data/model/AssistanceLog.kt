package com.saralgati.app.data.model

import com.squareup.moshi.Json
import com.squareup.moshi.JsonClass

/** One event worth telling the caregiver about: rage taps, fraud warnings, stuck reports, SOS. */
@JsonClass(generateAdapter = true)
data class AssistanceLog(
    val id: String? = null,
    @Json(name = "elder_id") val elderId: String,
    @Json(name = "event_type") val eventType: String,
    val description: String? = null,
    @Json(name = "screenshot_url") val screenshotUrl: String? = null,
    val severity: String? = null,
    val resolved: Boolean? = null,
    @Json(name = "resolved_at") val resolvedAt: String? = null,
    @Json(name = "screen_name") val screenName: String? = null,
    @Json(name = "app_package") val appPackage: String? = null,
    @Json(name = "duration_ms") val durationMs: Long? = null,
    val metadata: Map<String, @JvmSuppressWildcards Any>? = null,
    @Json(name = "created_at") val createdAt: String? = null
)
