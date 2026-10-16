package com.saralgati.app.data.model

import com.squareup.moshi.Json
import com.squareup.moshi.JsonClass

/** One paired elder device, as returned by the caregiver or pairing handshake API. */
@JsonClass(generateAdapter = true)
data class ElderProfile(
    val id: String,
    @Json(name = "caregiver_id") val caregiverId: String? = null,
    @Json(name = "elder_name") val elderName: String,
    @Json(name = "phone_model") val phoneModel: String? = null,
    @Json(name = "os_version") val osVersion: String? = null,
    @Json(name = "battery_status") val batteryStatus: Int? = null,
    @Json(name = "emergency_contact") val emergencyContact: String? = null,
    @Json(name = "preferred_lang") val preferredLang: String? = null,
    @Json(name = "device_token") val deviceToken: String? = null,
    @Json(name = "last_heartbeat") val lastHeartbeat: String? = null,
    @Json(name = "is_active") val isActive: Boolean? = null
)
