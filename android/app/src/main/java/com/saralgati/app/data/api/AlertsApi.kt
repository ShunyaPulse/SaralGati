package com.saralgati.app.data.api

import com.saralgati.app.data.model.ApiResponse
import com.saralgati.app.data.model.AssistanceLog
import retrofit2.Response
import retrofit2.http.Body
import retrofit2.http.POST

interface AlertsApi {
    @POST("api/alerts")
    suspend fun triggerAlert(@Body log: AssistanceLog): Response<ApiResponse<AssistanceLog>>
}
