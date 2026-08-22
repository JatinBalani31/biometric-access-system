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
    @Json(name = "vector") val vector: List<Float>,   // 128-d MobileFaceNet embedding
    @Json(name = "vectorDimension") val vectorDimension: Int,
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
    @Json(name = "embeddings") val embeddings: List<FaceEmbeddingRecord>
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
