package com.biometric.kiosk.sync

import android.content.Context
import android.util.Log
import androidx.hilt.work.HiltWorker
import androidx.work.*
import com.biometric.kiosk.data.api.KioskApiService
import com.biometric.kiosk.data.db.EmbeddingDao
import com.biometric.kiosk.data.db.EmbeddingEntity
import com.biometric.kiosk.data.prefs.DevicePrefs
import dagger.assisted.Assisted
import dagger.assisted.AssistedInject
import java.util.concurrent.TimeUnit

/**
 * WorkManager background job that syncs face embeddings from the backend.
 *
 * Strategy:
 * - Full sync on first run (since = null)
 * - Incremental delta sync on subsequent runs (since = lastSyncAt)
 * - Upserts active embeddings, deletes revoked ones
 * - Updates lastSyncAt on success
 * - Retries with exponential backoff on network failure
 * - Works offline: kiosk continues matching from cached local DB
 */
@HiltWorker
class EmbeddingSyncWorker @AssistedInject constructor(
    @Assisted context: Context,
    @Assisted workerParams: WorkerParameters,
    private val apiService: KioskApiService,
    private val embeddingDao: EmbeddingDao,
    private val devicePrefs: DevicePrefs
) : CoroutineWorker(context, workerParams) {

    companion object {
        private const val TAG = "EmbeddingSyncWorker"
        const val WORK_NAME_PERIODIC = "embedding_sync_periodic"
        const val WORK_NAME_ONESHOT = "embedding_sync_oneshot"

        /**
         * Enqueue the periodic sync job. Call this on app start and when
         * the admin changes the sync interval.
         */
        fun schedulePeriodicSync(
            context: Context,
            intervalMinutes: Int,
            replaceExisting: Boolean = false
        ) {
            val constraints = Constraints.Builder()
                .setRequiredNetworkType(NetworkType.CONNECTED)
                .build()

            val request = PeriodicWorkRequestBuilder<EmbeddingSyncWorker>(
                intervalMinutes.toLong(), TimeUnit.MINUTES,
                (intervalMinutes / 2).toLong().coerceAtLeast(5), TimeUnit.MINUTES // flex interval
            )
                .setConstraints(constraints)
                .setBackoffCriteria(
                    BackoffPolicy.EXPONENTIAL,
                    WorkRequest.MIN_BACKOFF_MILLIS,
                    TimeUnit.MILLISECONDS
                )
                .build()

            val policy = if (replaceExisting)
                ExistingPeriodicWorkPolicy.CANCEL_AND_REENQUEUE
            else
                ExistingPeriodicWorkPolicy.KEEP

            WorkManager.getInstance(context)
                .enqueueUniquePeriodicWork(WORK_NAME_PERIODIC, policy, request)

            Log.i(TAG, "Periodic sync scheduled every $intervalMinutes minutes")
        }

        /** Trigger an immediate one-shot sync (e.g. on app start or admin "Force Sync") */
        fun runImmediateSync(context: Context) {
            val constraints = Constraints.Builder()
                .setRequiredNetworkType(NetworkType.CONNECTED)
                .build()

            val request = OneTimeWorkRequestBuilder<EmbeddingSyncWorker>()
                .setConstraints(constraints)
                .setBackoffCriteria(BackoffPolicy.EXPONENTIAL, 5, TimeUnit.SECONDS)
                .build()

            WorkManager.getInstance(context)
                .enqueueUniqueWork(
                    WORK_NAME_ONESHOT,
                    ExistingWorkPolicy.REPLACE,
                    request
                )

            Log.i(TAG, "Immediate sync enqueued")
        }
    }

    override suspend fun doWork(): Result {
        val token = devicePrefs.deviceToken
        val tenantId = devicePrefs.tenantId

        if (token.isEmpty()) {
            Log.w(TAG, "No device token configured — skipping sync")
            return Result.failure()
        }

        return try {
            // Use delta sync if we have a previous sync timestamp
            val since = devicePrefs.lastSyncAt
            Log.i(TAG, "Starting sync: tenantId=$tenantId, since=$since")

            var page = 1
            var totalSynced = 0
            var hasMore = true

            while (hasMore) {
                val response = apiService.getFaceEmbeddings(
                    token = token,
                    since = since,
                    limit = 100,
                    page = page
                )

                val (active, revoked) = response.embeddings.partition { it.status == "active" }

                // Upsert active embeddings into local DB
                if (active.isNotEmpty()) {
                    val entities = active.map { record ->
                        EmbeddingEntity(
                            subscriberId = record.subscriberId,
                            subscriberName = record.subscriberName,
                            email = record.email,
                            planName = record.planName ?: "Membership",
                            daysLeft = record.daysLeft ?: 0,
                            isExpired = record.isExpired ?: false,
                            status = record.status,
                            vector = record.vector.joinToString(","),
                            updatedAt = record.updatedAt,
                            tenantId = record.tenantId
                        )
                    }
                    embeddingDao.upsertAll(entities)
                }

                // Mark revoked entries for deletion
                if (revoked.isNotEmpty()) {
                    val revokedEntities = revoked.map { record ->
                        EmbeddingEntity(
                            subscriberId = record.subscriberId,
                            subscriberName = record.subscriberName,
                            email = record.email,
                            planName = null,
                            daysLeft = 0,
                            isExpired = true,
                            status = "revoked",
                            vector = "0",
                            updatedAt = record.updatedAt,
                            tenantId = record.tenantId
                        )
                    }
                    embeddingDao.upsertAll(revokedEntities)
                    embeddingDao.deleteRevoked(tenantId)
                }

                totalSynced += active.size
                hasMore = response.hasMore
                page++

                // Update server time as new baseline for next incremental sync
                if (!hasMore) {
                    devicePrefs.lastSyncAt = response.serverTime
                }
            }

            val cachedCount = embeddingDao.getCount(tenantId)
            Log.i(TAG, "Sync complete: synced=$totalSynced, total cached=$cachedCount")

            Result.success()
        } catch (e: Exception) {
            Log.e(TAG, "Sync failed: ${e.message}", e)
            // Retry with backoff — kiosk works offline from cached data in the meantime
            if (runAttemptCount < 3) Result.retry() else Result.failure()
        }
    }
}
