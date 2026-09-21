package com.saralgati.app.utils

import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.net.Uri
import android.os.Build
import android.provider.Settings
import android.util.Log

object AutoStartHelper {
    private const val TAG = "AutoStartHelper"

    fun getBrandName(): String {
        return Build.MANUFACTURER.replaceFirstChar { if (it.isLowerCase()) it.titlecase() else it.toString() }
    }

    fun isAutoStartSupported(): Boolean {
        val manufacturer = Build.MANUFACTURER.lowercase()
        return manufacturer.contains("xiaomi") ||
                manufacturer.contains("redmi") ||
                manufacturer.contains("poco") ||
                manufacturer.contains("oppo") ||
                manufacturer.contains("realme") ||
                manufacturer.contains("vivo") ||
                manufacturer.contains("iqoo") ||
                manufacturer.contains("oneplus") ||
                manufacturer.contains("samsung") ||
                manufacturer.contains("transsion") ||
                manufacturer.contains("tecno") ||
                manufacturer.contains("infinix")
    }

    fun navigateToAutoStart(context: Context) {
        val manufacturer = Build.MANUFACTURER.lowercase()
        val intent = Intent()
        var componentSet = false

        try {
            when {
                manufacturer.contains("xiaomi") || manufacturer.contains("redmi") || manufacturer.contains("poco") -> {
                    intent.component = ComponentName("com.miui.securitycenter", "com.miui.permcenter.autostart.AutoStartManagementActivity")
                    componentSet = true
                }
                manufacturer.contains("oppo") -> {
                    intent.component = ComponentName("com.coloros.safecenter", "com.coloros.safecenter.permission.startup.StartupAppListActivity")
                    if (!isIntentResolvable(context, intent)) {
                        intent.component = ComponentName("com.coloros.safecenter", "com.coloros.safecenter.startupapp.StartupAppListActivity")
                    }
                    if (!isIntentResolvable(context, intent)) {
                        intent.component = ComponentName("com.oppo.safe", "com.oppo.safe.permission.startup.StartupAppListActivity")
                    }
                    componentSet = true
                }
                manufacturer.contains("realme") -> {
                    intent.component = ComponentName("com.coloros.safecenter", "com.coloros.safecenter.permission.startup.StartupAppListActivity")
                    if (!isIntentResolvable(context, intent)) {
                        intent.component = ComponentName("com.coloros.safecenter", "com.coloros.safecenter.startupapp.StartupAppListActivity")
                    }
                    componentSet = true
                }
                manufacturer.contains("vivo") || manufacturer.contains("iqoo") -> {
                    intent.component = ComponentName("com.iqoo.secure", "com.iqoo.secure.ui.phoneoptimize.AddWhiteListActivity")
                    if (!isIntentResolvable(context, intent)) {
                        intent.component = ComponentName("com.vivo.permissionmanager", "com.vivo.permissionmanager.activity.BgStartUpManagerActivity")
                    }
                    if (!isIntentResolvable(context, intent)) {
                        intent.component = ComponentName("com.iqoo.secure", "com.iqoo.secure.ui.phoneoptimize.BgStartUpManager")
                    }
                    componentSet = true
                }
                manufacturer.contains("oneplus") -> {
                    intent.component = ComponentName("com.oneplus.security", "com.oneplus.security.chainlaunch.view.ChainLaunchAppListAct")
                    if (!isIntentResolvable(context, intent)) {
                        intent.component = ComponentName("com.coloros.safecenter", "com.coloros.safecenter.permission.startup.StartupAppListActivity")
                    }
                    componentSet = true
                }
                manufacturer.contains("samsung") -> {
                    intent.component = ComponentName("com.samsung.android.lool", "com.samsung.android.sm.ui.battery.BatteryActivity")
                    if (!isIntentResolvable(context, intent)) {
                        intent.component = ComponentName("com.samsung.android.sm", "com.samsung.android.sm.ui.battery.BatteryActivity")
                    }
                    componentSet = true
                }
                manufacturer.contains("transsion") || manufacturer.contains("tecno") || manufacturer.contains("infinix") -> {
                    intent.component = ComponentName("com.transsion.phonemanager", "com.transsion.phonemanager.settings.AutoRunManageActivity")
                    componentSet = true
                }
            }

            if (componentSet && isIntentResolvable(context, intent)) {
                context.startActivity(intent)
            } else {
                // Fallback to standard App Info settings
                openAppInfoSettings(context)
            }
        } catch (e: Exception) {
            Log.e(TAG, "Failed to open AutoStart settings for ${Build.MANUFACTURER}", e)
            openAppInfoSettings(context)
        }
    }

    private fun isIntentResolvable(context: Context, intent: Intent): Boolean {
        val pm = context.packageManager
        val list = pm.queryIntentActivities(intent, PackageManager.MATCH_DEFAULT_ONLY)
        return list.isNotEmpty()
    }

    private fun openAppInfoSettings(context: Context) {
        try {
            val intent = Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS)
            intent.data = Uri.parse("package:${context.packageName}")
            context.startActivity(intent)
        } catch (e: Exception) {
            Log.e(TAG, "Failed to open fallback app info settings", e)
        }
    }
}
