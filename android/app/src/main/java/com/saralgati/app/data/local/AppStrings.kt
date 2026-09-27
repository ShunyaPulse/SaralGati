package com.saralgati.app.data.local

/**
 * Centralized, high-contrast localization strings for Hindi and English in SaralGati Android.
 */
object AppStrings {
    // -------------------------------------------------------------
    // Language Selection Screen
    // -------------------------------------------------------------
    fun selectLangTitle(lang: String): String =
        if (lang == "en") "Choose Your Language" else "अपनी पसंदीदा भाषा चुनें"

    fun selectLangSubtitle(lang: String): String =
        if (lang == "en") "Select how SaralGati should speak and guide you" else "सरलगति ऐप और बोलकर सहायता किस भाषा में दे?"

    const val HINDI_TITLE = "🇮🇳 हिंदी (Hindi)"
    const val HINDI_SUBTITLE = "ऐप और बोलकर सहायता हिंदी में"

    const val ENGLISH_TITLE = "🇬🇧 English"
    // Guidance from the server is written in Hinglish by design, so the promise
    // here is the app's own words - not a fully English voice experience.
    const val ENGLISH_SUBTITLE = "App in English; spoken help in simple Hinglish"

    fun continueBtn(lang: String): String =
        if (lang == "en") "Continue" else "आगे बढ़ें"

    fun switchLangLabel(lang: String): String =
        if (lang == "en") "🌐 Language: English" else "🌐 भाषा: हिंदी"

    // -------------------------------------------------------------
    // Dashboard & Protection Screen
    // -------------------------------------------------------------
    fun title(lang: String): String =
        if (lang == "en") "SaralGati Protection" else "सरलगति सुरक्षा"

    fun appConnected(lang: String): String =
        if (lang == "en") "✅ App is Connected" else "✅ ऐप कनेक्टेड है"

    fun disconnect(lang: String): String =
        if (lang == "en") "Disconnect App" else "ऐप डिस्कनेक्ट करें"

    fun allProtectionActive(lang: String): String =
        if (lang == "en") "🛡️ All Protection is Active" else "🛡️ सभी सुरक्षा सेवाएं सक्रिय हैं"

    fun onScreenHelper(lang: String): String =
        if (lang == "en") "On-Screen Helper" else "स्क्रीन सहायक"

    fun voiceGuidance(lang: String): String =
        if (lang == "en") "Voice Guidance (TTS)" else "आवाज़ से सहायता (TTS)"

    fun startHelperNow(lang: String): String =
        if (lang == "en") "🚀 Start Helper Now" else "🚀 अभी सहायक शुरू करें"

    fun tabProtection(lang: String): String =
        if (lang == "en") "Protection" else "सुरक्षा"

    fun tabDoctor(lang: String): String =
        if (lang == "en") "Phone Doctor" else "फोन डॉक्टर"

    fun enableAccessibility(lang: String): String =
        if (lang == "en") "Enable Accessibility Permission" else "एक्सेसिबिलिटी (Accessibility) सेवा चालू करें"

    fun restrictedAccessibility(lang: String): String =
        if (lang == "en") "If Accessibility says 'Restricted': Open App Info -> Top 3 Dots -> Allow restricted settings"
        else "यदि एक्सेसिबिलिटी 'प्रतिबंधित' दिखाए: ऐप जानकारी खोलें -> ऊपर 3 बिंदियां -> प्रतिबंधित सेटिंग्स की अनुमति दें"

    fun openAppInfo(lang: String): String =
        if (lang == "en") "Open App Info (To Unlock)" else "ऐप जानकारी खोलें (अनलॉक हेतु)"

    fun grantOverlay(lang: String): String =
        if (lang == "en") "Grant Overlay (Floating) Permission" else "फ्लोटिंग बटन (Overlay) अनुमति दें"

