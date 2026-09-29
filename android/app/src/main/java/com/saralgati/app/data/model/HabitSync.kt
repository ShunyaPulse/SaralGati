package com.saralgati.app.data.model

import com.squareup.moshi.Json
import com.squareup.moshi.JsonClass

/** One rule in a sync batch, with a free-form payload the server interprets by type. */
@JsonClass(generateAdapter = true)
data class SyncHabitPayload(
    val type: String,
    val payload: Map<String, @JvmSuppressWildcards Any>
)

/** Body of `/api/v1/agent/sync-habits`: what the phone learned since the last sync. */
@JsonClass(generateAdapter = true)
data class SyncHabitsRequest(
    @Json(name = "battery_level") val batteryLevel: Int?,
    val habits: List<SyncHabitPayload>
)
