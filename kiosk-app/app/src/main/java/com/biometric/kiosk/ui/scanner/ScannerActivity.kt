package com.biometric.kiosk.ui.scanner

import android.Manifest
import android.content.Intent
import android.content.pm.PackageManager
import android.graphics.Bitmap
import android.graphics.Matrix
import android.graphics.Rect
import android.os.Bundle
import android.view.MotionEvent
import android.view.View
import android.view.WindowManager
import android.widget.Toast
import androidx.activity.result.contract.ActivityResultContracts
import androidx.activity.viewModels
import androidx.annotation.OptIn
import androidx.appcompat.app.AppCompatActivity
import androidx.camera.core.*
import androidx.camera.lifecycle.ProcessCameraProvider
import androidx.core.content.ContextCompat
import androidx.lifecycle.lifecycleScope
import com.biometric.kiosk.R
import com.biometric.kiosk.data.db.EmbeddingEntity
import com.biometric.kiosk.data.prefs.DevicePrefs
import com.biometric.kiosk.ml.FaceAligner
import com.biometric.kiosk.databinding.ActivityScannerBinding
import com.biometric.kiosk.sync.EmbeddingSyncWorker
import com.biometric.kiosk.ui.admin.AdminActivity
import com.biometric.kiosk.ui.result.AccessResultFragment
import com.google.mlkit.vision.common.InputImage
import com.google.mlkit.vision.face.FaceDetection
import com.google.mlkit.vision.face.FaceDetector
import com.google.mlkit.vision.face.FaceDetectorOptions
import dagger.hilt.android.AndroidEntryPoint
import kotlinx.coroutines.launch
import java.util.concurrent.ExecutorService
import java.util.concurrent.Executors
import javax.inject.Inject

@AndroidEntryPoint
class ScannerActivity : AppCompatActivity() {

    private lateinit var binding: ActivityScannerBinding
    private val viewModel: ScannerViewModel by viewModels()

    @Inject
    lateinit var devicePrefs: DevicePrefs

    private lateinit var cameraExecutor: ExecutorService
    private lateinit var faceDetector: FaceDetector

    // ── Triple-tap corner gesture to open admin ───────────────────────────────
    private var tapCount = 0
    private var lastTapTime = 0L
    private val TRIPLE_TAP_WINDOW_MS = 2000L

