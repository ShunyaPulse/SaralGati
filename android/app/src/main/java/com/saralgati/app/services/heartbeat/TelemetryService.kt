package com.saralgati.app.services.heartbeat

import android.Manifest
import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.Service
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.location.Location
import android.location.LocationManager
import android.os.Build
import android.os.IBinder
import android.util.Log
import androidx.core.app.NotificationCompat
import androidx.core.content.ContextCompat
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

        // A cached fix older than this is not reported at all: aligned with
        // the server's 15-minute staleness window.
        private const val MAX_FIX_AGE_MS = 15 * 60 * 1000L
    }

    override fun onCreate() {
        super.onCreate()
        localPrefs = LocalPrefs(applicationContext)
        NetworkModule.tokenProvider = { localPrefs.getAuthToken() }
        createNotificationChannel()
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                startForeground(
                    NOTIFICATION_ID,
                    buildForegroundNotification(),
                    android.content.pm.ServiceInfo.FOREGROUND_SERVICE_TYPE_DATA_SYNC
                )
            } else {
                startForeground(NOTIFICATION_ID, buildForegroundNotification())
            }
            Log.i(TAG, "TelemetryService created and running in foreground.")
        } catch (e: Exception) {
            Log.e(TAG, "Failed to start foreground service: ${e.message}", e)
        }
        
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
                        
                        val manufacturer = Build.MANUFACTURER.replaceFirstChar { 
                            if (it.isLowerCase()) it.titlecase() else it.toString() 
                        }
                        val model = Build.MODEL
                        val phoneModel = if (model.startsWith(manufacturer, ignoreCase = true)) model else "$manufacturer $model"
                        val osVersion = "Android ${Build.VERSION.RELEASE} (API ${Build.VERSION.SDK_INT})"

                        val heartbeatBody = mutableMapOf<String, Any>(
                            "battery_level" to batteryPct,
                            "phone_model" to phoneModel,
                            "os_version" to osVersion
                        )
                        lastKnownFix()?.let { fix ->
                            heartbeatBody["latitude"] = fix.latitude
                            heartbeatBody["longitude"] = fix.longitude
                            if (fix.hasAccuracy()) {
                                heartbeatBody["location_accuracy_m"] = fix.accuracy.toDouble()
                            }
                            Log.d(TAG, "Reporting location fix age ${(System.currentTimeMillis() - fix.time) / 1000}s")
                        }

                        val response = NetworkModule.eldersApi.updateHeartbeat(elderId, heartbeatBody)
                        if (response.isSuccessful) {
                            Log.d(TAG, "Heartbeat sent successfully. Battery: $batteryPct%, Device: $phoneModel")
                        } else {
                            Log.w(TAG, "Heartbeat failed: ${response.code()}")
                        }

                        // On-Device Habit Aggregator Sync
                        try {
                            val habits = listOf(
                                com.saralgati.app.data.model.SyncHabitPayload(
                                    type = "device_preference",
                                    payload = mapOf("font_scale" to resources.configuration.fontScale)
                                )
                            )
                            val syncRes = NetworkModule.agentApi.syncHabits(
                                com.saralgati.app.data.model.SyncHabitsRequest(
                                    batteryLevel = batteryPct,
                                    habits = habits
                                )
                            )
                            if (syncRes.isSuccessful) {
                                Log.d(TAG, "Habits synced successfully")
                            }
                        } catch (e: Exception) {
                            Log.e(TAG, "Habit sync error: ${e.message}")
                        }
                    }
                } catch (e: Exception) {
                    Log.e(TAG, "Network error during heartbeat: ${e.message}")
                }
                delay(HEARTBEAT_INTERVAL_MS)
            }
        }
    }

    /**
     * Freshest cached fix from any provider.
     *
     * Tracking is deliberately passive: one read per heartbeat instead of a
     * long-lived location listener, so the companion never holds a wake lock on
     * an elder's phone. Returns null when the permission is denied (the app then
     * simply reports no location) or when every provider's cache is too old.
     */
    private fun lastKnownFix(): Location? {
        val fineGranted = ContextCompat.checkSelfPermission(
            this, Manifest.permission.ACCESS_FINE_LOCATION
        ) == PackageManager.PERMISSION_GRANTED
        val coarseGranted = ContextCompat.checkSelfPermission(
            this, Manifest.permission.ACCESS_COARSE_LOCATION
        ) == PackageManager.PERMISSION_GRANTED
        if (!fineGranted && !coarseGranted) return null

        val manager = getSystemService(Context.LOCATION_SERVICE) as? LocationManager ?: return null
        val providers = buildList {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                add(LocationManager.FUSED_PROVIDER)
            } else {
                add("fused")
            }
            add(LocationManager.GPS_PROVIDER)
            add(LocationManager.NETWORK_PROVIDER)
            add(LocationManager.PASSIVE_PROVIDER)
        }

        var newest: Location? = null
        for (provider in providers) {
            val fix = try {
                manager.getLastKnownLocation(provider)
            } catch (e: SecurityException) {
                null
            } catch (e: IllegalArgumentException) {
                null
            }

            val current = newest
            if (fix != null && (current == null || fix.time > current.time)) {
                newest = fix
            }
        }

        val fix = newest ?: return null
        if (System.currentTimeMillis() - fix.time > MAX_FIX_AGE_MS) return null
        return fix
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
