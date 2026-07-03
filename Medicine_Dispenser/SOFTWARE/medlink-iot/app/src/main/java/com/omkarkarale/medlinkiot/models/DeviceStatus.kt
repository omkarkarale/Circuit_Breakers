package com.omkarkarale.medlinkiot.models

data class DeviceStatus(
    val connected: Boolean,
    val deviceName: String,
    val firmwareVersion: String,
    val uptimeSeconds: Long,
    val batteryPercentage: Int,
    val batteryCharging: Boolean,
    val wifiSSID: String,
    val ipAddress: String,
    val signalStrength: Int,
    val temperature: Float,
    val nextDoseCountdown: Int
)
