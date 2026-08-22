package com.biometric.kiosk.ui.scanner

import android.Manifest
import android.content.Intent
import android.content.pm.PackageManager
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.graphics.ImageFormat
import android.graphics.Matrix
import android.graphics.Rect
import android.graphics.YuvImage
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
import java.io.ByteArrayOutputStream
import java.util.concurrent.ExecutorService
import java.util.concurrent.Executors

@AndroidEntryPoint
class ScannerActivity : AppCompatActivity() {

    private lateinit var binding: ActivityScannerBinding
    private val viewModel: ScannerViewModel by viewModels()

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
        val options = FaceDetectorOptions.Builder()
            .setPerformanceMode(FaceDetectorOptions.PERFORMANCE_MODE_FAST)
            .setLandmarkMode(FaceDetectorOptions.LANDMARK_MODE_NONE)
            .setClassificationMode(FaceDetectorOptions.CLASSIFICATION_MODE_NONE)
            .setMinFaceSize(0.20f)   // Minimum face size: 20% of shorter image dimension
            .enableTracking()
            .build()
        faceDetector = FaceDetection.getClient(options)

        cameraExecutor = Executors.newSingleThreadExecutor()

        // ── Trigger immediate sync on launch ──────────────────────────────────
        EmbeddingSyncWorker.runImmediateSync(this)
        EmbeddingSyncWorker.schedulePeriodicSync(this, intervalMinutes = 15)

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
                    val bitmap = imageProxy.toBitmap()
                    val faceCrop = cropFace(bitmap, face.boundingBox, rotationDegrees)
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

    private fun cropFace(bitmap: Bitmap, boundingBox: Rect, rotationDegrees: Int): Bitmap {
        // Rotate bitmap to match display orientation
        val matrix = Matrix().apply { postRotate(rotationDegrees.toFloat()) }
        val rotated = Bitmap.createBitmap(bitmap, 0, 0, bitmap.width, bitmap.height, matrix, false)

        // Scale bounding box coordinates to match rotated bitmap
        val isRotated = rotationDegrees == 90 || rotationDegrees == 270
        val scaleX = rotated.width.toFloat() / (if (isRotated) bitmap.height else bitmap.width)
        val scaleY = rotated.height.toFloat() / (if (isRotated) bitmap.width else bitmap.height)

        val left = (boundingBox.left * scaleX).toInt().coerceIn(0, rotated.width - 1)
        val top = (boundingBox.top * scaleY).toInt().coerceIn(0, rotated.height - 1)
        val width = (boundingBox.width() * scaleX).toInt().coerceIn(1, rotated.width - left)
        val height = (boundingBox.height() * scaleY).toInt().coerceIn(1, rotated.height - top)

        val crop = Bitmap.createBitmap(rotated, left, top, width, height)
        if (rotated != bitmap) rotated.recycle()
        return crop
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
        // Swallow back button in kiosk mode
    }

    override fun onDestroy() {
        super.onDestroy()
        cameraExecutor.shutdown()
        faceDetector.close()
    }
}

// ── Helper Extension: ImageProxy → Bitmap ─────────────────────────────────────

@OptIn(ExperimentalGetImage::class)
private fun ImageProxy.toBitmap(): Bitmap {
    val yBuffer = planes[0].buffer
    val vuBuffer = planes[2].buffer
    val ySize = yBuffer.remaining()
    val vuSize = vuBuffer.remaining()
    val nv21 = ByteArray(ySize + vuSize)
    yBuffer.get(nv21, 0, ySize)
    vuBuffer.get(nv21, ySize, vuSize)
    val yuvImage = YuvImage(nv21, ImageFormat.NV21, this.width, this.height, null)
    val out = ByteArrayOutputStream()
    yuvImage.compressToJpeg(Rect(0, 0, this.width, this.height), 90, out)
    val imageBytes = out.toByteArray()
    return BitmapFactory.decodeByteArray(imageBytes, 0, imageBytes.size)
}
