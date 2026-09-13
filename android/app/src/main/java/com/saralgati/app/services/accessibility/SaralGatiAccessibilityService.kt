package com.saralgati.app.services.accessibility

import android.accessibilityservice.AccessibilityService
import android.content.Intent
import android.util.Log
import android.view.accessibility.AccessibilityEvent
import android.view.accessibility.AccessibilityNodeInfo
import com.saralgati.app.data.api.NetworkModule
import com.saralgati.app.data.local.LocalPrefs
import com.saralgati.app.data.model.AssistanceLog
import android.content.BroadcastReceiver
import android.content.Context
import android.content.IntentFilter
import android.os.Build
import com.saralgati.app.data.model.ScreenContextRequest
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.launch

class SaralGatiAccessibilityService : AccessibilityService() {

    private val serviceScope = CoroutineScope(Dispatchers.IO + SupervisorJob())
    private lateinit var localPrefs: LocalPrefs

    // Variables for Rage Tap Detection
    private var lastClickedNodeId: String? = null
    private var lastClickTime: Long = 0
    private var clickCount = 0
    private var lastAlertTriggerTime: Long = 0
    private val RAGE_TAP_THRESHOLD = 3
    private val RAGE_TAP_TIME_WINDOW_MS = 2000L // 3 clicks within 2 seconds
    private val ALERT_COOLDOWN_MS = 15000L // 15 seconds cooldown between alerts

    companion object {
        const val ACTION_EXTRACT_SCREEN = "com.saralgati.app.ACTION_EXTRACT_SCREEN"
        const val ACTION_SPEAK_EXPLANATION = "com.saralgati.app.ACTION_SPEAK_EXPLANATION"
        const val EXTRA_EXPLANATION_TEXT = "explanation_text"
        
        private const val TAG = "SaralGatiA11y"
        var isServiceRunning = false
            private set
    }

    private val screenExtractReceiver = object : BroadcastReceiver() {
        override fun onReceive(context: Context?, intent: Intent?) {
            if (intent?.action == ACTION_EXTRACT_SCREEN) {
                extractAndExplainScreen()
            }
        }
    }

    override fun onServiceConnected() {
        super.onServiceConnected()
        isServiceRunning = true
        localPrefs = LocalPrefs(applicationContext)
        
        val filter = IntentFilter(ACTION_EXTRACT_SCREEN)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            registerReceiver(screenExtractReceiver, filter, Context.RECEIVER_NOT_EXPORTED)
        } else {
            registerReceiver(screenExtractReceiver, filter)
        }
        
