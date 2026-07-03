package com.omkarkarale.medlinkiot.repository

import com.omkarkarale.medlinkiot.models.Medicine
import com.omkarkarale.medlinkiot.models.LogEntry
import kotlinx.coroutines.flow.Flow

interface MedicineRepository {
    val allMedicines: Flow<List<Medicine>>
    val allLogs: Flow<List<LogEntry>>

    suspend fun getMedicineById(id: Int): Medicine?
    suspend fun insertMedicine(medicine: Medicine)
    suspend fun deleteMedicineById(id: Int)
    suspend fun updatePillsRemaining(id: Int, pills: Int)
    suspend fun updateEnabledStatus(id: Int, enabled: Boolean)
    suspend fun insertLog(log: LogEntry)
    suspend fun clearLogs()
}
