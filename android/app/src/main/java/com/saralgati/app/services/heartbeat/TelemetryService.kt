package com.saralgati.app.services.heartbeat

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.Service
import android.content.Context
import android.content.Intent
import android.os.Build
import android.os.IBinder
import android.util.Log
import androidx.core.app.NotificationCompat
import com.saralgati.app.R
import android.os.BatteryManager
import com.saralgati.app.data.api.NetworkModule
import com.saralgati.app.data.local.LocalPrefs
import kotlinx.coroutines.*

class TelemetryService : Service() {

    private val serviceScope = CoroutineScope(Dispatchers.IO + SupervisorJob())
    private lateinit var localPrefs: LocalPrefs
    private var isRunning = false

    companion object {
        private const val TAG = "TelemetryService"
        private const val CHANNEL_ID = "saralgati_telemetry_channel"
        private const val NOTIFICATION_ID = 1001
        private const val HEARTBEAT_INTERVAL_MS = 60000L // 1 minute
    }

    override fun onCreate() {
        super.onCreate()
        localPrefs = LocalPrefs(applicationContext)
        NetworkModule.tokenProvider = { localPrefs.getAuthToken() }
        createNotificationChannel()
        startForeground(NOTIFICATION_ID, buildForegroundNotification())
        Log.i(TAG, "TelemetryService created and running in foreground.")
        
        startHeartbeatLoop()
    }

    private fun startHeartbeatLoop() {
        isRunning = true
        serviceScope.launch {
            while (isRunning) {
                try {
                    val elderId = localPrefs.getElderId()
                    if (elderId != null) {
                        val bm = getSystemService(Context.BATTERY_SERVICE) as BatteryManager
                        val batteryPct = bm.getIntProperty(BatteryManager.BATTERY_PROPERTY_CAPACITY)
                        
                        val response = NetworkModule.eldersApi.updateHeartbeat(
                            elderId, 
                            mapOf("battery_level" to batteryPct)
                        )
                        if (response.isSuccessful) {
                            Log.d(TAG, "Heartbeat sent successfully. Battery: $batteryPct%")
                        } else {
                            Log.w(TAG, "Heartbeat failed: ${response.code()}")
                        }
                    }
                } catch (e: Exception) {
                    Log.e(TAG, "Network error during heartbeat: ${e.message}")
                }
                delay(HEARTBEAT_INTERVAL_MS)
            }
        }
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        Log.d(TAG, "TelemetryService onStartCommand")
        return START_STICKY
    }

    override fun onDestroy() {
        super.onDestroy()
        isRunning = false
        serviceScope.cancel()
        Log.i(TAG, "TelemetryService destroyed")
    }

    override fun onBind(intent: Intent?): IBinder? = null

    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                CHANNEL_ID,
                "SaralGati Protection",
                NotificationManager.IMPORTANCE_LOW
            ).apply {
                description = "Runs background heartbeat and device protection telemetry"
            }
            val manager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
            manager.createNotificationChannel(channel)
        }
    }

    private fun buildForegroundNotification(): Notification {
        return NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle(getString(R.string.heartbeat_notification_title))
            .setContentText(getString(R.string.heartbeat_notification_desc))
            .setSmallIcon(R.drawable.ic_launcher_foreground)
            .setOngoing(true)
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .build()
    }
}
