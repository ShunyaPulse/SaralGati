const fs = require('fs');
const filepath = 'android/app/src/main/java/com/saralgati/app/data/api/NetworkModule.kt';
let code = fs.readFileSync(filepath, 'utf8');

const search = `import retrofit2.Retrofit
import retrofit2.converter.moshi.MoshiConverterFactory`;
const replace = `import retrofit2.Retrofit
import retrofit2.converter.moshi.MoshiConverterFactory
import java.security.MessageDigest
import javax.crypto.Mac
import javax.crypto.spec.SecretKeySpec
import android.util.Base64`;

code = code.replace(search, replace);

const search2 = `    private val authInterceptor = okhttp3.Interceptor { chain ->
        val original = chain.request()
        val token = tokenProvider?.invoke()
        val request = if (!token.isNullOrBlank() && original.header("Authorization") == null) {
            original.newBuilder()
                .header("Authorization", "Bearer $token")
                .build()
        } else {
            original
        }
        chain.proceed(request)
    }`;

const replace2 = `    private const val API_SECRET = "saralgati_super_secret_key_2024" // Needs to match backend

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
    }`;

code = code.replace(search2, replace2);
fs.writeFileSync(filepath, code);
