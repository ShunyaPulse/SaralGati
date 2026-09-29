package com.saralgati.app.services.accessibility

import android.view.accessibility.AccessibilityNodeInfo

/**
 * Window-level questions about the screen, each a pure function of its
 * arguments: is this class a real Activity rather than an internal widget, is
 * this an endless feed that must never be auto-scrolled, and where is the
 * scrollable container in this node tree?
 *
 * They used to be private members of SaralGatiAccessibilityService even though
 * none of them reads the service's state, so they now live here and only the
 * visibility changed (private member -> internal top-level function in the same
 * package), leaving every call site untouched.
 */

/**
 * Determines whether [cls] is a genuine Android Activity rather than an internal View/Widget.
 * Prevents widget layouts or scrolling views (e.g. FrameLayout, RecyclerView) from being
 * misidentified as screen transitions.
 */
internal fun isActualActivity(cls: String, pkg: String): Boolean {
    if (cls.isBlank()) return false
    if (cls.startsWith("android.widget.") ||
        cls.startsWith("android.view.") ||
        cls.startsWith("androidx.") ||
        cls.startsWith("android.webkit.")) {
        return false
    }
    return cls.endsWith("Activity") || (pkg.isNotEmpty() && cls.startsWith(pkg))
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

internal fun isInfiniteOrLongScrollApp(pkg: String): Boolean {
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

internal fun findScrollableNode(
    node: AccessibilityNodeInfo?,
    needBackward: Boolean = false
): AccessibilityNodeInfo? {
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
