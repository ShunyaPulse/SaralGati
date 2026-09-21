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
import androidx.compose.ui.unit.sp
import androidx.compose.ui.text.font.FontWeight
import com.saralgati.app.data.api.NetworkModule
import com.saralgati.app.data.local.LocalPrefs
import com.saralgati.app.data.model.AppVersionInfo
import com.saralgati.app.ui.dashboard.DashboardScreen
import com.saralgati.app.ui.onboarding.PairingScreen
import com.saralgati.app.ui.theme.SaralGatiTheme
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import kotlinx.coroutines.launch

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
                    val scope = rememberCoroutineScope()

                    // Check for App Updates: prompts every 3rd time the app is opened
                    LaunchedEffect(Unit) {
                        val openCount = localPrefs.incrementAppOpenCount()
                        if (openCount % 3 == 0) {
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
                                        if (versionInfo.versionCode > currentVersionCode || versionInfo.forceUpdate) {
                                            availableUpdate = versionInfo
                                        }
                                    }
                                }
                            } catch (e: Exception) {
                                // Network offline, skip update check
                            }
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
                        var selectedTab by remember { mutableIntStateOf(0) }
                        Scaffold(
                            bottomBar = {
                                NavigationBar {
                                    NavigationBarItem(
                                        selected = selectedTab == 0,
                                        onClick = { selectedTab = 0 },
                                        icon = { Text("🛡️", fontSize = 20.sp) },
                                        label = { Text("Suraksha") }
                                    )
                                    NavigationBarItem(
                                        selected = selectedTab == 1,
                                        onClick = { selectedTab = 1 },
                                        icon = { Text("🩹", fontSize = 20.sp) },
                                        label = { Text("Phone Doctor") }
                                    )
                                }
                            }
                        ) { paddingValues ->
                            androidx.compose.foundation.layout.Box(modifier = androidx.compose.foundation.layout.padding(paddingValues)) {
                                if (selectedTab == 0) {
                                    DashboardScreen(
                                        onUnpair = {
                                            localPrefs.clear()
                                            isPaired = false
                                        }
                                    )
                                } else {
                                    com.saralgati.app.ui.phonedoctor.PhoneDoctorScreen()
                                }
                            }
                        }
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
                                    text = "SaralGati का नया वर्ज़न उपलब्ध है। बेहतर सुरक्षा और नए फ़ीचर्स के लिए अभी अपडेट करें।"
                                )
                            },
                            confirmButton = {
                                Button(
                                    onClick = {
                                        if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.O && !this@MainActivity.packageManager.canRequestPackageInstalls()) {
                                            android.widget.Toast.makeText(this@MainActivity, "Please allow 'Install Unknown Apps' to update", android.widget.Toast.LENGTH_LONG).show()
                                            val intent = android.content.Intent(android.provider.Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES).apply {
                                                data = android.net.Uri.parse("package:${this@MainActivity.packageName}")
                                            }
                                            this@MainActivity.startActivity(intent)
                                            // Keep dialog open so they can click Update Now again after returning
                                        } else {
                                            availableUpdate = null
                                            android.widget.Toast.makeText(this@MainActivity, "Downloading update...", android.widget.Toast.LENGTH_SHORT).show()
                                            scope.launch {
                                                com.saralgati.app.utils.ApkInstaller.downloadAndInstall(this@MainActivity, update.downloadUrl)
                                            }
                                        }
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

