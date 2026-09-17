package com.saralgati.app.services.overlay

import android.app.Service
import android.content.Context
import android.content.Intent
import android.graphics.Color
import android.graphics.PixelFormat
import android.graphics.drawable.GradientDrawable
import android.os.Build
import android.os.IBinder
import android.speech.tts.TextToSpeech
import android.util.Log
import android.view.Gravity
import android.view.MotionEvent
import android.view.View
import android.view.ViewGroup
import android.view.WindowManager
import android.widget.Button
import android.widget.FrameLayout
import android.widget.ImageView
import android.widget.LinearLayout
import android.widget.TextView
import com.saralgati.app.data.local.LocalPrefs
import android.content.BroadcastReceiver
import android.content.IntentFilter
import java.util.Locale

class FloatingHelperService : Service(), TextToSpeech.OnInitListener {

    private lateinit var windowManager: WindowManager
    private lateinit var bubbleView: View
    private lateinit var expandedView: View
    
    private var paramsBubble: WindowManager.LayoutParams? = null
    private var paramsExpanded: WindowManager.LayoutParams? = null
    
    private var isExpanded = false
    private lateinit var tts: TextToSpeech
    private var speechRecognizer: android.speech.SpeechRecognizer? = null
    private lateinit var localPrefs: LocalPrefs

    companion object {
        const val ACTION_SHOW_RAGE_TAP = "com.saralgati.app.ACTION_SHOW_RAGE_TAP"
        private const val TAG = "FloatingHelper"
        var isRunning = false
            private set
    }

    private var activeHighlightView: View? = null
    private val highlightHandler = android.os.Handler(android.os.Looper.getMainLooper())
    private var removeHighlightRunnable: Runnable? = null

    private val explanationReceiver = object : BroadcastReceiver() {
        override fun onReceive(context: Context?, intent: Intent?) {
            val action = intent?.action
            if (action == com.saralgati.app.services.accessibility.SaralGatiAccessibilityService.ACTION_SPEAK_EXPLANATION ||
                action == "com.saralgati.app.ACTION_SPEAK_EXPLANATION") {
                val text = intent.getStringExtra(com.saralgati.app.services.accessibility.SaralGatiAccessibilityService.EXTRA_EXPLANATION_TEXT)
                    ?: intent.getStringExtra("explanation_text")
                if (!text.isNullOrEmpty()) {
                    speak(text, true)
                    
                    // Reset title if it was loading
                    val titleView = expandedView.findViewWithTag<TextView>("titleView")
                    if (titleView?.text == "सोच रहा है...") {
                        titleView.text = "सरलगति सहायक"
                    }
                }
            } else if (action == com.saralgati.app.services.accessibility.SaralGatiAccessibilityService.ACTION_SHOW_VISUAL_CUE ||
                       action == "com.saralgati.app.ACTION_SHOW_VISUAL_CUE") {
                val left = intent.getIntExtra("bounds_left", 0)
                val top = intent.getIntExtra("bounds_top", 0)
                val right = intent.getIntExtra("bounds_right", 0)
                val bottom = intent.getIntExtra("bounds_bottom", 0)
                showVisualCue(left, top, right, bottom)
            } else if (action == "com.saralgati.app.ACTION_CLEAR_VISUAL_CUE") {
                highlightHandler.post { removeCurrentHighlight() }
            }
        }
    }

    override fun onCreate() {
        super.onCreate()
        isRunning = true
        localPrefs = LocalPrefs(applicationContext)
        windowManager = getSystemService(Context.WINDOW_SERVICE) as WindowManager
        tts = TextToSpeech(this, this)
        
        val filter = IntentFilter().apply {
            addAction("com.saralgati.app.ACTION_SPEAK_EXPLANATION")
            addAction("com.saralgati.app.ACTION_SHOW_VISUAL_CUE")
            addAction("com.saralgati.app.ACTION_CLEAR_VISUAL_CUE")
        }
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            registerReceiver(explanationReceiver, filter, Context.RECEIVER_NOT_EXPORTED)
        } else {
            registerReceiver(explanationReceiver, filter)
        }
        
        createBubbleView()
        createExpandedView()
        
