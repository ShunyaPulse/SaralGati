package com.saralgati.app.data.api

import com.squareup.moshi.Moshi
import com.squareup.moshi.kotlin.reflect.KotlinJsonAdapterFactory
import okhttp3.HttpUrl.Companion.toHttpUrlOrNull
import okhttp3.OkHttpClient
import okhttp3.logging.HttpLoggingInterceptor
import retrofit2.Retrofit
import retrofit2.converter.moshi.MoshiConverterFactory
import java.util.concurrent.TimeUnit
import javax.crypto.Mac
import javax.crypto.spec.SecretKeySpec
import android.util.Base64

object NetworkModule {
    private const val BASE_URL = "https://saralgati-685823552970.asia-south1.run.app/"

    var tokenProvider: (() -> String?)? = null
    var baseUrlProvider: (() -> String?)? = null

    private val moshi = Moshi.Builder()
        .add(KotlinJsonAdapterFactory())
        .build()

    // Gate HTTP body logging on DEBUG builds and redact sensitive auth headers so
    // release APKs never leak elder screen text or credentials to system logcat.
    private val loggingInterceptor = HttpLoggingInterceptor().apply {
        level = if (com.saralgati.app.BuildConfig.DEBUG) {
            HttpLoggingInterceptor.Level.BODY
        } else {
            HttpLoggingInterceptor.Level.NONE
        }
        redactHeader("Authorization")
        redactHeader("X-App-Signature")
    }

    private val API_SECRET: String = com.saralgati.app.BuildConfig.API_SECRET

    private val authInterceptor = okhttp3.Interceptor { chain ->
        val original = chain.request()
        val token = tokenProvider?.invoke()

        // Honour dynamic api_url from QR pairing when present so self-hosted or
        // staging deployments talk to the exact server that minted the token.
        val configuredBase = baseUrlProvider?.invoke()?.trim()?.takeIf { it.isNotEmpty() }
            ?.toHttpUrlOrNull()
        val effectiveUrl = if (configuredBase != null) {
            original.url.newBuilder()
                .scheme(configuredBase.scheme)
                .host(configuredBase.host)
                .port(configuredBase.port)
                .build()
        } else {
            original.url
        }

        val timestamp = System.currentTimeMillis().toString()
        val path = effectiveUrl.encodedPath
        val method = original.method
        val message = "$method$path$timestamp"

        val requestBuilder = original.newBuilder()
            .url(effectiveUrl)
            .header("X-App-Timestamp", timestamp)

        if (API_SECRET.isNotBlank()) {
            try {
                val mac = Mac.getInstance("HmacSHA256")
                val secretKey = SecretKeySpec(API_SECRET.toByteArray(Charsets.UTF_8), "HmacSHA256")
                mac.init(secretKey)
                val signatureBytes = mac.doFinal(message.toByteArray(Charsets.UTF_8))
                val signature = Base64.encodeToString(signatureBytes, Base64.NO_WRAP)
                requestBuilder.header("X-App-Signature", signature)
            } catch (e: Exception) {
                android.util.Log.e("NetworkModule", "HMAC signing error: ${e.message}")
            }
        }

        if (!token.isNullOrBlank() && original.header("Authorization") == null) {
            requestBuilder.header("Authorization", "Bearer $token")
        }

        chain.proceed(requestBuilder.build())
    }

    private val okHttpClient = OkHttpClient.Builder()
        .connectTimeout(10, TimeUnit.SECONDS)
        .readTimeout(15, TimeUnit.SECONDS)
        .writeTimeout(15, TimeUnit.SECONDS)
        .retryOnConnectionFailure(true)
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
