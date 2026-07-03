package com.omkarkarale.medlinkiot.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider
import androidx.lifecycle.viewModelScope
import com.omkarkarale.medlinkiot.models.*
import com.omkarkarale.medlinkiot.repository.MedicineRepository
import com.omkarkarale.medlinkiot.repository.DeviceRepository
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.*
import kotlinx.coroutines.launch
import java.util.Locale

class MedicationViewModel(
    private val medicineRepository: MedicineRepository,
    private val deviceRepository: DeviceRepository
) : ViewModel() {

    val medications: StateFlow<List<Medicine>> = medicineRepository.allMedicines.stateIn(
        scope = viewModelScope,
        started = SharingStarted.WhileSubscribed(5000),
        initialValue = emptyList()
    )

    val logs: StateFlow<List<LogEntry>> = medicineRepository.allLogs.stateIn(
        scope = viewModelScope,
        started = SharingStarted.WhileSubscribed(5000),
        initialValue = emptyList()
    )

    // IoT Hub State derived from DeviceRepository
    val hubConnected = deviceRepository.deviceStatus.map { it.connected }.stateIn(
        scope = viewModelScope,
        started = SharingStarted.WhileSubscribed(5000),
        initialValue = true
    )

    val hubBattery = deviceRepository.deviceStatus.map { it.batteryPercentage }.stateIn(
        scope = viewModelScope,
        started = SharingStarted.WhileSubscribed(5000),
        initialValue = 85
    )

    private val _countdownSeconds = MutableStateFlow(5037)
    val countdownSeconds = _countdownSeconds.asStateFlow()

    // Wi-Fi Config
    private val _wifiSSID = MutableStateFlow("Home_Network_5G")
    val wifiSSID = _wifiSSID.asStateFlow()

    private val _wifiPassword = MutableStateFlow("password123")
    val wifiPassword = _wifiPassword.asStateFlow()

    private val _isConnectingWifi = MutableStateFlow(false)
    val isConnectingWifi = _isConnectingWifi.asStateFlow()

    // Theme Settings
    private val _isDarkTheme = MutableStateFlow(false)
    val isDarkTheme = _isDarkTheme.asStateFlow()

    // Engineering Diagnostics States
    val temperature = deviceRepository.deviceStatus.map { it.temperature }.stateIn(
        scope = viewModelScope,
        started = SharingStarted.WhileSubscribed(5000),
        initialValue = 34.2f
    )

    val componentStates = deviceRepository.diagnostics.map { result ->
        result.components.associate { it.component.displayName to it.status.toUiString() }
    }.stateIn(
        scope = viewModelScope,
        started = SharingStarted.WhileSubscribed(5000),
        initialValue = emptyMap()
    )

    private val _isTestingComponent = MutableStateFlow<String?>(null)
    val isTestingComponent = _isTestingComponent.asStateFlow()

    private val _isFullDiagnosing = MutableStateFlow(false)
    val isFullDiagnosing = _isFullDiagnosing.asStateFlow()

    init {
        // Dynamic binding from deviceStatus flow to update local details like countdown and SSID
        viewModelScope.launch {
            deviceRepository.deviceStatus.collect { status ->
                _countdownSeconds.value = status.nextDoseCountdown
                _wifiSSID.value = status.wifiSSID
            }
        }

        // Launch simulated background countdown for dispenser timer
        viewModelScope.launch {
            while (true) {
                delay(1000)
                if (_countdownSeconds.value > 0) {
                    _countdownSeconds.value -= 1
                } else {
                    _countdownSeconds.value = 28800 // Reset to 8 hours
                }
            }
        }
    }

    fun toggleTheme() {
        _isDarkTheme.value = !_isDarkTheme.value
    }

    fun updateWifiSSID(ssid: String) {
        _wifiSSID.value = ssid
    }

    fun updateWifiPassword(pass: String) {
        _wifiPassword.value = pass
    }

    fun connectDevice(onComplete: () -> Unit) {
        viewModelScope.launch {
            _isConnectingWifi.value = true
            delay(2500) // Simulating network handshake and connection sequence
            deviceRepository.updateWifi(_wifiSSID.value, _wifiPassword.value)
            _isConnectingWifi.value = false
            onComplete()
            
            // Log connection success
            addLog(
                medicationName = "IoT Hub",
                dosage = "System Config",
                status = "Taken",
                description = "Successfully configured Wi-Fi SSID '${_wifiSSID.value}' and reconnected smart dispenser hub.",
                categoryDate = "Today"
            )
        }
    }

    fun addMedication(
        name: String,
        dosage: String,
        type: String,
        colorHex: String,
        slot: Int,
        pillsRemaining: Int,
        dosePerReminder: Int,
        repeatPattern: String,
        scheduleTimes: String
    ) {
        viewModelScope.launch {
            // Map comma-separated scheduleTimes to List<Schedule>
            val schedules = scheduleTimes.split(",").mapIndexed { idx, time ->
                Schedule(id = idx + 1, time = time.trim(), enabled = true)
            }

            val med = Medicine(
                id = 0,
                name = name,
                dosage = dosage,
                type = type,
                colorHex = colorHex,
                slot = slot,
                pillsRemaining = pillsRemaining,
                maxCapacity = 30,
                dosePerReminder = dosePerReminder,
                repeatPattern = repeatPattern,
                scheduleTimes = schedules,
                isEnabled = true,
                lastTakenTime = "Today, 02:05 PM",
                streakDays = 0
            )
            medicineRepository.insertMedicine(med)

            // Add action log
            addLog(
                medicationName = name,
                dosage = dosage,
                status = "Taken",
                description = "Added to smart dispenser Slot #$slot schedule. Auto-sync finalized.",
                categoryDate = "Today"
            )
        }
    }

    fun refillAll() {
        viewModelScope.launch {
            medications.value.forEach { med ->
                medicineRepository.insertMedicine(med.copy(pillsRemaining = med.maxCapacity))
            }
            addLog(
                medicationName = "Inventory",
                dosage = "All Medications",
                status = "Taken",
                description = "Inventory successfully restocked to full capacities on all active slot channels.",
                categoryDate = "Today"
            )
        }
    }

    fun refillMedication(medication: Medicine) {
        viewModelScope.launch {
            val updated = medication.copy(pillsRemaining = medication.maxCapacity)
            medicineRepository.insertMedicine(updated)
            addLog(
                medicationName = medication.name,
                dosage = medication.dosage,
                status = "Taken",
                description = "Inventory refilled. Added ${medication.maxCapacity - medication.pillsRemaining} pills to Slot #${medication.slot}.",
                categoryDate = "Today"
            )
        }
    }

    fun toggleMedicationEnabled(medication: Medicine, enabled: Boolean) {
        viewModelScope.launch {
            val updated = medication.copy(isEnabled = enabled)
            medicineRepository.insertMedicine(updated)
            addLog(
                medicationName = medication.name,
                dosage = medication.dosage,
                status = if (enabled) "Taken" else "Cancelled",
                description = if (enabled) "Dispenser channel Slot #${medication.slot} is enabled." else "Dispenser channel Slot #${medication.slot} has been disabled.",
                categoryDate = "Today"
            )
        }
    }

    fun deleteMedication(id: Int, medName: String) {
        viewModelScope.launch {
            medicineRepository.deleteMedicineById(id)
            addLog(
                medicationName = medName,
                dosage = "Removed",
                status = "Cancelled",
                description = "Medication removed from dispenser schedule list database.",
                categoryDate = "Today"
            )
        }
    }

    fun testDispense(medication: Medicine, onComplete: (Boolean) -> Unit) {
        viewModelScope.launch {
            _isTestingComponent.value = "Slot #${medication.slot}"
            delay(2000) // Simulating physical gear motor motion
            
            val success = medication.isEnabled && medication.pillsRemaining >= medication.dosePerReminder
            if (success) {
                val newRemaining = (medication.pillsRemaining - medication.dosePerReminder).coerceAtLeast(0)
                medicineRepository.updatePillsRemaining(medication.id, newRemaining)
                
                addLog(
                    medicationName = medication.name,
                    dosage = medication.dosage,
                    status = "Taken",
                    description = "Test Dispense succeeded! Dropped ${medication.dosePerReminder} pill(s) from SmartBox Slot #${medication.slot}.",
                    categoryDate = "Today"
                )
            } else {
                addLog(
                    medicationName = medication.name,
                    dosage = medication.dosage,
                    status = "Failed",
                    description = "Test Dispense failed on Slot #${medication.slot}. Slot disabled or empty.",
                    categoryDate = "Today"
                )
            }
            _isTestingComponent.value = null
            onComplete(success)
        }
    }

    fun runComponentTest(componentName: String) {
        viewModelScope.launch {
            _isTestingComponent.value = componentName
            
            // Map display componentName to enum ComponentType
            val componentType = ComponentType.values().find { it.displayName == componentName }
            if (componentType != null) {
                val result = deviceRepository.testComponent(componentType)
                addLog(
                    medicationName = componentName,
                    dosage = "Hardware Test",
                    status = "Taken",
                    description = result.message,
                    categoryDate = "Today"
                )
            } else {
                delay(1500)
            }
            _isTestingComponent.value = null
        }
    }

    fun runFullDiagnostics(onComplete: () -> Unit) {
        viewModelScope.launch {
            _isFullDiagnosing.value = true
            deviceRepository.runFullDiagnostics()
            _isFullDiagnosing.value = false
            onComplete()

            addLog(
                medicationName = "System",
                dosage = "All Sensors",
                status = "Taken",
                description = "Completed full engineering hardware system audit. All slots clear. Temperature nominal.",
                categoryDate = "Today"
            )
        }
    }

    private suspend fun addLog(
        medicationName: String,
        dosage: String,
        status: String,
        description: String,
        categoryDate: String
    ) {
        medicineRepository.insertLog(
            LogEntry(
                id = 0,
                medicationName = medicationName,
                dosage = dosage,
                timestamp = System.currentTimeMillis(),
                status = status,
                description = description,
                categoryDate = categoryDate
            )
        )
    }

    fun getFormattedCountdown(): String {
        val seconds = _countdownSeconds.value
        val h = seconds / 3600
        val m = (seconds % 3600) / 60
        val s = seconds % 60
        return String.format(Locale.US, "%02d:%02d:%02d", h, m, s)
    }

    private fun ComponentStatus.toUiString(): String = when(this) {
        ComponentStatus.OK -> "WORKING"
        ComponentStatus.WARNING -> "WARNING"
        ComponentStatus.ERROR, ComponentStatus.OFFLINE -> "OFFLINE"
        ComponentStatus.TESTING -> "TESTING"
    }

    // Default factory to manage manual repository instantiation without Dagger/Hilt
    class Factory(
        private val medicineRepository: MedicineRepository,
        private val deviceRepository: DeviceRepository
    ) : ViewModelProvider.Factory {
        @Suppress("UNCHECKED_CAST")
        override fun <T : ViewModel> create(modelClass: Class<T>): T {
            if (modelClass.isAssignableFrom(MedicationViewModel::class.java)) {
                return MedicationViewModel(medicineRepository, deviceRepository) as T
            }
            throw IllegalArgumentException("Unknown ViewModel class")
        }
    }
}
