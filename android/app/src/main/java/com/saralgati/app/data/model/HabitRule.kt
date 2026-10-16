package com.saralgati.app.data.model

import com.squareup.moshi.Json
import com.squareup.moshi.JsonClass

/** One learned rule the companion replays on the elder's phone, matching Postgres `habit_rules`. */
@JsonClass(generateAdapter = true)
data class HabitRule(
    val id: String = "",
    @Json(name = "elder_id") val elderId: String = "",
    @Json(name = "rule_type") val ruleType: String? = null,
    @Json(name = "rule_payload") val rulePayload: Map<String, @JvmSuppressWildcards Any>? = null,
    @Json(name = "app_package") val appPackage: String? = null,
    @Json(name = "screen_name") val screenName: String? = null,
    @Json(name = "ui_node_id") val uiNodeId: String? = null,
    @Json(name = "action_type") val actionType: String? = null,
    val confidence: Float? = null,
    val payload: String? = null,
    @Json(name = "is_active") val isActive: Boolean? = true,
    @Json(name = "created_at") val createdAt: String? = null,
    @Json(name = "updated_at") val updatedAt: String? = null
)
