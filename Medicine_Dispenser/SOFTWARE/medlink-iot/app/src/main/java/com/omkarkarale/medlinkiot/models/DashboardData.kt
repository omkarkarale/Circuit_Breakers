package com.omkarkarale.medlinkiot.models

data class DashboardData(
    val deviceStatus: DeviceStatus,
    val nextDoseCountdown: Int,
    val adherencePercentage: Int,
    val inventory: List<Medicine>,
    val recentLogs: List<LogEntry>
)
