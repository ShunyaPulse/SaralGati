package com.saralgati.app.data.api

import com.saralgati.app.data.model.ApiResponse
import com.saralgati.app.data.model.AppVersionInfo
import retrofit2.Response
import retrofit2.http.GET

interface AppApi {
    @GET("api/v1/app/version")
    suspend fun getLatestVersion(): Response<ApiResponse<AppVersionInfo>>
}
