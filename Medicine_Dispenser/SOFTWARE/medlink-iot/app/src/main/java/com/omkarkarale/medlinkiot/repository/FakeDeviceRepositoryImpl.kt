package com.omkarkarale.medlinkiot.repository

import com.omkarkarale.medlinkiot.models.*
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asStateFlow

class FakeDeviceRepositoryImpl : DeviceRepository {
    private val _deviceStatus = MutableStateFlow(
        DeviceStatus(
            connected = true,
            deviceName = "Smart Dispenser Hub",
            firmwareVersion = "v0.6.0",
            uptimeSeconds = 3600L,
            batteryPercentage = 85,
            batteryCharging = false,
            wifiSSID = "Home_Network_5G",
            ipAddress = "192.168.1.12",
            signalStrength = -65,
            temperature = 34.2f,
            nextDoseCountdown = 5037
        )
    )
    override val deviceStatus: Flow<DeviceStatus> = _deviceStatus.asStateFlow()

    private val _diagnostics = MutableStateFlow(
        DiagnosticResult(
            components = listOf(
                DiagnosticComponent(ComponentType.STEPPER_MOTOR_1, ComponentStatus.OK, System.currentTimeMillis() - 600000, "Working normally"),
                DiagnosticComponent(ComponentType.STEPPER_MOTOR_2, ComponentStatus.OK, System.currentTimeMillis() - 600000, "Working normally"),
                DiagnosticComponent(ComponentType.STEPPER_MOTOR_3, ComponentStatus.WARNING, System.currentTimeMillis() - 600000, "High friction detected"),
                DiagnosticComponent(ComponentType.RTC_MODULE, ComponentStatus.OK, System.currentTimeMillis() - 600000, "Working normally"),
                DiagnosticComponent(ComponentType.IR_SENSOR, ComponentStatus.OFFLINE, System.currentTimeMillis() - 600000, "Calibration offset error"),
                DiagnosticComponent(ComponentType.SPEAKER, ComponentStatus.OK, System.currentTimeMillis() - 600000, "Working normally"),
                DiagnosticComponent(ComponentType.OLED_DISPLAY, ComponentStatus.OK, System.currentTimeMillis() - 600000, "Working normally"),
                DiagnosticComponent(ComponentType.WIFI_STACK, ComponentStatus.OK, System.currentTimeMillis() - 600000, "Working normally"),
                DiagnosticComponent(ComponentType.API_GATEWAY, ComponentStatus.OK, System.currentTimeMillis() - 600000, "Working normally")
            ),
            temperature = 34.2f
        )
    )
    override val diagnostics: Flow<DiagnosticResult> = _diagnostics.asStateFlow()

    override suspend fun testComponent(component: ComponentType): DispenseResult {
        // Mark as TESTING
        updateComponentStatus(component, ComponentStatus.TESTING, "Running diagnostics...")
        delay(1500) // Simulating testing period

        // Set to OK
        val msg = when(component) {
            ComponentType.IR_SENSOR -> "IR Sensor calibration reset completed"
            ComponentType.STEPPER_MOTOR_3 -> "Stepper Motor 3 friction test completed"
            else -> "${component.displayName} self-test completed"
        }
        updateComponentStatus(component, ComponentStatus.OK, msg)

        return DispenseResult(success = true, message = msg)
    }

    override suspend fun runFullDiagnostics(): DiagnosticResult {
        // Set all to testing
        val start = _diagnostics.value.components.map {
            it.copy(status = ComponentStatus.TESTING, lastTest = System.currentTimeMillis(), message = "Auditing...")
        }
        _diagnostics.value = DiagnosticResult(start, 34.2f)

        delay(2500) // Simulating diagnostics audit sweep

        // Set all to OK, cool down
        val end = _diagnostics.value.components.map {
            it.copy(status = ComponentStatus.OK, lastTest = System.currentTimeMillis(), message = "System audit pass")
        }
        val result = DiagnosticResult(end, 32.5f)
        _diagnostics.value = result

        // Cool temperature in status too
        _deviceStatus.value = _deviceStatus.value.copy(temperature = 32.5f)

        return result
    }

    override suspend fun updateWifi(ssid: String, pass: String): Boolean {
        delay(2000)
        _deviceStatus.value = _deviceStatus.value.copy(
            wifiSSID = ssid,
            connected = true,
            ipAddress = "192.168.1.14"
        )
        return true
    }

    private fun updateComponentStatus(component: ComponentType, status: ComponentStatus, message: String) {
        val currentComponents = _diagnostics.value.components.toMutableList()
        val index = currentComponents.indexOfFirst { it.component == component }
        if (index != -1) {
            currentComponents[index] = currentComponents[index].copy(
                status = status,
                lastTest = System.currentTimeMillis(),
                message = message
            )
            _diagnostics.value = DiagnosticResult(currentComponents, _diagnostics.value.temperature)
        }
    }
}
