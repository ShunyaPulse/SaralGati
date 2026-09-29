package com.saralgati.app.data.api

import com.saralgati.app.data.model.ApiResponse
import com.saralgati.app.data.model.AskContextRequest
import com.saralgati.app.data.model.FeedbackRequest
import com.saralgati.app.data.model.FraudCheckRequest
import com.saralgati.app.data.model.FraudVerdict
import com.saralgati.app.data.model.ScreenContextRequest
import com.saralgati.app.data.model.ScreenExplanationResponse
import com.saralgati.app.data.model.SyncHabitsRequest
import retrofit2.Response
import retrofit2.http.Body
import retrofit2.http.POST

/** The guidance agent endpoints the companion calls while the elder is on screen. */
interface AgentApi {
    @POST("api/v1/agent/explain")
    suspend fun explainScreen(@Body request: ScreenContextRequest): Response<ApiResponse<ScreenExplanationResponse>>

    @POST("api/v1/agent/ask")
    suspend fun askQuestion(@Body request: AskContextRequest): Response<ApiResponse<ScreenExplanationResponse>>

    @POST("api/v1/agent/feedback")
    suspend fun sendFeedback(@Body request: FeedbackRequest): Response<ApiResponse<Map<String, Any>>>

    @POST("api/v1/agent/sync-habits")
    suspend fun syncHabits(@Body request: SyncHabitsRequest): Response<ApiResponse<Any>>

    // The verdict is the whole response body (no {success, data} envelope).
    @POST("api/v1/agent/fraud-check")
    suspend fun checkFraud(@Body request: FraudCheckRequest): Response<FraudVerdict>
}
