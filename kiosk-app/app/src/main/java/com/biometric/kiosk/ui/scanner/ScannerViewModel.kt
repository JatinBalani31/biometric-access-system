package com.biometric.kiosk.ui.scanner

import android.graphics.Bitmap
import android.graphics.Rect
import android.util.Log
import androidx.camera.core.ImageProxy
import androidx.lifecycle.LiveData
import androidx.lifecycle.MutableLiveData
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.biometric.kiosk.data.api.EnrollFaceRequest
import com.biometric.kiosk.data.api.KioskApiService
import com.biometric.kiosk.data.db.EmbeddingDao
import com.biometric.kiosk.data.db.EmbeddingEntity
import com.biometric.kiosk.data.prefs.DevicePrefs
import com.biometric.kiosk.ml.CosineMatcher
import com.biometric.kiosk.ml.FaceEmbedder
import com.biometric.kiosk.ml.MatchReason
import com.biometric.kiosk.ml.MatchResult
import com.biometric.kiosk.sync.EmbeddingSyncWorker
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.*
import java.util.concurrent.atomic.AtomicBoolean
import javax.inject.Inject

/**
 * ViewModel driving the scanner screen.
 * Orchestrates: face crop → embedding → matching → result display.
 */
@HiltViewModel
class ScannerViewModel @Inject constructor(
    private val embedder: FaceEmbedder,
    private val matcher: CosineMatcher,
    private val embeddingDao: EmbeddingDao,
    private val devicePrefs: DevicePrefs,
    private val apiService: KioskApiService
) : ViewModel() {

    companion object {
        private const val TAG = "ScannerViewModel"
        /** Duration to display green Access Granted card */
        private const val MATCH_DISPLAY_MS = 2500L
        /** Frames the same subscriber must win before access is granted. */
        private const val REQUIRED_CONSECUTIVE_HITS = 2
    }

    sealed class ScannerState {
        object Scanning : ScannerState()
        data class Matched(val entity: EmbeddingEntity, val score: Float) : ScannerState()
        object NotRecognized : ScannerState()
        object SyncRequired : ScannerState()  // shown when gallery is empty
        /** Every cached vector came from a different model — those members must re-enrol. */
        object IncompatibleGallery : ScannerState()
    }

    private val _state = MutableLiveData<ScannerState>(ScannerState.Scanning)
    val state: LiveData<ScannerState> = _state

    private val _cachedCount = MutableLiveData<Int>(0)
    val cachedCount: LiveData<Int> = _cachedCount

    private val _lastSyncAt = MutableLiveData<String?>(null)
    val lastSyncAt: LiveData<String?> = _lastSyncAt

    /** Prevents multiple concurrent matches / re-entry during result display */
    private val isProcessing = AtomicBoolean(false)
    private var debounceJob: Job? = null

    /**
     * Consecutive-frame confirmation. A single frame clearing the threshold can be a
     * fluke — a bad crop, motion blur, or a genuine near-miss against another member.
     * Requiring the same subscriber to win [REQUIRED_CONSECUTIVE_HITS] frames in a row
     * cuts false accepts sharply while costing under 100ms at camera frame rate.
     */
    private var pendingSubscriberId: Int? = null
    private var consecutiveHits = 0

    init {
        refreshStats()
    }

    fun refreshStats() {
        viewModelScope.launch {
            val all = embeddingDao.getAll()
            _cachedCount.postValue(all.size)
            _lastSyncAt.postValue(devicePrefs.lastSyncAt)
        }
    }

    /**
     * Process a detected face bitmap.
     *
     * @param faceBitmap   Cropped face region from ML Kit bounding box
     */
    fun processFace(faceBitmap: Bitmap) {
        // Debounce: ignore frames while result is showing or another match is in progress
        if (!isProcessing.compareAndSet(false, true)) return

        viewModelScope.launch(Dispatchers.Default) {
            try {
                val gallery = embeddingDao.getAllActive().ifEmpty { embeddingDao.getAll() }

                if (gallery.isEmpty()) {
                    android.util.Log.d(TAG, "Gallery empty in local SQLite")
                    isProcessing.set(false)
                    return@launch
                }

                // Generate embedding from face bitmap
                val probe = embedder.embed(faceBitmap)
                if (probe == null) {
                    Log.w(TAG, "Embedder returned null — model may not be loaded")
                    isProcessing.set(false)
                    return@launch
                }

                // Match against local gallery
                val threshold = devicePrefs.similarityThreshold
                val result = matcher.findBestMatch(probe, gallery, threshold)

                Log.d(TAG, "Match: score=${result.score}, reason=${result.reason}, isMatch=${result.isMatch}")

                when {
                    result.isMatch -> {
                        val entity = result.match!!
                        if (pendingSubscriberId == entity.subscriberId) {
                            consecutiveHits++
                        } else {
                            pendingSubscriberId = entity.subscriberId
                            consecutiveHits = 1
                        }

                        if (consecutiveHits >= REQUIRED_CONSECUTIVE_HITS) {
                            resetConfirmation()
                            _state.postValue(ScannerState.Matched(entity, result.score))
                            resetAfterDelay(MATCH_DISPLAY_MS)
                        } else {
                            // Need one more agreeing frame before opening the gate.
                            isProcessing.set(false)
                        }
                    }

                    result.reason == MatchReason.INCOMPATIBLE_GALLERY -> {
                        Log.e(
                            TAG,
                            "Every cached embedding has a different dimension than this device " +
                                "produces. Those members were enrolled with a different model and " +
                                "must re-enrol before they can be recognised."
                        )
                        resetConfirmation()
                        _state.postValue(ScannerState.IncompatibleGallery)
                        resetAfterDelay(2500L)
                    }

                    result.reason == MatchReason.GALLERY_EMPTY -> {
                        resetConfirmation()
                        _state.postValue(ScannerState.SyncRequired)
                        resetAfterDelay(1500L)
                    }

                    else -> {
                        // Smooth continuous scanning: do NOT freeze screen on non-matching frames!
                        // Immediately allow next frame to be analyzed.
                        resetConfirmation()
                        isProcessing.set(false)
                    }
                }
            } catch (e: Exception) {
                Log.e(TAG, "Error processing face: ${e.message}", e)
                isProcessing.set(false)
            }
        }
    }

    private fun resetConfirmation() {
        pendingSubscriberId = null
        consecutiveHits = 0
    }

    /** Returns to scanning state after the result display duration */
    private fun resetAfterDelay(delayMs: Long = MATCH_DISPLAY_MS) {
        debounceJob?.cancel()
        debounceJob = viewModelScope.launch {
            delay(delayMs)
            _state.postValue(ScannerState.Scanning)
            isProcessing.set(false)
            refreshStats()
        }
    }

    /** Called from the scanner activity to reset immediately (e.g. user taps dismiss) */
    fun resetToScanning() {
        debounceJob?.cancel()
        resetConfirmation()
        _state.postValue(ScannerState.Scanning)
        isProcessing.set(false)
    }

    /**
     * Enrolls the current face from camera directly for a subscriber using MobileFaceNet.
     * Updates local cache and uploads to server.
     */
    fun enrollCurrentFace(subscriberId: Int, subscriberName: String, faceBitmap: Bitmap, onComplete: ((Boolean, String) -> Unit)? = null) {
        viewModelScope.launch(Dispatchers.Default) {
            try {
                val probe = embedder.embed(faceBitmap) ?: run {
                    withContext(Dispatchers.Main) { onComplete?.invoke(false, "Face embedder returned null") }
                    return@launch
                }

                val tenantId = devicePrefs.tenantId
                val vectorStr = probe.joinToString(",")
                val nowStr = java.text.SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", java.util.Locale.US).format(java.util.Date())

                val entity = EmbeddingEntity(
                    subscriberId = subscriberId,
                    subscriberName = subscriberName,
                    email = "jatin@biometric.io",
                    planName = "Pro Access Plan",
                    daysLeft = 365,
                    isExpired = false,
                    status = "active",
                    vector = vectorStr,
                    updatedAt = nowStr,
                    tenantId = tenantId
                )

                embeddingDao.upsertAll(listOf(entity))

                // Upload to server asynchronously
                try {
                    apiService.enrollFace(
                        token = devicePrefs.deviceToken,
                        body = EnrollFaceRequest(
                            subscriberId = subscriberId,
                            faceVector = probe.toList()
                        )
                    )
                } catch (e: Exception) {
                    Log.w(TAG, "Server sync of enrolled face: ${e.message}")
                }

                withContext(Dispatchers.Main) {
                    refreshStats()
                    _state.postValue(ScannerState.Matched(entity, 0.99f))
                    resetAfterDelay(MATCH_DISPLAY_MS)
                    onComplete?.invoke(true, "Successfully enrolled face for $subscriberName!")
                }
            } catch (e: Exception) {
                Log.e(TAG, "Enroll error: ${e.message}", e)
                withContext(Dispatchers.Main) { onComplete?.invoke(false, "Enrollment error: ${e.message}") }
            }
        }
    }

    override fun onCleared() {
        super.onCleared()
        embedder.close()
    }
}
