package com.saralgati.app.ui.onboarding

import androidx.compose.foundation.layout.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.saralgati.app.data.local.LocalPrefs

@Composable
fun PairingScreen(
    localPrefs: LocalPrefs,
    onPairedSuccess: () -> Unit
) {
    // Pre-filled with your live elder ID from dashboard for quick 1-tap testing!
    var elderIdInput by remember { mutableStateOf("53e964db-2e74-4491-8295-9c4a45b5b592") }
    var elderName by remember { mutableStateOf("Elder1") }
    var errorMessage by remember { mutableStateOf<String?>(null) }

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

        OutlinedTextField(
            value = elderName,
            onValueChange = { elderName = it },
            label = { Text("Elder's Name") },
            modifier = Modifier.fillMaxWidth().padding(bottom = 16.dp),
            singleLine = true
        )

        OutlinedTextField(
            value = elderIdInput,
            onValueChange = { elderIdInput = it },
            label = { Text("Elder ID (from Dashboard URL)") },
            supportingText = { Text("URL: .../elders/53e964db-2e74-4491-8295-9c4a45b5b592") },
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

        Button(
            onClick = {
                val cleanId = elderIdInput.trim()
                if (cleanId.isBlank()) {
                    errorMessage = "Please provide an Elder ID."
                    return@Button
                }

                // Save locally to preferences
                localPrefs.savePairingInfo(cleanId, "caregiver_live")
                onPairedSuccess()
            },
            modifier = Modifier.fillMaxWidth().height(56.dp)
        ) {
            Text("Link Device (Quick Test)", fontSize = 16.sp, fontWeight = FontWeight.SemiBold)
        }
    }
}
