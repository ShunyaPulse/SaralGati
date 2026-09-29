package com.saralgati.app.data.model

import com.squareup.moshi.Json
import com.squareup.moshi.JsonClass

/** Screen text sent to the guidance agent: what the elder is looking at, and their language. */
@JsonClass(generateAdapter = true)
data class ScreenContextRequest(
    @Json(name = "app_package") val appPackage: String,
    @Json(name = "ui_elements") val uiElements: List<String>,
    @Json(name = "guidance_lang") val guidanceLang: String? = null
)

/** Progress through a multi-step playbook, echoed back with the explanation. */
@JsonClass(generateAdapter = true)
data class FlowState(
    @Json(name = "flow_id") val flowId: String,
    @Json(name = "current_step") val currentStep: Int,
    @Json(name = "total_steps") val totalSteps: Int,
    @Json(name = "step_label") val stepLabel: String
)

/** What the agent answers with: the spoken explanation plus the element to spotlight. */
@JsonClass(generateAdapter = true)
data class ScreenExplanationResponse(
    val explanation: String,
    @Json(name = "highlight_index") val highlightIndex: Int? = null,
    @Json(name = "interaction_id") val interactionId: String? = null,
    val flow: FlowState? = null
)

/** The elder's correction after a guidance answer, used by the learning flywheel. */
@JsonClass(generateAdapter = true)
data class FeedbackRequest(
    @Json(name = "interaction_id") val interactionId: String,
    val feedback: String,
    @Json(name = "actual_tapped_index") val actualTappedIndex: Int? = null
)

/** Body of `/api/v1/agent/ask`: the same screen plus the question the elder asked. */
@JsonClass(generateAdapter = true)
data class AskContextRequest(
    @Json(name = "app_package") val appPackage: String,
    @Json(name = "ui_elements") val uiElements: List<String>,
    val question: String,
    @Json(name = "conversation_history") val conversationHistory: List<ChatMessage> = emptyList(),
    @Json(name = "guidance_lang") val guidanceLang: String? = null
)

@JsonClass(generateAdapter = true)
data class ChatMessage(
    val role: String,
    val content: String
)
