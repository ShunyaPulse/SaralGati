package com.saralgati.app.data.api

import com.squareup.moshi.Moshi
import com.squareup.moshi.kotlin.reflect.KotlinJsonAdapterFactory
import okhttp3.OkHttpClient
import okhttp3.logging.HttpLoggingInterceptor
import retrofit2.Retrofit
import retrofit2.converter.moshi.MoshiConverterFactory
import java.security.MessageDigest
import javax.crypto.Mac
import javax.crypto.spec.SecretKeySpec
import android.util.Base64

object NetworkModule {
    private const val BASE_URL = "https://saralgati-685823552970.asia-south1.run.app/"

    var tokenProvider: (() -> String?)? = null

    private val moshi = Moshi.Builder()
        .add(KotlinJsonAdapterFactory())
        .build()

    private val loggingInterceptor = HttpLoggingInterceptor().apply {
        level = HttpLoggingInterceptor.Level.BODY
    }

    // In a real app this should be obfuscated or fetched from native C++,
    // but for the purpose of the prototype we use a hardcoded fallback or BuildConfig variable.
    private const val API_SECRET = "saralgati_super_secret_key_2024"

    private val authInterceptor = okhttp3.Interceptor { chain ->
        val original = chain.request()
        val token = tokenProvider?.invoke()

        val timestamp = System.currentTimeMillis().toString()
        val path = original.url.encodedPath
        val method = original.method
        val message = "$method$path$timestamp"

        val mac = Mac.getInstance("HmacSHA256")
        val secretKey = SecretKeySpec(API_SECRET.toByteArray(Charsets.UTF_8), "HmacSHA256")
        mac.init(secretKey)
        val signatureBytes = mac.doFinal(message.toByteArray(Charsets.UTF_8))
        val signature = Base64.encodeToString(signatureBytes, Base64.NO_WRAP)

        val requestBuilder = original.newBuilder()
            .header("X-App-Timestamp", timestamp)
            .header("X-App-Signature", signature)

        if (!token.isNullOrBlank() && original.header("Authorization") == null) {
            requestBuilder.header("Authorization", "Bearer $token")
        }

        chain.proceed(requestBuilder.build())
    }

    private val okHttpClient = OkHttpClient.Builder()
        .addInterceptor(authInterceptor)
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

    val appApi: AppApi by lazy {
        retrofit.create(AppApi::class.java)
    }
}
