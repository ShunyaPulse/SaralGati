package com.saralgati.app.data.model

import com.squareup.moshi.Json
import com.squareup.moshi.JsonClass

/** What the update check returns, so the companion can offer a new APK. */
@JsonClass(generateAdapter = true)
data class AppVersionInfo(
    @Json(name = "version_code") val versionCode: Int,
    @Json(name = "version_name") val versionName: String,
    @Json(name = "download_url") val downloadUrl: String,
    @Json(name = "force_update") val forceUpdate: Boolean = false,
    val changelog: String? = null
)
