package com.biometric.kiosk.data.prefs

import android.content.Context
import android.content.SharedPreferences
import androidx.security.crypto.EncryptedSharedPreferences
import androidx.security.crypto.MasterKey
import com.biometric.kiosk.BuildConfig
import dagger.hilt.android.qualifiers.ApplicationContext
import java.security.MessageDigest
import java.security.SecureRandom
import java.util.Base64
import javax.inject.Inject
import javax.inject.Singleton

/**
 * Encrypted preferences wrapper using AndroidX Security Crypto
 * (EncryptedSharedPreferences backed by Android Keystore).
 *
 * All sensitive values — device token, admin PIN hash, DB key — are stored here.
 */
@Singleton
class DevicePrefs @Inject constructor(
    @ApplicationContext private val context: Context
) {
    companion object {
        private const val PREFS_FILE = "kiosk_device_prefs"

        // Preference keys
        const val KEY_DEVICE_TOKEN = "device_token"
        const val KEY_BACKEND_URL = "backend_url"
        const val KEY_TENANT_ID = "tenant_id"
        const val KEY_ADMIN_PIN_HASH = "admin_pin_hash"
        const val KEY_SIMILARITY_THRESHOLD = "similarity_threshold"
        const val KEY_SYNC_INTERVAL_MINUTES = "sync_interval_minutes"
        const val KEY_LAST_SYNC_AT = "last_sync_at"
        const val KEY_DB_KEY = "db_encryption_key"
        const val KEY_IS_REGISTERED = "is_registered"

        // Defaults
        const val DEFAULT_THRESHOLD = 0.65f
        const val DEFAULT_SYNC_INTERVAL = 15
        const val DEFAULT_ADMIN_PIN = "1234"
    }

    private val masterKey: MasterKey by lazy {
        MasterKey.Builder(context)
            .setKeyScheme(MasterKey.KeyScheme.AES256_GCM)
            .build()
    }

    private val prefs: SharedPreferences by lazy {
        EncryptedSharedPreferences.create(
            context,
            PREFS_FILE,
            masterKey,
            EncryptedSharedPreferences.PrefKeyEncryptionScheme.AES256_SIV,
            EncryptedSharedPreferences.PrefValueEncryptionScheme.AES256_GCM
        )
    }

    /** Device token used in the x-device-token header for all API calls */
    var deviceToken: String
        get() = prefs.getString(KEY_DEVICE_TOKEN, BuildConfig.DEVICE_TOKEN) ?: ""
        set(value) = prefs.edit().putString(KEY_DEVICE_TOKEN, value).apply()

    /** Backend base URL */
    var backendUrl: String
        get() = prefs.getString(KEY_BACKEND_URL, BuildConfig.BACKEND_URL) ?: BuildConfig.BACKEND_URL
        set(value) = prefs.edit().putString(KEY_BACKEND_URL, value).apply()

    /** Tenant ID this device is registered to */
    var tenantId: Int
        get() = prefs.getInt(KEY_TENANT_ID, 1)
        set(value) = prefs.edit().putInt(KEY_TENANT_ID, value).apply()

    /** Cosine similarity threshold (0.0–1.0) for accepting a face match */
    var similarityThreshold: Float
        get() = prefs.getFloat(KEY_SIMILARITY_THRESHOLD, DEFAULT_THRESHOLD)
        set(value) = prefs.edit().putFloat(KEY_SIMILARITY_THRESHOLD, value).apply()

    /** How often the background sync job runs */
    var syncIntervalMinutes: Int
        get() = prefs.getInt(KEY_SYNC_INTERVAL_MINUTES, DEFAULT_SYNC_INTERVAL)
        set(value) = prefs.edit().putInt(KEY_SYNC_INTERVAL_MINUTES, value).apply()

    /** ISO-8601 timestamp of last successful sync — used for delta queries */
    var lastSyncAt: String?
        get() = prefs.getString(KEY_LAST_SYNC_AT, null)
        set(value) = prefs.edit().putString(KEY_LAST_SYNC_AT, value).apply()

    /** Whether the device has been registered with a valid token and tenant */
    var isRegistered: Boolean
        get() = prefs.getBoolean(KEY_IS_REGISTERED, deviceToken.isNotEmpty())
        set(value) = prefs.edit().putBoolean(KEY_IS_REGISTERED, value).apply()

    // ─── Admin PIN ───────────────────────────────────────────────────────────

    /**
     * Store a hashed PIN so we never store the raw PIN even in encrypted prefs.
     * Uses SHA-256 with the device's unique app-install ID as salt.
     */
    fun setAdminPin(rawPin: String) {
        val hash = sha256(rawPin + getOrCreatePinSalt())
        prefs.edit().putString(KEY_ADMIN_PIN_HASH, hash).apply()
    }

    fun verifyAdminPin(rawPin: String): Boolean {
        val storedHash = prefs.getString(KEY_ADMIN_PIN_HASH, null)
        if (storedHash == null) {
            // First launch — accept default PIN from BuildConfig and set it
            if (rawPin == BuildConfig.ADMIN_PIN || rawPin == DEFAULT_ADMIN_PIN) {
                setAdminPin(rawPin)
                return true
            }
            return false
        }
        val hash = sha256(rawPin + getOrCreatePinSalt())
        return hash == storedHash
    }

    // ─── Database encryption key ─────────────────────────────────────────────

    /**
     * Returns (or creates) the 32-byte SQLCipher database key.
     * Generated once via SecureRandom and stored in EncryptedSharedPreferences.
     */
    fun getOrCreateDbKey(): CharArray {
        val existing = prefs.getString(KEY_DB_KEY, null)
        if (existing != null) return existing.toCharArray()

        val newKey = ByteArray(32).also { SecureRandom().nextBytes(it) }
        val encoded = Base64.getEncoder().encodeToString(newKey)
        prefs.edit().putString(KEY_DB_KEY, encoded).apply()
        return encoded.toCharArray()
    }

    // ─── Clear (logout) ──────────────────────────────────────────────────────

    /**
     * Wipe all preferences except the DB key (so we can still open and clear the DB).
     * Call [AppDatabase.deleteAll] before this in the logout flow.
     */
    fun clearDeviceRegistration() {
        prefs.edit()
            .remove(KEY_DEVICE_TOKEN)
            .remove(KEY_TENANT_ID)
            .remove(KEY_LAST_SYNC_AT)
            .remove(KEY_IS_REGISTERED)
            .apply()
    }

    // ─── Internal helpers ────────────────────────────────────────────────────

    private fun getOrCreatePinSalt(): String {
        val saltKey = "pin_salt"
        val existing = prefs.getString(saltKey, null)
        if (existing != null) return existing
        val salt = ByteArray(16).also { SecureRandom().nextBytes(it) }
        val encoded = Base64.getEncoder().encodeToString(salt)
        prefs.edit().putString(saltKey, encoded).apply()
        return encoded
    }

    private fun sha256(input: String): String {
        val bytes = MessageDigest.getInstance("SHA-256").digest(input.toByteArray())
        return bytes.joinToString("") { "%02x".format(it) }
    }
}
