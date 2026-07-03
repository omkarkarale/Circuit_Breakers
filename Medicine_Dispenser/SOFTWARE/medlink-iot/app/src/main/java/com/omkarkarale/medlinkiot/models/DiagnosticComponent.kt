package com.omkarkarale.medlinkiot.models

data class DiagnosticComponent(
    val component: ComponentType,
    val status: ComponentStatus,
    val lastTest: Long?,
    val message: String?
)
