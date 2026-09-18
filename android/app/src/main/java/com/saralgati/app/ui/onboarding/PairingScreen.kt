package com.saralgati.app.ui.onboarding

import android.Manifest
import android.content.pm.PackageManager
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.layout.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.core.content.ContextCompat
import com.saralgati.app.data.local.LocalPrefs
import com.saralgati.app.data.api.NetworkModule
import kotlinx.coroutines.launch
import org.json.JSONObject

@Composable
fun PairingScreen(
    localPrefs: LocalPrefs,
    onPairedSuccess: () -> Unit
) {
    var elderIdInput by remember { mutableStateOf("") }
    var isScanning by remember { mutableStateOf(false) }
    var errorMessage by remember { mutableStateOf<String?>(null) }
    var isLoading by remember { mutableStateOf(false) }
    val context = LocalContext.current
    val scope = rememberCoroutineScope()

    val cameraPermissionLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.RequestPermission(),
        onResult = { isGranted ->
            if (isGranted) {
                isScanning = true
                errorMessage = null
            } else {
                errorMessage = "Camera permission is required to scan QR codes."
            }
        }
    )

    if (isScanning) {
        Box(modifier = Modifier.fillMaxSize()) {
            QrCodeScanner(
                onQrScanned = { qrData ->
                    try {
                        val json = JSONObject(qrData)
                        val elderId = json.getString("elder_id")
                        val deviceToken = json.optString("device_token", "caregiver_live")
                        localPrefs.savePairingInfo(elderId, "caregiver_live", deviceToken)
                        
                        // Auto-detect and push device model & OS version
                        val phoneModel = getDevicePhoneModel()
                        val osVersion = getDeviceOsVersion()
                        scope.launch {
                            try {
                                NetworkModule.eldersApi.updateHeartbeat(
                                    elderId,
                                    mapOf(
                                        "phone_model" to phoneModel,
                                        "os_version" to osVersion
                                    )
                                )
                            } catch (_: Exception) {}
                        }

                        isScanning = false
                        onPairedSuccess()
                    } catch (e: Exception) {
                        errorMessage = "Invalid QR Code format"
                        isScanning = false
                    }
                }
            )
            Button(
                onClick = { isScanning = false },
                modifier = Modifier.align(Alignment.BottomCenter).padding(32.dp)
            ) {
                Text("Cancel Scan")
            }
        }
        return
    }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(24.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center
    ) {
        Text(
            text = "SaralGati Setup",
            style = MaterialTheme.typography.headlineMedium,
            fontWeight = FontWeight.Bold,
            color = MaterialTheme.colorScheme.primary,
            modifier = Modifier.padding(bottom = 8.dp)
        )
        
        Text(
            text = "Link this device to the live Caregiver Dashboard.",
            textAlign = TextAlign.Center,
            style = MaterialTheme.typography.bodyMedium,
            modifier = Modifier.padding(bottom = 24.dp)
        )

        Button(
            onClick = {
                if (ContextCompat.checkSelfPermission(context, Manifest.permission.CAMERA) == PackageManager.PERMISSION_GRANTED) {
                    isScanning = true
                    errorMessage = null
                } else {
                    cameraPermissionLauncher.launch(Manifest.permission.CAMERA)
                }
            },
            modifier = Modifier.fillMaxWidth().height(64.dp).padding(bottom = 16.dp),
            enabled = !isLoading
        ) {
            Text("Scan QR Code to Pair", fontSize = 16.sp, fontWeight = FontWeight.SemiBold)
        }

        Text("OR", modifier = Modifier.padding(vertical = 16.dp))

        OutlinedTextField(
            value = elderIdInput,
            onValueChange = { elderIdInput = it },
            label = { Text("Elder ID (from Dashboard URL)") },
            modifier = Modifier.fillMaxWidth().padding(bottom = 24.dp),
            singleLine = true,
            enabled = !isLoading
        )

        if (errorMessage != null) {
            Text(
                text = errorMessage!!,
                color = MaterialTheme.colorScheme.error,
                modifier = Modifier.padding(bottom = 16.dp)
            )
        }

        OutlinedButton(
            onClick = {
                val cleanId = elderIdInput.trim()
                if (cleanId.isBlank()) {
                    errorMessage = "Please provide an Elder ID."
                    return@OutlinedButton
                }

                scope.launch {
                    isLoading = true
                    errorMessage = null
                    try {
                        val response = NetworkModule.eldersApi.getElderStatus(cleanId)
                        if (response.isSuccessful && response.body()?.success == true) {
                            localPrefs.savePairingInfo(cleanId, "caregiver_live")
                            
                            // Auto-detect and push device model & OS version
                            val phoneModel = getDevicePhoneModel()
                            val osVersion = getDeviceOsVersion()
                            try {
                                NetworkModule.eldersApi.updateHeartbeat(
                                    cleanId,
                                    mapOf(
                                        "phone_model" to phoneModel,
                                        "os_version" to osVersion
                                    )
                                )
                            } catch (_: Exception) {}

                            onPairedSuccess()
                        } else {
                            errorMessage = "Elder ID not found. Please create one on saralgati.com first."
                        }
                    } catch (e: Exception) {
                        errorMessage = "Network error. Please check internet connection."
                    } finally {
                        isLoading = false
                    }
                }
            },
            modifier = Modifier.fillMaxWidth().height(56.dp),
            enabled = !isLoading
        ) {
            if (isLoading) {
                CircularProgressIndicator(modifier = Modifier.size(24.dp), color = MaterialTheme.colorScheme.primary)
            } else {
                Text("Link Device Manually", fontSize = 16.sp, fontWeight = FontWeight.SemiBold)
            }
        }
    }
}

private fun getDevicePhoneModel(): String {
    val manufacturer = android.os.Build.MANUFACTURER.replaceFirstChar { 
        if (it.isLowerCase()) it.titlecase() else it.toString() 
    }
    val model = android.os.Build.MODEL
    return if (model.startsWith(manufacturer, ignoreCase = true)) {
        model
    } else {
        "$manufacturer $model"
    }
}

private fun getDeviceOsVersion(): String {
    return "Android ${android.os.Build.VERSION.RELEASE} (API ${android.os.Build.VERSION.SDK_INT})"
}

