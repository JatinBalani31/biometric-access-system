package com.biometric.kiosk.data.api

import retrofit2.http.*

/**
 * Retrofit interface for the B2B Kiosk backend REST API.
 * All requests authenticate with the device's x-device-token header.
 */
interface KioskApiService {

    /**
     * Incremental face embeddings sync.
     * GET /api/kiosk/face-embeddings
     *
     * @param token  Device bearer token (e.g. "dev_apex_kiosk_main_a109bf83")
     * @param since  ISO-8601 timestamp for delta sync. Null = full sync.
     * @param limit  Max embeddings per page (1–100)
     * @param page   Page number
     */
    @GET("api/kiosk/face-embeddings")
    suspend fun getFaceEmbeddings(
        @Header("x-device-token") token: String,
        @Query("since") since: String? = null,
        @Query("limit") limit: Int = 100,
        @Query("page") page: Int = 1
    ): DeviceSyncResponse

    /**
     * Server-side access verification (used as a secondary fallback or audit trail).
     * POST /api/kiosk/verify-access
     * Primary match is done on-device with cached embeddings.
     */
    @POST("api/kiosk/verify-access")
    suspend fun verifyAccess(
        @Header("x-device-token") token: String,
        @Body body: VerifyAccessRequest
    ): AccessResult

    /**
     * Enroll on-device face embedding directly to server.
     * POST /api/kiosk/enroll-face
     */
    @POST("api/kiosk/enroll-face")
    suspend fun enrollFace(
        @Header("x-device-token") token: String,
        @Body body: EnrollFaceRequest
    ): EnrollFaceResponse

    /**
     * Exchange a short-lived pairing code (generated in the admin panel) for this
     * device's permanent token. No device token required — the code itself is the
     * one-time credential for this single exchange.
     * POST /api/devices/pair
     */
    @POST("api/devices/pair")
    suspend fun pairDevice(@Body body: PairRequest): PairResponse
}