    // ── Camera permission ─────────────────────────────────────────────────────
    private val requestPermissionLauncher = registerForActivityResult(
        ActivityResultContracts.RequestPermission()
    ) { granted ->
        if (granted) startCamera() else showPermissionDenied()
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        // Unpaired kiosk — send it to the pairing screen instead of starting the scanner.
        if (!devicePrefs.isRegistered || devicePrefs.deviceToken.isBlank()) {
            startActivity(Intent(this, com.biometric.kiosk.ui.pairing.PairingActivity::class.java))
            finish()
            return
        }

        binding = ActivityScannerBinding.inflate(layoutInflater)
        setContentView(binding.root)

        // ── Kiosk / immersive mode ────────────────────────────────────────────
        window.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
        window.addFlags(WindowManager.LayoutParams.FLAG_SHOW_WHEN_LOCKED)
        window.addFlags(WindowManager.LayoutParams.FLAG_TURN_SCREEN_ON)
        hideSystemUI()

        // ── Start lock-task mode (requires device owner policy) ───────────────
        try {
            startLockTask()
        } catch (e: Exception) {
            // Not a device owner — app will run in standard mode
            android.util.Log.w("ScannerActivity", "Lock task not available: ${e.message}")
        }

        // ── Configure ML Kit Face Detector ────────────────────────────────────
        // Landmarks are required: FaceAligner uses the two eye centres to map each
        // face onto the canonical 112x112 crop MobileFaceNet expects. Without them
        // the network sees an unaligned, arbitrarily-rolled box and accuracy drops
        // sharply.
        val options = FaceDetectorOptions.Builder()
            .setPerformanceMode(FaceDetectorOptions.PERFORMANCE_MODE_FAST)
            .setLandmarkMode(FaceDetectorOptions.LANDMARK_MODE_ALL)
            .setClassificationMode(FaceDetectorOptions.CLASSIFICATION_MODE_NONE)
            .setMinFaceSize(0.20f)   // Minimum face size: 20% of shorter image dimension
            .enableTracking()
            .build()
        faceDetector = FaceDetection.getClient(options)

        cameraExecutor = Executors.newSingleThreadExecutor()

        // ── Trigger immediate sync on launch, then fall back to the admin-configured
        // interval (defaults to once a day — the kiosk matches from its local cache
        // offline between syncs, so it only needs connectivity briefly). ─────────────
        EmbeddingSyncWorker.runImmediateSync(this)
        EmbeddingSyncWorker.schedulePeriodicSync(this, intervalMinutes = devicePrefs.syncIntervalMinutes)

        // ── Observe scanner state ─────────────────────────────────────────────
        viewModel.state.observe(this) { state ->
            when (state) {
                is ScannerViewModel.ScannerState.Scanning -> {
                    dismissResultFragment()
                    updateStatusText("Position your face in the frame")
                }
                is ScannerViewModel.ScannerState.Matched -> {
                    showResultFragment(matched = true, entity = state.entity, score = state.score)
                }
                is ScannerViewModel.ScannerState.NotRecognized -> {
                    showResultFragment(matched = false, entity = null, score = 0f)
                }
                is ScannerViewModel.ScannerState.SyncRequired -> {
                    updateStatusText("⏳ Loading subscriber data...")
                }
                is ScannerViewModel.ScannerState.IncompatibleGallery -> {
                    updateStatusText("⚠ Cached faces were enrolled with a different model — re-enrol required")
                }
            }
        }

        viewModel.cachedCount.observe(this) { count ->
            binding.tvCachedCount.text = "$count members cached"
        }

        viewModel.lastSyncAt.observe(this) { lastSync ->
            binding.tvLastSync.text = if (lastSync != null)
                "Last sync: ${lastSync.take(19).replace("T", " ")}"
            else
                "Last sync: Never"
        }

        // ── Camera permission ──────────────────────────────────────────────────
        if (ContextCompat.checkSelfPermission(this, Manifest.permission.CAMERA)
            == PackageManager.PERMISSION_GRANTED
        ) {
            startCamera()
        } else {
            requestPermissionLauncher.launch(Manifest.permission.CAMERA)
        }

        // ── Direct Admin Gear Button Click ────────────────────────────────────
        binding.btnAdminGear.setOnClickListener {
            showAdminPinDialog()
        }

        // ── Tap to Sync directly from screen ──────────────────────────────────
        val syncListener = View.OnClickListener {
            EmbeddingSyncWorker.runImmediateSync(this)
            Toast.makeText(this, "⟳ Syncing subscribers with server...", Toast.LENGTH_SHORT).show()
        }
        binding.statusBar.setOnClickListener(syncListener)
        binding.tvCachedCount.setOnClickListener(syncListener)

        // ── Triple-tap corner gesture on the top-right corner overlay ─────────
        binding.adminTapTarget.setOnClickListener {
            val now = System.currentTimeMillis()
            if (now - lastTapTime > TRIPLE_TAP_WINDOW_MS) tapCount = 0
            tapCount++
            lastTapTime = now
            if (tapCount >= 3) {
                tapCount = 0
                showAdminPinDialog()
            }
        }
    }

    // ── Camera Setup ──────────────────────────────────────────────────────────

    private fun startCamera() {
        val cameraProviderFuture = ProcessCameraProvider.getInstance(this)
        cameraProviderFuture.addListener({
            val cameraProvider = cameraProviderFuture.get()

            val preview = Preview.Builder().build().also {
                it.setSurfaceProvider(binding.previewView.surfaceProvider)
            }

            val imageAnalysis = ImageAnalysis.Builder()
                .setBackpressureStrategy(ImageAnalysis.STRATEGY_KEEP_ONLY_LATEST)
                .setOutputImageFormat(ImageAnalysis.OUTPUT_IMAGE_FORMAT_YUV_420_888)
                .build()

            imageAnalysis.setAnalyzer(cameraExecutor) { imageProxy ->
                analyzeFrame(imageProxy)
            }

            val cameraSelector = CameraSelector.DEFAULT_FRONT_CAMERA

            try {
                cameraProvider.unbindAll()
                cameraProvider.bindToLifecycle(
                    this, cameraSelector, preview, imageAnalysis
                )
            } catch (e: Exception) {
                android.util.Log.e("ScannerActivity", "Camera bind failed: ${e.message}")
            }
        }, ContextCompat.getMainExecutor(this))
    }

