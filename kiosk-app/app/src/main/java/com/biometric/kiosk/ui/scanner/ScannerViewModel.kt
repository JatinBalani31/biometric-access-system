package com.biometric.kiosk.ui.scanner

import android.graphics.Bitmap
import android.graphics.Rect
import android.util.Log
import androidx.camera.core.ImageProxy
import androidx.lifecycle.LiveData
import androidx.lifecycle.MutableLiveData
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
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
    private val devicePrefs: DevicePrefs
) : ViewModel() {

    companion object {
        private const val TAG = "ScannerViewModel"
        /** Ignore frames for this many ms after showing a result (debounce) */
        private const val DEBOUNCE_MS = 5000L
        /** Delay before returning to scan after displaying result */
        private const val RESULT_DISPLAY_MS = 5000L
    }

    sealed class ScannerState {
        object Scanning : ScannerState()
        data class Matched(val entity: EmbeddingEntity, val score: Float) : ScannerState()
        object NotRecognized : ScannerState()
        object SyncRequired : ScannerState()  // shown when gallery is empty
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

    init {
        refreshStats()
    }

    fun refreshStats() {
        viewModelScope.launch {
            val tenantId = devicePrefs.tenantId
            _cachedCount.postValue(embeddingDao.getCount(tenantId))
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
                val tenantId = devicePrefs.tenantId
                val gallery = embeddingDao.getActiveByTenant(tenantId)

                if (gallery.isEmpty()) {
                    _state.postValue(ScannerState.SyncRequired)
                    resetAfterDelay()
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

                Log.d(TAG, "Match: score=${result.score}, reason=${result.reason}")

                when {
                    result.isMatch -> {
                        _state.postValue(ScannerState.Matched(result.match!!, result.score))
                        resetAfterDelay()
                    }
                    result.reason == MatchReason.GALLERY_EMPTY -> {
                        _state.postValue(ScannerState.SyncRequired)
                        resetAfterDelay()
                    }
                    else -> {
                        _state.postValue(ScannerState.NotRecognized)
                        resetAfterDelay()
                    }
                }
            } catch (e: Exception) {
                Log.e(TAG, "Error processing face: ${e.message}", e)
                isProcessing.set(false)
            }
        }
    }

    /** Returns to scanning state after the result display duration */
    private fun resetAfterDelay() {
        debounceJob?.cancel()
        debounceJob = viewModelScope.launch {
            delay(RESULT_DISPLAY_MS)
            _state.postValue(ScannerState.Scanning)
            isProcessing.set(false)
            refreshStats()
        }
    }

    /** Called from the scanner activity to reset immediately (e.g. user taps dismiss) */
    fun resetToScanning() {
        debounceJob?.cancel()
        _state.postValue(ScannerState.Scanning)
        isProcessing.set(false)
    }

    override fun onCleared() {
        super.onCleared()
        embedder.close()
    }
}
