package com.saralgati.app.services.accessibility

import android.view.accessibility.AccessibilityNodeInfo

/**
 * Reading a live screen: what a node *is* (its role) and what an elder would
 * call it (its label).
 *
 * Both functions are pure functions of the node they are handed - they read the
 * node's own text, content description, view id and class name and return a
 * string - which is why they can live outside [SaralGatiAccessibilityService]
 * and be read without a service instance. The service keeps the part that
 * genuinely needs its state: walking the window and deciding what to spotlight.
 *
 * Moved verbatim out of SaralGatiAccessibilityService.kt; only the visibility
 * changed (private member -> internal top-level function in the same package),
 * so no call site had to change.
 */

/**
 * Classifies an AccessibilityNodeInfo into high-level UI roles:
 * [BUTTON] -> Clickable button, action icon, ImageButton, or clickable container
 * [INPUT] -> EditText, text field
 * [TOGGLE] -> CheckBox, Switch, RadioButton
 * [TEXT] -> Plain static non-clickable text
 */
internal fun getElementRole(node: AccessibilityNodeInfo): String {
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
internal fun resolveHumanReadableLabel(node: AccessibilityNodeInfo): String? {
    val rawText = node.text?.toString()?.trim()
    val rawDesc = node.contentDescription?.toString()?.trim()
    val rawViewId = node.viewIdResourceName?.lowercase() ?: ""
    val viewId = rawViewId.substringAfterLast(":id/").substringAfterLast("/")

    // Filter out single character font-icon glyphs (like '0' or obscure icon codes)
    val nodeClassName = node.className?.toString() ?: ""
    val isImageLike = nodeClassName.contains("ImageView", ignoreCase = true) || nodeClassName.contains(
        "ImageButton",
        ignoreCase = true
    )
    val text =
        if (rawText != null && rawText.length == 1 && ((rawText == "0" && isImageLike) || !rawText[0].isLetterOrDigit())) null else rawText
    val desc =
        if (rawDesc != null && rawDesc.length == 1 && ((rawDesc == "0" && isImageLike) || !rawDesc[0].isLetterOrDigit())) null else rawDesc

    val combined = "$desc $text $viewId $rawViewId".lowercase()

    // 1. CAMERA & PHOTOGRAPHY ICONS
    if (combined.contains("shutter") || combined.contains("capture") || combined.contains("take photo") ||
        combined.contains("take picture") || combined.contains("snap") || combined.contains("btn_camera_capture")
    ) {
        return "Photo kheenchne wala button (Camera Shutter)"
    }
    if (combined.contains("switch camera") || combined.contains("flip") || combined.contains("rotate camera") ||
        combined.contains("front camera") || combined.contains("rear camera") || combined.contains("toggle camera") ||
        combined.contains("facing") || combined.contains("selfie camera")
    ) {
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
        combined.contains("khoj") || combined.contains("query") || rawText == "🔍" || rawDesc == "🔍"
    ) {
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
    if (combined.contains("scan qr") || combined.contains("scanner") || combined.contains("scan_qr") || combined.contains(
            "barcode"
        )
    ) {
        return "QR Code scan karne ka camera (Scan & Pay)"
    }
    if (combined.contains("send money") || combined.contains("pay") || combined.contains("transfer")) {
        return "Paise bhejne ka button (Pay / Transfer)"
    }
    if (combined.contains("check balance") || combined.contains("view balance") || combined.contains("account balance")) {
        return "Bank balance check karne ka button"
    }
    if (combined.contains("history") || combined.contains("passbook") || combined.contains("statement") || combined.contains(
            "transactions"
        )
    ) {
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
        combined.contains("document") || combined.contains("media")
    ) {
        return "Photo / Document jodne wala button (Attachment Clip)"
    }
    if (combined.contains("voice") || combined.contains("mic") || combined.contains("microphone") ||
        combined.contains("record audio") || combined.contains("sound input")
    ) {
        return "Awaaz record karne wala mic button (Voice Note)"
    }
    if (combined.contains("send") || combined.contains("submit") || combined.contains("send arrow") || combined.contains(
            "bhejo"
        )
    ) {
        return "Message bhejne wala button (Send Arrow)"
    }
    if (combined.contains("emoji") || combined.contains("smiley") || combined.contains("sticker") || combined.contains(
            "gif"
        )
    ) {
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
    if (combined.contains("dial") || combined.contains("dialpad") || combined.contains("keypad") || combined.contains(
            "numpad"
        )
    ) {
        return "Number dial karne ka keypad"
    }
    if (combined.contains("end call") || combined.contains("hang up") || combined.contains("disconnect") || combined.contains(
            "reject"
        )
    ) {
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
        combined.contains("menu") || combined.contains("three dots") || combined.contains("dots")
    ) {
        return "Menu / 3 Bindi (More Options)"
    }
    if (combined.contains("hamburger") || combined.contains("drawer") || combined.contains("side menu") || combined.contains(
            "three lines"
        )
    ) {
        return "Side menu / 3 Line wala button (Main Menu)"
    }
    if (combined.contains("navigate up") || combined.contains("back") || combined.contains("arrow back") ||
        combined.contains("previous") || rawText == "←" || rawDesc == "←"
    ) {
        return "Peeche jane wala button (Back Arrow)"
    }
    if (combined.contains("close") || combined.contains("cancel") || combined.contains("dismiss") ||
        rawText == "✕" || rawText == "X" || rawDesc == "close"
    ) {
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
    if (combined.contains("favorite") || combined.contains("favourite") || combined.contains("star") || combined.contains(
            "like"
        )
    ) {
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
    if (combined.contains("password visibility") || combined.contains("show password") || combined.contains("hide password") || combined.contains(
            "eye"
        )
    ) {
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
