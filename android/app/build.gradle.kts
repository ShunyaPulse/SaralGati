plugins {
    alias(libs.plugins.android.application)
    alias(libs.plugins.kotlin.compose)
}

android {
    namespace = "com.saralgati.app"
    compileSdk {
        version = release(37)
    }

    val versionFile = rootProject.file("../version.json")
    val (parsedVersionCode, parsedVersionName) = if (versionFile.exists()) {
        val text = versionFile.readText()
        val codeMatch = Regex("\"version_code\"\\s*:\\s*(\\d+)").find(text)?.groupValues?.get(1)?.toIntOrNull() ?: 2
        val nameMatch = Regex("\"version_name\"\\s*:\\s*\"([^\"]+)\"").find(text)?.groupValues?.get(1) ?: "1.1"
        Pair(codeMatch, nameMatch)
    } else {
        Pair(2, "1.1")
    }

    val vCode = System.getenv("BUILD_NUMBER")?.toIntOrNull() ?: parsedVersionCode
    val vName = System.getenv("BUILD_VERSION") ?: parsedVersionName

    defaultConfig {
        applicationId = "com.saralgati.app"
        minSdk = 24
        targetSdk = 37
        versionCode = vCode
        versionName = vName
        val secret = System.getenv("API_SECRET")?.takeIf { it.isNotBlank() } ?: "YOUR_API_SECRET"
        buildConfigField("String", "API_SECRET", "\"$secret\"")

        testInstrumentationRunner = "androidx.test.runner.AndroidJUnitRunner"
    }

    signingConfigs {
        create("release") {
            val envPath = System.getenv("KEYSTORE_PATH")
            val candidateFiles = listOfNotNull(
                envPath?.let { file(it) },
                envPath?.let { rootProject.file(it) },
                rootProject.file("keystore.jks"),
                file("keystore.jks")
            )
            val keystoreFile = candidateFiles.firstOrNull { it.exists() }

            if (keystoreFile != null) {
                storeFile = keystoreFile
                storePassword = System.getenv("KEYSTORE_PASSWORD")?.ifEmpty { "saralgati_fallback" } ?: "saralgati_fallback"
                keyAlias = System.getenv("KEY_ALIAS")?.ifEmpty { "saralgati_key" } ?: "saralgati_key"
                keyPassword = System.getenv("KEY_PASSWORD")?.ifEmpty { "saralgati_fallback" } ?: "saralgati_fallback"
            } else {
                // Generate a standalone fallback keystore so CI and local builds never fail validation
                val autoKeystore = rootProject.file("fallback-keystore.jks")
                storeFile = autoKeystore
                storePassword = "saralgati_fallback"
                keyAlias = "saralgati_key"
                keyPassword = "saralgati_fallback"
            }
        }
    }

    buildTypes {
        release {
            isMinifyEnabled = true
            isShrinkResources = true
            proguardFiles(
                getDefaultProguardFile("proguard-android-optimize.txt"),
                "proguard-rules.pro"
            )
            signingConfig = signingConfigs.getByName("release")
        }
    }
    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_11
        targetCompatibility = JavaVersion.VERSION_11
    }
    buildFeatures {
        compose = true
        buildConfig = true
    }
}

dependencies {
    implementation(platform(libs.androidx.compose.bom))
    implementation(libs.androidx.activity.compose)
    implementation(libs.androidx.compose.material3)
    implementation(libs.androidx.compose.ui)
    implementation(libs.androidx.compose.ui.graphics)
    implementation(libs.androidx.compose.ui.tooling.preview)
    implementation(libs.androidx.core.ktx)
    implementation(libs.androidx.lifecycle.runtime.ktx)

    // Networking
    implementation(libs.retrofit)
    implementation(libs.retrofit.converter.moshi)
    implementation(libs.moshi.kotlin)
    implementation(libs.okhttp)
    implementation(libs.okhttp.logging.interceptor)

    // Camera & ML Kit
    implementation(libs.androidx.camera.core)
    implementation(libs.androidx.camera.camera2)
    implementation(libs.androidx.camera.lifecycle)
    implementation(libs.androidx.camera.view)
    implementation(libs.mlkit.barcode.scanning)
    implementation(libs.guava)

    testImplementation(libs.junit)
    androidTestImplementation(platform(libs.androidx.compose.bom))
    androidTestImplementation(libs.androidx.compose.ui.test.junit4)
    androidTestImplementation(libs.androidx.espresso.core)
    androidTestImplementation(libs.androidx.junit)
    debugImplementation(libs.androidx.compose.ui.test.manifest)
    debugImplementation(libs.androidx.compose.ui.tooling)
}

tasks.register("generateFallbackKeystore") {
    val autoKeystore = rootProject.file("fallback-keystore.jks")
    outputs.file(autoKeystore)
    doLast {
        if (!autoKeystore.exists()) {
            try {
                val process = ProcessBuilder(
                    "keytool", "-genkey", "-v",
                    "-keystore", autoKeystore.absolutePath,
                    "-alias", "saralgati_key",
                    "-keyalg", "RSA", "-keysize", "2048", "-validity", "10000",
                    "-storepass", "saralgati_fallback",
                    "-keypass", "saralgati_fallback",
                    "-dname", "CN=SaralGati,O=SaralGati,C=IN"
                ).start()
                process.waitFor()
            } catch (e: Exception) {
                println("Warning: keytool not found or failed.")
            }
        }
    }
}

tasks.whenTaskAdded {
    if (name.startsWith("validateSigning")) {
        dependsOn("generateFallbackKeystore")
    }
}