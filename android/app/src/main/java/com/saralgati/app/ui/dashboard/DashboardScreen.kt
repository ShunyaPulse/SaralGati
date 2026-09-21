package com.saralgati.app.ui.dashboard

import android.content.Intent
import android.net.Uri
import android.os.Build
import android.provider.Settings
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import android.content.ComponentName
import android.content.Context
import android.text.TextUtils
import androidx.compose.ui.platform.LocalLifecycleOwner
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.LifecycleEventObserver
import com.saralgati.app.data.api.NetworkModule
import com.saralgati.app.data.local.LocalPrefs
import com.saralgati.app.data.model.AssistanceLog
import com.saralgati.app.services.accessibility.SaralGatiAccessibilityService
import com.saralgati.app.utils.AutoStartHelper
import kotlinx.coroutines.launch

@Composable
fun DashboardScreen(
    onUnpair: () -> Unit = {}
) {
    val context = LocalContext.current
    val coroutineScope = rememberCoroutineScope()
    val localPrefs = remember { LocalPrefs(context) }
    val elderId = localPrefs.getElderId() ?: "Unknown"

    var alertStatusMessage by remember { mutableStateOf<String?>(null) }
    var isSendingAlert by remember { mutableStateOf(false) }

    val lifecycleOwner = LocalLifecycleOwner.current
    var isAccessibilityEnabled by remember { mutableStateOf(isAccessibilityServiceEnabled(context)) }
    var isOverlayGranted by remember { mutableStateOf(isOverlayPermissionGranted(context)) }
    var isBatteryExempt by remember { mutableStateOf(isBatteryOptimizationIgnored(context)) }
    var isAutoStartConfigured by remember { mutableStateOf(localPrefs.getBoolean("pref_autostart_configured", false)) }
    var canInstallPackages by remember { mutableStateOf(if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) context.packageManager.canRequestPackageInstalls() else true) }

    DisposableEffect(lifecycleOwner) {
        val observer = LifecycleEventObserver { _, event ->
            if (event == Lifecycle.Event.ON_RESUME) {
                isAccessibilityEnabled = isAccessibilityServiceEnabled(context)
                isOverlayGranted = isOverlayPermissionGranted(context)
                isBatteryExempt = isBatteryOptimizationIgnored(context)
                isAutoStartConfigured = localPrefs.getBoolean("pref_autostart_configured", false)
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                    canInstallPackages = context.packageManager.canRequestPackageInstalls()
                }
            }
        }
        lifecycleOwner.lifecycle.addObserver(observer)
        onDispose {
            lifecycleOwner.lifecycle.removeObserver(observer)
        }
    }

    LaunchedEffect(Unit) {
        val intent = Intent(context, com.saralgati.app.services.heartbeat.TelemetryService::class.java)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            context.startForegroundService(intent)
        } else {
            context.startService(intent)
        }
    }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(24.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.SpaceBetween
    ) {
        Column(
            horizontalAlignment = Alignment.CenterHorizontally,
            modifier = Modifier.fillMaxWidth()
        ) {
            Text(
                text = "SaralGati Protection",
                style = MaterialTheme.typography.headlineMedium,
                fontWeight = FontWeight.Bold,
                color = MaterialTheme.colorScheme.primary
            )
            
            Spacer(modifier = Modifier.height(8.dp))
            
            Surface(
                color = MaterialTheme.colorScheme.primaryContainer,
                shape = RoundedCornerShape(12.dp),
                modifier = Modifier.padding(vertical = 8.dp)
            ) {
                Column(
                    horizontalAlignment = Alignment.CenterHorizontally,
                    modifier = Modifier.padding(horizontal = 16.dp, vertical = 8.dp)
                ) {
                    Text(
                        text = "Connected Elder ID:\n$elderId",
                        style = MaterialTheme.typography.bodySmall,
                        textAlign = TextAlign.Center
                    )
                    Spacer(modifier = Modifier.height(6.dp))
                    OutlinedButton(
                        onClick = onUnpair,
                        colors = ButtonDefaults.outlinedButtonColors(contentColor = MaterialTheme.colorScheme.error),
                        contentPadding = PaddingValues(horizontal = 12.dp, vertical = 4.dp),
                        modifier = Modifier.height(32.dp)
                    ) {
                        Text("Disconnect / Pair New QR", fontSize = 12.sp, fontWeight = FontWeight.SemiBold)
                    }
                }
            }

            Spacer(modifier = Modifier.height(16.dp))

            // 1. Accessibility Permission Button (only shown if not yet enabled)
            if (!isAccessibilityEnabled) {
                OutlinedButton(
                    onClick = {
                        val intent = Intent(Settings.ACTION_ACCESSIBILITY_SETTINGS)
                        context.startActivity(intent)
                    },
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Text("Enable Accessibility Permission")
                }
                
                if (Build.VERSION.SDK_INT >= 33) {
                    Spacer(modifier = Modifier.height(4.dp))
                    Text(
                        "If Accessibility says 'Restricted': Open App Info -> Top 3 Dots -> Allow restricted settings",
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.error,
                        modifier = Modifier.padding(horizontal = 4.dp)
                    )
                    OutlinedButton(
                        onClick = {
                            val intent = Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS).apply {
                                data = Uri.parse("package:${context.packageName}")
                            }
                            context.startActivity(intent)
                        },
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Text("Open App Info (To Unlock)")
                    }
                }
            }

            // 2. Overlay Permission Button (only shown if not yet granted)
            if (!isOverlayGranted) {
                Spacer(modifier = Modifier.height(8.dp))
                OutlinedButton(
                    onClick = {
                        val intent = Intent(
                            Settings.ACTION_MANAGE_OVERLAY_PERMISSION,
                            Uri.parse("package:${context.packageName}")
                        )
                        context.startActivity(intent)
                    },
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Text("Grant Overlay (Floating) Permission")
                }
            }

            // 3. Battery Optimization Exemption Button (only shown if not yet exempt)
            if (!isBatteryExempt) {
                Spacer(modifier = Modifier.height(8.dp))
                OutlinedButton(
                    onClick = {
                        val intent = Intent(Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS).apply {
                            data = Uri.parse("package:${context.packageName}")
                        }
                        context.startActivity(intent)
                    },
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Text("Disable Battery Optimization")
                }
            }

            // 4. Install Unknown Apps Permission Button (for seamless Auto-Updates)
            if (!canInstallPackages) {
                Spacer(modifier = Modifier.height(8.dp))
                OutlinedButton(
                    onClick = {
                        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                            val intent = Intent(Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES).apply {
                                data = Uri.parse("package:${context.packageName}")
                            }
                            context.startActivity(intent)
                        }
                    },
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Text("Allow Auto-Updates Permission")
                }
            }

            // 5. Auto-Start Button (only shown if supported by OEM and not yet configured)
            val showAutoStart = AutoStartHelper.isAutoStartSupported() && !isAutoStartConfigured
            if (showAutoStart) {
                Spacer(modifier = Modifier.height(8.dp))
                OutlinedButton(
                    onClick = {
                        localPrefs.saveBoolean("pref_autostart_configured", true)
                        isAutoStartConfigured = true
                        AutoStartHelper.navigateToAutoStart(context)
                    },
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Text("Enable Auto-Start (${AutoStartHelper.getBrandName()})")
                }
            }

            // 6. All Protections Active Badge (shown when no setup buttons are needed)
            if (isAccessibilityEnabled && isOverlayGranted && isBatteryExempt && canInstallPackages && !showAutoStart) {
                Surface(
                    color = Color(0xFFDCFCE7),
                    shape = RoundedCornerShape(12.dp),
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Row(
                        modifier = Modifier.padding(horizontal = 16.dp, vertical = 12.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Text(
                            text = "🛡️ All Permissions & Protection Active",
                            fontWeight = FontWeight.SemiBold,
                            color = Color(0xFF15803D),
                            fontSize = 14.sp
                        )
                    }
                }
            }

            if (alertStatusMessage != null) {
                Spacer(modifier = Modifier.height(12.dp))
                Text(
                    text = alertStatusMessage!!,
                    color = if (alertStatusMessage!!.startsWith("Success")) Color(0xFF16A34A) else MaterialTheme.colorScheme.error,
                    style = MaterialTheme.typography.bodyMedium,
                    textAlign = TextAlign.Center
                )
            }
        }
        
        Spacer(modifier = Modifier.weight(1f))

        // On-Screen Helper Controls
        Surface(
            color = Color(0xFFF3F4F6),
            shape = RoundedCornerShape(16.dp),
            modifier = Modifier.fillMaxWidth()
        ) {
            Column(modifier = Modifier.padding(16.dp)) {
                Text(
                    text = "On-Screen Helper Settings",
                    fontWeight = FontWeight.Bold,
                    fontSize = 18.sp,
                    modifier = Modifier.padding(bottom = 12.dp)
                )

                var voiceEnabled by remember { mutableStateOf(localPrefs.getBoolean("pref_voice", true)) }
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text("Voice Guidance (TTS)")
                    Switch(
                        checked = voiceEnabled,
                        onCheckedChange = { 
                            voiceEnabled = it
                            localPrefs.saveBoolean("pref_voice", it)
                        }
                    )
                }

                Spacer(modifier = Modifier.height(16.dp))

                Button(
                    onClick = {
                        val intent = Intent(context, com.saralgati.app.services.overlay.FloatingHelperService::class.java)
                        context.startService(intent)
                    },
                    colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF0074c8)),
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(56.dp),
                    shape = RoundedCornerShape(12.dp)
                ) {
                    Text("Start On-Screen Helper", fontSize = 18.sp, fontWeight = FontWeight.Bold, color = Color.White)
                }
            }
        }
    }
}

private fun isAccessibilityServiceEnabled(context: Context): Boolean {
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

private fun isOverlayPermissionGranted(context: Context): Boolean {
    return Build.VERSION.SDK_INT < Build.VERSION_CODES.M || Settings.canDrawOverlays(context)
}

private fun isBatteryOptimizationIgnored(context: Context): Boolean {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.M) return true
    val pm = context.getSystemService(Context.POWER_SERVICE) as? android.os.PowerManager
    return pm?.isIgnoringBatteryOptimizations(context.packageName) ?: true
}
