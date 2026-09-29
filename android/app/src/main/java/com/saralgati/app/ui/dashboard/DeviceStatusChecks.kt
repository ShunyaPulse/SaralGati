package com.saralgati.app.ui.dashboard

import android.content.ComponentName
import android.content.Context
import android.os.Build
import android.provider.Settings
import android.text.TextUtils
import com.saralgati.app.services.accessibility.SaralGatiAccessibilityService

/**
 * The "is this phone actually set up?" checks the dashboard re-runs every time
 * it resumes. They only read system state, so they do not need to live inside
 * the composable.
 */

internal fun isAccessibilityServiceEnabled(context: Context): Boolean {
    if (SaralGatiAccessibilityService.isServiceRunning) {
        return true
    }
    val enabledServices = Settings.Secure.getString(
        context.contentResolver,
        Settings.Secure.ENABLED_ACCESSIBILITY_SERVICES
    ) ?: return false
    val colonSplitter = TextUtils.SimpleStringSplitter(':')
    colonSplitter.setString(enabledServices)
    val myComponentName = ComponentName(context, SaralGatiAccessibilityService::class.java)
    while (colonSplitter.hasNext()) {
        val componentNameString = colonSplitter.next()
        val enabledComponent = ComponentName.unflattenFromString(componentNameString)
        if (enabledComponent != null && enabledComponent == myComponentName) {
            return true
        }
    }
    return false
}

internal fun isOverlayPermissionGranted(context: Context): Boolean {
    return Build.VERSION.SDK_INT < Build.VERSION_CODES.M || Settings.canDrawOverlays(context)
}

internal fun isBatteryOptimizationIgnored(context: Context): Boolean {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.M) return true
    val pm = context.getSystemService(Context.POWER_SERVICE) as? android.os.PowerManager
    return pm?.isIgnoringBatteryOptimizations(context.packageName) ?: true
}
