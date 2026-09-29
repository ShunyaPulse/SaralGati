package com.saralgati.app.ui.phonedoctor

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
import com.saralgati.app.data.local.AppStrings
import kotlinx.coroutines.launch

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun PhoneDoctorScreen(
    currentLang: String = "hi"
) {
    val context = LocalContext.current
    val lifecycleOwner = LocalLifecycleOwner.current
    val localPrefs = remember { LocalPrefs(context) }

    var showSettings by remember { mutableStateOf(false) }
    var hasWritePermission by remember { mutableStateOf(canWriteSettings(context)) }
    var hasDndPermission by remember { mutableStateOf(canAccessDnd(context)) }

    // Auto-refresh permission state when returning from system settings
    DisposableEffect(lifecycleOwner) {
        val observer = LifecycleEventObserver { _, event ->
            if (event == Lifecycle.Event.ON_RESUME) {
                hasWritePermission = canWriteSettings(context)
                hasDndPermission = canAccessDnd(context)
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
    var fixDnd by remember { mutableStateOf(localPrefs.getBoolean("doctor_fix_dnd", false)) }

    Box(modifier = Modifier.fillMaxSize()) {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(24.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.Center
        ) {

            Text(
                text = AppStrings.doctorTitle(currentLang),
                style = MaterialTheme.typography.headlineMedium,
                fontWeight = FontWeight.Bold,
                color = MaterialTheme.colorScheme.primary,
                modifier = Modifier.padding(bottom = 8.dp)
            )

            Text(
                text = AppStrings.doctorSubtitle(currentLang),
                style = MaterialTheme.typography.bodyMedium,
                textAlign = TextAlign.Center,
                color = Color.Gray,
                modifier = Modifier.padding(bottom = 60.dp)
            )

            // Giant "Sab Theek Karo" Button
            Button(
                onClick = {
                    executeFixes(context, localPrefs, currentLang)
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
                        AppStrings.fixAllBtn(currentLang),
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
            title = { Text(AppStrings.doctorSettingsTitle(currentLang), fontSize = 18.sp, fontWeight = FontWeight.Bold) },
            text = {
                Column {
                    Text(
                        AppStrings.doctorSettingsSubtitle(currentLang),
                        fontSize = 14.sp,
                        color = Color.Gray,
                        modifier = Modifier.padding(bottom = 8.dp)
                    )

                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Checkbox(
                            checked = fixRinger,
                            onCheckedChange = { fixRinger = it; localPrefs.saveBoolean("doctor_fix_ringer", it) })
                        Text(AppStrings.doctorFixRinger(currentLang), fontSize = 15.sp)
                    }
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Checkbox(
                            checked = fixMedia,
                            onCheckedChange = { fixMedia = it; localPrefs.saveBoolean("doctor_fix_media", it) })
                        Text(AppStrings.doctorFixMedia(currentLang), fontSize = 15.sp)
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
                            text = AppStrings.doctorFixBrightness(currentLang, hasWritePermission),
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
                            text = AppStrings.doctorFixTimeout(currentLang, hasWritePermission),
                            fontSize = 15.sp
                        )
                    }
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Checkbox(
                            checked = fixDnd,
                            onCheckedChange = {
                                fixDnd = it
                                localPrefs.saveBoolean("doctor_fix_dnd", it)
                                if (it && !hasDndPermission) {
                                    openDndSettings(context)
                                }
                            }
                        )
                        Text(
                            text = AppStrings.doctorFixDnd(currentLang, hasDndPermission),
                            fontSize = 15.sp
                        )
                    }

                    // Combined Permission Warning Card
                    val needsWrite = (fixBrightness || fixScreenTimeout) && !hasWritePermission
                    val needsDnd = fixDnd && !hasDndPermission

                    if (needsWrite || needsDnd) {
                        Spacer(modifier = Modifier.height(10.dp))
                        Surface(
                            color = Color(0xFFFEF3C7),
                            shape = RoundedCornerShape(8.dp),
                            modifier = Modifier.fillMaxWidth()
                        ) {
                            Column(modifier = Modifier.padding(10.dp)) {
                                Text(
                                    text = AppStrings.doctorPermissionTitle(currentLang),
                                    fontSize = 12.sp,
                                    fontWeight = FontWeight.Bold,
                                    color = Color(0xFF92400E)
                                )
                                Text(
                                    text = AppStrings.doctorPermissionBody(currentLang),
                                    fontSize = 11.sp,
                                    color = Color(0xFF92400E),
                                    modifier = Modifier.padding(vertical = 4.dp)
                                )
                                if (needsWrite) {
                                    Button(
                                        onClick = { openWriteSettingsPermission(context) },
                                        colors = ButtonDefaults.buttonColors(containerColor = Color(0xFFD97706)),
                                        contentPadding = PaddingValues(horizontal = 12.dp, vertical = 4.dp),
                                        modifier = Modifier.fillMaxWidth().height(36.dp).padding(bottom = 4.dp)
                                    ) {
                                        Text(
                                            AppStrings.doctorAllowWrite(currentLang),
                                            fontSize = 11.sp,
                                            fontWeight = FontWeight.Bold,
                                            color = Color.White
                                        )
                                    }
                                }
                                if (needsDnd) {
                                    Button(
                                        onClick = { openDndSettings(context) },
                                        colors = ButtonDefaults.buttonColors(containerColor = Color(0xFFD97706)),
                                        contentPadding = PaddingValues(horizontal = 12.dp, vertical = 4.dp),
                                        modifier = Modifier.fillMaxWidth().height(36.dp)
                                    ) {
                                        Text(
                                            AppStrings.doctorAllowDnd(currentLang),
                                            fontSize = 11.sp,
                                            fontWeight = FontWeight.Bold,
                                            color = Color.White
                                        )
                                    }
                                }
                            }
                        }
                    }
                }
            },
            confirmButton = {
                TextButton(onClick = { showSettings = false }) {
                    Text(AppStrings.doctorSave(currentLang))
                }
            }
        )
    }
}
