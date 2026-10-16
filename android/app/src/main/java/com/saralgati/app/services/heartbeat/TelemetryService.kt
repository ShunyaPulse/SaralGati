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
import android.os.BatteryManager
import android.os.Build
import android.os.IBinder
import android.os.PowerManager
import android.util.Log
import androidx.core.app.NotificationCompat
import androidx.core.content.ContextCompat
import com.saralgati.app.R
import com.saralgati.app.data.api.NetworkModule
import com.saralgati.app.data.local.LocalPrefs
import kotlinx.coroutines.*
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import java.util.TimeZone

class TelemetryService : Service() {

    private val serviceScope = CoroutineScope(Dispatchers.IO + SupervisorJob())
    private lateinit var localPrefs: LocalPrefs
    private var isRunning = false

    // Energy-efficient state tracking: avoid redundant network calls when config/habits are unchanged
    private var lastConfigSyncAt: Long = 0L
    private var lastHabitSyncAt: Long = 0L
    private var lastSyncedFontScale: Float? = null
    private var lastReportedLocation: Location? = null

    companion object {
        private const val TAG = "TelemetryService"
        private const val CHANNEL_ID = "saralgati_telemetry_channel"
        private const val NOTIFICATION_ID = 1001
        private const val NORMAL_HEARTBEAT_INTERVAL_MS = 60_000L // 1 minute normal cadence
        private const val LOW_POWER_STATIONARY_INTERVAL_MS = 120_000L // 2 minutes in Battery Saver + stationary (well inside server 5m online window)
        private const val CONFIG_SYNC_INTERVAL_MS = 5 * 60_000L // 5 minutes (aligned with server Redis TTL)
        private const val HABIT_FALLBACK_SYNC_INTERVAL_MS = 30 * 60_000L // 30 minutes if font_scale is unchanged
        private const val STATIONARY_DISPLACEMENT_METERS = 15f

        // A cached fix older than this is not reported at all: aligned with
        // the server's 15-minute staleness window.
        private const val MAX_FIX_AGE_MS = 15 * 60 * 1000L
    }

