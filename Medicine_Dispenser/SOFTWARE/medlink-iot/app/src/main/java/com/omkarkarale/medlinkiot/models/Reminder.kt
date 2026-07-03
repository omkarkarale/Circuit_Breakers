package com.omkarkarale.medlinkiot.models

data class Reminder(
    val id: Int,
    val medicineId: Int,
    val reminderTime: String,
    val isDismissed: Boolean
)
