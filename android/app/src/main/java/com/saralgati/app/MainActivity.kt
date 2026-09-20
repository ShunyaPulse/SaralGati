package com.saralgati.app

import android.content.Intent
import android.net.Uri
import android.os.Build
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import com.saralgati.app.data.api.NetworkModule
import com.saralgati.app.data.local.LocalPrefs
import com.saralgati.app.data.model.AppVersionInfo
import com.saralgati.app.ui.dashboard.DashboardScreen
import com.saralgati.app.ui.onboarding.PairingScreen
import com.saralgati.app.ui.theme.SaralGatiTheme
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext

class MainActivity : ComponentActivity() {
    private lateinit var localPrefs: LocalPrefs

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        
        localPrefs = LocalPrefs(this)
        NetworkModule.tokenProvider = { localPrefs.getAuthToken() }
        
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
                    var availableUpdate by remember { mutableStateOf<AppVersionInfo?>(null) }

                    // Check for App Updates: runs on every app launch now
                    LaunchedEffect(Unit) {
                        localPrefs.incrementAppOpenCount()
                        try {
                            val res = withContext(Dispatchers.IO) {
                                NetworkModule.appApi.getLatestVersion()
                            }
                            if (res.isSuccessful && res.body()?.success == true) {
                                val versionInfo = res.body()?.data
                                if (versionInfo != null) {
                                    val currentVersionCode = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
                                        packageManager.getPackageInfo(packageName, 0).longVersionCode.toInt()
                                    } else {
                                        @Suppress("DEPRECATION")
                                        packageManager.getPackageInfo(packageName, 0).versionCode
                                    }
                                    // FORCE CHECK FOR TESTING: Log current vs fetched
                                    android.util.Log.d("UpdateCheck", "Current: $currentVersionCode, Remote: ${versionInfo.versionCode}")
                                    if (versionInfo.versionCode > currentVersionCode || versionInfo.forceUpdate) {
                                        availableUpdate = versionInfo
                                    }
                                }
                            }
                        } catch (e: Exception) {
                            // Network offline, skip update check
                            android.util.Log.e("UpdateCheck", "Failed to check update", e)
                        }
                    }

                    // Auto-Kick validation: if paired, verify that the saved Elder ID actually exists in the database
                    LaunchedEffect(isPaired) {
                        if (isPaired) {
                            val elderId = localPrefs.getElderId()
                            if (elderId.isNullOrBlank()) {
                                localPrefs.clear()
                                isPaired = false
                            } else {
                                try {
                                    val response = withContext(Dispatchers.IO) {
                                        NetworkModule.eldersApi.getElderStatus(elderId.trim())
                                    }
                                    if (!response.isSuccessful || response.body()?.success != true) {
                                        // Fake or deleted Elder ID: immediately clear preferences and force to PairingScreen
                                        localPrefs.clear()
                                        isPaired = false
                                    }
                                } catch (e: Exception) {
                                    // Network issue: keep offline functionality intact, don't kick on network timeouts
                                }
                            }
                        }
                    }

                    if (isPaired) {
                        DashboardScreen(
                            onUnpair = {
                                localPrefs.clear()
                                isPaired = false
                            }
                        )
                    } else {
                        PairingScreen(
                            localPrefs = localPrefs,
                            onPairedSuccess = { isPaired = true }
                        )
                    }

                    // In-App Update Dialog (force-update = false, user can skip)
                    if (availableUpdate != null) {
                        val update = availableUpdate!!
                        AlertDialog(
                            onDismissRequest = { availableUpdate = null },
                            title = {
                                Text(
                                    text = "नया अपडेट उपलब्ध है (v${update.versionName})",
                                    fontWeight = FontWeight.Bold
                                )
                            },
                            text = {
                                Text(
                                    text = "SaralGati का नया वर्ज़न उपलब्ध है। बेहतर सुरक्षा और नए फ़ीचर्स के लिए अभी अपडेट करें।" +
                                            if (!update.changelog.isNullOrBlank()) "\n\nबदलाव:\n${update.changelog}" else ""
                                )
                            },
                            confirmButton = {
                                Button(
                                    onClick = {
                                        availableUpdate = null
                                        val intent = Intent(Intent.ACTION_VIEW, Uri.parse(update.downloadUrl))
                                        startActivity(intent)
                                    }
                                ) {
                                    Text("Update Now")
                                }
                            },
                            dismissButton = {
                                TextButton(onClick = { availableUpdate = null }) {
                                    Text("Baad Mein")
                                }
                            }
                        )
                    }
                }
            }
        }
    }
}

