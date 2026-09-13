package com.saralgati.app.data.api

import com.squareup.moshi.Moshi
import com.squareup.moshi.kotlin.reflect.KotlinJsonAdapterFactory
import okhttp3.OkHttpClient
import okhttp3.logging.HttpLoggingInterceptor
import retrofit2.Retrofit
import retrofit2.converter.moshi.MoshiConverterFactory

object NetworkModule {
    private const val BASE_URL = "https://saralgati-685823552970.asia-south1.run.app/"

    private val moshi = Moshi.Builder()
        .add(KotlinJsonAdapterFactory())
        .build()

    private val loggingInterceptor = HttpLoggingInterceptor().apply {
        level = HttpLoggingInterceptor.Level.BODY
    }

    private val okHttpClient = OkHttpClient.Builder()
        .addInterceptor(loggingInterceptor)
        .build()

    private val retrofit = Retrofit.Builder()
        .baseUrl(BASE_URL)
        .client(okHttpClient)
        .addConverterFactory(MoshiConverterFactory.create(moshi))
        .build()

    val eldersApi: EldersApi by lazy {
        retrofit.create(EldersApi::class.java)
    }

    val alertsApi: AlertsApi by lazy {
        retrofit.create(AlertsApi::class.java)
    }

    val habitsApi: HabitsApi by lazy {
        retrofit.create(HabitsApi::class.java)
    }

    val agentApi: AgentApi by lazy {
        retrofit.create(AgentApi::class.java)
    }
}
