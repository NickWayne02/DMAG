import java.util.Base64

plugins {
    id("com.android.application")
    // The Flutter Gradle Plugin must be applied after the Android and Kotlin Gradle plugins.
    id("dev.flutter.flutter-gradle-plugin")
    id("com.google.gms.google-services")
}

val dartEnvironmentVariables = mutableMapOf<String, String>()
if (project.hasProperty("dart-defines")) {
    val defines = project.property("dart-defines") as String
    defines.split(",").forEach { entry ->
        if (entry.isNotEmpty()) {
            val decoded = String(Base64.getDecoder().decode(entry), Charsets.UTF_8)
            val pair = decoded.split("=", limit = 2)
            if (pair.size == 2) {
                dartEnvironmentVariables[pair[0]] = pair[1]
            }
        }
    }
}
val isErBrand = dartEnvironmentVariables["APP_BRAND"]?.lowercase() == "er" ||
    (project.findProperty("appBrand") as? String)?.lowercase() == "er"

android {
    namespace = "com.factory.app"
    compileSdk = flutter.compileSdkVersion
    ndkVersion = flutter.ndkVersion

    compileOptions {
        isCoreLibraryDesugaringEnabled = true
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }

    defaultConfig {
        // TODO: Specify your own unique Application ID (https://developer.android.com/studio/build/application-id.html).
        applicationId = if (isErBrand) "com.factory.app.er" else "com.factory.app"
        manifestPlaceholders["appLabel"] = if (isErBrand) "E&R" else "DMAG"
        manifestPlaceholders["appIcon"] = if (isErBrand) "@mipmap/ic_brand1" else "@mipmap/ic_launcher"
        // You can update the following values to match your application needs.
        // For more information, see: https://flutter.dev/to/review-gradle-config.
        minSdk = flutter.minSdkVersion
        targetSdk = flutter.targetSdkVersion
        // Uses the version code from pubspec.yaml. When using split APKs, 1000 * ABI_VERSION
        // is added automatically by Flutter. (https://developer.android.com/studio/build/configure-apk-splits#configure-APK-versions)
        // You can force using the value of versionCode by specifying the `-P force-version-code-ignoring-abi=true`
        // flag during build.
        versionCode = flutter.versionCode
        versionName = flutter.versionName
    }

    buildTypes {
        release {
            // TODO: Add your own signing config for the release build.
            // Signing with the debug keys for now, so `flutter run --release` works.
            signingConfig = signingConfigs.getByName("debug")
        }
    }
}

kotlin {
    compilerOptions {
        jvmTarget = org.jetbrains.kotlin.gradle.dsl.JvmTarget.JVM_17
    }
}

flutter {
    source = "../.."
}

dependencies {
    coreLibraryDesugaring("com.android.tools:desugar_jdk_libs:2.1.4")
}
