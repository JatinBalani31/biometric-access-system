package com.biometric.kiosk.ui.scanner

import android.app.Dialog
import android.content.Intent
import android.os.Bundle
import android.text.Editable
import android.text.TextWatcher
import android.widget.Toast
import androidx.fragment.app.DialogFragment
import com.biometric.kiosk.data.prefs.DevicePrefs
import com.biometric.kiosk.databinding.DialogPinBinding
import com.biometric.kiosk.ui.admin.AdminActivity
import com.google.android.material.dialog.MaterialAlertDialogBuilder
import dagger.hilt.android.AndroidEntryPoint
import javax.inject.Inject

@AndroidEntryPoint
class AdminPinDialogFragment : DialogFragment() {

    @Inject
    lateinit var devicePrefs: DevicePrefs

    override fun onCreateDialog(savedInstanceState: Bundle?): Dialog {
        val binding = DialogPinBinding.inflate(layoutInflater)

        val dialog = MaterialAlertDialogBuilder(requireContext())
            .setTitle("Admin Access")
            .setView(binding.root)
            .setNegativeButton("Cancel", null)
            .setPositiveButton("Enter", null) // Set below to prevent auto-dismiss on wrong PIN
            .create()

        dialog.setOnShowListener {
            dialog.getButton(Dialog.BUTTON_POSITIVE).setOnClickListener {
                val pin = binding.etPin.text.toString()
                if (devicePrefs.verifyAdminPin(pin)) {
                    dismiss()
                    startActivity(Intent(requireActivity(), AdminActivity::class.java))
                } else {
                    binding.tilPin.error = "Incorrect PIN"
                    binding.etPin.text?.clear()
                }
            }
        }

        // Auto-focus and clear error on type
        binding.etPin.addTextChangedListener(object : TextWatcher {
            override fun afterTextChanged(s: Editable?) { binding.tilPin.error = null }
            override fun beforeTextChanged(s: CharSequence?, start: Int, count: Int, after: Int) {}
            override fun onTextChanged(s: CharSequence?, start: Int, before: Int, count: Int) {}
        })

        return dialog
    }
}
