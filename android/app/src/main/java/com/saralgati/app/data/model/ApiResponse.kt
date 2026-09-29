package com.saralgati.app.data.model

import com.squareup.moshi.JsonClass

/** The `{success, error, data}` envelope every caregiver API route returns. */
@JsonClass(generateAdapter = true)
data class ApiResponse<T>(
    val success: Boolean,
    val error: String? = null,
    val data: T? = null
)
