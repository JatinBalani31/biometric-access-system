package com.biometric.kiosk.ui.pairing

import android.content.Intent
import android.os.Bundle
import android.view.View
import androidx.activity.viewModels
import androidx.appcompat.app.AppCompatActivity
import com.biometric.kiosk.databinding.ActivityPairingBinding
import com.biometric.kiosk.ui.admin.AdminActivity
import com.biometric.kiosk.ui.scanner.ScannerActivity
import dagger.hilt.android.AndroidEntryPoint

/**
 * First-run screen shown whenever the kiosk has no device token yet.
 * Exchanges a short-lived pairing code (generated in the admin panel) for a
 * permanent device token — no manual local.properties edit + rebuild required
 * to bring a new physical kiosk online.
 */
@AndroidEntryPoint
class PairingActivity : AppCompatActivity() {

    private lateinit var binding: ActivityPairingBinding
    private val viewModel: PairingViewModel by viewModels()

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivityPairingBinding.inflate(layoutInflater)
        setContentView(binding.root)

        binding.btnPair.setOnClickListener {
            val code = binding.etPairingCode.text?.toString().orEmpty()
            viewModel.pair(code)
        }

        binding.tvManualSetup.setOnClickListener {
            startActivity(Intent(this, AdminActivity::class.java))
        }

        viewModel.state.observe(this) { state ->
            when (state) {
                is PairingUiState.Idle -> {
                    binding.progressPairing.visibility = View.GONE
                    binding.btnPair.isEnabled = true
                    binding.tvPairingError.visibility = View.GONE
                }
                is PairingUiState.Loading -> {
                    binding.progressPairing.visibility = View.VISIBLE
                    binding.btnPair.isEnabled = false
                    binding.tvPairingError.visibility = View.GONE
                }
                is PairingUiState.Error -> {
                    binding.progressPairing.visibility = View.GONE
                    binding.btnPair.isEnabled = true
                    binding.tvPairingError.text = state.message
                    binding.tvPairingError.visibility = View.VISIBLE
                }
                is PairingUiState.Success -> {
                    binding.progressPairing.visibility = View.GONE
                    startActivity(Intent(this, ScannerActivity::class.java))
                    finish()
                }
            }
        }
    }
}
