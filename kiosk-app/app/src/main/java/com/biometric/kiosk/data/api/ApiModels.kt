package com.biometric.kiosk.data.api

import com.squareup.moshi.Json
import com.squareup.moshi.JsonClass

/**
 * Mirrors FaceEmbeddingRecord from backend types/api.ts
 */
@JsonClass(generateAdapter = true)
data class FaceEmbeddingRecord(
    @Json(name = "id") val id: String,
    @Json(name = "subscriberId") val subscriberId: Int,
    @Json(name = "tenantId") val tenantId: Int,
    @Json(name = "subscriberName") val subscriberName: String,
    @Json(name = "email") val email: String?,
    @Json(name = "vector") val vector: List<Float>,   // 192-d L2-normalized MobileFaceNet embedding
    @Json(name = "vectorDimension") val vectorDimension: Int,
    /** Extractor that produced [vector]. Vectors from different models are not comparable. */
    @Json(name = "modelId") val modelId: String? = null,
    @Json(name = "status") val status: String,         // "active" | "revoked" | "pending"
    @Json(name = "planName") val planName: String?,
    @Json(name = "daysLeft") val daysLeft: Int?,
    @Json(name = "isExpired") val isExpired: Boolean?,
    @Json(name = "updatedAt") val updatedAt: String,
    @Json(name = "createdAt") val createdAt: String
)

/**
 * Mirrors DeviceSyncResponse from backend types/api.ts
 */
@JsonClass(generateAdapter = true)
data class DeviceSyncResponse(
    @Json(name = "tenantId") val tenantId: Int,
    @Json(name = "deviceId") val deviceId: Int?,
    @Json(name = "deviceName") val deviceName: String?,
    @Json(name = "serverTime") val serverTime: String,
    @Json(name = "since") val since: String?,
    @Json(name = "page") val page: Int,
    @Json(name = "limit") val limit: Int,
    @Json(name = "total") val total: Int,
    @Json(name = "hasMore") val hasMore: Boolean,
    @Json(name = "embeddings") val embeddings: List<FaceEmbeddingRecord>,
    /** Extractor the server expects this device to use, e.g. "mobilefacenet_112_v1". */
    @Json(name = "modelId") val modelId: String? = null,
    /** Dimension of every vector in [embeddings]. Used to evict stale local rows. */
    @Json(name = "embeddingDimension") val embeddingDimension: Int? = null,
    /** Enrolled vectors the server withheld because they came from another model. */
    @Json(name = "skippedIncompatible") val skippedIncompatible: Int? = null
)

/**
 * Request body for POST /api/kiosk/verify-access
 */
@JsonClass(generateAdapter = true)
data class VerifyAccessRequest(
    @Json(name = "subscriber_id") val subscriberId: Int? = null,
    @Json(name = "email") val email: String? = null,
    @Json(name = "phone") val phone: String? = null
)

/**
 * Subscriber info returned by verify-access
 */
@JsonClass(generateAdapter = true)
data class SubscriberInfo(
    @Json(name = "id") val id: Int,
    @Json(name = "name") val name: String,
    @Json(name = "email") val email: String?,
    @Json(name = "planName") val planName: String?,
    @Json(name = "endDate") val endDate: String?,
    @Json(name = "daysLeft") val daysLeft: Int,
    @Json(name = "status") val status: String
)

/**
 * Response from POST /api/kiosk/verify-access
 */
@JsonClass(generateAdapter = true)
data class AccessResult(
    @Json(name = "accessGranted") val accessGranted: Boolean,
    @Json(name = "subscriber") val subscriber: SubscriberInfo?,
    @Json(name = "reason") val reason: String
)

/**
 * Request body for POST /api/kiosk/enroll-face
 */
@JsonClass(generateAdapter = true)
data class EnrollFaceRequest(
    @Json(name = "subscriber_id") val subscriberId: Int,
    @Json(name = "face_vector") val faceVector: List<Float>
)

/**
 * Response from POST /api/kiosk/enroll-face
 */
@JsonClass(generateAdapter = true)
data class EnrollFaceResponse(
    @Json(name = "success") val success: Boolean,
    @Json(name = "message") val message: String?
)

/**
 * Request body for POST /api/devices/pair — exchanges a short-lived pairing code
 * (typed in from the admin panel) for this device's permanent token.
 */
@JsonClass(generateAdapter = true)
data class PairRequest(
    @Json(name = "pairing_code") val pairingCode: String
)

/**
 * Response from POST /api/devices/pair
 */
@JsonClass(generateAdapter = true)
data class PairResponse(
    @Json(name = "success") val success: Boolean,
    @Json(name = "device_token") val deviceToken: String,
    @Json(name = "tenant_id") val tenantId: Int,
    @Json(name = "tenant_name") val tenantName: String?,
    @Json(name = "device_name") val deviceName: String?
)
