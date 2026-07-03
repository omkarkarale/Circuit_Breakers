package com.omkarkarale.medlinkiot.models

data class LogEntry(
    val id: Int,
    val medicationName: String,
    val dosage: String,
    val timestamp: Long,
    val status: String,
    val description: String,
    val categoryDate: String
)
