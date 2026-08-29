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
 * Input:  112×112 RGB face crop, normalized to [-1.0, 1.0] via (x - 127.5) / 128
 * Output: 192-dimensional L2-normalized face embedding vector
 *
 * Crops must be eye-aligned by [FaceAligner] first — MobileFaceNet is trained on
 * canonically aligned faces and loses meaningful accuracy on raw detector boxes.
 *
 * This contract is mirrored exactly by the web enrolment path in
 * src/lib/face-embedding.ts, which loads the same .tflite file. Embeddings are
 * only comparable between identical extractors, so the two must never diverge.
 *
 * The model file (mobilefacenet.tflite) must be placed in app/src/main/assets/.
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
        private const val DEFAULT_INPUT_SIZE = 112
        private const val DEFAULT_EMBEDDING_SIZE = 192
        private const val FLOAT_SIZE = 4
        private const val IMAGE_MEAN = 127.5f
        private const val IMAGE_STD = 128.0f
    }

    private var interpreter: Interpreter? = null
    private var gpuDelegate: GpuDelegate? = null
    private var inputSize: Int = DEFAULT_INPUT_SIZE
    private var embeddingSize: Int = DEFAULT_EMBEDDING_SIZE

    init {
        try {
            setupInterpreter()
        } catch (e: IOException) {
            android.util.Log.e("FaceEmbedder", "Failed to load TFLite model: ${e.message}")
        }
    }

    private fun setupInterpreter() {
        val model = loadModelFile()
        val options = Interpreter.Options()

        val compatList = CompatibilityList()
        if (compatList.isDelegateSupportedOnThisDevice) {
            gpuDelegate = GpuDelegate(compatList.bestOptionsForThisDevice)
            options.addDelegate(gpuDelegate!!)
            android.util.Log.i("FaceEmbedder", "GPU delegate enabled")
        } else {
            options.numThreads = 4
            android.util.Log.i("FaceEmbedder", "Using CPU inference with 4 threads")
        }

        val interp = Interpreter(model, options)
        try {
            val inTensor = interp.getInputTensor(0)
            val outTensor = interp.getOutputTensor(0)
            val inShape = inTensor.shape()
            val outShape = outTensor.shape()

            inputSize = when {
                inShape.size >= 4 -> inShape[1].takeIf { it > 0 } ?: DEFAULT_INPUT_SIZE
                inShape.size >= 2 -> inShape[1].takeIf { it > 0 } ?: DEFAULT_INPUT_SIZE
                else -> DEFAULT_INPUT_SIZE
            }

            var prod = 1
            for (i in 1 until outShape.size) {
                if (outShape[i] > 0) prod *= outShape[i]
            }
            embeddingSize = if (prod in 32..2048) prod else DEFAULT_EMBEDDING_SIZE

            android.util.Log.i("FaceEmbedder", "Model initialized: inShape=${inShape.contentToString()}, outShape=${outShape.contentToString()}, inputSize=$inputSize, embeddingSize=$embeddingSize")

            if (inputSize != DEFAULT_INPUT_SIZE || embeddingSize != DEFAULT_EMBEDDING_SIZE) {
                android.util.Log.e(
                    "FaceEmbedder",
                    "MODEL CONTRACT MISMATCH: $MODEL_FILENAME is ${inputSize}px/${embeddingSize}-D but " +
                        "enrolment produces ${DEFAULT_INPUT_SIZE}px/${DEFAULT_EMBEDDING_SIZE}-D. " +
                        "All subscribers must be re-enrolled with the matching model."
                )
            }
        } catch (e: Exception) {
            android.util.Log.w("FaceEmbedder", "Could not inspect tensor shapes: ${e.message}")
        }
        interpreter = interp
    }

    /**
     * Generate L2-normalized face embedding from a bitmap face crop.
     */
    fun embed(faceBitmap: Bitmap): FloatArray? {
        val interp = interpreter ?: return null

        val inputBuffer = preprocessBitmap(faceBitmap)
        val outputBuffer = Array(1) { FloatArray(embeddingSize) }

        interp.run(inputBuffer, outputBuffer)

        val embedding = outputBuffer[0]
        return l2Normalize(embedding)
    }

    /**
     * Converts a Bitmap to a ByteBuffer suitable for facenet.tflite input.
     * Applies center-crop resize and normalizes pixels from [0,255] to [-1.0, 1.0].
     */
    private fun preprocessBitmap(bitmap: Bitmap): ByteBuffer {
        val resized = resizeBitmap(bitmap, inputSize, inputSize)

        val buffer = ByteBuffer.allocateDirect(1 * inputSize * inputSize * 3 * FLOAT_SIZE)
        buffer.order(ByteOrder.nativeOrder())

        val pixels = IntArray(inputSize * inputSize)
        resized.getPixels(pixels, 0, inputSize, 0, 0, inputSize, inputSize)

        for (pixel in pixels) {
            val r = ((pixel shr 16) and 0xFF)
            val g = ((pixel shr 8) and 0xFF)
            val b = (pixel and 0xFF)
            // Normalize to [-1.0, 1.0] (FaceNet standard)
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
