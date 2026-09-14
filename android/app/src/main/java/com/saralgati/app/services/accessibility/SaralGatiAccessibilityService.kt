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
            traverseNode(rootNode, elements, elementBounds)
            
            val appPackage = rootNode.packageName?.toString() ?: "unknown"
            Log.i(TAG, "Extracted ${elements.size} elements from $appPackage")
        
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
            traverseNode(rootNode, elements, elementBounds)
            
            val appPackage = rootNode.packageName?.toString() ?: "unknown"
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
                        broadcastVisualCue(elementBounds[highlightIndex])
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
        val intent = Intent("com.saralgati.app.ACTION_CLEAR_VISUAL_CUE").apply {
            setPackage(packageName)
        }
        sendBroadcast(intent)
    }

    private fun traverseNode(
        node: AccessibilityNodeInfo,
        elements: MutableList<String>,
        elementBounds: MutableList<android.graphics.Rect>
    ) {
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
            val isReasonableButtonSize = (w in 24..900) && (h in 24..500)
            
            // Prefer clickable nodes or leaf nodes to prevent selecting massive layout parents
            val isInteractiveOrLeaf = node.isClickable || node.childCount == 0
            
            if (isReasonableButtonSize && isInteractiveOrLeaf) {
                elements.add(label.trim())
                elementBounds.add(rect)
            }
        }

        for (i in 0 until node.childCount) {
            node.getChild(i)?.let {
                traverseNode(it, elements, elementBounds)
                it.recycle()
            }
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
        val text = if (rawText != null && rawText.length == 1 && (rawText == "0" || !rawText[0].isLetterOrDigit())) null else rawText
        val desc = if (rawDesc != null && rawDesc.length == 1 && (rawDesc == "0" || !rawDesc[0].isLetterOrDigit())) null else rawDesc

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
        try {
            unregisterReceiver(screenExtractReceiver)
        } catch (e: Exception) {
            Log.e(TAG, "Receiver not registered")
        }
        Log.i(TAG, "SaralGati Accessibility Service destroyed.")
    }
}
