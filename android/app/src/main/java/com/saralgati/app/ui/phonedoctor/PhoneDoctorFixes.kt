package com.saralgati.app.ui.phonedoctor

import android.app.NotificationManager
import android.content.Context
import android.content.Intent
import android.media.AudioManager
import android.net.Uri
import android.os.Build
import android.provider.Settings
import android.widget.Toast
import com.saralgati.app.data.local.AppStrings
import com.saralgati.app.data.local.LocalPrefs

/**
 * The system-level half of Phone Doctor: the two permissions it needs (write
 * settings, DND access) and the fixes it applies. None of it touches Compose
 * state, so it lives beside the screen instead of inside it.
 */

internal fun canWriteSettings(context: Context): Boolean {
    return Build.VERSION.SDK_INT < Build.VERSION_CODES.M || Settings.System.canWrite(context)
}

internal fun openWriteSettingsPermission(context: Context) {
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
        try {
            val intent = Intent(Settings.ACTION_MANAGE_WRITE_SETTINGS).apply {
                data = Uri.parse("package:${context.packageName}")
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            }
            context.startActivity(intent)
        } catch (e: Exception) {
            try {
                val fallback = Intent(Settings.ACTION_MANAGE_WRITE_SETTINGS).apply {
                    addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                }
                context.startActivity(fallback)
            } catch (ignored: Exception) {
            }
        }
    }
}

internal fun canAccessDnd(context: Context): Boolean {
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
        val nm = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        return nm.isNotificationPolicyAccessGranted
    }
    return true
}

internal fun openDndSettings(context: Context) {
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
        try {
            val intent = Intent(Settings.ACTION_NOTIFICATION_POLICY_ACCESS_SETTINGS).apply {
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            }
            context.startActivity(intent)
        } catch (ignored: Exception) {
        }
    }
}

internal fun executeFixes(context: Context, prefs: LocalPrefs, currentLang: String = "hi") {
    try {
        val audioManager = context.getSystemService(Context.AUDIO_SERVICE) as AudioManager
        val nm = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        var fixedItems = 0

        // Fix DND First so audio levels can be changed safely
        if (prefs.getBoolean("doctor_fix_dnd", false)) {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                if (nm.isNotificationPolicyAccessGranted) {
                    try {
                        nm.setInterruptionFilter(NotificationManager.INTERRUPTION_FILTER_ALL)
                        fixedItems++
                    } catch (e: Exception) {
                    }
                }
            }
        }

        if (prefs.getBoolean("doctor_fix_ringer", true)) {
            try {
                audioManager.ringerMode = AudioManager.RINGER_MODE_NORMAL
            } catch (e: Exception) {
            }

            val maxRinger = audioManager.getStreamMaxVolume(AudioManager.STREAM_RING)
            audioManager.setStreamVolume(AudioManager.STREAM_RING, maxRinger, 0)
            // Also fix notification volume if independent
            val maxNotif = audioManager.getStreamMaxVolume(AudioManager.STREAM_NOTIFICATION)
            audioManager.setStreamVolume(AudioManager.STREAM_NOTIFICATION, maxNotif, 0)
            fixedItems++
        }

        if (prefs.getBoolean("doctor_fix_media", true)) {
            val maxMedia = audioManager.getStreamMaxVolume(AudioManager.STREAM_MUSIC)
            audioManager.setStreamVolume(AudioManager.STREAM_MUSIC, (maxMedia * 0.85).toInt(), 0)
            fixedItems++
        }

        val hasPermission = canWriteSettings(context)

        if (prefs.getBoolean("doctor_fix_brightness", false)) {
            if (hasPermission) {
                try {
                    Settings.System.putInt(
                        context.contentResolver,
                        Settings.System.SCREEN_BRIGHTNESS_MODE,
                        Settings.System.SCREEN_BRIGHTNESS_MODE_MANUAL
                    )
                    Settings.System.putInt(
                        context.contentResolver,
                        Settings.System.SCREEN_BRIGHTNESS,
                        220 // ~85% Brightness for clear elder readability
                    )
                    fixedItems++
                } catch (e: Exception) {
                    // Ignore failure gracefully
                }
            }
        }

        if (prefs.getBoolean("doctor_fix_timeout", false)) {
            if (hasPermission) {
                try {
                    Settings.System.putInt(
                        context.contentResolver,
                        Settings.System.SCREEN_OFF_TIMEOUT,
                        300000 // 5 minutes so screen doesn't turn off rapidly
                    )
                    fixedItems++
                } catch (e: Exception) {
                    // Ignore failure gracefully
                }
            }
        }

        Toast.makeText(context, AppStrings.doctorFixed(currentLang), Toast.LENGTH_SHORT).show()
    } catch (e: Exception) {
        Toast.makeText(context, AppStrings.doctorFixError(currentLang), Toast.LENGTH_SHORT).show()
    }
}
