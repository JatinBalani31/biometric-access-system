package com.biometric.kiosk.ml

import android.graphics.Bitmap
import android.graphics.Canvas
import android.graphics.Matrix
import android.graphics.Paint
import android.graphics.Rect
import com.google.mlkit.vision.face.Face
import com.google.mlkit.vision.face.FaceLandmark
import kotlin.math.abs
import kotlin.math.atan2
import kotlin.math.hypot
import kotlin.math.max

/**
 * Normalizes a detected face into the canonical 112x112 crop MobileFaceNet was
 * trained on.
 *
 * Feeding the raw detector box straight to the network is the single biggest
 * avoidable accuracy loss in this pipeline: the box is loosely cropped, keeps
 * whatever in-plane head roll the subject had, and varies in scale frame to
 * frame. A two-point (eye) similarity transform fixes all three.
 *
 * The web enrolment path performs the identical transform — see
 * src/lib/face-embedding.ts. Both sides must agree or embeddings will not be
 * comparable.
 */
object FaceAligner {

    const val OUTPUT_SIZE = 112

    /** ArcFace canonical eye positions for a 112x112 crop, in image coordinates. */
    private const val CANON_LEFT_EYE_X = 38.2946f
    private const val CANON_LEFT_EYE_Y = 51.6963f
    private const val CANON_RIGHT_EYE_X = 73.5318f
    private const val CANON_RIGHT_EYE_Y = 51.5014f

    /** Extra context kept around the box when landmarks are unavailable. */
    private const val BOX_MARGIN = 0.25f

    /**
     * Maximum head rotation accepted for recognition. MobileFaceNet degrades
     * sharply beyond roughly this much yaw, and a rejected frame costs nothing
     * because the next one arrives in ~30ms.
     */
    const val MAX_YAW_DEGREES = 20f
    const val MAX_ROLL_DEGREES = 20f

    /** Minimum eye separation in source pixels — rejects faces too far away. */
    private const val MIN_EYE_DISTANCE_PX = 24f

    /**
     * True when the face is square-on enough and close enough to be worth
     * embedding. Cheap to evaluate, and skipping bad frames raises the
     * effective match rate more than lowering the threshold does.
     */
    fun isGoodQuality(face: Face): Boolean {
        if (abs(face.headEulerAngleY) > MAX_YAW_DEGREES) return false
        if (abs(face.headEulerAngleZ) > MAX_ROLL_DEGREES) return false

        val left = face.getLandmark(FaceLandmark.LEFT_EYE)?.position
        val right = face.getLandmark(FaceLandmark.RIGHT_EYE)?.position
        if (left != null && right != null) {
            if (hypot(right.x - left.x, right.y - left.y) < MIN_EYE_DISTANCE_PX) return false
        }
        return true
    }

    /**
     * Produce a 112x112 aligned face crop from a full (already rotation-corrected)
     * frame.
     *
     * Falls back to a margined centre-crop of the bounding box when eye landmarks
     * are unavailable, which is still far better than the bare box.
     */
    fun align(frame: Bitmap, face: Face): Bitmap {
        val left = face.getLandmark(FaceLandmark.LEFT_EYE)?.position
        val right = face.getLandmark(FaceLandmark.RIGHT_EYE)?.position

        return if (left != null && right != null) {
            alignByEyes(frame, left.x, left.y, right.x, right.y)
        } else {
            cropByBox(frame, face.boundingBox)
        }
    }

    /**
     * Similarity transform mapping the two detected eye centres onto their
     * canonical positions. This removes roll, fixes scale, and centres the face
     * in one step.
     */
    private fun alignByEyes(
        frame: Bitmap,
        leftX: Float,
        leftY: Float,
        rightX: Float,
        rightY: Float
    ): Bitmap {
        val dx = rightX - leftX
        val dy = rightY - leftY
        val srcDist = hypot(dx, dy).takeIf { it > 1e-3f } ?: 1f

        val tdx = CANON_RIGHT_EYE_X - CANON_LEFT_EYE_X
        val tdy = CANON_RIGHT_EYE_Y - CANON_LEFT_EYE_Y

        val scale = hypot(tdx, tdy) / srcDist
        val angle = atan2(tdy, tdx) - atan2(dy, dx)

        val a = scale * kotlin.math.cos(angle)
        val b = scale * kotlin.math.sin(angle)
        val tx = CANON_LEFT_EYE_X - (a * leftX - b * leftY)
        val ty = CANON_LEFT_EYE_Y - (b * leftX + a * leftY)

        // Android Matrix is row-major [MSCALE_X MSKEW_X MTRANS_X; MSKEW_Y MSCALE_Y MTRANS_Y]
        // mapping x' = MSCALE_X*x + MSKEW_X*y + MTRANS_X
        val matrix = Matrix().apply {
            setValues(
                floatArrayOf(
                    a, -b, tx,
                    b, a, ty,
                    0f, 0f, 1f
                )
            )
        }

        val output = Bitmap.createBitmap(OUTPUT_SIZE, OUTPUT_SIZE, Bitmap.Config.ARGB_8888)
        Canvas(output).drawBitmap(
            frame,
            matrix,
            Paint(Paint.FILTER_BITMAP_FLAG or Paint.ANTI_ALIAS_FLAG)
        )
        return output
    }

    /** Square centre-crop of the detector box plus margin, scaled to 112x112. */
    private fun cropByBox(frame: Bitmap, box: Rect): Bitmap {
        val side = max(box.width(), box.height()) * (1f + BOX_MARGIN)
        val cx = box.exactCenterX()
        val cy = box.exactCenterY()

        val output = Bitmap.createBitmap(OUTPUT_SIZE, OUTPUT_SIZE, Bitmap.Config.ARGB_8888)
        val scale = OUTPUT_SIZE / side
        val matrix = Matrix().apply {
            postTranslate(-(cx - side / 2f), -(cy - side / 2f))
            postScale(scale, scale)
        }
        Canvas(output).drawBitmap(
            frame,
            matrix,
            Paint(Paint.FILTER_BITMAP_FLAG or Paint.ANTI_ALIAS_FLAG)
        )
        return output
    }
}
