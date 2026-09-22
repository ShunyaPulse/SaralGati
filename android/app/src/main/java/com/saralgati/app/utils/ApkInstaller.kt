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

    suspend fun downloadAndInstall(context: Context, apkUrl: String) {
        withContext(Dispatchers.IO) {
            try {
                Log.d(TAG, "Starting APK download from: \$apkUrl")
                val url = URL(apkUrl)
                val connection = url.openConnection() as HttpURLConnection
                connection.requestMethod = "GET"
                connection.connect()

                if (connection.responseCode != HttpURLConnection.HTTP_OK) {
                    Log.e(TAG, "Failed to download APK, HTTP code: \${connection.responseCode}")
                    return@withContext
                }

                val inputStream = connection.inputStream
                installApkSession(context, inputStream)
            } catch (e: Exception) {
                Log.e(TAG, "Error downloading or installing APK", e)
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

            val out = session.openWrite("SaralGatiUpdate", 0, -1)
            val buffer = ByteArray(65536)
            var bytesRead: Int
            while (apkStream.read(buffer).also { bytesRead = it } != -1) {
                out.write(buffer, 0, bytesRead)
            }
            session.fsync(out)
            out.close()

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
