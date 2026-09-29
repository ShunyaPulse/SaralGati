package com.saralgati.app.data.api

import com.saralgati.app.data.model.ApiResponse
import com.saralgati.app.data.model.ElderProfile
import retrofit2.Response
import retrofit2.http.Body
import retrofit2.http.GET
import retrofit2.http.POST
import retrofit2.http.Path

interface EldersApi {
    @POST("api/elders")
    suspend fun registerElder(@Body profile: ElderProfile): Response<ApiResponse<ElderProfile>>

    @GET("api/elders/{id}")
    suspend fun getElderStatus(@Path("id") elderId: String): Response<ApiResponse<ElderProfile>>

    // Additional endpoint for heartbeat and device metadata updates
    @POST("api/elders/{id}/heartbeat")
    suspend fun updateHeartbeat(@Path("id") elderId: String, @Body status: Map<String, @JvmSuppressWildcards Any>): Response<ApiResponse<Any>>
}
