package com.saralgati.app.ui.phonedoctor

import android.content.Context
import android.content.Intent
import android.media.AudioManager
import android.net.Uri
import android.os.Build
import android.provider.Settings
import android.widget.Toast
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.runtime.getValue
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalLifecycleOwner
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.LifecycleEventObserver
import com.saralgati.app.data.local.LocalPrefs
import kotlinx.coroutines.launch

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun PhoneDoctorScreen() {
    val context = LocalContext.current
    val lifecycleOwner = LocalLifecycleOwner.current
    val localPrefs = remember { LocalPrefs(context) }
    
    var showSettings by remember { mutableStateOf(false) }
    var hasWritePermission by remember { mutableStateOf(canWriteSettings(context)) }
    
    // Auto-refresh permission state when returning from system settings
    DisposableEffect(lifecycleOwner) {
        val observer = LifecycleEventObserver { _, event ->
            if (event == Lifecycle.Event.ON_RESUME) {
                hasWritePermission = canWriteSettings(context)
            }
        }
        lifecycleOwner.lifecycle.addObserver(observer)
        onDispose {
            lifecycleOwner.lifecycle.removeObserver(observer)
        }
    }
    
    // Checkbox states (Caregiver configures these)
    var fixRinger by remember { mutableStateOf(localPrefs.getBoolean("doctor_fix_ringer", true)) }
    var fixMedia by remember { mutableStateOf(localPrefs.getBoolean("doctor_fix_media", true)) }
    var fixBrightness by remember { mutableStateOf(localPrefs.getBoolean("doctor_fix_brightness", false)) }
    var fixScreenTimeout by remember { mutableStateOf(localPrefs.getBoolean("doctor_fix_timeout", false)) }

    Box(modifier = Modifier.fillMaxSize()) {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(24.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.Center
        ) {
            
            Text(
                text = "Phone Doctor",
                style = MaterialTheme.typography.headlineMedium,
                fontWeight = FontWeight.Bold,
                color = MaterialTheme.colorScheme.primary,
                modifier = Modifier.padding(bottom = 8.dp)
            )
            
            Text(
                text = "Agar phone me awaaz ya roshni ki dikkat hai, toh ek button dabayein.",
                style = MaterialTheme.typography.bodyMedium,
                textAlign = TextAlign.Center,
                color = Color.Gray,
                modifier = Modifier.padding(bottom = 60.dp)
            )

            // Giant "Sab Theek Karo" Button
            Button(
                onClick = {
                    executeFixes(context, localPrefs)
                },
                colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF16A34A)), // Green
                shape = CircleShape,
                modifier = Modifier
                    .size(200.dp)
                    .padding(8.dp),
                elevation = ButtonDefaults.buttonElevation(defaultElevation = 8.dp, pressedElevation = 4.dp)
            ) {
                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                    Text("🛠️", fontSize = 48.sp, modifier = Modifier.padding(bottom = 8.dp))
                    Text(
                        "Sab Theek\nKaro",
                        fontSize = 24.sp,
                        fontWeight = FontWeight.ExtraBold,
                        color = Color.White,
                        textAlign = TextAlign.Center
                    )
                }
            }
        }

        // Small hidden/unobtrusive settings button at the bottom for Caregiver
        IconButton(
            onClick = { showSettings = true },
            modifier = Modifier
                .align(Alignment.BottomEnd)
                .padding(16.dp)
                .size(48.dp)
        ) {
            Text(
                text = "⚙️",
                fontSize = 24.sp,
                color = Color.LightGray
            )
        }
    }

    if (showSettings) {
        AlertDialog(
            onDismissRequest = { showSettings = false },
            title = { Text("Caregiver Settings\n(Button Actions)", fontSize = 18.sp, fontWeight = FontWeight.Bold) },
            text = {
                Column {
                    Text("Select what 'Sab Theek Karo' will fix:", fontSize = 14.sp, color = Color.Gray, modifier = Modifier.padding(bottom = 8.dp))
                    
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Checkbox(checked = fixRinger, onCheckedChange = { fixRinger = it; localPrefs.saveBoolean("doctor_fix_ringer", it) })
                        Text("Max Ringer (Awaaz Full)", fontSize = 15.sp)
                    }
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Checkbox(checked = fixMedia, onCheckedChange = { fixMedia = it; localPrefs.saveBoolean("doctor_fix_media", it) })
                        Text("Max Video/Media Volume", fontSize = 15.sp)
                    }
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Checkbox(
                            checked = fixBrightness,
                            onCheckedChange = {
                                fixBrightness = it
                                localPrefs.saveBoolean("doctor_fix_brightness", it)
                                if (it && !hasWritePermission) {
                                    openWriteSettingsPermission(context)
                                }
                            }
                        )
                        Text(
                            text = if (hasWritePermission) "Brightness High (85%) ✅" else "Brightness High (85%)",
                            fontSize = 15.sp
                        )
                    }
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Checkbox(
                            checked = fixScreenTimeout,
                            onCheckedChange = {
                                fixScreenTimeout = it
                                localPrefs.saveBoolean("doctor_fix_timeout", it)
                                if (it && !hasWritePermission) {
                                    openWriteSettingsPermission(context)
                                }
                            }
                        )
                        Text(
                            text = if (hasWritePermission) "Screen Timeout 5 Mins ✅" else "Screen Timeout 5 Mins",
                            fontSize = 15.sp
                        )
                    }

                    // If either brightness or timeout is enabled but permission is missing, show an explicit action card
                    if ((fixBrightness || fixScreenTimeout) && !hasWritePermission) {
                        Spacer(modifier = Modifier.height(10.dp))
                        Surface(
                            color = Color(0xFFFEF3C7),
                            shape = RoundedCornerShape(8.dp),
                            modifier = Modifier.fillMaxWidth()
                        ) {
                            Column(modifier = Modifier.padding(10.dp)) {
                                Text(
                                    text = "⚠️ System Modify Permission Required",
                                    fontSize = 12.sp,
                                    fontWeight = FontWeight.Bold,
                                    color = Color(0xFF92400E)
                                )
                                Text(
                                    text = "Roshni aur screen timeout set karne ke liye 'Allow modify system settings' chalu karein.",
                                    fontSize = 11.sp,
                                    color = Color(0xFF92400E),
                                    modifier = Modifier.padding(vertical = 4.dp)
                                )
                                Button(
                                    onClick = { openWriteSettingsPermission(context) },
                                    colors = ButtonDefaults.buttonColors(containerColor = Color(0xFFD97706)),
                                    contentPadding = PaddingValues(horizontal = 12.dp, vertical = 4.dp),
                                    modifier = Modifier.fillMaxWidth().height(36.dp)
                                ) {
                                    Text("Allow Permission Now", fontSize = 12.sp, fontWeight = FontWeight.Bold, color = Color.White)
                                }
                            }
                        }
                    }
                }
            },
            confirmButton = {
                TextButton(onClick = { showSettings = false }) {
                    Text("Save & Close")
                }
            }
        )
    }
}

private fun canWriteSettings(context: Context): Boolean {
    return Build.VERSION.SDK_INT < Build.VERSION_CODES.M || Settings.System.canWrite(context)
}

private fun openWriteSettingsPermission(context: Context) {
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
            } catch (ignored: Exception) {}
        }
    }
}

private fun executeFixes(context: Context, prefs: LocalPrefs) {
    try {
        val audioManager = context.getSystemService(Context.AUDIO_SERVICE) as AudioManager
        var fixedItems = 0
        
        if (prefs.getBoolean("doctor_fix_ringer", true)) {
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
        
        Toast.makeText(context, "✅ Sab Theek Ho Gaya!", Toast.LENGTH_SHORT).show()
    } catch (e: Exception) {
        Toast.makeText(context, "Kuch theek karne me dikkat aayi.", Toast.LENGTH_SHORT).show()
    }
}