    override fun onCreate() {
        super.onCreate()
        localPrefs = LocalPrefs(applicationContext)
        NetworkModule.tokenProvider = { localPrefs.getAuthToken() }
        NetworkModule.baseUrlProvider = { localPrefs.getApiUrl() }
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
            val manufacturer = Build.MANUFACTURER.replaceFirstChar {
                if (it.isLowerCase()) it.titlecase() else it.toString()
            }
            val model = Build.MODEL
            val phoneModel = if (model.startsWith(manufacturer, ignoreCase = true)) model else "$manufacturer $model"
            val osVersion = "Android ${Build.VERSION.RELEASE} (API ${Build.VERSION.SDK_INT})"

            while (isRunning) {
                var nextDelayMs = NORMAL_HEARTBEAT_INTERVAL_MS
                try {
                    val elderId = localPrefs.getElderId()
                    if (elderId != null) {
                        val bm = getSystemService(Context.BATTERY_SERVICE) as BatteryManager
                        val batteryPct = bm.getIntProperty(BatteryManager.BATTERY_PROPERTY_CAPACITY)
                        val isCharging = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                            bm.isCharging
                        } else {
                            false
                        }
                        val pm = getSystemService(Context.POWER_SERVICE) as? PowerManager
                        val isLowPowerMode = (pm?.isPowerSaveMode == true) || (!isCharging && batteryPct in 0..20)

                        val heartbeatBody = mutableMapOf<String, Any>(
                            "battery_level" to batteryPct,
                            "phone_model" to phoneModel,
                            "os_version" to osVersion
                        )
                        val currentFix = lastKnownFix(preferLowPower = isLowPowerMode)
                        var isStationary = true
                        if (currentFix != null) {
                            heartbeatBody["latitude"] = currentFix.latitude
                            heartbeatBody["longitude"] = currentFix.longitude
                            if (currentFix.hasAccuracy()) {
                                heartbeatBody["location_accuracy_m"] = currentFix.accuracy.toDouble()
                            }
                            val prevFix = lastReportedLocation
                            if (prevFix != null && prevFix.distanceTo(currentFix) > STATIONARY_DISPLACEMENT_METERS) {
                                isStationary = false
                            }
                            lastReportedLocation = currentFix
                            Log.d(TAG, "Reporting location fix age ${(System.currentTimeMillis() - currentFix.time) / 1000}s")
                        }

                        if (isLowPowerMode && isStationary) {
                            nextDelayMs = LOW_POWER_STATIONARY_INTERVAL_MS
                        }

                        val response = NetworkModule.eldersApi.updateHeartbeat(elderId, heartbeatBody)
                        if (response.isSuccessful) {
                            Log.d(TAG, "Heartbeat sent successfully. Battery: $batteryPct%, Device: $phoneModel")
                        } else {
                            Log.w(TAG, "Heartbeat failed: ${response.code()}")
                        }

                        val now = System.currentTimeMillis()

                        // Sync Caregiver Agent Config on startup and every 5 minutes (aligned with server Redis TTL)
                        if (now - lastConfigSyncAt >= CONFIG_SYNC_INTERVAL_MS) {
                            try {
                                val cfgRes = NetworkModule.agentApi.getConfig()
                                if (cfgRes.isSuccessful && cfgRes.body()?.success == true) {
                                    lastConfigSyncAt = now
                                    val cfg = cfgRes.body()?.data
                                    if (cfg != null) {
                                        localPrefs.saveEmergencyContact(cfg.emergencyContact)
                                        if (!localPrefs.hasSelectedLanguage() && !cfg.preferredLang.isNullOrBlank()) {
                                            val normLang = if (cfg.preferredLang == "en") "en" else "hi"
                                            localPrefs.setLanguagePrefs(normLang, normLang)
                                        }
                                    }
                                }
                            } catch (e: Exception) {
                                Log.w(TAG, "Agent config sync skipped: ${e.message}")
                            }
                        }

                        // Delta-Triggered On-Device Habit Sync: only transmit when font_scale changes or every 30m
                        val currentFontScale = resources.configuration.fontScale
                        val fontScaleChanged = lastSyncedFontScale == null || kotlin.math.abs(currentFontScale - (lastSyncedFontScale ?: 0f)) > 0.001f
                        if (fontScaleChanged || now - lastHabitSyncAt >= HABIT_FALLBACK_SYNC_INTERVAL_MS) {
                            try {
                                val habits = listOf(
                                    com.saralgati.app.data.model.SyncHabitPayload(
                                        type = "device_preference",
                                        payload = mapOf("font_scale" to currentFontScale)
                                    )
                                )
                                val isoTimestamp = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", Locale.US).apply {
                                    timeZone = TimeZone.getTimeZone("UTC")
                                }.format(Date())
                                val syncRes = NetworkModule.agentApi.syncHabits(
                                    com.saralgati.app.data.model.SyncHabitsRequest(
                                        deviceToken = localPrefs.getAuthToken(),
                                        batteryLevel = batteryPct,
                                        habits = habits,
                                        timestamp = isoTimestamp
                                    )
                                )
                                if (syncRes.isSuccessful) {
                                    lastSyncedFontScale = currentFontScale
                                    lastHabitSyncAt = now
                                    Log.d(TAG, "Habits synced (delta-aware)")
                                }
                            } catch (e: Exception) {
                                Log.e(TAG, "Habit sync error: ${e.message}")
                            }
                        }
                    }
                } catch (e: Exception) {
                    Log.e(TAG, "Network error during heartbeat: ${e.message}")
                }
                delay(nextDelayMs)
            }
        }
    }

    private fun lastKnownFix(preferLowPower: Boolean = false): Location? {
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
            add(LocationManager.PASSIVE_PROVIDER)
            add(LocationManager.NETWORK_PROVIDER)
            if (!preferLowPower) {
                add(LocationManager.GPS_PROVIDER)
            }
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
