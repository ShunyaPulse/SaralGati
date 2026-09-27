package com.saralgati.app.data.local

/**
 * Centralized, high-contrast localization strings for Hindi and English in SaralGati Android.
 *
 * Hindi strings use DAILY-USE Hinglish (e.g. "train" not "railgadi",
 * "school" not "vidyalaya"). They are intentionally informal and warm.
 */
object AppStrings {
    // -------------------------------------------------------------
    // Language Selection Screen — now handled inline in LanguageSelectScreen.kt
    // via LangOption data class. These stay for settings toggle label.
    // -------------------------------------------------------------
    fun switchLangLabel(lang: String): String =
        if (lang == "en") "🌐 Language: English" else "🌐 भाषा: हिंदी"

    fun continueBtn(lang: String): String =
        if (lang == "en") "Continue" else "आगे बढ़ें"

    // -------------------------------------------------------------
    // Dashboard & Protection Screen
    // -------------------------------------------------------------
    fun title(lang: String): String =
        if (lang == "en") "SaralGati Protection" else "सरलगति सुरक्षा"

    fun appConnected(lang: String): String =
        if (lang == "en") "✅ App is Connected" else "✅ ऐप कनेक्ट है"

    fun disconnect(lang: String): String =
        if (lang == "en") "Disconnect App" else "ऐप डिस्कनेक्ट करें"

    fun allProtectionActive(lang: String): String =
        if (lang == "en") "🛡️ All Protection is Active" else "🛡️ सारी सुरक्षा चालू है"

    fun onScreenHelper(lang: String): String =
        if (lang == "en") "On-Screen Helper" else "स्क्रीन हेल्पर"

    fun voiceGuidance(lang: String): String =
        if (lang == "en") "Voice Guidance (TTS)" else "बोलकर गाइड (TTS)"

    fun startHelperNow(lang: String): String =
        if (lang == "en") "🚀 Start Helper Now" else "🚀 अभी हेल्पर शुरू करें"

    fun tabProtection(lang: String): String =
        if (lang == "en") "Protection" else "सुरक्षा"

    fun tabDoctor(lang: String): String =
        if (lang == "en") "Phone Doctor" else "फोन डॉक्टर"

    fun enableAccessibility(lang: String): String =
        if (lang == "en") "Enable Accessibility Permission" else "Accessibility परमिशन चालू करें"

    fun restrictedAccessibility(lang: String): String =
        if (lang == "en") "If Accessibility says 'Restricted': Open App Info -> Top 3 Dots -> Allow restricted settings"
        else "अगर Accessibility 'Restricted' दिखाए: App Info खोलें -> ऊपर 3 dots -> Restricted settings allow करें"

    fun openAppInfo(lang: String): String =
        if (lang == "en") "Open App Info (To Unlock)" else "App Info खोलें (Unlock करने के लिए)"

    fun grantOverlay(lang: String): String =
        if (lang == "en") "Grant Overlay (Floating) Permission" else "Floating बटन (Overlay) परमिशन दें"

    fun disableBatteryOpt(lang: String): String =
        if (lang == "en") "Disable Battery Optimization" else "बैटरी ऑप्टिमाइज़ेशन बंद करें"

    fun allowAutoUpdates(lang: String): String =
        if (lang == "en") "Allow Auto-Updates Permission" else "ऑटो-अपडेट परमिशन दें"

    fun enableAutoStart(brand: String, lang: String): String =
        if (lang == "en") "Enable Auto-Start ($brand)" else "ऑटो-स्टार्ट चालू करें ($brand)"

    // -------------------------------------------------------------
    // Setup / Pairing Screen
    // -------------------------------------------------------------
    fun setupTitle(lang: String): String =
        if (lang == "en") "SaralGati Setup" else "सरलगति सेटअप"

    fun setupSubtitle(lang: String): String =
        if (lang == "en") "Enter the 6-digit code from caregiver dashboard or scan QR code."
        else "Caregiver डैशबोर्ड से 6 digit कोड डालें या QR स्कैन करें।"

    fun scanQrBtn(lang: String): String =
        if (lang == "en") "📷 Scan QR Code" else "📷 QR कोड स्कैन करें"

    fun cancelScan(lang: String): String =
        if (lang == "en") "Cancel Scan" else "स्कैन बंद करें"

    fun orText(lang: String): String =
        if (lang == "en") "— OR —" else "— या —"

    fun enterCodeLabel(lang: String): String =
        if (lang == "en") "Pairing Code" else "पेयरिंग कोड"

    fun connectBtn(lang: String): String =
        if (lang == "en") "Connect" else "कनेक्ट करें"

    fun connecting(lang: String): String =
        if (lang == "en") "Connecting..." else "कनेक्ट हो रहा है..."

    fun enterElderIdPlaceholder(lang: String): String =
        if (lang == "en") "6-digit code (e.g. 582194)" else "6 digit कोड (जैसे 582194)"

    // -------------------------------------------------------------
    // Phone Doctor Screen
    // -------------------------------------------------------------
    fun doctorTitle(lang: String): String =
        if (lang == "en") "Phone Doctor" else "फोन डॉक्टर"

    fun doctorSubtitle(lang: String): String =
        if (lang == "en") "If there are sound or brightness issues, tap the button."
        else "अगर आवाज़ या ब्राइटनेस में दिक्कत है तो बटन दबाएं।"

