# Add project specific ProGuard rules here.

# ── TFLite ─────────────────────────────────────────────────────────────────
-keep class org.tensorflow.lite.** { *; }
-keep class org.tensorflow.lite.gpu.** { *; }
-keep class org.tensorflow.lite.support.** { *; }

# ── ML Kit ─────────────────────────────────────────────────────────────────
-keep class com.google.mlkit.** { *; }
-keep class com.google.android.gms.vision.** { *; }

# ── SQLCipher ──────────────────────────────────────────────────────────────
-keep class net.sqlcipher.** { *; }
-keep class net.sqlcipher.database.** { *; }

# ── Room ───────────────────────────────────────────────────────────────────
-keep class * extends androidx.room.RoomDatabase { *; }
-keep @androidx.room.Entity class * { *; }
-keep @androidx.room.Dao class * { *; }

# ── Retrofit + Moshi ───────────────────────────────────────────────────────
-keep class com.squareup.moshi.** { *; }
-keep @com.squareup.moshi.JsonClass class * { *; }
-keepclassmembers class * {
    @com.squareup.moshi.FromJson <methods>;
    @com.squareup.moshi.ToJson <methods>;
}
-keep class retrofit2.** { *; }
-keepattributes Signature, Exceptions, *Annotation*

# ── Data model classes (keep for Moshi JSON deserialization) ───────────────
-keep class com.biometric.kiosk.data.api.** { *; }
-keep class com.biometric.kiosk.data.db.** { *; }

# ── Firebase ───────────────────────────────────────────────────────────────
-keep class com.google.firebase.** { *; }

# ── Hilt ───────────────────────────────────────────────────────────────────
-keep class dagger.hilt.** { *; }
-keep class javax.inject.** { *; }
-keepclassmembers class * {
    @dagger.hilt.android.AndroidEntryPoint <init>(...);
}

# ── WorkManager ────────────────────────────────────────────────────────────
-keep class * extends androidx.work.Worker { *; }
-keep class * extends androidx.work.CoroutineWorker { *; }
-keep class * extends androidx.work.ListenableWorker { *; }

# ── General ────────────────────────────────────────────────────────────────
-keepattributes SourceFile,LineNumberTable
-keepattributes *Annotation*
-dontwarn kotlin.**
-dontwarn kotlinx.**
