package com.biometric.kiosk.ui.admin

import android.os.Bundle
import android.view.View
import android.widget.Toast
import androidx.activity.viewModels
import androidx.appcompat.app.AlertDialog
import androidx.appcompat.app.AppCompatActivity
import com.biometric.kiosk.databinding.ActivityAdminBinding
import com.biometric.kiosk.sync.EmbeddingSyncWorker
import dagger.hilt.android.AndroidEntryPoint

@AndroidEntryPoint
class AdminActivity : AppCompatActivity() {

    private lateinit var binding: ActivityAdminBinding
    private val viewModel: AdminViewModel by viewModels()

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        try {
            binding = ActivityAdminBinding.inflate(layoutInflater)
            setContentView(binding.root)

            setupToolbar()
            loadSettings()
            setupListeners()
            observeViewModel()
        } catch (e: Exception) {
            Toast.makeText(this, "Admin error: ${e.message}", Toast.LENGTH_LONG).show()
            finish()
        }
    }

    private fun setupToolbar() {
        setSupportActionBar(binding.toolbar)
        supportActionBar?.apply {
            title = "⚙ Admin Settings"
            setDisplayHomeAsUpEnabled(true)
        }
        binding.toolbar.setNavigationOnClickListener {
            finish()
        }
    }

    private fun loadSettings() {
        viewModel.loadSettings()
    }

    private fun observeViewModel() {
        viewModel.settings.observe(this) { settings ->
            binding.etBackendUrl.setText(settings.backendUrl)
            binding.etDeviceToken.setText(settings.deviceToken)
            binding.tvTenantId.text = "Tenant ID: ${settings.tenantId}"
            binding.tvLastSync.text = "Last Sync: ${settings.lastSyncAt ?: "Never"}"
            binding.tvCachedCount.text = "Cached Embeddings: ${settings.cachedCount}"
            binding.sliderThreshold.value = settings.threshold * 100f
            binding.tvThresholdValue.text = "%.2f".format(settings.threshold)
            binding.sliderSyncInterval.value = settings.syncIntervalMinutes.toFloat()
            binding.tvSyncIntervalValue.text = formatInterval(settings.syncIntervalMinutes)
        }

        viewModel.syncStatus.observe(this) { status ->
            binding.tvSyncResult.text = status
            binding.tvSyncResult.visibility = View.VISIBLE
        }

        viewModel.isSaving.observe(this) { saving ->
            binding.btnSave.isEnabled = !saving
            binding.btnSave.text = if (saving) "Saving..." else "Save Settings"
        }
    }

    private fun setupListeners() {
        // Threshold slider
        binding.sliderThreshold.addOnChangeListener { _, value, _ ->
            val threshold = value / 100f
            binding.tvThresholdValue.text = "%.2f".format(threshold)
        }

        // Sync interval slider
        binding.sliderSyncInterval.addOnChangeListener { _, value, _ ->
            binding.tvSyncIntervalValue.text = formatInterval(value.toInt())
        }

        // Save button
        binding.btnSave.setOnClickListener {
            viewModel.saveSettings(
                backendUrl = binding.etBackendUrl.text.toString().trim(),
                deviceToken = binding.etDeviceToken.text.toString().trim(),
                threshold = binding.sliderThreshold.value / 100f,
                syncIntervalMinutes = binding.sliderSyncInterval.value.toInt()
            )
            // Reschedule sync with new interval
            EmbeddingSyncWorker.schedulePeriodicSync(
                this,
                binding.sliderSyncInterval.value.toInt(),
                replaceExisting = true
            )
            Toast.makeText(this, "Settings saved", Toast.LENGTH_SHORT).show()
        }

        // Force sync button
        binding.btnForceSync.setOnClickListener {
            viewModel.triggerFullResync()
            EmbeddingSyncWorker.runImmediateSync(this)
            Toast.makeText(this, "Clean full sync started...", Toast.LENGTH_SHORT).show()
            binding.tvSyncResult.text = "Syncing fresh embeddings from server..."
            binding.tvSyncResult.visibility = View.VISIBLE
        }

        // Change PIN
        binding.btnChangePin.setOnClickListener {
            showChangePinDialog()
        }

        // Log out / Clear Device
        binding.btnLogout.setOnClickListener {
            AlertDialog.Builder(this)
                .setTitle("Log Out & Clear Device")
                .setMessage("This will delete all cached face embeddings and clear device registration. The device will need to be re-registered. Continue?")
                .setPositiveButton("Clear Device") { _, _ ->
                    viewModel.clearDevice()
                    Toast.makeText(this, "Device cleared", Toast.LENGTH_LONG).show()
                    finish()
                }
                .setNegativeButton("Cancel", null)
                .show()
        }
    }

    private fun showChangePinDialog() {
        val dialogBinding = layoutInflater.inflate(com.biometric.kiosk.R.layout.dialog_change_pin, null)
        AlertDialog.Builder(this)
            .setTitle("Change Admin PIN")
            .setView(dialogBinding)
            .setPositiveButton("Change") { _, _ ->
                val newPin = dialogBinding.findViewById<com.google.android.material.textfield.TextInputEditText>(
                    com.biometric.kiosk.R.id.et_new_pin
                )?.text.toString()
                if (newPin.length >= 4) {
                    viewModel.changePin(newPin)
                    Toast.makeText(this, "PIN changed", Toast.LENGTH_SHORT).show()
                } else {
                    Toast.makeText(this, "PIN must be at least 4 digits", Toast.LENGTH_SHORT).show()
                }
            }
            .setNegativeButton("Cancel", null)
            .show()
    }

    override fun onSupportNavigateUp(): Boolean {
        finish()
        return true
    }

    private fun formatInterval(minutes: Int): String {
        if (minutes < 60) return "$minutes min"
        val hours = minutes / 60
        val rem = minutes % 60
        return if (rem == 0) "$hours h" else "${hours}h ${rem}m"
    }
}
