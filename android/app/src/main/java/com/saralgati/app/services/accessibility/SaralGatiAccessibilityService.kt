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
import android.content.BroadcastReceiver
import android.content.Context
import android.content.IntentFilter
import android.os.Build
import com.saralgati.app.data.local.AppStrings
import com.saralgati.app.data.model.ScreenContextRequest
import com.saralgati.app.services.fraud.OfflineFraudSentinel
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
    private var lastFraudScanPackage: String? = null
    private var lastFraudSignature: String? = null
    private var fraudScanInFlight = false

    // Active fraud tracking:
    // Once warned on a screen, it is spoken ONCE and never re-spoken on content changes
    // or periodic cooldowns. If the user leaves the screen/app or locks the phone,
    // the warning and speech are immediately dismissed.
    private var activeFraudPackage: String? = null
    private var activeFraudWindow: String? = null
    private var currentActivityName: String? = null
    private var hasSpokenForActiveFraud = false
    private var lastFraudWarnedAt = 0L

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
        private const val FRAUD_SCAN_MIN_INTERVAL_MS = 900L // min gap between verdict requests for the same app
        private const val FRAUD_SCAN_MAX_ELEMENTS = 300 // matches the API's per-request element cap
        private const val FRAUD_WARNING_COOLDOWN_MS = 15000L // never re-speak a warning inside this window

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

        /** The connected service, so SaralGati's own UI can hand back state that
         *  belongs to whatever app the elder just left. */
        @Volatile
        private var instance: SaralGatiAccessibilityService? = null

        /**
         * Called when SaralGati's own UI reaches the foreground.
         *
         * A warning card describes the trap screen it was raised for, and its
         * "safe exit" spotlight points at elements of *that* screen, so over our
         * own guidance and language picker it is meaningless. Our own screens are
         * never scanned (they are not a trap), so nothing ever judged them safe
         * and the card used to sit on top of them until the elder closed it by
         * hand - which is how a scam warning ended up on the language screen.
         */
        fun onCompanionUiShown() {
            instance?.clearFraudWarningForOwnUi()
        }
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

    private val screenStateReceiver = object : BroadcastReceiver() {
        override fun onReceive(context: Context?, intent: Intent?) {
            when (intent?.action) {
                Intent.ACTION_SCREEN_OFF -> {
                    // Phone is asleep: clear active fraud state, stop any speech and
                    // take the warning card down so nothing is spoken while display is off.
                    Log.i(TAG, "Screen off / phone in sleep: dismissing fraud warning")
                    clearFraudWarning()
                }

                Intent.ACTION_SCREEN_ON -> {
                    // Re-evaluate whatever is on screen when the elder wakes up.
                    lastFraudSignature = null
                    lastFraudScanAt = 0L
                }
            }
        }
    }

    override fun onCreate() {
        super.onCreate()
        localPrefs = LocalPrefs(applicationContext)
    }

    override fun onServiceConnected() {
        super.onServiceConnected()
        isServiceRunning = true
        instance = this
        if (!::localPrefs.isInitialized) {
            localPrefs = LocalPrefs(applicationContext)
        }
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

        val screenFilter = IntentFilter().apply {
            addAction(Intent.ACTION_SCREEN_OFF)
            addAction(Intent.ACTION_SCREEN_ON)
        }
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            registerReceiver(screenStateReceiver, screenFilter, Context.RECEIVER_EXPORTED)
        } else {
            registerReceiver(screenStateReceiver, screenFilter)
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

                if (isActualActivity(cls, pkg)) {
                    currentActivityName = cls
                }

                // If user genuinely leaves the screen/app where fraud was detected, dismiss immediately.
                // Do NOT dismiss for SaralGati's own overlay, System UI, keyboard, or view/scroll events!
                if (activeFraudPackage != null) {
                    val isOwnApp = pkg == packageName
                    val isSystemUi = pkg == "com.android.systemui" || pkg.contains("inputmethod")
                    val packageChanged = pkg.isNotEmpty() && !isOwnApp && !isSystemUi && pkg != activeFraudPackage
                    val activityChanged = isActualActivity(cls, pkg) && activeFraudWindow != null && cls != activeFraudWindow

                    if (packageChanged || (pkg == activeFraudPackage && activityChanged)) {
                        Log.i(
                            TAG,
                            "User switched away from fraud screen ($activeFraudPackage/$activeFraudWindow -> $pkg/$cls): dismissing warning"
                        )
                        clearFraudWarning()
                    }
                }

                scanScreenForFraud(pkg, currentActivityName ?: cls)
                handleWindowStateChanged(pkg, cls)
            }

            AccessibilityEvent.TYPE_WINDOW_CONTENT_CHANGED -> {
                if (!isScreenInteractive()) return
                val pkg = event.packageName?.toString() ?: ""
                // If this package is already actively showing fraud warning and has already spoken,
                // do not re-scan or re-trigger speech on content changes (e.g. scrolling).
                // The warning card remains visible and stable while scrolling!
                if (pkg.isNotEmpty() && pkg == activeFraudPackage && hasSpokenForActiveFraud) {
                    return
                }
                scanScreenForFraud(pkg, currentActivityName)
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
                    val foundIdx =
                        activeElementBounds.indexOfFirst { android.graphics.Rect.intersects(clickedRect, it) }
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
                        Log.d(
                            TAG,
                            "Sent implicit feedback: $feedbackType (actualIndex: $actualIndex) for interaction: $interactionId"
                        )

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
            (recentClickTimes.last() - recentClickTimes.first()) < RAGE_TAP_TIME_WINDOW_MS
        ) {
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
    private fun scanScreenForFraud(pkg: String, cls: String? = null) {
        if (pkg.isEmpty() || pkg == packageName) return
        if (!localPrefs.isPaired()) return
        // Never scan or speak while the phone is asleep / the display is off.
        if (!isScreenInteractive()) return
        if (fraudScanInFlight) return
        // Once warned on a screen, do not keep re-scanning or re-speaking while still on it.
        if (pkg == activeFraudPackage && hasSpokenForActiveFraud) return

        val now = System.currentTimeMillis()
        val sameApp = pkg == lastFraudScanPackage
        if (sameApp && now - lastFraudScanAt < FRAUD_SCAN_MIN_INTERVAL_MS) return
        lastFraudScanAt = now
        lastFraudScanPackage = pkg
        serviceScope.launch { runFraudScan(pkg, cls) }
    }

    private suspend fun runFraudScan(pkg: String, cls: String?) {
        fraudScanInFlight = true
        try {
            if (!isScreenInteractive()) return
            val rootNode = rootInActiveWindow ?: return
            val elements = mutableListOf<String>()
            val elementBounds = mutableListOf<android.graphics.Rect>()
            if (rootNode.packageName?.toString() == pkg) {
                traverseNode(rootNode, elements, elementBounds, relaxedForFraud = true)
            }
            rootNode.recycle()
            if (elements.isEmpty()) return
            if (!isScreenInteractive()) return

            val scanElements = elements.take(FRAUD_SCAN_MAX_ELEMENTS)
            val scanBounds = elementBounds.take(FRAUD_SCAN_MAX_ELEMENTS)

            // 1. Instant, network-free check first: the elder is warned the moment
            // the scam appears, even with no data or a server cold start.
            val isEn = localPrefs.getGuidanceLang() == "en"
            val offline = OfflineFraudSentinel.analyze(this, scanElements)
            if (offline != null) {
                val safeBounds = OfflineFraudSentinel.findSafeActionIndex(scanElements)
                    ?.let { scanBounds.getOrNull(it) }
                // Each alert is rendered in one language only: message, title and
                // advice all come from the same locale.
                warnAboutFraud(
                    pkg,
                    cls,
                    offline.level,
                    offline.category,
                    if (isEn) offline.titleEn else offline.title,
                    if (isEn) offline.messageEn else offline.messageHi,
                    if (isEn) offline.safeAdvice else offline.safeAdviceHi,
                    safeBounds
                )
            }

            // 2. The server stays authoritative (and captures the flywheel case).
            // Identical text cannot produce a different verdict, and recording the
            // signature keeps a flaky network from retrying the same screen.
            val signature = scanElements.joinToString("|").hashCode().toString()
            if (signature == lastFraudSignature) return

            val response = NetworkModule.agentApi.checkFraud(FraudCheckRequest(pkg, scanElements))
            if (!response.isSuccessful) return
            if (!isScreenInteractive()) return
            val verdict = response.body() ?: return
            lastFraudSignature = signature

            if (!verdict.isDangerous) {
                return
            }

            val safeBounds = verdict.actionDecision.safeActionIndex?.let { scanBounds.getOrNull(it) }
            val alertTitle = if (isEn) {
                verdict.userAlert.titleEn ?: "Warning: Potential Scam"
            } else {
                verdict.userAlert.title
            }
            val alertMsg = if (isEn) verdict.userAlert.messageEn else verdict.userAlert.messageHi
            val alertAdvice = if (isEn) {
                verdict.actionDecision.safeAdvice
            } else {
                verdict.actionDecision.safeAdviceHi ?: verdict.actionDecision.safeAdvice
            }
            warnAboutFraud(
                pkg,
                cls,
                verdict.threatLevel,
                verdict.threatCategory,
                alertTitle,
                alertMsg,
                alertAdvice,
                safeBounds
            )
        } catch (e: Exception) {
            Log.e(TAG, "Fraud scan failed: ${e.message}")
        } finally {
            fraudScanInFlight = false
        }
    }

    /**
     * Take down a warning that belonged to a screen/app the elder has left,
     * stop speech, and clear state so returning to a scam screens again.
     */
    private fun clearFraudWarning() {
        lastFraudSignature = null
        lastFraudScanPackage = null
        val hadWarning = activeFraudPackage != null
        activeFraudPackage = null
        activeFraudWindow = null
        hasSpokenForActiveFraud = false
        if (hadWarning) {
            dismissFraudWarning()
            Log.i(TAG, "Fraud warning dismissed and state cleared")
        }
    }

    private fun clearFraudWarningForOwnUi() {
        clearFraudWarning()
        Log.i(TAG, "Own UI in the foreground: took down the fraud warning card")
    }

    /**
     * True while `pkg` is genuinely the active screen in the foreground.
     * When display is off, returns false to prevent hovering during background sleep.
     * If rootInActiveWindow is temporarily null (during layout passes or overlay display),
     * returns true rather than failing into silence.
     */
    private fun isPackageInForeground(pkg: String): Boolean {
        if (!isScreenInteractive()) return false
        val root = rootInActiveWindow ?: return true
        val current = root.packageName?.toString()
        root.recycle()
        return current == null || current == pkg || current == packageName || current == "com.android.systemui"
    }

    private fun dismissFraudWarning() {
        val intent = Intent(this, com.saralgati.app.services.overlay.FloatingHelperService::class.java).apply {
            action = com.saralgati.app.services.overlay.FloatingHelperService.ACTION_DISMISS_FRAUD_WARNING
        }
        try {
            startService(intent)
        } catch (e: Exception) {
            Log.e(TAG, "Failed to dismiss fraud warning overlay: ${e.message}")
        }
    }

    private fun isScreenInteractive(): Boolean {
        val powerManager = getSystemService(Context.POWER_SERVICE) as? android.os.PowerManager ?: return true
        return powerManager.isInteractive
    }

    /**
     * Say one warning per trap screen. Once spoken, it does NOT re-speak in a loop
     * or on periodic cooldowns. If the elder leaves or sleeps, it is silenced.
     */
    private fun warnAboutFraud(
        pkg: String,
        cls: String?,
        level: String,
        category: String,
        title: String,
        message: String,
        advice: String,
        safeBounds: android.graphics.Rect?,
    ) {
        if (!isScreenInteractive()) return
        if (pkg == activeFraudPackage && hasSpokenForActiveFraud) return
        if (!isPackageInForeground(pkg)) return

        Log.w(TAG, "Fraud sentinel: $level/$category on $pkg ($cls)")
        activeFraudPackage = pkg
        activeFraudWindow = if (isActualActivity(cls ?: "", pkg)) cls else currentActivityName
        hasSpokenForActiveFraud = true
        lastFraudWarnedAt = System.currentTimeMillis()
        warnElderAboutFraud(title, message, advice, safeBounds)
    }

    private fun warnElderAboutFraud(
        title: String,
        message: String,
        advice: String,
        safeBounds: android.graphics.Rect?
    ) {
        val intent = Intent(this, com.saralgati.app.services.overlay.FloatingHelperService::class.java).apply {
            action = com.saralgati.app.services.overlay.FloatingHelperService.ACTION_SHOW_FRAUD_WARNING
            putExtra(com.saralgati.app.services.overlay.FloatingHelperService.EXTRA_FRAUD_TITLE, title)
            putExtra(com.saralgati.app.services.overlay.FloatingHelperService.EXTRA_FRAUD_MESSAGE, message)
            putExtra(com.saralgati.app.services.overlay.FloatingHelperService.EXTRA_FRAUD_ADVICE, advice)
        }
        try {
            startService(intent)
        } catch (e: Exception) {
            Log.e(TAG, "Failed to start fraud warning overlay: ${e.message}")
        }

        // Point the spotlight at the button that gets the elder out of the trap.
        if (safeBounds != null) broadcastVisualCue(safeBounds)
    }

    private fun triggerRageTapAlert(pkgName: String, viewId: String) {
        val elderId = localPrefs.getElderId() ?: return

        // Trigger the on-screen helper to pop up and ask if they need help
        val intent = Intent(this, com.saralgati.app.services.overlay.FloatingHelperService::class.java).apply {
            action = com.saralgati.app.services.overlay.FloatingHelperService.ACTION_SHOW_RAGE_TAP
        }
        try {
            startService(intent)
        } catch (e: Exception) {
            Log.e(TAG, "Failed to start rage tap overlay: ${e.message}")
        }

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

            val curLang = localPrefs.getAppLanguage()
            val isEn = localPrefs.getGuidanceLang() == "en"
            val rootNode = rootInActiveWindow
            if (rootNode == null) {
                Log.e(TAG, "extractAndExplainScreen: rootInActiveWindow is null")
                broadcastExplanation(AppStrings.cannotReadScreen(curLang))
                return@launch
            }

            val elements = mutableListOf<String>()
            val elementBounds = mutableListOf<android.graphics.Rect>()
            val belowFoldFlags = mutableListOf<Boolean>()
            val appPackage = rootNode.packageName?.toString() ?: "unknown"

            extractFullWindowElements(rootNode, appPackage, elements, elementBounds, belowFoldFlags)
            Log.i(TAG, "Extracted ${elements.size} elements (below-fold included) from $appPackage")

            try {
                val request = ScreenContextRequest(appPackage, elements, localPrefs.getGuidanceLang())
                val response = NetworkModule.agentApi.explainScreen(request)
                if (response.isSuccessful && response.body()?.success == true) {
                    val data = response.body()?.data
                    val explanation = data?.explanation
                        ?: if (isEn) "I cannot understand this screen right now." else "मुझे समझ नहीं आया कि यह स्क्रीन क्या है।"
                    broadcastExplanation(explanation)
                    val highlightIndex = data?.highlightIndex
                    if (highlightIndex != null && highlightIndex in elementBounds.indices) {
                        broadcastVisualCue(elementBounds[highlightIndex])
                    }
                } else {
                    broadcastExplanation(if (isEn) "Could not connect to the server." else "सर्वर से संपर्क नहीं हो पाया।")
                }
            } catch (e: Exception) {
                Log.e(TAG, "Failed to explain screen: ${e.message}")
                broadcastExplanation(if (isEn) "Network connection error." else "नेटवर्क में दिक्कत है।")
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

            val curLang = localPrefs.getAppLanguage()
            val isEn = localPrefs.getGuidanceLang() == "en"
            val rootNode = rootInActiveWindow
            if (rootNode == null) {
                Log.e(TAG, "extractAndAskScreen: rootInActiveWindow is null")
                broadcastExplanation(AppStrings.cannotReadScreen(curLang))
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
                val request = com.saralgati.app.data.model.AskContextRequest(
                    appPackage,
                    elements,
                    question,
                    conversationHistory.toList(),
                    localPrefs.getGuidanceLang()
                )
                val response = NetworkModule.agentApi.askQuestion(request)
                if (response.isSuccessful && response.body()?.success == true) {
                    val data = response.body()?.data
                    val explanation = data?.explanation
                        ?: if (isEn) "I could not find an answer for this question." else "मुझे इस सवाल का जवाब नहीं मिला।"
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
                    broadcastExplanation(if (isEn) "Could not connect to the server." else "सर्वर से संपर्क नहीं हो पाया।")
                }
            } catch (e: Exception) {
                Log.e(TAG, "Failed to ask question: ${e.message}")
                broadcastExplanation(if (isEn) "Network connection error." else "नेटवर्क में दिक्कत है।")
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
        instance = null
        // Cancel all coroutines to prevent memory leaks and dangling network requests
        serviceScope.coroutineContext[kotlinx.coroutines.Job]?.cancel()
        try {
            unregisterReceiver(screenExtractReceiver)
        } catch (e: Exception) {
            Log.e(TAG, "Receiver not registered")
        }
        try {
            unregisterReceiver(screenStateReceiver)
        } catch (e: Exception) {
            Log.e(TAG, "Screen state receiver not registered")
        }
        Log.i(TAG, "SaralGati Accessibility Service destroyed.")
    }
}
