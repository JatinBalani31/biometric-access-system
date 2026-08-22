package com.biometric.kiosk.ui.result

import android.animation.ObjectAnimator
import android.animation.ValueAnimator
import android.os.Bundle
import android.os.CountDownTimer
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.view.animation.AnimationUtils
import androidx.fragment.app.Fragment
import com.biometric.kiosk.R
import com.biometric.kiosk.data.db.EmbeddingEntity
import com.biometric.kiosk.databinding.FragmentAccessResultBinding
import com.biometric.kiosk.ui.scanner.ScannerViewModel
import androidx.fragment.app.activityViewModels

/**
 * Full-screen overlay fragment showing access GRANTED or DENIED result.
 * Auto-dismisses after 5 seconds with a visual countdown ring animation.
 */
class AccessResultFragment : Fragment() {

    companion object {
        const val TAG = "AccessResultFragment"

        private const val ARG_MATCHED = "matched"
        private const val ARG_NAME = "name"
        private const val ARG_PLAN = "plan"
        private const val ARG_DAYS_LEFT = "days_left"
        private const val ARG_IS_EXPIRED = "is_expired"
        private const val ARG_SCORE = "score"
        private const val AUTO_DISMISS_MS = 5000L

        fun newInstance(matched: Boolean, entity: EmbeddingEntity?, score: Float): AccessResultFragment {
            return AccessResultFragment().apply {
                arguments = Bundle().apply {
                    putBoolean(ARG_MATCHED, matched)
                    putString(ARG_NAME, entity?.subscriberName ?: "")
                    putString(ARG_PLAN, entity?.planName ?: "")
                    putInt(ARG_DAYS_LEFT, entity?.daysLeft ?: 0)
                    putBoolean(ARG_IS_EXPIRED, entity?.isExpired ?: false)
                    putFloat(ARG_SCORE, score)
                }
            }
        }
    }

    private var _binding: FragmentAccessResultBinding? = null
    private val binding get() = _binding!!
    private val scannerViewModel: ScannerViewModel by activityViewModels()

    private var countDownTimer: CountDownTimer? = null

    override fun onCreateView(
        inflater: LayoutInflater, container: ViewGroup?, savedInstanceState: Bundle?
    ): View {
        _binding = FragmentAccessResultBinding.inflate(inflater, container, false)
        return binding.root
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)

        val isMatched = arguments?.getBoolean(ARG_MATCHED) ?: false
        val name = arguments?.getString(ARG_NAME) ?: ""
        val plan = arguments?.getString(ARG_PLAN) ?: ""
        val daysLeft = arguments?.getInt(ARG_DAYS_LEFT) ?: 0
        val isExpired = arguments?.getBoolean(ARG_IS_EXPIRED) ?: false
        val score = arguments?.getFloat(ARG_SCORE) ?: 0f

        setupUI(isMatched, name, plan, daysLeft, isExpired, score)
        startCountdown()

        binding.root.setOnClickListener {
            countDownTimer?.cancel()
            scannerViewModel.resetToScanning()
        }
    }

    private fun setupUI(
        isMatched: Boolean, name: String, plan: String,
        daysLeft: Int, isExpired: Boolean, score: Float
    ) {
        if (isMatched && !isExpired) {
            // ── ACCESS GRANTED ──────────────────────────────────────────────
            binding.root.setBackgroundResource(R.drawable.bg_granted)
            binding.ivResultIcon.setImageResource(R.drawable.ic_checkmark_circle)
            binding.tvResultTitle.text = "ACCESS GRANTED"
            binding.tvResultTitle.setTextColor(requireContext().getColor(R.color.granted_text))
            binding.tvSubscriberName.text = name
            binding.tvSubscriberName.visibility = View.VISIBLE
            binding.tvPlanInfo.text = "📋 $plan"
            binding.tvPlanInfo.visibility = View.VISIBLE
            binding.tvDaysLeft.text = "⏱ $daysLeft days remaining"
            binding.tvDaysLeft.visibility = View.VISIBLE
            binding.tvStatusBadge.text = "● ACTIVE"
            binding.tvStatusBadge.setTextColor(requireContext().getColor(R.color.color_active))
            binding.tvStatusBadge.visibility = View.VISIBLE
            binding.tvMessage.text = "Welcome! Enjoy your session."
            binding.tvMessage.visibility = View.VISIBLE

            // Entrance animation
            val slideIn = AnimationUtils.loadAnimation(context, R.anim.slide_up_fade_in)
            binding.cardContent.startAnimation(slideIn)

        } else if (isMatched && isExpired) {
            // ── EXPIRED SUBSCRIPTION ────────────────────────────────────────
            binding.root.setBackgroundResource(R.drawable.bg_expired)
            binding.ivResultIcon.setImageResource(R.drawable.ic_warning_circle)
            binding.tvResultTitle.text = "SUBSCRIPTION EXPIRED"
            binding.tvResultTitle.setTextColor(requireContext().getColor(R.color.expired_text))
            binding.tvSubscriberName.text = name
            binding.tvSubscriberName.visibility = View.VISIBLE
            binding.tvPlanInfo.text = "📋 $plan"
            binding.tvPlanInfo.visibility = View.VISIBLE
            binding.tvDaysLeft.text = "Plan expired — please renew at the front desk"
            binding.tvDaysLeft.visibility = View.VISIBLE
            binding.tvStatusBadge.text = "● EXPIRED"
            binding.tvStatusBadge.setTextColor(requireContext().getColor(R.color.color_expired))
            binding.tvStatusBadge.visibility = View.VISIBLE
            binding.tvMessage.visibility = View.GONE

        } else {
            // ── NOT RECOGNIZED ──────────────────────────────────────────────
            binding.root.setBackgroundResource(R.drawable.bg_denied)
            binding.ivResultIcon.setImageResource(R.drawable.ic_error_circle)
            binding.tvResultTitle.text = "NOT RECOGNIZED"
            binding.tvResultTitle.setTextColor(requireContext().getColor(R.color.denied_text))
            binding.tvSubscriberName.visibility = View.GONE
            binding.tvPlanInfo.visibility = View.GONE
            binding.tvDaysLeft.visibility = View.GONE
            binding.tvStatusBadge.visibility = View.GONE
            binding.tvMessage.text = "Face not recognized.\nPlease check in at the front desk."
            binding.tvMessage.visibility = View.VISIBLE
        }
    }

    private fun startCountdown() {
        countDownTimer = object : CountDownTimer(AUTO_DISMISS_MS, 200) {
            override fun onTick(millisUntilFinished: Long) {
                val progress = (millisUntilFinished.toFloat() / AUTO_DISMISS_MS * 100).toInt()
                binding.progressCountdown.progress = progress
                binding.tvCountdown.text = "${(millisUntilFinished / 1000) + 1}"
            }

            override fun onFinish() {
                scannerViewModel.resetToScanning()
            }
        }.start()

        // Animate countdown arc
        ObjectAnimator.ofInt(binding.progressCountdown, "progress", 100, 0).apply {
            duration = AUTO_DISMISS_MS
            start()
        }
    }

    override fun onDestroyView() {
        super.onDestroyView()
        countDownTimer?.cancel()
        _binding = null
    }
}