        windowManager.addView(bubbleView, paramsBubble)
        Log.i(TAG, "Floating Helper Service started")
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        if (intent?.action == ACTION_SHOW_RAGE_TAP) {
            expandHelper(
                title = "क्या आपको यहाँ कुछ सहायता चाहिए?",
                speakMsg = "ऐसा लगता है कि आपको यहाँ कुछ परेशानी हो रही है। क्या मैं मदद करूँ?"
            )
        }
        return START_STICKY
    }

    override fun onInit(status: Int) {
        if (status == TextToSpeech.SUCCESS) {
            val langPref = localPrefs.getString("pref_lang", "hi")
            val locale = if (langPref == "en") Locale.ENGLISH else Locale("hi", "IN")
            val result = tts.setLanguage(locale)
            if (result == TextToSpeech.LANG_MISSING_DATA || result == TextToSpeech.LANG_NOT_SUPPORTED) {
                Log.e(TAG, "TTS Language not supported")
            }
            
            tts.setOnUtteranceProgressListener(object : android.speech.tts.UtteranceProgressListener() {
                override fun onStart(utteranceId: String?) {}
                override fun onDone(utteranceId: String?) {
                    if (utteranceId == "explanation_done") {
                        // Gently start silent microphone listener after explanation
                        android.os.Handler(android.os.Looper.getMainLooper()).post {
                            startListeningSilent()
                        }
                    }
                }
                override fun onError(utteranceId: String?) {}
            })
        }
    }

    private fun speak(text: String, isExplanation: Boolean = false) {
        val voiceEnabled = localPrefs.getBoolean("pref_voice", true)
        if (voiceEnabled) {
            val utteranceId = if (isExplanation) "explanation_done" else "standard_msg"
            tts.speak(text, TextToSpeech.QUEUE_FLUSH, null, utteranceId)
        }
    }

    private fun startListeningSilent() {
        if (speechRecognizer == null) {
            speechRecognizer = android.speech.SpeechRecognizer.createSpeechRecognizer(this)
            speechRecognizer?.setRecognitionListener(object : android.speech.RecognitionListener {
                override fun onReadyForSpeech(params: android.os.Bundle?) {
                    // Turn floating bubble red to indicate recording
                    resetBubbleColor(android.graphics.Color.RED)
                }
                override fun onBeginningOfSpeech() {}
                override fun onRmsChanged(rmsdB: Float) {}
                override fun onBufferReceived(buffer: ByteArray?) {}
                override fun onEndOfSpeech() {
                    resetBubbleColor(android.graphics.Color.parseColor("#0074c8"))
                }
                override fun onError(error: Int) {
                    resetBubbleColor(android.graphics.Color.parseColor("#0074c8"))
                }
                override fun onResults(results: android.os.Bundle?) {
                    resetBubbleColor(android.graphics.Color.parseColor("#0074c8"))
                    val matches = results?.getStringArrayList(android.speech.SpeechRecognizer.RESULTS_RECOGNITION)
                    val text: String? = matches?.firstOrNull()
                    if (text != null && text.isNotEmpty()) {
                        val extractIntent = Intent("com.saralgati.app.ACTION_EXTRACT_AND_ASK").apply {
                            setPackage(packageName)
                            putExtra("question", text)
                        }
                        sendBroadcast(extractIntent)
                    }
                }
                override fun onPartialResults(partialResults: android.os.Bundle?) {}
                override fun onEvent(eventType: Int, params: android.os.Bundle?) {}
            })
        }
        
        val intent = Intent(android.speech.RecognizerIntent.ACTION_RECOGNIZE_SPEECH).apply {
            putExtra(android.speech.RecognizerIntent.EXTRA_LANGUAGE_MODEL, android.speech.RecognizerIntent.LANGUAGE_MODEL_FREE_FORM)
            putExtra(android.speech.RecognizerIntent.EXTRA_LANGUAGE, "hi-IN")
        }
        speechRecognizer?.startListening(intent)
    }

    private fun resetBubbleColor(color: Int) {
        val vg = bubbleView as? android.view.ViewGroup
        val icon = vg?.getChildAt(0) as? ImageView
        val bg = icon?.background as? android.graphics.drawable.GradientDrawable
        bg?.setColor(color)
    }

    private fun createBubbleView() {
        // A simple circular button layout programmatically
        val layout = FrameLayout(this)
        val icon = ImageView(this)
        icon.setImageResource(android.R.drawable.ic_menu_help) // Fallback Android icon
        icon.setColorFilter(Color.WHITE)
        
        val background = GradientDrawable()
        background.shape = GradientDrawable.OVAL
        background.setColor(Color.parseColor("#0074c8")) // Primary blue
        icon.background = background
        
        val p = FrameLayout.LayoutParams(140, 140)
        p.gravity = Gravity.CENTER
        layout.addView(icon, p)

        val overlayType = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY
        } else {
            WindowManager.LayoutParams.TYPE_PHONE
        }

        paramsBubble = WindowManager.LayoutParams(
            WindowManager.LayoutParams.WRAP_CONTENT,
            WindowManager.LayoutParams.WRAP_CONTENT,
            overlayType,
            WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE,
            PixelFormat.TRANSLUCENT
        )
        paramsBubble?.gravity = Gravity.TOP or Gravity.START
        paramsBubble?.x = 0
        paramsBubble?.y = 100

        bubbleView = layout

        setupDrag(bubbleView, paramsBubble!!) {
            // On click
            expandHelper(
                title = "सरलगति सहायक",
                speakMsg = "नमस्ते, मैं आपकी कैसे मदद कर सकता हूँ?"
            )
        }
    }

    private fun createExpandedView() {
        val density = resources.displayMetrics.density
        val dp = { value: Int -> (value * density).toInt() }

        val rootLayout = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(dp(16), dp(12), dp(16), dp(16))
            
            val bgDrawable = GradientDrawable().apply {
                setColor(Color.WHITE)
                cornerRadius = dp(24).toFloat()
                setStroke(dp(1), Color.parseColor("#E2E8F0"))
            }
            background = bgDrawable
            elevation = dp(12).toFloat()
        }

        // Header: Title + Sleek Close '✕' Icon
        val headerRow = LinearLayout(this).apply {
            orientation = LinearLayout.HORIZONTAL
            gravity = Gravity.CENTER_VERTICAL
            layoutParams = LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT,
                LinearLayout.LayoutParams.WRAP_CONTENT
            ).apply {
                bottomMargin = dp(10)
            }
        }

        val titleText = TextView(this).apply {
            text = "सरलगति सहायक"
            textSize = 16f
            typeface = android.graphics.Typeface.DEFAULT_BOLD
            setTextColor(Color.parseColor("#0F172A"))
            tag = "titleView"
            layoutParams = LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.WRAP_CONTENT, 1f)
        }
        headerRow.addView(titleText)

        val btnCloseIcon = TextView(this).apply {
            text = "✕"
            textSize = 16f
            gravity = Gravity.CENTER
            setTextColor(Color.parseColor("#64748B"))
            val closeBg = GradientDrawable().apply {
                shape = GradientDrawable.OVAL
                setColor(Color.parseColor("#F1F5F9"))
            }
            background = closeBg
            layoutParams = LinearLayout.LayoutParams(dp(28), dp(28))
            setOnClickListener {
                collapseHelper()
            }
        }
        headerRow.addView(btnCloseIcon)
        rootLayout.addView(headerRow)

        // Action Buttons Row (Side-by-side for ultra-compact vertical footprint)
        val actionsRow = LinearLayout(this).apply {
            orientation = LinearLayout.HORIZONTAL
            layoutParams = LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT,
                LinearLayout.LayoutParams.WRAP_CONTENT
            )
        }

        // Button 1: Explain Screen
        val btnExplain = Button(this).apply {
            text = "🔍 स्क्रीन समझाइए\n(Explain Screen)"
            textSize = 12f
            setTextColor(Color.WHITE)
            isAllCaps = false
            val bg = GradientDrawable().apply {
                cornerRadius = dp(14).toFloat()
                setColor(Color.parseColor("#0284C7")) // Calm Sky Blue
            }
            background = bg
            layoutParams = LinearLayout.LayoutParams(0, dp(50), 1f).apply {
                marginEnd = dp(6)
            }
            setOnClickListener {
                speak("एक सेकंड रुकिए, मैं देख रहा हूँ...")
                collapseHelper()
                val extractIntent = Intent("com.saralgati.app.ACTION_EXTRACT_SCREEN").apply {
                    setPackage(packageName)
                }
                sendBroadcast(extractIntent)
            }
        }
        actionsRow.addView(btnExplain)

        // Button 2: Ask a Question
        val btnNext = Button(this).apply {
            text = "🎙️ सवाल पूछें\n(Ask a Question)"
            textSize = 12f
            setTextColor(Color.WHITE)
            isAllCaps = false
            val bg = GradientDrawable().apply {
                cornerRadius = dp(14).toFloat()
                setColor(Color.parseColor("#16A34A")) // Emerald Green
            }
            background = bg
            layoutParams = LinearLayout.LayoutParams(0, dp(50), 1f).apply {
                marginStart = dp(6)
            }
            setOnClickListener {
                collapseHelper()
                android.os.Handler(android.os.Looper.getMainLooper()).post {
                    startListeningSilent()
                }
            }
        }
        actionsRow.addView(btnNext)
        rootLayout.addView(actionsRow)

        val overlayType = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY
        } else {
            WindowManager.LayoutParams.TYPE_PHONE
        }

        val screenWidth = resources.displayMetrics.widthPixels
        val horizontalMargin = dp(16)

        paramsExpanded = WindowManager.LayoutParams(
            screenWidth - (horizontalMargin * 2),
            WindowManager.LayoutParams.WRAP_CONTENT,
            overlayType,
            WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE,
            PixelFormat.TRANSLUCENT
        ).apply {
            gravity = Gravity.BOTTOM or Gravity.CENTER_HORIZONTAL
            y = dp(24) // Float 24dp above system navigation bar
        }

        expandedView = rootLayout
    }

    private fun expandHelper(title: String, speakMsg: String) {
        if (!isExpanded) {
            val titleView = expandedView.findViewWithTag<TextView>("titleView")
            titleView?.text = title
            
            windowManager.removeView(bubbleView)
            windowManager.addView(expandedView, paramsExpanded)
            isExpanded = true
            speak(speakMsg)
        }
    }

    private fun collapseHelper() {
        if (isExpanded) {
            windowManager.removeView(expandedView)
            windowManager.addView(bubbleView, paramsBubble)
            isExpanded = false
            tts.stop()
        }
    }

    private fun setupDrag(view: View, params: WindowManager.LayoutParams, onClick: () -> Unit) {
        var initialX: Int = 0
        var initialY: Int = 0
        var initialTouchX: Float = 0f
        var initialTouchY: Float = 0f
        var isClick = false

        view.setOnTouchListener { _, event ->
            when (event.action) {
                MotionEvent.ACTION_DOWN -> {
                    initialX = params.x
                    initialY = params.y
                    initialTouchX = event.rawX
                    initialTouchY = event.rawY
                    isClick = true
                    true
                }
                MotionEvent.ACTION_MOVE -> {
                    val dx = event.rawX - initialTouchX
                    val dy = event.rawY - initialTouchY
                    if (Math.abs(dx) > 10 || Math.abs(dy) > 10) {
                        isClick = false
                    }
                    params.x = initialX + dx.toInt()
                    params.y = initialY + dy.toInt()
                    windowManager.updateViewLayout(view, params)
                    true
                }
                MotionEvent.ACTION_UP -> {
                    if (isClick) {
                        onClick()
                    }
                    true
                }
                else -> false
            }
        }
    }

    private fun showVisualCue(left: Int, top: Int, right: Int, bottom: Int) {
        val width = right - left
        val height = bottom - top
        if (width <= 0 || height <= 0) return

        highlightHandler.post {
            removeCurrentHighlight()

            val overlayType = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY
            } else {
                WindowManager.LayoutParams.TYPE_PHONE
            }

            val highlightView = View(this).apply {
                val strokeColor = Color.parseColor("#10B981") // Vibrant Emerald Green
                val bg = GradientDrawable().apply {
                    shape = GradientDrawable.RECTANGLE
                    cornerRadius = 16f
                    setStroke(8, strokeColor)
                    setColor(Color.parseColor("#3310B981")) // 20% transparent green tint
                }
                background = bg

                val anim = android.view.animation.AlphaAnimation(0.3f, 1.0f).apply {
                    duration = 600
                    repeatMode = android.view.animation.Animation.REVERSE
                    repeatCount = android.view.animation.Animation.INFINITE
                }
                startAnimation(anim)
            }

            val params = WindowManager.LayoutParams(
                width,
                height,
                overlayType,
                WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE or
                WindowManager.LayoutParams.FLAG_NOT_TOUCHABLE or
                WindowManager.LayoutParams.FLAG_LAYOUT_IN_SCREEN or
                WindowManager.LayoutParams.FLAG_LAYOUT_NO_LIMITS,
                PixelFormat.TRANSLUCENT
            ).apply {
                gravity = Gravity.TOP or Gravity.START
                x = left
                y = top
            }

            try {
                windowManager.addView(highlightView, params)
                activeHighlightView = highlightView

                removeHighlightRunnable = Runnable {
                    removeCurrentHighlight()
                }
                highlightHandler.postDelayed(removeHighlightRunnable!!, 7000L)
            } catch (e: Exception) {
                Log.e(TAG, "Failed to show visual cue: ${e.message}")
            }
        }
    }

    private fun removeCurrentHighlight() {
        removeHighlightRunnable?.let { highlightHandler.removeCallbacks(it) }
        activeHighlightView?.let {
            it.clearAnimation()
            try {
                windowManager.removeView(it)
            } catch (e: Exception) {
                Log.e(TAG, "Error removing highlight view: ${e.message}")
            }
            activeHighlightView = null
        }
    }

    override fun onDestroy() {
        super.onDestroy()
        isRunning = false
        removeCurrentHighlight()
        if (isExpanded) {
            windowManager.removeView(expandedView)
        } else {
            if (this::bubbleView.isInitialized) {
                windowManager.removeView(bubbleView)
            }
        }
        if (this::tts.isInitialized) {
            tts.stop()
            tts.shutdown()
        }
        try {
            unregisterReceiver(explanationReceiver)
        } catch (e: Exception) {
            Log.e(TAG, "Receiver not registered")
        }
        Log.i(TAG, "Floating Helper Service destroyed")
    }

    override fun onBind(intent: Intent?): IBinder? = null
}
