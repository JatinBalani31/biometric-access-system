package com.biometric.kiosk.ml

import android.content.Context
import android.graphics.Bitmap
import android.graphics.Matrix
import dagger.hilt.android.qualifiers.ApplicationContext
import org.tensorflow.lite.Interpreter
import org.tensorflow.lite.gpu.CompatibilityList
import org.tensorflow.lite.gpu.GpuDelegate
import java.io.FileInputStream
import java.io.IOException
import java.nio.ByteBuffer
import java.nio.ByteOrder
import java.nio.MappedByteBuffer
import java.nio.channels.FileChannel
import javax.inject.Inject
import javax.inject.Singleton
import kotlin.math.sqrt

/**
 * TFLite MobileFaceNet inference wrapper.
 *
 * Input:  160×160 RGB face crop, normalized to [-1.0, 1.0]
 * Output: 128-dimensional L2-normalized face embedding vector
 *
 * The model file (mobilefacenet.tflite) must be placed in app/src/main/assets/.
 * Download from: https://github.com/sirius-ai/MobileFaceNet_TF or
 * the MediaPipe FaceNet model on TF Hub (converted to TFLite).
 *
 * GPU acceleration is used when available (CompatibilityList check).
 * Falls back gracefully to CPU if GPU delegate is not supported.
 */
@Singleton
class FaceEmbedder @Inject constructor(
    @ApplicationContext private val context: Context
) {
    companion object {
        private const val MODEL_FILENAME = "mobilefacenet.tflite"
        private const val INPUT_SIZE = 160          // MobileFaceNet expects 160×160
        private const val EMBEDDING_SIZE = 128       // Output dimension
        private const val FLOAT_SIZE = 4             // bytes per float
        private const val IMAGE_MEAN = 127.5f
        private const val IMAGE_STD = 128.0f
    }

    private var interpreter: Interpreter? = null
    private var gpuDelegate: GpuDelegate? = null

    init {
        try {
            setupInterpreter()
        } catch (e: IOException) {
            android.util.Log.e("FaceEmbedder", "Failed to load TFLite model: ${e.message}")
            // App will work in degraded mode — face matching won't work until model loads
        }
    }

    private fun setupInterpreter() {
        val model = loadModelFile()
        val options = Interpreter.Options()

        // Prefer GPU acceleration for faster inference on mid-range tablets
        val compatList = CompatibilityList()
        if (compatList.isDelegateSupportedOnThisDevice) {
            gpuDelegate = GpuDelegate(compatList.bestOptionsForThisDevice)
            options.addDelegate(gpuDelegate!!)
            android.util.Log.i("FaceEmbedder", "GPU delegate enabled")
        } else {
            options.numThreads = 4  // Use 4 threads for CPU inference
            android.util.Log.i("FaceEmbedder", "Using CPU inference with 4 threads")
        }

        interpreter = Interpreter(model, options)
    }

    /**
     * Generate a 128-dimensional L2-normalized face embedding from a bitmap face crop.
     *
     * @param faceBitmap  The face region crop (any size — resized internally to 160×160)
     * @return  FloatArray of size 128, L2-normalized, or null if the model isn't ready
     */
    fun embed(faceBitmap: Bitmap): FloatArray? {
        val interp = interpreter ?: return null

        // 1. Resize and normalize the face crop to model input format
        val inputBuffer = preprocessBitmap(faceBitmap)

        // 2. Allocate output buffer: [1, 128] float32 array
        val outputBuffer = Array(1) { FloatArray(EMBEDDING_SIZE) }

        // 3. Run TFLite inference
        interp.run(inputBuffer, outputBuffer)

        // 4. Extract embedding and L2-normalize it
        val embedding = outputBuffer[0]
        return l2Normalize(embedding)
    }

    /**
     * Converts a Bitmap to a ByteBuffer suitable for TFLite input.
     * Applies center-crop resize and normalizes pixels from [0,255] to [-1.0, 1.0].
     */
    private fun preprocessBitmap(bitmap: Bitmap): ByteBuffer {
        val resized = resizeBitmap(bitmap, INPUT_SIZE, INPUT_SIZE)

        val buffer = ByteBuffer.allocateDirect(1 * INPUT_SIZE * INPUT_SIZE * 3 * FLOAT_SIZE)
        buffer.order(ByteOrder.nativeOrder())

        val pixels = IntArray(INPUT_SIZE * INPUT_SIZE)
        resized.getPixels(pixels, 0, INPUT_SIZE, 0, 0, INPUT_SIZE, INPUT_SIZE)

        for (pixel in pixels) {
            val r = ((pixel shr 16) and 0xFF)
            val g = ((pixel shr 8) and 0xFF)
            val b = (pixel and 0xFF)
            // Normalize to [-1.0, 1.0]
            buffer.putFloat((r - IMAGE_MEAN) / IMAGE_STD)
            buffer.putFloat((g - IMAGE_MEAN) / IMAGE_STD)
            buffer.putFloat((b - IMAGE_MEAN) / IMAGE_STD)
        }

        buffer.rewind()
        if (resized != bitmap) resized.recycle()
        return buffer
    }

    private fun resizeBitmap(bitmap: Bitmap, width: Int, height: Int): Bitmap {
        if (bitmap.width == width && bitmap.height == height) return bitmap
        val scaleX = width.toFloat() / bitmap.width
        val scaleY = height.toFloat() / bitmap.height
        val matrix = Matrix().apply { setScale(scaleX, scaleY) }
        return Bitmap.createBitmap(bitmap, 0, 0, bitmap.width, bitmap.height, matrix, false)
    }

    /**
     * L2-normalize a vector so cosine similarity == dot product.
     * Both stored embeddings and probe embeddings must be L2-normalized for
     * the CosineMatcher to work correctly.
     */
    private fun l2Normalize(vector: FloatArray): FloatArray {
        var norm = 0f
        for (v in vector) norm += v * v
        norm = sqrt(norm)
        if (norm < 1e-10f) return vector
        return FloatArray(vector.size) { vector[it] / norm }
    }

    private fun loadModelFile(): MappedByteBuffer {
        val fileDescriptor = context.assets.openFd(MODEL_FILENAME)
        val inputStream = FileInputStream(fileDescriptor.fileDescriptor)
        val fileChannel = inputStream.channel
        val startOffset = fileDescriptor.startOffset
        val declaredLength = fileDescriptor.declaredLength
        return fileChannel.map(FileChannel.MapMode.READ_ONLY, startOffset, declaredLength)
    }

    fun close() {
        interpreter?.close()
        gpuDelegate?.close()
        interpreter = null
        gpuDelegate = null
    }
}
