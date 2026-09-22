# SaralGati Android ProGuard / R8 Rules

# Data Models (Moshi JSON Serialization)
-keep class com.saralgati.app.data.model.** { *; }
-keepclassmembers class * {
    @com.squareup.moshi.Json <fields>;
    @com.squareup.moshi.JsonClass <fields>;
}
-keep class * extends com.squareup.moshi.JsonAdapter { *; }
-keep,allowobfuscation,allowshrinking class com.squareup.moshi.** { *; }
-dontwarn com.squareup.moshi.**

# Retrofit 2
-dontwarn retrofit2.**
-keep class retrofit2.** { *; }
-keepattributes Signature, InnerClasses, EnclosingMethod
-keepclassmembers,allowshrinking,allowobfuscation interface * {
    @retrofit2.http.* <methods>;
}

# OkHttp
-dontwarn okhttp3.**
-dontwarn okio.**
-keepnames class okhttp3.internal.publicsuffix.PublicSuffixDatabase

# Android Components & Accessibility Service
-keep public class com.saralgati.app.MainActivity { *; }
-keep public class com.saralgati.app.services.accessibility.SaralGatiAccessibilityService { *; }
-keep public class com.saralgati.app.services.overlay.FloatingHelperService { *; }
-keep public class com.saralgati.app.services.heartbeat.TelemetryService { *; }
-keep public class * extends android.app.Service
-keep public class * extends android.accessibilityservice.AccessibilityService

# ML Kit Barcode Scanning & CameraX
-keep class com.google.mlkit.** { *; }
-dontwarn com.google.mlkit.**
-keep class androidx.camera.** { *; }
-dontwarn androidx.camera.**

# Guava
-dontwarn com.google.common.**
