package com.biometric.kiosk.ui.scanner

import android.content.Context
import android.graphics.Canvas
import android.graphics.Paint
import android.graphics.RectF
import android.util.AttributeSet
import android.view.View
import androidx.core.content.ContextCompat
import com.biometric.kiosk.R
import kotlin.math.min

/**
 * Custom view that draws a face positioning guide overlay on the camera preview.
 *
 * Renders:
 * - A semi-transparent dark vignette around the edges
 * - An oval face guide in the center with animated border
 * - Corner tick marks at the four corners of the oval
 */
class FaceGuideOverlay @JvmOverloads constructor(
    context: Context,
    attrs: AttributeSet? = null,
    defStyleAttr: Int = 0
) : View(context, attrs, defStyleAttr) {

    private val ovalPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        color = ContextCompat.getColor(context, R.color.face_guide_color)
        style = Paint.Style.STROKE
        strokeWidth = 3f
    }

    private val vignettePaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        color = 0x66000000.toInt()
        style = Paint.Style.FILL
    }

    private val cornerPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        color = ContextCompat.getColor(context, R.color.face_guide_active)
        style = Paint.Style.STROKE
        strokeWidth = 5f
        strokeCap = Paint.Cap.ROUND
    }

    private val ovalRect = RectF()
    private val cornerLen = 30f

    override fun onDraw(canvas: Canvas) {
        super.onDraw(canvas)

        val w = width.toFloat()
        val h = height.toFloat()

        // Face oval: centered, 65% of width, ~80% of height
        val ovalW = w * 0.65f
        val ovalH = ovalW * 1.35f
        val left = (w - ovalW) / 2f
        val top = (h - ovalH) / 2f
        ovalRect.set(left, top, left + ovalW, top + ovalH)

        // Draw corner indicators (L-shaped ticks at corners of the oval bounding box)
        val cl = ovalRect.left
        val ct = ovalRect.top
        val cr = ovalRect.right
        val cb = ovalRect.bottom

        // Top-left
        canvas.drawLine(cl, ct + cornerLen, cl, ct, cornerPaint)
        canvas.drawLine(cl, ct, cl + cornerLen, ct, cornerPaint)
        // Top-right
        canvas.drawLine(cr - cornerLen, ct, cr, ct, cornerPaint)
        canvas.drawLine(cr, ct, cr, ct + cornerLen, cornerPaint)
        // Bottom-left
        canvas.drawLine(cl, cb - cornerLen, cl, cb, cornerPaint)
        canvas.drawLine(cl, cb, cl + cornerLen, cb, cornerPaint)
        // Bottom-right
        canvas.drawLine(cr - cornerLen, cb, cr, cb, cornerPaint)
        canvas.drawLine(cr, cb, cr, cb - cornerLen, cornerPaint)

        // Oval guide border
        canvas.drawOval(ovalRect, ovalPaint)
    }
}
