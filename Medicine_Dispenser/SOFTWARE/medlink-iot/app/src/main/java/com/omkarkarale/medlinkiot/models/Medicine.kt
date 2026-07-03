package com.omkarkarale.medlinkiot.models

data class Medicine(
    val id: Int,
    val name: String,
    val type: String, // Tablet, Capsule, Softgel
    val colorHex: String,
    val slot: Int, // 1, 2, 3
    val pillsRemaining: Int,
    val maxCapacity: Int,
    val dosePerReminder: Int,
    val repeatPattern: String,
    val scheduleTimes: List<Schedule>,
    val isEnabled: Boolean,
    val lastTakenTime: String?,
    val streakDays: Int,
    val dosage: String
)
