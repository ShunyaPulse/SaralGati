package com.saralgati.app

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import com.saralgati.app.data.local.LocalPrefs
import com.saralgati.app.ui.dashboard.DashboardScreen
import com.saralgati.app.ui.onboarding.PairingScreen
import com.saralgati.app.ui.theme.SaralGatiTheme

class MainActivity : ComponentActivity() {
    private lateinit var localPrefs: LocalPrefs

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        
        localPrefs = LocalPrefs(this)
        com.saralgati.app.data.api.NetworkModule.tokenProvider = { localPrefs.getAuthToken() }
        
        if (checkSelfPermission(android.Manifest.permission.RECORD_AUDIO) != android.content.pm.PackageManager.PERMISSION_GRANTED) {
            requestPermissions(arrayOf(android.Manifest.permission.RECORD_AUDIO), 1001)
        }

        setContent {
            SaralGatiTheme {
                Surface(
                    modifier = Modifier.fillMaxSize(),
                    color = MaterialTheme.colorScheme.background
                ) {
                    var isPaired by remember { mutableStateOf(localPrefs.isPaired()) }
                    
                    if (isPaired) {
                        DashboardScreen()
                    } else {
                        PairingScreen(
                            localPrefs = localPrefs,
                            onPairedSuccess = { isPaired = true }
                        )
                    }
                }
            }
        }
    }
}
