package com.saralgati.app.ui.phonedoctor

import android.content.Context
import android.media.AudioManager
import android.widget.Toast
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Settings
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.runtime.getValue
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.saralgati.app.data.local.LocalPrefs
import kotlinx.coroutines.launch

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun PhoneDoctorScreen() {
    val context = LocalContext.current
    val localPrefs = remember { LocalPrefs(context) }
    
    var showSettings by remember { mutableStateOf(false) }
    
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
            Icon(
                imageVector = Icons.Default.Settings,
                contentDescription = "Doctor Settings",
                tint = Color.LightGray // Very subtle so elders don't click it often
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
                        Checkbox(checked = fixBrightness, onCheckedChange = { fixBrightness = it; localPrefs.saveBoolean("doctor_fix_brightness", it) })
                        Text("Brightness to 100% (Requires Permission)", fontSize = 15.sp)
                    }
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Checkbox(checked = fixScreenTimeout, onCheckedChange = { fixScreenTimeout = it; localPrefs.saveBoolean("doctor_fix_timeout", it) })
                        Text("Screen Timeout 5 Mins (Requires Permission)", fontSize = 15.sp)
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
            audioManager.setStreamVolume(AudioManager.STREAM_MUSIC, (maxMedia * 0.8).toInt(), 0) // 80% is safe/loud enough
            fixedItems++
        }

        // Brightness and Screen Timeout require WRITE_SETTINGS permission.
        // We will just show a Toast for now if they are checked but permission is missing.
        if (prefs.getBoolean("doctor_fix_brightness", false) || prefs.getBoolean("doctor_fix_timeout", false)) {
            if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.M) {
                if (!android.provider.Settings.System.canWrite(context)) {
                    Toast.makeText(context, "System Modify Permission needed for Brightness/Timeout!", Toast.LENGTH_LONG).show()
                } else {
                    if (prefs.getBoolean("doctor_fix_brightness", false)) {
                        android.provider.Settings.System.putInt(context.contentResolver, android.provider.Settings.System.SCREEN_BRIGHTNESS_MODE, android.provider.Settings.System.SCREEN_BRIGHTNESS_MODE_MANUAL)
                        android.provider.Settings.System.putInt(context.contentResolver, android.provider.Settings.System.SCREEN_BRIGHTNESS, 200) // ~80%
                        fixedItems++
                    }
                    if (prefs.getBoolean("doctor_fix_timeout", false)) {
                        android.provider.Settings.System.putInt(context.contentResolver, android.provider.Settings.System.SCREEN_OFF_TIMEOUT, 300000) // 5 mins
                        fixedItems++
                    }
                }
            }
        }
        
        Toast.makeText(context, "✅ Sab Theek Ho Gaya!", Toast.LENGTH_SHORT).show()
    } catch (e: Exception) {
        Toast.makeText(context, "Kuch theek karne me dikkat aayi.", Toast.LENGTH_SHORT).show()
    }
}

