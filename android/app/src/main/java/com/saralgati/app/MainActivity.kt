package com.saralgati.app

import android.content.Intent
import android.net.Uri
import android.os.Build
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.runtime.getValue
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.sp
import androidx.compose.ui.text.font.FontWeight
import com.saralgati.app.data.api.NetworkModule
import com.saralgati.app.data.local.LocalPrefs
import com.saralgati.app.data.model.AppVersionInfo
import com.saralgati.app.data.local.AppStrings
import com.saralgati.app.services.accessibility.SaralGatiAccessibilityService
import com.saralgati.app.ui.dashboard.DashboardScreen
import com.saralgati.app.ui.onboarding.LanguageSelectScreen
import com.saralgati.app.ui.onboarding.PairingScreen
import com.saralgati.app.ui.theme.SaralGatiTheme
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import kotlinx.coroutines.launch

class MainActivity : ComponentActivity() {
    private lateinit var localPrefs: LocalPrefs

    /**
     * The floating helper and its TTS are started with one language and would
     * keep that voice forever. Tell the running service the moment the elder
     * picks the other language, so the card and the voice follow immediately.
     */
    private fun notifyOverlayLanguageChanged() {
        val overlay = com.saralgati.app.services.overlay.FloatingHelperService
        if (!overlay.isRunning) return
        try {
            startService(
                Intent(this, overlay::class.java).apply {
                    action = overlay.ACTION_LANGUAGE_CHANGED
                }
            )
        } catch (e: Exception) {
            android.util.Log.e("MainActivity", "Failed to notify language change: ${e.message}")
        }
    }

    /**
     * SaralGati's own screens are never screened for fraud, so nothing ever
     * judged them safe and a warning card raised for the app the elder came from
     * kept hovering over our own guidance and the language picker. Entering our
     * UI means they have left that screen, so take the stale card down.
     */
    private fun dismissStaleFraudWarning() {
        SaralGatiAccessibilityService.onCompanionUiShown()
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        localPrefs = LocalPrefs(this)
        NetworkModule.tokenProvider = { localPrefs.getAuthToken() }

        // COARSE and FINE are requested together: from Android 12 neither one
        // alone gives a usable fix for the caregiver's location view.
        var permissions = arrayOf(
            android.Manifest.permission.RECORD_AUDIO,
            android.Manifest.permission.ACCESS_FINE_LOCATION,
            android.Manifest.permission.ACCESS_COARSE_LOCATION
        )
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            permissions += android.Manifest.permission.POST_NOTIFICATIONS
        }
        if (permissions.any { checkSelfPermission(it) != android.content.pm.PackageManager.PERMISSION_GRANTED }) {
            requestPermissions(permissions, 1001)
        }

        setContent {
            SaralGatiTheme {
                Surface(
                    modifier = Modifier.fillMaxSize(),
                    color = MaterialTheme.colorScheme.background
                ) {
                    var hasSelectedLanguage by remember { mutableStateOf(localPrefs.hasSelectedLanguage()) }
                    var currentLanguage by remember { mutableStateOf(localPrefs.getAppLanguage()) }
                    var showLanguageSelection by remember { mutableStateOf(false) }
                    var isPaired by remember { mutableStateOf(localPrefs.isPaired()) }
                    var availableUpdate by remember { mutableStateOf<AppVersionInfo?>(null) }
                    val scope = rememberCoroutineScope()

                    // Language Selection Screen: Shown first if user hasn't selected a language yet, or when requested
                    if (!hasSelectedLanguage || showLanguageSelection) {
                        LanguageSelectScreen(
                            currentAppLang = currentLanguage,
                            currentGuidanceLang = localPrefs.getGuidanceLang(),
                            onLanguageSelected = { appLang, guidanceLang ->
                                localPrefs.setLanguagePrefs(appLang, guidanceLang)
                                currentLanguage = appLang
                                hasSelectedLanguage = true
                                showLanguageSelection = false
                                notifyOverlayLanguageChanged()
                            }
                        )
                        return@Surface
                    }

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
                        var selectedTab by remember { mutableStateOf(0) }
                        Scaffold(
                            bottomBar = {
                                NavigationBar {
                                    NavigationBarItem(
                                        selected = selectedTab == 0,
                                        onClick = { selectedTab = 0 },
                                        icon = { Text("🛡️", fontSize = 20.sp) },
                                        label = { Text(AppStrings.tabProtection(currentLanguage)) }
                                    )
                                    NavigationBarItem(
                                        selected = selectedTab == 1,
                                        onClick = { selectedTab = 1 },
                                        icon = { Text("🩹", fontSize = 20.sp) },
                                        label = { Text(AppStrings.tabDoctor(currentLanguage)) }
                                    )
                                }
                            }
                        ) { paddingValues ->
                            Box(modifier = Modifier.padding(paddingValues)) {
                                if (selectedTab == 0) {
                                    DashboardScreen(
                                        currentLang = currentLanguage,
                                        onChangeLanguage = { showLanguageSelection = true },
                                        onUnpair = {
                                            localPrefs.clear()
                                            isPaired = false
                                        }
                                    )
                                } else {
                                    com.saralgati.app.ui.phonedoctor.PhoneDoctorScreen(
                                        currentLang = currentLanguage
                                    )
                                }
                            }
                        }
                    } else {
                        PairingScreen(
                            localPrefs = localPrefs,
                            currentLang = currentLanguage,
                            onChangeLanguage = { showLanguageSelection = true },
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
                                    text = AppStrings.updateTitle(currentLanguage, update.versionName),
                                    fontWeight = FontWeight.Bold
                                )
                            },
                            text = {
                                Text(AppStrings.updateBody(currentLanguage))
                            },
                            confirmButton = {
                                Button(
                                    onClick = {
                                        if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.O && !this@MainActivity.packageManager.canRequestPackageInstalls()) {
                                            android.widget.Toast.makeText(
                                                this@MainActivity,
                                                AppStrings.allowUnknownSources(currentLanguage),
                                                android.widget.Toast.LENGTH_LONG
                                            ).show()
                                            val intent =
                                                android.content.Intent(android.provider.Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES)
                                                    .apply {
                                                        data =
                                                            android.net.Uri.parse("package:${this@MainActivity.packageName}")
                                                    }
                                            this@MainActivity.startActivity(intent)
                                            // Keep dialog open so they can click Update Now again after returning
                                        } else {
                                            availableUpdate = null
                                            android.widget.Toast.makeText(
                                                this@MainActivity,
                                                AppStrings.downloadingUpdate(currentLanguage),
                                                android.widget.Toast.LENGTH_SHORT
                                            ).show()
                                            scope.launch {
                                                com.saralgati.app.utils.ApkInstaller.downloadAndInstall(
                                                    this@MainActivity,
                                                    update.downloadUrl
                                                )
                                            }
                                        }
                                    }
                                ) {
                                    Text(AppStrings.updateNow(currentLanguage))
                                }
                            },
                            dismissButton = {
                                TextButton(onClick = { availableUpdate = null }) {
                                    Text(AppStrings.updateLater(currentLanguage))
                                }
                            }
                        )
                    }
                }
            }
        }
    }

    override fun onResume() {
        super.onResume()
        dismissStaleFraudWarning()
    }
}

