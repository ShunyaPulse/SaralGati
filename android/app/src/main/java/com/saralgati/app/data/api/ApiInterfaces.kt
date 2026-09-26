package com.saralgati.app.data.api

import com.saralgati.app.data.model.ApiResponse
import com.saralgati.app.data.model.AssistanceLog
import com.saralgati.app.data.model.ElderProfile
import com.saralgati.app.data.model.HabitRule
import retrofit2.Response
import retrofit2.http.Body
import retrofit2.http.GET
import retrofit2.http.POST
import retrofit2.http.Path
import retrofit2.http.Query

interface EldersApi {
    @POST("api/elders")
    suspend fun registerElder(@Body profile: ElderProfile): Response<ApiResponse<ElderProfile>>

    @GET("api/elders/{id}")
    suspend fun getElderStatus(@Path("id") elderId: String): Response<ApiResponse<ElderProfile>>
    
    // Additional endpoint for heartbeat and device metadata updates
    @POST("api/elders/{id}/heartbeat")
    suspend fun updateHeartbeat(@Path("id") elderId: String, @Body status: Map<String, @JvmSuppressWildcards Any>): Response<ApiResponse<Any>>
}

interface AlertsApi {
    @POST("api/alerts")
    suspend fun triggerAlert(@Body log: AssistanceLog): Response<ApiResponse<AssistanceLog>>
}

interface HabitsApi {
    @GET("api/habits")
    suspend fun getHabits(@Query("elder_id") elderId: String): Response<ApiResponse<List<HabitRule>>>
}

interface AgentApi {
    @POST("api/v1/agent/explain")
    suspend fun explainScreen(@Body request: com.saralgati.app.data.model.ScreenContextRequest): Response<ApiResponse<com.saralgati.app.data.model.ScreenExplanationResponse>>

    @POST("api/v1/agent/ask")
    suspend fun askQuestion(@Body request: com.saralgati.app.data.model.AskContextRequest): Response<ApiResponse<com.saralgati.app.data.model.ScreenExplanationResponse>>

    @POST("api/v1/agent/feedback")
    suspend fun sendFeedback(@Body request: com.saralgati.app.data.model.FeedbackRequest): Response<ApiResponse<Map<String, Any>>>

    @POST("api/v1/agent/sync-habits")
    suspend fun syncHabits(@Body request: com.saralgati.app.data.model.SyncHabitsRequest): Response<ApiResponse<Any>>

    // The verdict is the whole response body (no {success, data} envelope).
    @POST("api/v1/agent/fraud-check")
    suspend fun checkFraud(@Body request: com.saralgati.app.data.model.FraudCheckRequest): Response<com.saralgati.app.data.model.FraudVerdict>
}

interface AppApi {
    @GET("api/v1/app/version")
    suspend fun getLatestVersion(): Response<ApiResponse<com.saralgati.app.data.model.AppVersionInfo>>
}
