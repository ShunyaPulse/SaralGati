package com.saralgati.app.utils

import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.content.pm.PackageInstaller
import android.os.Build
import android.util.Log
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import java.io.InputStream
import java.net.HttpURLConnection
import java.net.URL

object ApkInstaller {
    private const val TAG = "ApkInstaller"
    private const val MAX_REDIRECTS = 5

    suspend fun downloadAndInstall(context: Context, apkUrl: String) {
        withContext(Dispatchers.IO) {
            var connection: HttpURLConnection? = null
            try {
                Log.d(TAG, "Starting APK download from: $apkUrl")
                var currentUrl = apkUrl
                var redirects = 0

                while (redirects <= MAX_REDIRECTS) {
                    val url = URL(currentUrl)
                    val conn = (url.openConnection() as HttpURLConnection).apply {
                        requestMethod = "GET"
                        connectTimeout = 15_000
                        readTimeout = 60_000
                        instanceFollowRedirects = true
                        setRequestProperty("User-Agent", "SaralGati-Android-Updater")
                    }
                    conn.connect()
                    val code = conn.responseCode
                    if (code in listOf(
                            HttpURLConnection.HTTP_MOVED_PERM,
                            HttpURLConnection.HTTP_MOVED_TEMP,
                            HttpURLConnection.HTTP_SEE_OTHER,
                            307,
                            308
                        )
                    ) {
                        val location = conn.getHeaderField("Location")
                        conn.disconnect()
                        if (location.isNullOrBlank()) {
                            Log.e(TAG, "Redirect response $code missing Location header")
                            return@withContext
                        }
                        currentUrl = URL(url, location).toString()
                        redirects++
                        continue
                    }
                    connection = conn
                    break
                }

                val finalConn = connection ?: run {
                    Log.e(TAG, "Too many redirects while downloading APK")
                    return@withContext
                }

                if (finalConn.responseCode != HttpURLConnection.HTTP_OK) {
                    Log.e(TAG, "Failed to download APK, HTTP code: ${finalConn.responseCode}")
                    return@withContext
                }

                finalConn.inputStream.use { inputStream ->
                    installApkSession(context, inputStream)
                }
            } catch (e: Exception) {
                Log.e(TAG, "Error downloading or installing APK", e)
            } finally {
                connection?.disconnect()
            }
        }
    }

    private fun installApkSession(context: Context, apkStream: InputStream) {
        val packageInstaller = context.packageManager.packageInstaller
        val params = PackageInstaller.SessionParams(PackageInstaller.SessionParams.MODE_FULL_INSTALL).apply {
            setAppPackageName(context.packageName)
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                setRequireUserAction(PackageInstaller.SessionParams.USER_ACTION_NOT_REQUIRED)
            }
        }
        var sessionId = -1

        try {
            sessionId = packageInstaller.createSession(params)
            val session = packageInstaller.openSession(sessionId)

            session.openWrite("SaralGatiUpdate", 0, -1).use { out ->
                val buffer = ByteArray(65536)
                var bytesRead: Int
                while (apkStream.read(buffer).also { bytesRead = it } != -1) {
                    out.write(buffer, 0, bytesRead)
                }
                session.fsync(out)
            }

            // Commit the session
            val intent = Intent(context, InstallReceiver::class.java)
            val pendingIntentFlags = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_MUTABLE
            } else {
                PendingIntent.FLAG_UPDATE_CURRENT
            }
            
            val pendingIntent = PendingIntent.getBroadcast(
                context,
                3439,
                intent,
                pendingIntentFlags
            )

            session.commit(pendingIntent.intentSender)
            session.close()
            Log.d(TAG, "Session committed successfully")
        } catch (e: Exception) {
            Log.e(TAG, "Failed to install APK session", e)
            if (sessionId != -1) {
                packageInstaller.abandonSession(sessionId)
            }
        }
    }
}
