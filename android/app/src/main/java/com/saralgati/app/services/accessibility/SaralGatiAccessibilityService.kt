package com.saralgati.app.services.accessibility

import android.accessibilityservice.AccessibilityService
import android.content.Intent
import android.util.Log
import android.view.accessibility.AccessibilityEvent
import android.view.accessibility.AccessibilityNodeInfo
import com.saralgati.app.data.api.NetworkModule
import com.saralgati.app.data.local.LocalPrefs
import com.saralgati.app.data.model.AssistanceLog
import com.saralgati.app.data.model.FraudCheckRequest
import com.saralgati.app.data.model.FraudVerdict
import android.content.BroadcastReceiver
import android.content.Context
import android.content.IntentFilter
import android.os.Build
import com.saralgati.app.data.model.ScreenContextRequest
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.launch
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock

class SaralGatiAccessibilityService : AccessibilityService() {

    private val serviceScope = CoroutineScope(Dispatchers.IO + SupervisorJob())
    private val stateMutex = Mutex()
    private lateinit var localPrefs: LocalPrefs

    // Variables for Rage Tap Detection
    private var lastClickedNodeId: String? = null
    private val recentClickTimes = ArrayDeque<Long>(RAGE_TAP_THRESHOLD)
    private var lastAlertTriggerTime: Long = 0

    // Variables for the real-time anti-fraud sentinel
    private var lastFraudScanAt = 0L
    private var lastFraudSignature: String? = null
    private var fraudScanInFlight = false

    // Variables for Continuous Learning Implicit Feedback Loop
    private var activeInteractionId: String? = null
    private var activeHighlightedIndex: Int? = null
    private var activeHighlightedBounds: android.graphics.Rect? = null
    private var activeHighlightTime: Long = 0L
    private var activeAppPackage: String? = null
    private var activeWindowClassName: String? = null
    private var activeFlowGoal: String? = null
    private var activeElementBounds: List<android.graphics.Rect> = emptyList()

    companion object {
        private const val RAGE_TAP_THRESHOLD = 3
        private const val RAGE_TAP_TIME_WINDOW_MS = 2000L // 3 clicks within 2 seconds
        private const val ALERT_COOLDOWN_MS = 15000L // 15 seconds cooldown between alerts
        private const val FEEDBACK_EXPIRY_MS = 25000L // 25 seconds window to detect user tap
        private const val FRAUD_SCAN_MIN_INTERVAL_MS = 2500L // at most one verdict request per screen burst
        private const val FRAUD_SCAN_MAX_ELEMENTS = 300 // matches the API's per-request element cap

        const val ACTION_EXTRACT_SCREEN = "com.saralgati.app.ACTION_EXTRACT_SCREEN"
        const val ACTION_EXTRACT_AND_ASK = "com.saralgati.app.ACTION_EXTRACT_AND_ASK"
        const val ACTION_SPEAK_EXPLANATION = "com.saralgati.app.ACTION_SPEAK_EXPLANATION"
        const val EXTRA_EXPLANATION_TEXT = "explanation_text"
        
        const val ACTION_SHOW_VISUAL_CUE = "com.saralgati.app.ACTION_SHOW_VISUAL_CUE"
        const val EXTRA_BOUNDS_LEFT = "bounds_left"
        const val EXTRA_BOUNDS_TOP = "bounds_top"
        const val EXTRA_BOUNDS_RIGHT = "bounds_right"
        const val EXTRA_BOUNDS_BOTTOM = "bounds_bottom"
        
        private const val TAG = "SaralGatiA11y"
        var isServiceRunning = false
            private set
    }


    private val screenExtractReceiver = object : BroadcastReceiver() {
        override fun onReceive(context: Context?, intent: Intent?) {
            if (intent?.action == ACTION_EXTRACT_SCREEN) {
                extractAndExplainScreen()
            } else if (intent?.action == ACTION_EXTRACT_AND_ASK) {
                val question = intent.getStringExtra("question") ?: return
                extractAndAskScreen(question)
            }
        }
    }