    @OptIn(ExperimentalGetImage::class)
    private fun analyzeFrame(imageProxy: ImageProxy) {
        // Only process when in scanning state
        if (viewModel.state.value !is ScannerViewModel.ScannerState.Scanning) {
            imageProxy.close()
            return
        }

        val mediaImage = imageProxy.image ?: run { imageProxy.close(); return }
        val rotationDegrees = imageProxy.imageInfo.rotationDegrees

        val inputImage = InputImage.fromMediaImage(mediaImage, rotationDegrees)

        faceDetector.process(inputImage)
            .addOnSuccessListener { faces ->
                if (faces.isNotEmpty()) {
                    // Use the largest face (closest to camera)
                    val face = faces.maxByOrNull { it.boundingBox.width() * it.boundingBox.height() }!!

                    // Skip frames the network cannot do anything useful with. The next
                    // frame is ~30ms away, so rejecting is cheaper than a bad embedding.
                    if (!FaceAligner.isGoodQuality(face)) {
                        updateStatusText("Look straight at the camera")
                        return@addOnSuccessListener
                    }

                    val bitmap = try {
                        // CameraX's own converter — handles YUV row/pixel strides correctly.
                        imageProxy.toBitmap()
                    } catch (e: Exception) {
                        android.util.Log.w("ScannerActivity", "Frame conversion failed: ${e.message}")
                        return@addOnSuccessListener
                    }
                    val upright = rotateBitmap(bitmap, rotationDegrees)

                    // ML Kit reports landmarks in the rotated (upright) frame, which is
                    // the same space `upright` is in — so they can be used directly.
                    val faceCrop = FaceAligner.align(upright, face)
                    if (upright != bitmap) upright.recycle()

                    viewModel.processFace(faceCrop)
                }
            }
            .addOnFailureListener { e ->
                android.util.Log.w("ScannerActivity", "Face detection failed: ${e.message}")
            }
            .addOnCompleteListener {
                imageProxy.close()
            }
    }

    /**
     * Rotate the analysis frame upright so it shares a coordinate space with the
     * bounding box and landmarks ML Kit reported for the rotated InputImage.
     * Cropping and alignment are handled by [FaceAligner].
     */
    private fun rotateBitmap(bitmap: Bitmap, rotationDegrees: Int): Bitmap {
        if (rotationDegrees == 0) return bitmap
        val matrix = Matrix().apply { postRotate(rotationDegrees.toFloat()) }
        return Bitmap.createBitmap(bitmap, 0, 0, bitmap.width, bitmap.height, matrix, true)
    }

    // ── UI Helpers ─────────────────────────────────────────────────────────────

    private fun showResultFragment(matched: Boolean, entity: EmbeddingEntity?, score: Float) {
        val fragment = AccessResultFragment.newInstance(matched, entity, score)
        supportFragmentManager.beginTransaction()
            .replace(R.id.result_container, fragment, AccessResultFragment.TAG)
            .commit()
    }

    private fun dismissResultFragment() {
        supportFragmentManager.findFragmentByTag(AccessResultFragment.TAG)?.let {
            supportFragmentManager.beginTransaction().remove(it).commit()
        }
    }

    private fun updateStatusText(text: String) {
        runOnUiThread { binding.tvStatus.text = text }
    }

    private fun showAdminPinDialog() {
        // Show PIN entry dialog
        val fragment = AdminPinDialogFragment()
        fragment.show(supportFragmentManager, "AdminPinDialog")
    }

    private fun showPermissionDenied() {
        binding.tvStatus.text = "Camera permission required for face recognition"
        Toast.makeText(this, "Camera permission denied", Toast.LENGTH_LONG).show()
    }

    private fun hideSystemUI() {
        window.decorView.systemUiVisibility = (
            View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY
                or View.SYSTEM_UI_FLAG_LAYOUT_STABLE
                or View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION
                or View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN
                or View.SYSTEM_UI_FLAG_HIDE_NAVIGATION
                or View.SYSTEM_UI_FLAG_FULLSCREEN
            )
    }

    override fun onWindowFocusChanged(hasFocus: Boolean) {
        super.onWindowFocusChanged(hasFocus)
        if (hasFocus) hideSystemUI()
    }

    override fun onBackPressed() {
        // Stop lock-task / screen-pinning mode, then fully exit
        try {
            stopLockTask()
        } catch (e: Exception) {
            android.util.Log.w("ScannerActivity", "stopLockTask failed: ${e.message}")
        }
        finishAffinity()
    }

    override fun onDestroy() {
        super.onDestroy()
        cameraExecutor.shutdown()
        faceDetector.close()
    }
}
// The hand-rolled ImageProxy.toBitmap() extension that used to live here ignored
// plane row/pixel strides and was shadowed by CameraX's own member function
// anyway. ImageProxy.toBitmap() from camera-core is used directly instead.
