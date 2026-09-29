package com.saralgati.app.data.model

import com.squareup.moshi.Json
import com.squareup.moshi.JsonClass

/** One event worth telling the caregiver about: rage taps, fraud warnings, stuck reports. */
@JsonClass(generateAdapter = true)
data class AssistanceLog(
    val id: String? = null,
    @Json(name = "elder_id") val elderId: String,
    @Json(name = "event_type") val eventType: String,
    val description: String? = null,
    @Json(name = "screenshot_url") val screenshotUrl: String? = null,
    val severity: String? = null,
    @Json(name = "resolved_at") val resolvedAt: String? = null,
    @Json(name = "screen_name") val screenName: String? = null,
    @Json(name = "app_package") val appPackage: String? = null
)
