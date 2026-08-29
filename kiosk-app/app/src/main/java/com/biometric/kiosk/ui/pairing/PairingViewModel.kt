package com.biometric.kiosk.ui.pairing

import androidx.lifecycle.LiveData
import androidx.lifecycle.MutableLiveData
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.biometric.kiosk.data.api.KioskApiService
import com.biometric.kiosk.data.api.PairRequest
import com.biometric.kiosk.data.prefs.DevicePrefs
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.launch
import retrofit2.HttpException
import javax.inject.Inject

sealed class PairingUiState {
    object Idle : PairingUiState()
    object Loading : PairingUiState()
    data class Success(val tenantName: String?) : PairingUiState()
    data class Error(val message: String) : PairingUiState()
}

@HiltViewModel
class PairingViewModel @Inject constructor(
    private val apiService: KioskApiService,
    private val devicePrefs: DevicePrefs
) : ViewModel() {

    private val _state = MutableLiveData<PairingUiState>(PairingUiState.Idle)
    val state: LiveData<PairingUiState> = _state

    fun pair(code: String) {
        val trimmed = code.trim()
        if (trimmed.length != 6 || !trimmed.all { it.isDigit() }) {
            _state.value = PairingUiState.Error("Enter the 6-digit code exactly as shown in the admin panel.")
            return
        }

        _state.value = PairingUiState.Loading
        viewModelScope.launch {
            try {
                val response = apiService.pairDevice(PairRequest(pairingCode = trimmed))
                devicePrefs.deviceToken = response.deviceToken
                devicePrefs.tenantId = response.tenantId
                devicePrefs.isRegistered = true
                _state.value = PairingUiState.Success(response.tenantName)
            } catch (e: HttpException) {
                val message = when (e.code()) {
                    404 -> "That code is invalid or has expired. Generate a new one from the admin panel."
                    else -> "Pairing failed (HTTP ${e.code()}). Check the kiosk's network connection."
                }
                _state.value = PairingUiState.Error(message)
            } catch (e: Exception) {
                _state.value = PairingUiState.Error("Could not reach the server: ${e.message ?: "unknown error"}")
            }
        }
    }
}
