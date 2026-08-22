package com.biometric.kiosk.ui.admin

import android.app.Application
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.LiveData
import androidx.lifecycle.MutableLiveData
import androidx.lifecycle.viewModelScope
import com.biometric.kiosk.data.db.EmbeddingDao
import com.biometric.kiosk.data.prefs.DevicePrefs
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.launch
import javax.inject.Inject

data class AdminSettings(
    val backendUrl: String,
    val deviceToken: String,
    val tenantId: Int,
    val lastSyncAt: String?,
    val cachedCount: Int,
    val threshold: Float,
    val syncIntervalMinutes: Int
)

@HiltViewModel
class AdminViewModel @Inject constructor(
    application: Application,
    private val devicePrefs: DevicePrefs,
    private val embeddingDao: EmbeddingDao
) : AndroidViewModel(application) {

    private val _settings = MutableLiveData<AdminSettings>()
    val settings: LiveData<AdminSettings> = _settings

    private val _syncStatus = MutableLiveData<String>()
    val syncStatus: LiveData<String> = _syncStatus

    private val _isSaving = MutableLiveData<Boolean>(false)
    val isSaving: LiveData<Boolean> = _isSaving

    fun loadSettings() {
        viewModelScope.launch {
            val count = embeddingDao.getCount(devicePrefs.tenantId)
            _settings.postValue(
                AdminSettings(
                    backendUrl = devicePrefs.backendUrl,
                    deviceToken = devicePrefs.deviceToken,
                    tenantId = devicePrefs.tenantId,
                    lastSyncAt = devicePrefs.lastSyncAt,
                    cachedCount = count,
                    threshold = devicePrefs.similarityThreshold,
                    syncIntervalMinutes = devicePrefs.syncIntervalMinutes
                )
            )
        }
    }

    fun saveSettings(
        backendUrl: String,
        deviceToken: String,
        threshold: Float,
        syncIntervalMinutes: Int
    ) {
        _isSaving.postValue(true)
        viewModelScope.launch {
            devicePrefs.backendUrl = backendUrl
            devicePrefs.deviceToken = deviceToken
            devicePrefs.similarityThreshold = threshold
            devicePrefs.syncIntervalMinutes = syncIntervalMinutes
            _isSaving.postValue(false)
            loadSettings()
        }
    }

    fun changePin(newPin: String) {
        devicePrefs.setAdminPin(newPin)
    }

    fun clearDevice() {
        viewModelScope.launch {
            embeddingDao.deleteAll()
            devicePrefs.clearDeviceRegistration()
            devicePrefs.lastSyncAt = null
        }
    }
}