        Log.i(TAG, "SaralGati Accessibility Service connected successfully.")
    }

    override fun onAccessibilityEvent(event: AccessibilityEvent?) {
        if (event == null) return

        when (event.eventType) {
            AccessibilityEvent.TYPE_WINDOW_STATE_CHANGED -> {
                val pkg = event.packageName?.toString() ?: ""
                val cls = event.className?.toString() ?: ""
                Log.d(TAG, "Window switched: $pkg / $cls")
            }
            AccessibilityEvent.TYPE_VIEW_CLICKED -> {
                handleViewClicked(event)
            }
        }
    }

    private fun handleViewClicked(event: AccessibilityEvent) {
        val nodeInfo = event.source ?: return
        val currentTime = System.currentTimeMillis()

        // If an alert was recently triggered, ignore taps during the cooldown period
        if (currentTime - lastAlertTriggerTime < ALERT_COOLDOWN_MS) {
            nodeInfo.recycle()
            return
        }

        val viewId = nodeInfo.viewIdResourceName ?: (event.className?.toString() ?: "unknown_view")

        if (viewId == lastClickedNodeId && (currentTime - lastClickTime) < RAGE_TAP_TIME_WINDOW_MS) {
            clickCount++
        } else {
            // Reset for a new node or if time window expired
            lastClickedNodeId = viewId
            clickCount = 1
        }
        
        lastClickTime = currentTime

        if (clickCount >= RAGE_TAP_THRESHOLD) {
            Log.w(TAG, "Rage Tap Detected on node: $viewId")
            lastAlertTriggerTime = currentTime
            clickCount = 0
            lastClickedNodeId = null

            triggerRageTapAlert(event.packageName?.toString() ?: "unknown", viewId)
        }
        
        nodeInfo.recycle()
    }

    private fun triggerRageTapAlert(pkgName: String, viewId: String) {
        val elderId = localPrefs.getElderId() ?: return
        
        // Trigger the on-screen helper to pop up and ask if they need help
        val intent = Intent(this, com.saralgati.app.services.overlay.FloatingHelperService::class.java).apply {
            action = com.saralgati.app.services.overlay.FloatingHelperService.ACTION_SHOW_RAGE_TAP
        }
        startService(intent)

        serviceScope.launch {
            try {
                val log = AssistanceLog(
                    elderId = elderId,
                    eventType = "stuck_loop",
                    description = "Elder appears stuck, rapidly tapping on $viewId in $pkgName",
                    screenshotUrl = null,
                    severity = "medium",
                    screenName = viewId,
                    appPackage = pkgName
                )
                val response = NetworkModule.alertsApi.triggerAlert(log)
                if (response.isSuccessful) {
                    Log.i(TAG, "Successfully reported rage tap to backend.")
                } else {
                    Log.e(TAG, "Failed to report rage tap: ${response.code()}")
                }
            } catch (e: Exception) {
                Log.e(TAG, "Network error reporting rage tap: ${e.message}")
            }
        }
    }

    private fun extractAndExplainScreen() {
        val rootNode = rootInActiveWindow
        if (rootNode == null) {
            Log.e(TAG, "extractAndExplainScreen: rootInActiveWindow is null")
            broadcastExplanation("मैं स्क्रीन नहीं पढ़ पा रहा हूँ, कृपया ऐप को दोबारा खोलें।")
            return
        }
        
        val elements = mutableListOf<String>()
        traverseNode(rootNode, elements)
        
        val appPackage = rootNode.packageName?.toString() ?: "unknown"
        Log.i(TAG, "Extracted ${elements.size} elements from $appPackage")
        
        serviceScope.launch {
            try {
                val request = ScreenContextRequest(appPackage, elements)
                val response = NetworkModule.agentApi.explainScreen(request)
                if (response.isSuccessful && response.body()?.success == true) {
                    val explanation = response.body()?.data?.explanation ?: "मुझे समझ नहीं आया कि यह स्क्रीन क्या है।"
                    broadcastExplanation(explanation)
                } else {
                    broadcastExplanation("सर्वर से संपर्क नहीं हो पाया।")
                }
            } catch (e: Exception) {
                Log.e(TAG, "Failed to explain screen: ${e.message}")
                broadcastExplanation("नेटवर्क में दिक्कत है।")
            } finally {
                rootNode.recycle()
            }
        }
    }

    private fun traverseNode(node: AccessibilityNodeInfo, elements: MutableList<String>) {
        if (!node.isVisibleToUser) return
        
        val text = node.text?.toString()
        val desc = node.contentDescription?.toString()
        
        if (!text.isNullOrBlank()) {
            elements.add(text)
        } else if (!desc.isNullOrBlank()) {
            elements.add(desc)
        }

        for (i in 0 until node.childCount) {
            node.getChild(i)?.let {
                traverseNode(it, elements)
                it.recycle()
            }
        }
    }

    private fun broadcastExplanation(text: String) {
        val intent = Intent(ACTION_SPEAK_EXPLANATION).apply {
            putExtra(EXTRA_EXPLANATION_TEXT, text)
            setPackage(packageName)
        }
        sendBroadcast(intent)
    }

    override fun onInterrupt() {
        Log.w(TAG, "SaralGati Accessibility Service was interrupted.")
    }

    override fun onDestroy() {
        super.onDestroy()
        isServiceRunning = false
        try {
            unregisterReceiver(screenExtractReceiver)
        } catch (e: Exception) {
            Log.e(TAG, "Receiver not registered")
        }
        Log.i(TAG, "SaralGati Accessibility Service destroyed.")
    }
}
