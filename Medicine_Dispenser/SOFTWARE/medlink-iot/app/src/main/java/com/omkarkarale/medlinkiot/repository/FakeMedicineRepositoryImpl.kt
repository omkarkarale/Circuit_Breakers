package com.omkarkarale.medlinkiot.repository

import com.omkarkarale.medlinkiot.models.Medicine
import com.omkarkarale.medlinkiot.models.LogEntry
import com.omkarkarale.medlinkiot.models.Schedule
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asStateFlow

class FakeMedicineRepositoryImpl : MedicineRepository {
    private val _medicines = MutableStateFlow<List<Medicine>>(emptyList())
    override val allMedicines: Flow<List<Medicine>> = _medicines.asStateFlow()

    private val _logs = MutableStateFlow<List<LogEntry>>(emptyList())
    override val allLogs: Flow<List<LogEntry>> = _logs.asStateFlow()

    private var nextMedId = 4
    private var nextLogId = 6

    init {
        // Seed initial Medicines
        _medicines.value = listOf(
            Medicine(
                id = 1,
                name = "Aspirin",
                dosage = "100mg",
                type = "Tablet",
                colorHex = "#2196F3",
                slot = 1,
                pillsRemaining = 45,
                maxCapacity = 50,
                dosePerReminder = 1,
                repeatPattern = "Daily",
                scheduleTimes = listOf(Schedule(1, "02:00 PM", true)),
                isEnabled = true,
                lastTakenTime = "Today, 02:05 PM",
                streakDays = 5
            ),
            Medicine(
                id = 2,
                name = "Metformin",
                dosage = "500mg",
                type = "Capsule",
                colorHex = "#4CAF50",
                slot = 2,
                pillsRemaining = 8,
                maxCapacity = 30,
                dosePerReminder = 2,
                repeatPattern = "Daily",
                scheduleTimes = listOf(
                    Schedule(2, "08:00 AM", true),
                    Schedule(3, "08:00 PM", true)
                ),
                isEnabled = true,
                lastTakenTime = "Today, 08:05 AM",
                streakDays = 12
            ),
            Medicine(
                id = 3,
                name = "Lisinopril",
                dosage = "10mg",
                type = "Softgel",
                colorHex = "#9C27B0",
                slot = 3,
                pillsRemaining = 12,
                maxCapacity = 30,
                dosePerReminder = 1,
                repeatPattern = "Daily",
                scheduleTimes = listOf(Schedule(4, "10:30 AM", true)),
                isEnabled = false,
                lastTakenTime = null,
                streakDays = 0
            )
        )

        // Seed initial Medication Logs
        val currentTime = System.currentTimeMillis()
        val dayMillis = 24 * 60 * 60 * 1000L

        _logs.value = listOf(
            LogEntry(
                id = 1,
                medicationName = "Metformin",
                dosage = "500mg Oral",
                timestamp = currentTime - (2 * 60 * 60 * 1000L),
                status = "Taken",
                description = "Dispensed successfully from SmartBox Slot A2.",
                categoryDate = "Today"
            ),
            LogEntry(
                id = 2,
                medicationName = "Lisinopril",
                dosage = "10mg Oral",
                timestamp = currentTime - (5 * 60 * 60 * 1000L),
                status = "Cancelled",
                description = "Manual override by user. Stated \"Will take later with meal\".",
                categoryDate = "Today"
            ),
            LogEntry(
                id = 3,
                medicationName = "Atorvastatin",
                dosage = "20mg Oral",
                timestamp = currentTime - dayMillis,
                status = "Failed",
                description = "IoT Device Hardware Jam detected in Slot C1. Please inspect device.",
                categoryDate = "Yesterday"
            ),
            LogEntry(
                id = 4,
                medicationName = "Vitamin D3",
                dosage = "1000 IU",
                timestamp = currentTime - dayMillis - (4 * 60 * 60 * 1000L),
                status = "Missed",
                description = "No response to 3 repeated alerts. Window closed at 02:00 PM.",
                categoryDate = "Yesterday"
            ),
            LogEntry(
                id = 5,
                medicationName = "Metformin",
                dosage = "500mg Oral",
                timestamp = currentTime - dayMillis - (8 * 60 * 60 * 1000L),
                status = "Taken",
                description = "Dispensed successfully. Adherence streak: 12 days.",
                categoryDate = "Yesterday"
            )
        )
    }

    override suspend fun getMedicineById(id: Int): Medicine? {
        return _medicines.value.find { it.id == id }
    }

    override suspend fun insertMedicine(medicine: Medicine) {
        val current = _medicines.value.toMutableList()
        val index = current.indexOfFirst { it.id == medicine.id }
        if (index != -1) {
            current[index] = medicine
        } else {
            val newMed = if (medicine.id == 0) medicine.copy(id = nextMedId++) else medicine
            current.add(newMed)
        }
        _medicines.value = current
    }

    override suspend fun deleteMedicineById(id: Int) {
        val current = _medicines.value.toMutableList()
        current.removeAll { it.id == id }
        _medicines.value = current
    }

    override suspend fun updatePillsRemaining(id: Int, pills: Int) {
        val current = _medicines.value.toMutableList()
        val index = current.indexOfFirst { it.id == id }
        if (index != -1) {
            current[index] = current[index].copy(pillsRemaining = pills)
            _medicines.value = current
        }
    }

    override suspend fun updateEnabledStatus(id: Int, enabled: Boolean) {
        val current = _medicines.value.toMutableList()
        val index = current.indexOfFirst { it.id == id }
        if (index != -1) {
            current[index] = current[index].copy(isEnabled = enabled)
            _medicines.value = current
        }
    }

    override suspend fun insertLog(log: LogEntry) {
        val current = _logs.value.toMutableList()
        val newLog = if (log.id == 0) log.copy(id = nextLogId++) else log
        current.add(0, newLog)
        _logs.value = current
    }

    override suspend fun clearLogs() {
        _logs.value = emptyList()
    }
}