    fun disableBatteryOpt(lang: String): String =
        if (lang == "en") "Disable Battery Optimization" else "बैटरी ऑप्टिमाइज़ेशन बंद करें"

    fun allowAutoUpdates(lang: String): String =
        if (lang == "en") "Allow Auto-Updates Permission" else "ऑटो-अपडेट अनुमति दें"

    fun enableAutoStart(brand: String, lang: String): String =
        if (lang == "en") "Enable Auto-Start ($brand)" else "ऑटो-स्टार्ट चालू करें ($brand)"

    // -------------------------------------------------------------
    // Setup / Pairing Screen
    // -------------------------------------------------------------
    fun setupTitle(lang: String): String =
        if (lang == "en") "SaralGati Setup" else "सरलगति सेटअप"

    fun setupSubtitle(lang: String): String =
        if (lang == "en") "Enter the 6-digit code from caregiver dashboard or scan QR code."
        else "केयरगिवर डैशबोर्ड से 6-अंकों का कोड यहाँ दर्ज करें या QR स्कैन करें।"

    fun scanQrBtn(lang: String): String =
        if (lang == "en") "📷 Scan QR Code" else "📷 QR कोड स्कैन करें"

    fun cancelScan(lang: String): String =
        if (lang == "en") "Cancel Scan" else "स्कैन रद्द करें"

    fun orText(lang: String): String =
        if (lang == "en") "— OR —" else "— या —"

    fun enterCodeLabel(lang: String): String =
        if (lang == "en") "Pairing Code" else "पेयरिंग कोड"

    fun connectBtn(lang: String): String =
        if (lang == "en") "Connect" else "कनेक्ट करें"

    fun connecting(lang: String): String =
        if (lang == "en") "Connecting..." else "जोड़ रहे हैं..."

    fun enterElderIdPlaceholder(lang: String): String =
        if (lang == "en") "6-digit code (e.g. 582194)" else "6-अंकों का कोड (उदा. 582194)"

    // -------------------------------------------------------------
    // Phone Doctor Screen
    // -------------------------------------------------------------
    fun doctorTitle(lang: String): String =
        if (lang == "en") "Phone Doctor" else "फोन डॉक्टर"

    fun doctorSubtitle(lang: String): String =
        if (lang == "en") "If there are sound or brightness issues, tap the button."
        else "अगर फोन में आवाज़ या रोशनी की दिक्कत है, तो एक बटन दबाएं।"

    fun fixAllBtn(lang: String): String =
        if (lang == "en") "Fix\nEverything" else "सब ठीक\nकरो"

    fun caregiverSettings(lang: String): String =
        if (lang == "en") "Caregiver Settings\n(Button Actions)" else "केयरगिवर सेटिंग्स\n(बटन क्रियाएं)"

    fun fixesApplied(lang: String): String =
        if (lang == "en") "All settings optimized!" else "सब सेटिंग्स ठीक कर दी गई हैं!"

    fun doctorSettingsTitle(lang: String): String =
        if (lang == "en") "Caregiver Settings\n(Button Actions)" else "केयरगिवर सेटिंग्स\n(बटन क्रियाएं)"

    fun doctorSettingsSubtitle(lang: String): String =
        if (lang == "en") "Select what 'Fix Everything' will fix:" else "'सब ठीक करो' क्या ठीक करे, चुनें:"

    fun doctorFixRinger(lang: String): String =
        if (lang == "en") "Max Ringer (Full Volume)" else "रिंगर पूरी आवाज़"

    fun doctorFixMedia(lang: String): String =
        if (lang == "en") "Max Video / Media Volume" else "वीडियो / मीडिया पूरी आवाज़"

    fun doctorFixBrightness(lang: String, granted: Boolean): String {
        val label = if (lang == "en") "Brightness High (85%)" else "रोशनी तेज़ (85%)"
        return if (granted) "$label ✅" else label
    }

