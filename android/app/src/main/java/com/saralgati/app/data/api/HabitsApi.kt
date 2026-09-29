package com.saralgati.app.data.api

import com.saralgati.app.data.model.ApiResponse
import com.saralgati.app.data.model.HabitRule
import retrofit2.Response
import retrofit2.http.GET
import retrofit2.http.Query

interface HabitsApi {
    @GET("api/habits")
    suspend fun getHabits(@Query("elder_id") elderId: String): Response<ApiResponse<List<HabitRule>>>
}
