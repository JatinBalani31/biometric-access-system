package com.biometric.kiosk.ml

import com.biometric.kiosk.data.db.EmbeddingEntity
import javax.inject.Inject
import javax.inject.Singleton

/**
 * Cosine similarity matcher for face recognition.
 *
 * Both the probe embedding (from the live camera frame) and the gallery
 * embeddings (from the local SQLCipher DB) must be L2-normalized.
 * This means cosine similarity = dot product, which is computationally cheap.
 *
 * Algorithm:
 *   similarity = Σ(probe[i] * gallery[i])   (since both are unit vectors)
 *   match = similarity > threshold
 *
 * The threshold is configurable via [DevicePrefs.similarityThreshold].
 * Typical values for MobileFaceNet:
 *   0.60 = permissive (fewer false rejections, more false accepts)
 *   0.65 = balanced (recommended default)
 *   0.72 = strict (fewer false accepts, more false rejections)
 */
@Singleton
class CosineMatcher @Inject constructor() {

    /**
     * Find the best matching embedding from the gallery and check if it
     * exceeds the similarity threshold.
     *
     * @param probe      L2-normalized 128-d embedding from the live face
     * @param gallery    All cached embeddings for the tenant from local DB
     * @param threshold  Minimum cosine similarity to accept as a match
     * @return [MatchResult] with the best match or null if no match found
     */
    fun findBestMatch(
        probe: FloatArray,
        gallery: List<EmbeddingEntity>,
        threshold: Float
    ): MatchResult {
        if (gallery.isEmpty()) {
            return MatchResult(match = null, score = 0f, reason = MatchReason.GALLERY_EMPTY)
        }

        var bestScore = -1f
        var bestEntity: EmbeddingEntity? = null
        var incompatible = 0

        for (entity in gallery) {
            val galleryVector = try {
                entity.toFloatArray().also {
                    if (it.isEmpty()) android.util.Log.e("CosineMatcher", "Empty vector for ${entity.subscriberName}")
                }
            } catch (e: Exception) {
                android.util.Log.e("CosineMatcher", "Failed to parse vector for ${entity.subscriberName}: ${e.message}")
                continue // Skip malformed entries
            }

            // Vectors of differing length came from a different extractor. Truncating and
            // comparing them yields a meaningless near-zero score that presents as
            // "face not recognised" — the exact failure this guard exists to surface.
            if (galleryVector.size != probe.size) {
                incompatible++
                android.util.Log.e(
                    "CosineMatcher",
                    "Skipping ${entity.subscriberName} (ID ${entity.subscriberId}): enrolled as " +
                        "${galleryVector.size}-D but this device produces ${probe.size}-D. " +
                        "They were enrolled with a different model and must re-enrol."
                )
                continue
            }

            val score = cosineSimilarity(probe, galleryVector)

            android.util.Log.d("CosineMatcher", "Subscriber ${entity.subscriberName} (ID ${entity.subscriberId}): score = $score, threshold = $threshold")

            if (score > bestScore) {
                bestScore = score
                bestEntity = entity
            }
        }

        return when {
            bestEntity == null && incompatible > 0 ->
                MatchResult(null, 0f, MatchReason.INCOMPATIBLE_GALLERY)
            bestEntity == null -> MatchResult(null, 0f, MatchReason.GALLERY_EMPTY)
            bestScore >= threshold -> MatchResult(bestEntity, bestScore, MatchReason.MATCH)
            else -> MatchResult(null, bestScore, MatchReason.BELOW_THRESHOLD)
        }
    }

    /**
     * Cosine similarity between two L2-normalized vectors.
     * For unit vectors: cosine_similarity = dot_product.
     *
     * Returns value in [-1.0, 1.0]. Identical vectors → 1.0. Orthogonal → 0.0.
     */
    private fun cosineSimilarity(a: FloatArray, b: FloatArray): Float {
        var dot = 0f
        for (i in a.indices) dot += a[i] * b[i]
        return dot
    }
}

data class MatchResult(
    val match: EmbeddingEntity?,
    val score: Float,
    val reason: MatchReason
) {
    val isMatch: Boolean get() = match != null && reason == MatchReason.MATCH
}

enum class MatchReason {
    MATCH,                // score >= threshold
    BELOW_THRESHOLD,      // best score < threshold
    GALLERY_EMPTY,        // no embeddings in DB yet (sync hasn't run)
    INCOMPATIBLE_GALLERY  // every cached vector came from a different model
}