    fun doctorFixTimeout(lang: String, granted: Boolean): String {
        val label = if (lang == "en") "Screen Timeout 5 Mins" else "स्क्रीन 5 मिनट तक चालू रहे"
        return if (granted) "$label ✅" else label
    }

    fun doctorFixDnd(lang: String, granted: Boolean): String {
        val label = if (lang == "en") "Turn Off DND (Normal mode)" else "DND बंद करें (नॉर्मल मोड)"
        return if (granted) "$label ✅" else label
    }

    fun doctorPermissionTitle(lang: String): String =
        if (lang == "en") "⚠️ Permissions Required" else "⚠️ अनुमति ज़रूरी है"

    fun doctorPermissionBody(lang: String): String =
        if (lang == "en") "To run these features, please allow the permissions:" else "ये सुविधाएं चलाने के लिए अनुमति दें:"

    fun doctorAllowWrite(lang: String): String =
        if (lang == "en") "Allow Modify Settings (Brightness)" else "सेटिंग्स बदलने की अनुमति दें (रोशनी)"

    fun doctorAllowDnd(lang: String): String =
        if (lang == "en") "Allow DND Access (Silent)" else "DND (साइलेंट) की अनुमति दें"

    fun doctorSave(lang: String): String =
        if (lang == "en") "Save & Close" else "सेव करें और बंद करें"

    fun doctorFixed(lang: String): String =
        if (lang == "en") "✅ All settings fixed!" else "✅ सब ठीक हो गया!"

    fun doctorFixError(lang: String): String =
        if (lang == "en") "Something went wrong while fixing. Please try again." else "कुछ ठीक करने में दिक्कत आई।"

    // -------------------------------------------------------------
    // In-App Update Dialog
    // -------------------------------------------------------------
    fun updateTitle(lang: String, version: String): String =
        if (lang == "en") "A new update is available (v$version)" else "नया अपडेट उपलब्ध है (v$version)"

    fun updateBody(lang: String): String =
        if (lang == "en") "A newer version of SaralGati is available. Update now for better protection and new features."
        else "SaralGati का नया वर्ज़न उपलब्ध है। बेहतर सुरक्षा और नए फ़ीचर्स के लिए अभी अपडेट करें।"

    fun updateNow(lang: String): String =
        if (lang == "en") "Update Now" else "अभी अपडेट करें"

    fun updateLater(lang: String): String =
        if (lang == "en") "Later" else "बाद में"

    fun allowUnknownSources(lang: String): String =
        if (lang == "en") "Please allow 'Install Unknown Apps' to update" else "अपडेट के लिए 'अनजान ऐप इंस्टॉल' की अनुमति दें"

    fun downloadingUpdate(lang: String): String =
        if (lang == "en") "Downloading update..." else "अपडेट डाउनलोड हो रहा है..."

    // -------------------------------------------------------------
    // Floating Helper & TTS
    // -------------------------------------------------------------
    fun assistantTitle(lang: String): String =
        if (lang == "en") "SaralGati Assistant" else "सरलगति सहायक"

    fun rageTapTitle(lang: String): String =
        if (lang == "en") "Do you need help here?" else "क्या आपको यहाँ कुछ सहायता चाहिए?"

    fun rageTapMessage(lang: String): String =
        if (lang == "en") "It looks like you might need assistance. Can I help?"
        else "ऐसा लगता है कि आपको यहाँ कुछ परेशानी हो रही है। क्या मैं मदद करूँ?"

    fun listening(lang: String): String =
        if (lang == "en") "Listening..." else "सुन रहा हूँ..."

    fun thinking(lang: String): String =
        if (lang == "en") "Thinking..." else "सोच रहा हूँ..."

    fun cannotReadScreen(lang: String): String =
        if (lang == "en") "I cannot read the screen, please reopen the app."
        else "मैं स्क्रीन नहीं पढ़ पा रहा हूँ, कृपया ऐप को दोबारा खोलें।"
}
