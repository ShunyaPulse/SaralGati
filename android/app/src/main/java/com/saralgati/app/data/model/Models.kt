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
data class FlowState(
    @Json(name = "flow_id") val flowId: String,
    @Json(name = "current_step") val currentStep: Int,
    @Json(name = "total_steps") val totalSteps: Int,
    @Json(name = "step_label") val stepLabel: String
)

@JsonClass(generateAdapter = true)
data class ScreenExplanationResponse(
    val explanation: String,
    @Json(name = "highlight_index") val highlightIndex: Int? = null,
    @Json(name = "interaction_id") val interactionId: String? = null,
    val flow: FlowState? = null
)

@JsonClass(generateAdapter = true)
data class FeedbackRequest(
    @Json(name = "interaction_id") val interactionId: String,
    val feedback: String,
    @Json(name = "actual_tapped_index") val actualTappedIndex: Int? = null
)

@JsonClass(generateAdapter = true)
data class AskContextRequest(
    @Json(name = "app_package") val appPackage: String,
    @Json(name = "ui_elements") val uiElements: List<String>,
    val question: String,
    @Json(name = "conversation_history") val conversationHistory: List<ChatMessage> = emptyList()
)

@JsonClass(generateAdapter = true)
data class ChatMessage(
    val role: String,
    val content: String
)

@JsonClass(generateAdapter = true)
data class AppVersionInfo(
    @Json(name = "version_code") val versionCode: Int,
    @Json(name = "version_name") val versionName: String,
    @Json(name = "download_url") val downloadUrl: String,
    @Json(name = "force_update") val forceUpdate: Boolean = false,
    val changelog: String? = null
)

@JsonClass(generateAdapter = true)
data class SyncHabitPayload(
    val type: String,
    val payload: Map<String, @JvmSuppressWildcards Any>
)

@JsonClass(generateAdapter = true)
data class SyncHabitsRequest(
    @Json(name = "battery_level") val batteryLevel: Int?,
    val habits: List<SyncHabitPayload>
)

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
    @Json(name = "safe_advice") val safeAdvice: String = ""
)

@JsonClass(generateAdapter = true)
data class FraudUserAlert(
    val title: String,
    @Json(name = "message_en") val messageEn: String,
    @Json(name = "message_hi") val messageHi: String
)