    fun fixAllBtn(lang: String): String =
        if (lang == "en") "Fix\nEverything" else "सब ठीक\nकरो"

    fun caregiverSettings(lang: String): String =
        if (lang == "en") "Caregiver Settings\n(Button Actions)" else "Caregiver सेटिंग्स\n(बटन एक्शन)"

    fun fixesApplied(lang: String): String =
        if (lang == "en") "All settings optimized!" else "सब सेटिंग्स ठीक हो गई!"

    fun doctorSettingsTitle(lang: String): String =
        if (lang == "en") "Caregiver Settings\n(Button Actions)" else "Caregiver सेटिंग्स\n(बटन एक्शन)"

    fun doctorSettingsSubtitle(lang: String): String =
        if (lang == "en") "Select what 'Fix Everything' will fix:" else "'सब ठीक करो' क्या-क्या ठीक करे, चुनें:"

    fun doctorFixRinger(lang: String): String =
        if (lang == "en") "Max Ringer (Full Volume)" else "रिंगर पूरी आवाज़"

    fun doctorFixMedia(lang: String): String =
        if (lang == "en") "Max Video / Media Volume" else "वीडियो / मीडिया पूरी आवाज़"

    fun doctorFixBrightness(lang: String, granted: Boolean): String {
        val label = if (lang == "en") "Brightness High (85%)" else "ब्राइटनेस तेज़ (85%)"
        return if (granted) "$label ✅" else label
    }

    fun doctorFixTimeout(lang: String, granted: Boolean): String {
        val label = if (lang == "en") "Screen Timeout 5 Mins" else "स्क्रीन 5 मिनट तक चालू रहे"
        return if (granted) "$label ✅" else label
    }

    fun doctorFixDnd(lang: String, granted: Boolean): String {
        val label = if (lang == "en") "Turn Off DND (Normal mode)" else "DND बंद करें (Normal mode)"
        return if (granted) "$label ✅" else label
    }

    fun doctorPermissionTitle(lang: String): String =
        if (lang == "en") "⚠️ Permissions Required" else "⚠️ परमिशन चाहिए"

    fun doctorPermissionBody(lang: String): String =
        if (lang == "en") "To run these features, please allow the permissions:" else "ये फीचर्स चलाने के लिए परमिशन दें:"

    fun doctorAllowWrite(lang: String): String =
        if (lang == "en") "Allow Modify Settings (Brightness)" else "सेटिंग्स बदलने की परमिशन दें (ब्राइटनेस)"

    fun doctorAllowDnd(lang: String): String =
        if (lang == "en") "Allow DND Access (Silent)" else "DND (साइलेंट) की परमिशन दें"

    fun doctorSave(lang: String): String =
        if (lang == "en") "Save & Close" else "सेव करो"

    fun doctorFixed(lang: String): String =
        if (lang == "en") "✅ All settings fixed!" else "✅ सब ठीक हो गया!"

    fun doctorFixError(lang: String): String =
        if (lang == "en") "Something went wrong while fixing. Please try again." else "कुछ ठीक करने में दिक्कत आई, दोबारा try करें।"

    // -------------------------------------------------------------
    // In-App Update Dialog
    // -------------------------------------------------------------
    fun updateTitle(lang: String, version: String): String =
        if (lang == "en") "A new update is available (v$version)" else "नया अपडेट आया है (v$version)"

    fun updateBody(lang: String): String =
        if (lang == "en") "A newer version of SaralGati is available. Update now for better protection and new features."
        else "SaralGati का नया वर्ज़न आ गया है। बेहतर सुरक्षा और नए फीचर्स के लिए अभी अपडेट करें।"

    fun updateNow(lang: String): String =
        if (lang == "en") "Update Now" else "अभी अपडेट करें"

    fun updateLater(lang: String): String =
        if (lang == "en") "Later" else "बाद में"

    fun allowUnknownSources(lang: String): String =
        if (lang == "en") "Please allow 'Install Unknown Apps' to update" else "अपडेट के लिए 'Unknown Apps Install' की परमिशन दें"

    fun downloadingUpdate(lang: String): String =
        if (lang == "en") "Downloading update..." else "अपडेट डाउनलोड हो रहा है..."

    // -------------------------------------------------------------
    // Floating Helper & TTS
    // -------------------------------------------------------------
    fun assistantTitle(lang: String): String =
        if (lang == "en") "SaralGati Assistant" else "सरलगति हेल्पर"

    fun rageTapTitle(lang: String): String =
        if (lang == "en") "Do you need help here?" else "क्या आपको यहाँ हेल्प चाहिए?"

    fun rageTapMessage(lang: String): String =
        if (lang == "en") "It looks like you might need assistance. Can I help?"
        else "लग रहा है आपको कुछ दिक्कत हो रही है। मदद करूँ?"

    fun listening(lang: String): String =
        if (lang == "en") "Listening..." else "सुन रहा हूँ..."

    fun thinking(lang: String): String =
        if (lang == "en") "Thinking..." else "सोच रहा हूँ..."

    fun cannotReadScreen(lang: String): String =
        if (lang == "en") "I cannot read the screen, please reopen the app."
        else "मैं स्क्रीन नहीं पढ़ पा रहा, ऐप दोबारा खोलें।"
}
