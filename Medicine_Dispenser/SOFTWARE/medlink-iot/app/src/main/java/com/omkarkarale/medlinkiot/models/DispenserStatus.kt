package com.omkarkarale.medlinkiot.models

data class DispenserStatus(
    val slot: Int,
    val medicineName: String,
    val remainingPills: Int,
    val enabled: Boolean,
    val motorHealthy: Boolean
)
