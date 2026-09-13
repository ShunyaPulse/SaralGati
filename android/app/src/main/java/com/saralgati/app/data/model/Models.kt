package com.saralgati.app.data.model

import com.squareup.moshi.Json
import com.squareup.moshi.JsonClass

@JsonClass(generateAdapter = true)
data class ElderProfile(
    val id: String,
    @Json(name = "caregiver_id") val caregiverId: String,
    @Json(name = "elder_name") val elderName: String,
    @Json(name = "phone_model") val phoneModel: String?,
    @Json(name = "os_version") val osVersion: String?,
    @Json(name = "battery_status") val batteryStatus: Int?,
    @Json(name = "emergency_contact") val emergencyContact: String?,
    @Json(name = "preferred_lang") val preferredLang: String?,
    @Json(name = "device_token") val deviceToken: String?,
    @Json(name = "last_heartbeat") val lastHeartbeat: String?,
    @Json(name = "is_active") val isActive: Boolean?
)

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

@JsonClass(generateAdapter = true)
data class HabitRule(
    val id: String,
    @Json(name = "elder_id") val elderId: String,
    @Json(name = "rule_type") val ruleType: String?,
    @Json(name = "app_package") val appPackage: String,
    @Json(name = "screen_name") val screenName: String?,
    @Json(name = "ui_node_id") val uiNodeId: String?,
    @Json(name = "action_type") val actionType: String?,
    val confidence: Float?,
    val payload: String?
)

@JsonClass(generateAdapter = true)
data class ApiResponse<T>(
    val success: Boolean,
    val error: String? = null,
    val data: T? = null
)

@JsonClass(generateAdapter = true)
data class ScreenContextRequest(
    @Json(name = "app_package") val appPackage: String,
    @Json(name = "ui_elements") val uiElements: List<String>
)

@JsonClass(generateAdapter = true)
data class ScreenExplanationResponse(
    val explanation: String
)

@JsonClass(generateAdapter = true)
data class AskContextRequest(
    @Json(name = "app_package") val appPackage: String,
    @Json(name = "ui_elements") val uiElements: List<String>,
    val question: String
)