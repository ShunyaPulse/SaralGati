package com.saralgati.app.data.model

import com.squareup.moshi.Json
import com.squareup.moshi.JsonClass

/** One paired elder device, exactly as the caregiver API returns it. */
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
