package com.biometric.kiosk.data.db

import androidx.room.Entity
import androidx.room.PrimaryKey
import androidx.room.ColumnInfo

/**
 * Room entity that stores one cached face embedding record per subscriber.
 *
 * Security note: Only the mathematical embedding vector is stored — never the
 * raw photo, face crop, or any biometric image. The entire database is
 * encrypted at rest via SQLCipher.
 *
 * The vector is stored as a JSON-serialized FloatArray to avoid Room's
 * limitation on primitive array types. See [FloatArrayConverter].
 */
@Entity(tableName = "face_embeddings")
data class EmbeddingEntity(
    /** Matches subscriberId from the backend */
    @PrimaryKey
    @ColumnInfo(name = "subscriber_id")
    val subscriberId: Int,

    @ColumnInfo(name = "subscriber_name")
    val subscriberName: String,

    @ColumnInfo(name = "email")
    val email: String?,

    /** Subscription plan name for display on the result screen */
    @ColumnInfo(name = "plan_name")
    val planName: String?,

    /** Days remaining on subscription at last sync time */
    @ColumnInfo(name = "days_left")
    val daysLeft: Int,

    /** Whether the subscription was expired at last sync */
    @ColumnInfo(name = "is_expired")
    val isExpired: Boolean,

    /** "active" | "revoked" | "pending" — revoked entries are deleted on sync */
    @ColumnInfo(name = "status")
    val status: String,

    /**
     * 128-dimensional L2-normalized MobileFaceNet embedding.
     * Stored as comma-separated float string to work with Room without
     * a custom TypeConverter that might complicate SQLCipher encryption.
     * Format: "0.1234,0.5678,..."  (128 values)
     */
    @ColumnInfo(name = "vector")
    val vector: String,

    /** ISO-8601 timestamp of when this record was last updated on the server */
    @ColumnInfo(name = "updated_at")
    val updatedAt: String,

    /** tenantId for multi-tenant isolation on device */
    @ColumnInfo(name = "tenant_id")
    val tenantId: Int
) {
    /** Deserializes the stored CSV/JSON string back to a FloatArray for inference */
    fun toFloatArray(): FloatArray {
        val clean = vector.trim().removePrefix("[").removeSuffix("]")
        if (clean.isBlank()) return FloatArray(0)
        return clean.split(",")
            .mapNotNull { it.trim().toFloatOrNull() }
            .toFloatArray()
    }
}