    override fun onServiceConnected() {
        super.onServiceConnected()
        isServiceRunning = true
        localPrefs = LocalPrefs(applicationContext)
        NetworkModule.tokenProvider = { localPrefs.getAuthToken() }
        
        val filter = IntentFilter().apply {
            addAction(ACTION_EXTRACT_SCREEN)
            addAction(ACTION_EXTRACT_AND_ASK)
        }
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
                scanScreenForFraud(pkg)
                handleWindowStateChanged(pkg, cls)
            }
            AccessibilityEvent.TYPE_WINDOW_CONTENT_CHANGED -> {
                // Catches text that appears without a window switch (an incoming
                // WhatsApp message, a payment sheet drawn over the same activity).
                scanScreenForFraud(event.packageName?.toString() ?: "")
            }
            AccessibilityEvent.TYPE_VIEW_CLICKED -> {
                handleViewClicked(event)
            }
        }
    }

    private fun handleWindowStateChanged(pkg: String, cls: String) {
        val interactionId = activeInteractionId ?: return
        val highlightTime = activeHighlightTime
        val currentTime = System.currentTimeMillis()
        val elapsed = currentTime - highlightTime

        // Ignore overlay or own app events
        if (pkg == packageName) return

        // Check if transition occurred within active feedback window
        // (with a small 250ms guard to ensure it's not the initial trigger window)
        if (elapsed in 250L..FEEDBACK_EXPIRY_MS) {
            val appChanged = activeAppPackage != null && pkg != activeAppPackage
            val windowChanged = activeWindowClassName != null && cls != activeWindowClassName

            if (appChanged || windowChanged) {
                Log.i(TAG, "Window transition detected ($pkg / $cls). Auto-verifying interaction: $interactionId")

                // Clear immediately to prevent duplicate feedback
                val currentFlowGoal = activeFlowGoal
                val tappedIndex = activeHighlightedIndex
                activeInteractionId = null
                activeHighlightedIndex = null
                activeHighlightedBounds = null
                activeAppPackage = null
                activeWindowClassName = null
                activeElementBounds = emptyList()
                activeFlowGoal = null

                // Dismiss visual cue overlay
                clearVisualCue()

                serviceScope.launch {
                    try {
                        val req = com.saralgati.app.data.model.FeedbackRequest(
                            interactionId = interactionId,
                            feedback = "tapped_highlight",
                            actualTappedIndex = tappedIndex
                        )
                        NetworkModule.agentApi.sendFeedback(req)
                        Log.d(TAG, "Sent window-transition auto-verification for: $interactionId")
                        
                        // Auto-advance multi-step flow
                        if (currentFlowGoal != null) {
                            kotlinx.coroutines.delay(1000) // Wait for screen to fully render
                            extractAndAskScreen(currentFlowGoal)
                        }
                    } catch (e: Exception) {
                        Log.e(TAG, "Failed to send window-transition feedback: ${e.message}")
                    }
                }
            }
        }
    }

    private fun handleViewClicked(event: AccessibilityEvent) {
        val nodeInfo = event.source ?: return
        val currentTime = System.currentTimeMillis()

        // --- Continuous Learning: Check if click matches active highlighted button ---
        val interactionId = activeInteractionId
        val targetBounds = activeHighlightedBounds
        if (interactionId != null && targetBounds != null) {
            val elapsed = currentTime - activeHighlightTime
            if (elapsed < FEEDBACK_EXPIRY_MS) {
                val clickedRect = android.graphics.Rect()
                nodeInfo.getBoundsInScreen(clickedRect)

                val isTargetTapped = android.graphics.Rect.intersects(clickedRect, targetBounds)
                val feedbackType = if (isTargetTapped) "tapped_highlight" else "tapped_other"

                // Determine which element index was actually tapped
                val actualIndex: Int? = if (isTargetTapped) {
                    activeHighlightedIndex
                } else {
                    val foundIdx = activeElementBounds.indexOfFirst { android.graphics.Rect.intersects(clickedRect, it) }
                    if (foundIdx != -1) foundIdx else null
                }

                // Clear immediately to prevent duplicate feedback calls
                val currentFlowGoal = activeFlowGoal
                activeInteractionId = null
                activeHighlightedIndex = null
                activeHighlightedBounds = null
                activeAppPackage = null
                activeWindowClassName = null
                activeElementBounds = emptyList()
                activeFlowGoal = null
                clearVisualCue()

                serviceScope.launch {
                    try {
                        val req = com.saralgati.app.data.model.FeedbackRequest(
                            interactionId = interactionId,
                            feedback = feedbackType,
                            actualTappedIndex = actualIndex
                        )
                        NetworkModule.agentApi.sendFeedback(req)
                        Log.d(TAG, "Sent implicit feedback: $feedbackType (actualIndex: $actualIndex) for interaction: $interactionId")
                        
                        // Auto-advance multi-step flow if they tapped the correct target
                        if (currentFlowGoal != null && isTargetTapped) {
                            kotlinx.coroutines.delay(1000) // Wait for content change
                            extractAndAskScreen(currentFlowGoal)
                        }
                    } catch (e: Exception) {
                        Log.e(TAG, "Failed to send implicit feedback: ${e.message}")
                    }
                }
            } else {
                activeInteractionId = null
                activeHighlightedBounds = null
                activeAppPackage = null
                activeWindowClassName = null
                activeElementBounds = emptyList()
                activeFlowGoal = null
            }
        }

        // If an alert was recently triggered, ignore taps during the cooldown period
        if (currentTime - lastAlertTriggerTime < ALERT_COOLDOWN_MS) {
            nodeInfo.recycle()
            return
        }

        val viewId = nodeInfo.viewIdResourceName ?: (event.className?.toString() ?: "unknown_view")

        if (viewId != lastClickedNodeId) {
            lastClickedNodeId = viewId
            recentClickTimes.clear()
        }

        recentClickTimes.addLast(currentTime)
        // Keep only the last N timestamps
        while (recentClickTimes.size > RAGE_TAP_THRESHOLD) {
            recentClickTimes.removeFirst()
        }

        // Check if N taps happened within the time window (first to last)
        if (recentClickTimes.size >= RAGE_TAP_THRESHOLD &&
            (recentClickTimes.last() - recentClickTimes.first()) < RAGE_TAP_TIME_WINDOW_MS) {
            Log.w(TAG, "Rage Tap Detected on node: $viewId")
            lastAlertTriggerTime = currentTime
            recentClickTimes.clear()
            lastClickedNodeId = null

            triggerRageTapAlert(event.packageName?.toString() ?: "unknown", viewId)
        }
        
        nodeInfo.recycle()
    }

    /**
     * Real-time anti-fraud sentinel.
     *
     * The screen text the companion already reads for guidance is sent to
     * /api/v1/agent/fraud-check before the elder acts on it. Throttled to one
     * request per burst and skipped when the element set is unchanged, so
     * scrolling or typing cannot exhaust the server's per-device rate limit.
     */
    private fun scanScreenForFraud(pkg: String) {
        if (pkg.isEmpty() || pkg == packageName) return
        if (!localPrefs.isPaired()) return
        if (fraudScanInFlight) return
        val now = System.currentTimeMillis()
        if (now - lastFraudScanAt < FRAUD_SCAN_MIN_INTERVAL_MS) return
        lastFraudScanAt = now
        serviceScope.launch { runFraudScan(pkg) }
    }

    private suspend fun runFraudScan(pkg: String) {
        fraudScanInFlight = true
        try {
            val rootNode = rootInActiveWindow ?: return
            val elements = mutableListOf<String>()
            val elementBounds = mutableListOf<android.graphics.Rect>()
            if (rootNode.packageName?.toString() == pkg) {
                traverseNode(rootNode, elements, elementBounds, relaxedForFraud = true)
            }
            rootNode.recycle()
            if (elements.isEmpty()) return

            val scanElements = elements.take(FRAUD_SCAN_MAX_ELEMENTS)
            val scanBounds = elementBounds.take(FRAUD_SCAN_MAX_ELEMENTS)

            // Identical text cannot produce a different verdict, and recording
            // the signature before the call keeps a flaky network from retrying
            // the same screen every few seconds.
            val signature = scanElements.joinToString("|").hashCode().toString()
            if (signature == lastFraudSignature) return
            lastFraudSignature = signature

            val response = NetworkModule.agentApi.checkFraud(FraudCheckRequest(pkg, scanElements))
            val verdict = response.body()
            if (!response.isSuccessful || verdict == null || !verdict.isDangerous) return

            Log.w(TAG, "Fraud sentinel: ${verdict.threatLevel}/${verdict.threatCategory} on $pkg")
            val safeBounds = verdict.actionDecision.safeActionIndex?.let { scanBounds.getOrNull(it) }
            warnElderAboutFraud(verdict, safeBounds)
        } catch (e: Exception) {
            Log.e(TAG, "Fraud scan failed: ${e.message}")
        } finally {
            fraudScanInFlight = false
        }
    }

    private fun warnElderAboutFraud(verdict: FraudVerdict, safeBounds: android.graphics.Rect?) {
        val intent = Intent(this, com.saralgati.app.services.overlay.FloatingHelperService::class.java).apply {
            action = com.saralgati.app.services.overlay.FloatingHelperService.ACTION_SHOW_FRAUD_WARNING
            putExtra(com.saralgati.app.services.overlay.FloatingHelperService.EXTRA_FRAUD_TITLE, verdict.userAlert.title)
            putExtra(com.saralgati.app.services.overlay.FloatingHelperService.EXTRA_FRAUD_MESSAGE, verdict.userAlert.messageHi)
            putExtra(com.saralgati.app.services.overlay.FloatingHelperService.EXTRA_FRAUD_ADVICE, verdict.actionDecision.safeAdvice)
        }
        startService(intent)

        // Point the spotlight at the button that gets the elder out of the trap.
        if (safeBounds != null) broadcastVisualCue(safeBounds)
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

    // Infinite feeds and long communication/media lists that must NEVER be auto-scrolled
    private val INFINITE_AND_LONG_SCROLL_PACKAGES = setOf(
        "com.google.android.youtube",
        "com.google.android.apps.youtube.music",
        "com.instagram.android",
        "com.twitter.android",
        "com.x.android",
        "com.facebook.katana",
        "com.facebook.orca",
        "com.zhiliaoapp.musically",
        "com.ss.android.ugc.trill",
        "com.snapchat.android",
        "com.reddit.frontpage",
        "com.pinterest",
        "com.whatsapp",
        "com.whatsapp.w4b",
        "org.telegram.messenger",
        "com.google.android.gm",
        "com.google.android.apps.messaging",
        "com.google.android.apps.photos"
    )

    private fun isInfiniteOrLongScrollApp(pkg: String): Boolean {
        val lower = pkg.lowercase()
        if (INFINITE_AND_LONG_SCROLL_PACKAGES.contains(lower)) return true
        return lower.contains("youtube") ||
               lower.contains("instagram") ||
               lower.contains("facebook") ||
               lower.contains("twitter") ||
               lower.contains("whatsapp") ||
               lower.contains("reddit") ||
               lower.contains("tiktok") ||
               lower.contains("gmail") ||
               lower.contains("messaging") ||
               lower.contains("photos")
    }

    private fun findScrollableNode(node: AccessibilityNodeInfo?, needBackward: Boolean = false): AccessibilityNodeInfo? {
        if (node == null) return null
        if (node.isScrollable) {
            val hasAction = if (needBackward) {
                node.actionList.any {
                    it.id == AccessibilityNodeInfo.ACTION_SCROLL_BACKWARD ||
                    it.id == android.R.id.accessibilityActionScrollUp
                }
            } else {
                node.actionList.any {
                    it.id == AccessibilityNodeInfo.ACTION_SCROLL_FORWARD ||
                    it.id == android.R.id.accessibilityActionScrollDown
                }
            }
            if (hasAction) return node
        }
        for (i in 0 until node.childCount) {
            val child = node.getChild(i) ?: continue
            val found = findScrollableNode(child, needBackward)
            if (found != null) {
                // Recycle intermediate child if it's not the found node itself
                if (found != child) child.recycle()
                return found
            }
            child.recycle()
        }
        return null
    }

    /**
     * Extracts full screen content including below-the-fold elements for non-feed screens.
     * Guarantees:
     * 1. Never scrolls on infinite feeds or long chat/mail lists (YouTube, Instagram, WhatsApp, Gmail, etc.)
     * 2. Non-disruptive: Immediately restores scroll position back to top after a single controlled peek.
     * 3. Strictly at most 1 single peek scroll (never loops or goes to the end).
     */
    private suspend fun extractFullWindowElements(
        rootNode: AccessibilityNodeInfo,
        appPackage: String,
        elements: MutableList<String>,
        elementBounds: MutableList<android.graphics.Rect>,
        belowFoldFlags: MutableList<Boolean>
    ) {
        // Step 1: Extract visible viewport elements first
        traverseNode(rootNode, elements, elementBounds)
        for (i in elements.indices) {
            belowFoldFlags.add(false)
        }

        // Guardrail 1: Do NOT scroll on infinite feeds or long chat/mail lists
        if (isInfiniteOrLongScrollApp(appPackage)) {
            Log.d(TAG, "Skipping below-fold scan for feed/chat package: $appPackage")
            return
        }

        // Guardrail 2: Check if there is an active scrollable container
        val scrollableNode = findScrollableNode(rootNode, needBackward = false) ?: return

        try {
            // Perform 1 Controlled Peek Scroll
            val scrolled = scrollableNode.performAction(AccessibilityNodeInfo.ACTION_SCROLL_FORWARD)
            if (scrolled) {
                kotlinx.coroutines.delay(200) // Allow layout to settle

                val freshRoot = rootInActiveWindow
                if (freshRoot != null) {
                    val peekElements = mutableListOf<String>()
                    val peekBounds = mutableListOf<android.graphics.Rect>()
                    traverseNode(freshRoot, peekElements, peekBounds)

                    // Identify and add new elements not already visible (compare both label AND bounds to avoid dropping duplicate-named buttons)
                    val existingEntries = elements.zip(elementBounds).toSet()
                    for (idx in peekElements.indices) {
                        val el = peekElements[idx]
                        val bounds = peekBounds[idx]
                        // An element is new if it has a different label OR different bounds from all existing entries
                        val isDuplicate = existingEntries.any { (existLabel, existBounds) ->
                            existLabel == el && android.graphics.Rect.intersects(existBounds, bounds)
                        }
                        if (!isDuplicate) {
                            elements.add("[BELOW-FOLD] $el")
                            elementBounds.add(bounds)
                            belowFoldFlags.add(true)
                        }
                    }

                    // IMMEDIATE RESTORE: Scroll back to the top so user's screen is 100% untouched!
                    val restoreScrollNode = findScrollableNode(freshRoot, needBackward = true)
                    restoreScrollNode?.performAction(AccessibilityNodeInfo.ACTION_SCROLL_BACKWARD)
                    kotlinx.coroutines.delay(200)
                    freshRoot.recycle()
                }
            }
        } catch (e: Exception) {
            Log.e(TAG, "Safe scroll peek error: ${e.message}")
        }
    }

    private fun extractAndExplainScreen() {
        serviceScope.launch {
            // Immediately clear any old highlight box so it does not interfere or get scanned
            clearVisualCue()
            kotlinx.coroutines.delay(300)
            
            val rootNode = rootInActiveWindow
            if (rootNode == null) {
                Log.e(TAG, "extractAndExplainScreen: rootInActiveWindow is null")
                broadcastExplanation("मैं स्क्रीन नहीं पढ़ पा रहा हूँ, कृपया ऐप को दोबारा खोलें।")
                return@launch
            }
            
            val elements = mutableListOf<String>()
            val elementBounds = mutableListOf<android.graphics.Rect>()
            val belowFoldFlags = mutableListOf<Boolean>()
            val appPackage = rootNode.packageName?.toString() ?: "unknown"
            
            extractFullWindowElements(rootNode, appPackage, elements, elementBounds, belowFoldFlags)
            Log.i(TAG, "Extracted ${elements.size} elements (below-fold included) from $appPackage")
        
            try {
                val request = ScreenContextRequest(appPackage, elements)
                val response = NetworkModule.agentApi.explainScreen(request)
                if (response.isSuccessful && response.body()?.success == true) {
                    val data = response.body()?.data
                    val explanation = data?.explanation ?: "मुझे समझ नहीं आया कि यह स्क्रीन क्या है।"
                    broadcastExplanation(explanation)
                    val highlightIndex = data?.highlightIndex
                    if (highlightIndex != null && highlightIndex in elementBounds.indices) {
                        broadcastVisualCue(elementBounds[highlightIndex])
                    }
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

    private var currentAppPackage: String? = null
    private val conversationHistory = mutableListOf<com.saralgati.app.data.model.ChatMessage>()

    private fun extractAndAskScreen(question: String) {
        serviceScope.launch {
            // Immediately clear any old highlight box so it does not interfere or get scanned
            clearVisualCue()
            kotlinx.coroutines.delay(300)
            
            val rootNode = rootInActiveWindow
            if (rootNode == null) {
                Log.e(TAG, "extractAndAskScreen: rootInActiveWindow is null")
                broadcastExplanation("मैं स्क्रीन नहीं पढ़ पा रहा हूँ।")
                return@launch
            }
            
            val elements = mutableListOf<String>()
            val elementBounds = mutableListOf<android.graphics.Rect>()
            val belowFoldFlags = mutableListOf<Boolean>()
            val appPackage = rootNode.packageName?.toString() ?: "unknown"
            
            extractFullWindowElements(rootNode, appPackage, elements, elementBounds, belowFoldFlags)
            
            if (appPackage != currentAppPackage) {
                currentAppPackage = appPackage
                conversationHistory.clear()
            }
            
            try {
                val request = com.saralgati.app.data.model.AskContextRequest(appPackage, elements, question, conversationHistory.toList())
                val response = NetworkModule.agentApi.askQuestion(request)
                if (response.isSuccessful && response.body()?.success == true) {
                    val data = response.body()?.data
                    val explanation = data?.explanation ?: "मुझे इस सवाल का जवाब नहीं मिला।"
                    conversationHistory.add(com.saralgati.app.data.model.ChatMessage("user", question))
                    conversationHistory.add(com.saralgati.app.data.model.ChatMessage("assistant", explanation))
                    // Keep max 6 turns
                    if (conversationHistory.size > 6) {
                        conversationHistory.removeAt(0)
                        conversationHistory.removeAt(0)
                    }
                    broadcastExplanation(explanation)
                    val highlightIndex = data?.highlightIndex
                    if (highlightIndex != null && highlightIndex in elementBounds.indices) {
                        activeInteractionId = data?.interactionId
                        activeHighlightedIndex = highlightIndex
                        activeHighlightedBounds = elementBounds[highlightIndex]
                        activeHighlightTime = System.currentTimeMillis()
                        activeAppPackage = appPackage
                        activeWindowClassName = rootNode.className?.toString()
                        activeElementBounds = elementBounds.toList()
                        activeFlowGoal = if (data?.flow != null) question else null
                        
                        // Keep screen rock-solid stable: do not force scroll down on elder's live screen
                        broadcastVisualCue(elementBounds[highlightIndex])
                    } else {
                        activeInteractionId = null
                        activeHighlightedIndex = null
                        activeHighlightedBounds = null
                        activeAppPackage = null
                        activeWindowClassName = null
                        activeElementBounds = emptyList()
                        activeFlowGoal = null
                    }
                } else {
                    broadcastExplanation("सर्वर से संपर्क नहीं हो पाया।")
                }
            } catch (e: Exception) {
                Log.e(TAG, "Failed to ask question: ${e.message}")
                broadcastExplanation("नेटवर्क में दिक्कत है।")
            } finally {
                rootNode.recycle()
            }
        }
    }

    private fun clearVisualCue() {
        activeInteractionId = null
        activeHighlightedIndex = null
        activeHighlightedBounds = null
        activeAppPackage = null
        activeWindowClassName = null
        activeElementBounds = emptyList()
        val intent = Intent("com.saralgati.app.ACTION_CLEAR_VISUAL_CUE").apply {
            setPackage(packageName)
        }
        sendBroadcast(intent)
    }

    private fun traverseNode(
        node: AccessibilityNodeInfo,
        elements: MutableList<String>,
        elementBounds: MutableList<android.graphics.Rect>,
        relaxedForFraud: Boolean = false
    ) {
        if (node.isPassword) return
        if (!node.isVisibleToUser) return
        
        // Ignore SaralGati's own overlay windows from being scanned as screen content!
        val pkg = node.packageName?.toString()
        if (pkg == packageName) return
        
        val label = resolveHumanReadableLabel(node)
        
        if (!label.isNullOrBlank()) {
            val rect = android.graphics.Rect()
            node.getBoundsInScreen(rect)
            
            // Only capture elements with reasonable button/icon sizes (avoid full-screen parent containers!)
            val w = rect.width()
            val h = rect.height()
            val density = android.content.res.Resources.getSystem().displayMetrics.density
            val minPx = (16 * density).toInt()  // 16dp minimum
            val maxW = (300 * density).toInt()   // 300dp max width
            val maxH = (180 * density).toInt()   // 180dp max height
            // Fraud scanning also needs the message text, which is usually bigger
            // than a button; guidance still only targets tappable-sized nodes so a
            // chat bubble is never spotlighted.
            val isReasonableButtonSize = if (relaxedForFraud) {
                w >= minPx && h >= minPx
            } else {
                (w in minPx..maxW) && (h in minPx..maxH)
            }
            
            // Prefer clickable nodes or leaf nodes to prevent selecting massive layout parents
            val isInteractiveOrLeaf = node.isClickable || node.childCount == 0
            
            if (isReasonableButtonSize && isInteractiveOrLeaf) {
                val role = getElementRole(node)
                elements.add("$role ${label.trim()}")
                elementBounds.add(rect)
            }
        }

        for (i in 0 until node.childCount) {
            node.getChild(i)?.let {
                traverseNode(it, elements, elementBounds, relaxedForFraud)
                it.recycle()
            }
        }
    }

    /**
     * Classifies an AccessibilityNodeInfo into high-level UI roles:
     * [BUTTON] -> Clickable button, action icon, ImageButton, or clickable container
     * [INPUT] -> EditText, text field
     * [TOGGLE] -> CheckBox, Switch, RadioButton
     * [TEXT] -> Plain static non-clickable text
     */
    private fun getElementRole(node: AccessibilityNodeInfo): String {
        val className = node.className?.toString() ?: ""
        val isClickable = node.isClickable

        return when {
            className.contains("EditText", ignoreCase = true) -> "[INPUT]"
            className.contains("CheckBox", ignoreCase = true) ||
            className.contains("Switch", ignoreCase = true) ||
            className.contains("RadioButton", ignoreCase = true) -> "[TOGGLE]"
            className.contains("Button", ignoreCase = true) ||
            (className.contains("ImageView", ignoreCase = true) && isClickable) -> "[BUTTON]"
            // Clickable TextViews are interactive targets (modern apps use clickable TextViews as buttons)
            className.contains("TextView", ignoreCase = true) && isClickable -> "[BUTTON]"
            className.contains("TextView", ignoreCase = true) -> "[TEXT]"
            isClickable -> "[BUTTON]"
            else -> "[TEXT]"
        }
    }

    /**
     * Resolves human-readable labels for interactive nodes, explicitly disambiguating icons
     * (e.g. Camera Shutter vs Flip Camera, Search Magnifier vs '0', Paperclip, Mic, 3 Dots, etc.)
     */
    private fun resolveHumanReadableLabel(node: AccessibilityNodeInfo): String? {
        val rawText = node.text?.toString()?.trim()
        val rawDesc = node.contentDescription?.toString()?.trim()
        val rawViewId = node.viewIdResourceName?.lowercase() ?: ""
        val viewId = rawViewId.substringAfterLast(":id/").substringAfterLast("/")

        // Filter out single character font-icon glyphs (like '0' or obscure icon codes)
        val nodeClassName = node.className?.toString() ?: ""
        val isImageLike = nodeClassName.contains("ImageView", ignoreCase = true) || nodeClassName.contains("ImageButton", ignoreCase = true)
        val text = if (rawText != null && rawText.length == 1 && ((rawText == "0" && isImageLike) || !rawText[0].isLetterOrDigit())) null else rawText
        val desc = if (rawDesc != null && rawDesc.length == 1 && ((rawDesc == "0" && isImageLike) || !rawDesc[0].isLetterOrDigit())) null else rawDesc

        val combined = "$desc $text $viewId $rawViewId".lowercase()

        // 1. CAMERA & PHOTOGRAPHY ICONS
        if (combined.contains("shutter") || combined.contains("capture") || combined.contains("take photo") || 
            combined.contains("take picture") || combined.contains("snap") || combined.contains("btn_camera_capture")) {
            return "Photo kheenchne wala button (Camera Shutter)"
        }
        if (combined.contains("switch camera") || combined.contains("flip") || combined.contains("rotate camera") || 
            combined.contains("front camera") || combined.contains("rear camera") || combined.contains("toggle camera") || 
            combined.contains("facing") || combined.contains("selfie camera")) {
            return "Camera badalne wala button (Flip Front/Back Camera)"
        }
        if (combined.contains("flash") || combined.contains("torch") || combined.contains("lightning")) {
            return "Flash / Roshni chalane wala button"
        }
        if (combined.contains("video mode") || combined.contains("record video") || combined.contains("switch to video")) {
            return "Video banane wala mode (Video Record)"
        }
        if (combined.contains("timer") || combined.contains("countdown")) {
            return "Camera timer (Photo lene ka samay)"
        }
        if (combined.contains("hdr") || combined.contains("portrait") || combined.contains("beauty")) {
            return "Camera mode (Portrait ya HDR)"
        }
        if (combined.contains("zoom") || combined.contains("0.5x") || combined.contains("1x") || combined.contains("2x")) {
            return "Camera zoom (Pass ya door karne ka button)"
        }

        // 2. SEARCH & DISCOVERY (Fixing Magnifying Glass / Lens being confused with 0)
        if (combined.contains("search") || combined.contains("magnif") || combined.contains("find") || 
            combined.contains("khoj") || combined.contains("query") || rawText == "🔍" || rawDesc == "🔍") {
            return "Search / Khojne wala button (Lens)"
        }
        if (combined.contains("filter") || combined.contains("funnel")) {
            return "Filter karne wala button"
        }
        if (combined.contains("sort") || combined.contains("reorder")) {
            return "Kram se lagane ka button (Sort)"
        }
        if (combined.contains("refresh") || combined.contains("reload") || combined.contains("sync")) {
            return "Refresh / Dubara load karne ka button"
        }

        // 3. UPI, PAYMENTS & BANKING (Google Pay, PhonePe, Paytm, BHIM)
        if (combined.contains("scan qr") || combined.contains("scanner") || combined.contains("scan_qr") || combined.contains("barcode")) {
            return "QR Code scan karne ka camera (Scan & Pay)"
        }
        if (combined.contains("send money") || combined.contains("pay") || combined.contains("transfer")) {
            return "Paise bhejne ka button (Pay / Transfer)"
        }
        if (combined.contains("check balance") || combined.contains("view balance") || combined.contains("account balance")) {
            return "Bank balance check karne ka button"
        }
        if (combined.contains("history") || combined.contains("passbook") || combined.contains("statement") || combined.contains("transactions")) {
            return "Purane len-den dekhne ka button (History / Passbook)"
        }
        if (combined.contains("cart") || combined.contains("basket") || combined.contains("shopping bag")) {
            return "Khareedari ka jhola (Shopping Cart)"
        }

        // 4. YOUTUBE, AUDIO & VIDEO PLAYER
        if (combined.contains("play") && !combined.contains("playlist") && !combined.contains("google play")) {
            return "Video / Gana chalane ka button (Play)"
        }
        if (combined.contains("pause") || combined.contains("stop")) {
            return "Video / Gana rokne ka button (Pause)"
        }
        if (combined.contains("next") || combined.contains("skip forward") || combined.contains("fast forward")) {
            return "Agla video ya gana chalane ka button (Next / Skip)"
        }
        if (combined.contains("previous") || combined.contains("rewind") || combined.contains("skip back")) {
            return "Pichla video ya gana chalane ka button (Previous)"
        }
        if (combined.contains("fullscreen") || combined.contains("maximize") || combined.contains("expand")) {
            return "Badi screen karne ka button (Fullscreen)"
        }
        if (combined.contains("subtitles") || combined.contains("caption") || combined.contains(" cc ") || rawText == "CC") {
            return "Subtitles / Likhe hue shabda dikhane ka button (CC)"
        }
        if (combined.contains("volume") || combined.contains("sound") || combined.contains("audio level")) {
            return "Awaaz kam-tez karne ka button (Volume)"
        }

        // 5. CHAT, MESSAGING & INPUT ICONS
        if (combined.contains("attach") || combined.contains("clip") || combined.contains("paperclip") || 
            combined.contains("document") || combined.contains("media")) {
            return "Photo / Document jodne wala button (Attachment Clip)"
        }
        if (combined.contains("voice") || combined.contains("mic") || combined.contains("microphone") || 
            combined.contains("record audio") || combined.contains("sound input")) {
            return "Awaaz record karne wala mic button (Voice Note)"
        }
        if (combined.contains("send") || combined.contains("submit") || combined.contains("send arrow") || combined.contains("bhejo")) {
            return "Message bhejne wala button (Send Arrow)"
        }
        if (combined.contains("emoji") || combined.contains("smiley") || combined.contains("sticker") || combined.contains("gif")) {
            return "Emoji ya Sticker wala button"
        }
        if (combined.contains("forward") || combined.contains("aage bhejo")) {
            return "Aage bhejne ka button (Forward Message)"
        }
        if (combined.contains("status") || combined.contains("story") || combined.contains("stories")) {
            return "Status ya Story dekhne ka button"
        }
        if (combined.contains("new chat") || combined.contains("new message") || combined.contains("compose")) {
            return "Naya message shuru karne ka button (New Chat)"
        }

        // 6. PHONE & CALLING ICONS
        if (combined.contains("dial") || combined.contains("dialpad") || combined.contains("keypad") || combined.contains("numpad")) {
            return "Number dial karne ka keypad"
        }
        if (combined.contains("end call") || combined.contains("hang up") || combined.contains("disconnect") || combined.contains("reject")) {
            return "Call kaatne wala laal button (End Call)"
        }
        if (combined.contains("loudspeaker") || combined.contains("speaker")) {
            return "Speaker par aawaz tez karne ka button"
        }
        if (combined.contains("mute") || combined.contains("unmute")) {
            return "Mic band karne ka button (Mute)"
        }
        if (combined.contains("video call")) {
            return "Video call karne ka button"
        }
        if (combined.contains("phone") || combined.contains("call") || combined.contains("audio call")) {
            return "Phone milane ka button (Call)"
        }
        if (combined.contains("add contact") || combined.contains("new contact") || combined.contains("create contact")) {
            return "Naya number save karne ka button (Add Contact)"
        }
        if (combined.contains("hold call") || combined.contains("call hold")) {
            return "Call hold par rakhne ka button"
        }

        // 7. NAVIGATION, TABS & OVERFLOW MENUS
        if (combined.contains("more options") || combined.contains("overflow") || combined.contains("options menu") || 
            combined.contains("menu") || combined.contains("three dots") || combined.contains("dots")) {
            return "Menu / 3 Bindi (More Options)"
        }
        if (combined.contains("hamburger") || combined.contains("drawer") || combined.contains("side menu") || combined.contains("three lines")) {
            return "Side menu / 3 Line wala button (Main Menu)"
        }
        if (combined.contains("navigate up") || combined.contains("back") || combined.contains("arrow back") || 
            combined.contains("previous") || rawText == "←" || rawDesc == "←") {
            return "Peeche jane wala button (Back Arrow)"
        }
        if (combined.contains("close") || combined.contains("cancel") || combined.contains("dismiss") || 
            rawText == "✕" || rawText == "X" || rawDesc == "close") {
            return "Band karne ka cross button (Close)"
        }
        if (combined.contains("share") || combined.contains("share icon")) {
            return "Share / Aage bhejne ka button"
        }
        if (combined.contains("home") || combined.contains("homepage")) {
            return "Home screen / Mukhya prishth par jane ka button"
        }
        if (combined.contains("bookmark") || combined.contains("save page")) {
            return "Page ko save ya bookmark karne ka button"
        }
        if (combined.contains("tab") || combined.contains("open tabs")) {
            return "Khule hue tabs dekhne ka button"
        }

        // 8. GALLERY, FILES & DOCUMENT ACTIONS
        if (combined.contains("delete") || combined.contains("trash") || combined.contains("bin") || combined.contains("remove")) {
            return "Delete / Hatane ka dabba (Trash)"
        }
        if (combined.contains("edit") || combined.contains("pencil") || combined.contains("crop") || combined.contains("modify")) {
            return "Photo sudharne ka button (Edit / Pencil)"
        }
        if (combined.contains("favorite") || combined.contains("favourite") || combined.contains("star") || combined.contains("like")) {
            return "Pasand karne ka button (Favorite / Star)"
        }
        if (combined.contains("download") || combined.contains("save")) {
            return "Phone me save karne ka button (Download)"
        }
        if (combined.contains("rotate") || combined.contains("turn")) {
            return "Photo ghumane ka button (Rotate)"
        }
        if (combined.contains("info") || combined.contains("details") || combined.contains("properties")) {
            return "Photo ya file ki jaankari dekhne ka button (Info)"
        }

        // 9. SYSTEM SETTINGS & QUICK CONTROLS
        if (combined.contains("wifi") || combined.contains("wi-fi") || combined.contains("wlan")) {
            return "Wi-Fi internet ka button"
        }
        if (combined.contains("bluetooth")) {
            return "Bluetooth jodne ka button"
        }
        if (combined.contains("airplane") || combined.contains("flight mode")) {
            return "Flight / Airplane mode ka button"
        }
        if (combined.contains("hotspot") || combined.contains("tethering")) {
            return "Mobile Hotspot ka button"
        }
        if (combined.contains("location") || combined.contains("gps")) {
            return "Location / GPS chalu karne ka button"
        }
        if (combined.contains("auto-rotate") || combined.contains("screen orientation")) {
            return "Screen ghumane (Auto-Rotate) ka button"
        }
        if (combined.contains("brightness")) {
            return "Screen ki roshni (Brightness) ka slider"
        }
        if (combined.contains("battery") || combined.contains("power saver")) {
            return "Battery / Power saver ka button"
        }

        // 10. SECURITY, KEYBOARD & INPUT HELPERS
        if (combined.contains("password visibility") || combined.contains("show password") || combined.contains("hide password") || combined.contains("eye")) {
            return "Password dekhne ya chupane ka button (Eye Icon)"
        }
        if (combined.contains("backspace") || combined.contains("delete char")) {
            return "Akshar mitane ka button (Backspace)"
        }
        if (combined.contains("copy") || combined.contains("clipboard")) {
            return "Copy karne ka button"
        }
        if (combined.contains("paste")) {
            return "Paste / Chipkane ka button"
        }

        // Fallback: If text or description exists and has meaningful words
        if (!text.isNullOrBlank() && text.length > 1) {
            return text
        }
        if (!desc.isNullOrBlank() && desc.length > 1) {
            return desc
        }
        if (viewId.isNotBlank() && viewId.length > 2) {
            return viewId.replace('_', ' ')
        }

        return null
    }

    private fun broadcastVisualCue(rect: android.graphics.Rect) {
        val intent = Intent(ACTION_SHOW_VISUAL_CUE).apply {
            putExtra(EXTRA_BOUNDS_LEFT, rect.left)
            putExtra(EXTRA_BOUNDS_TOP, rect.top)
            putExtra(EXTRA_BOUNDS_RIGHT, rect.right)
            putExtra(EXTRA_BOUNDS_BOTTOM, rect.bottom)
            setPackage(packageName)
        }
        sendBroadcast(intent)
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
        // Cancel all coroutines to prevent memory leaks and dangling network requests
        serviceScope.coroutineContext[kotlinx.coroutines.Job]?.cancel()
        try {
            unregisterReceiver(screenExtractReceiver)
        } catch (e: Exception) {
            Log.e(TAG, "Receiver not registered")
        }
        Log.i(TAG, "SaralGati Accessibility Service destroyed.")
    }
}
