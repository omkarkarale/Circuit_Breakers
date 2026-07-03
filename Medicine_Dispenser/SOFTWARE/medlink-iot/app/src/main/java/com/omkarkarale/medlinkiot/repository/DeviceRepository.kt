package com.omkarkarale.medlinkiot.repository

import com.omkarkarale.medlinkiot.models.DeviceStatus
import com.omkarkarale.medlinkiot.models.DiagnosticResult
import com.omkarkarale.medlinkiot.models.DispenseResult
import com.omkarkarale.medlinkiot.models.ComponentType
import kotlinx.coroutines.flow.Flow

interface DeviceRepository {
    val deviceStatus: Flow<DeviceStatus>
    val diagnostics: Flow<DiagnosticResult>

    suspend fun testComponent(component: ComponentType): DispenseResult
    suspend fun runFullDiagnostics(): DiagnosticResult
    suspend fun updateWifi(ssid: String, pass: String): Boolean
}
