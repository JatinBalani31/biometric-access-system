package com.biometric.kiosk.data.db

import androidx.room.*

@Dao
interface EmbeddingDao {

    /**
     * Insert or replace all embedding records. Used during sync to upsert
     * new/updated embeddings from the server. Existing records with matching
     * subscriber_id are replaced atomically.
     */
    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun upsertAll(embeddings: List<EmbeddingEntity>)

    /**
     * Get all active embeddings for a tenant — used by [CosineMatcher] for
     * on-device face matching. Only returns "active" status records.
     */
    @Query("SELECT * FROM face_embeddings WHERE tenant_id = :tenantId AND status = 'active'")
    suspend fun getActiveByTenant(tenantId: Int): List<EmbeddingEntity>

    /**
     * Delete embeddings whose status is "revoked" for a tenant.
     * Called after each successful sync to clean up de-provisioned subscribers.
     */
    @Query("DELETE FROM face_embeddings WHERE tenant_id = :tenantId AND status = 'revoked'")
    suspend fun deleteRevoked(tenantId: Int)

    /**
     * Get the most recent updatedAt timestamp across all embeddings for
     * a tenant. Used as the `since` parameter for the next incremental sync.
     */
    @Query("SELECT MAX(updated_at) FROM face_embeddings WHERE tenant_id = :tenantId")
    suspend fun getLastUpdatedAt(tenantId: Int): String?

    /** Total number of cached embeddings for a tenant */
    @Query("SELECT COUNT(*) FROM face_embeddings WHERE tenant_id = :tenantId")
    suspend fun getCount(tenantId: Int): Int

    /** Wipe all embeddings — called from admin "Log Out / Clear Device" */
    @Query("DELETE FROM face_embeddings")
    suspend fun deleteAll()

    /**
     * Drop specific cached rows. Used to evict embeddings that were enrolled with a
     * different model: the server simply stops sending them, which an incremental
     * sync would otherwise never notice, leaving an unmatchable face in the cache.
     */
    @Query("DELETE FROM face_embeddings WHERE subscriber_id IN (:subscriberIds)")
    suspend fun deleteByIds(subscriberIds: List<Int>)

    /** Get a single embedding by subscriber ID for debug/admin screens */
    @Query("SELECT * FROM face_embeddings WHERE subscriber_id = :subscriberId LIMIT 1")
    suspend fun getById(subscriberId: Int): EmbeddingEntity?

    /** Get all embeddings for tenant */
    @Query("SELECT * FROM face_embeddings WHERE tenant_id = :tenantId")
    suspend fun getAllByTenant(tenantId: Int): List<EmbeddingEntity>

    /** Get all active embeddings regardless of tenant id */
    @Query("SELECT * FROM face_embeddings WHERE status = 'active'")
    suspend fun getAllActive(): List<EmbeddingEntity>

    /** Get all embeddings regardless of tenant id */
    @Query("SELECT * FROM face_embeddings")
    suspend fun getAll(): List<EmbeddingEntity>
}
