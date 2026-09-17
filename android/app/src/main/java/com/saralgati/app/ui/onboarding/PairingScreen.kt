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
import org.json.JSONObject

@Composable
fun PairingScreen(
    localPrefs: LocalPrefs,
    onPairedSuccess: () -> Unit
) {
    var elderIdInput by remember { mutableStateOf("") }
    var isScanning by remember { mutableStateOf(false) }
    var errorMessage by remember { mutableStateOf<String?>(null) }
    val context = LocalContext.current

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
                        localPrefs.savePairingInfo(elderId, deviceToken)
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
            modifier = Modifier.fillMaxWidth().height(64.dp).padding(bottom = 16.dp)
        ) {
            Text("Scan QR Code to Pair", fontSize = 16.sp, fontWeight = FontWeight.SemiBold)
        }

        Text("OR", modifier = Modifier.padding(vertical = 16.dp))

        OutlinedTextField(
            value = elderIdInput,
            onValueChange = { elderIdInput = it },
            label = { Text("Elder ID (from Dashboard URL)") },
            modifier = Modifier.fillMaxWidth().padding(bottom = 24.dp),
            singleLine = true
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

                localPrefs.savePairingInfo(cleanId, "caregiver_live")
                onPairedSuccess()
            },
            modifier = Modifier.fillMaxWidth().height(56.dp)
        ) {
            Text("Link Device Manually", fontSize = 16.sp, fontWeight = FontWeight.SemiBold)
        }
    }
}
