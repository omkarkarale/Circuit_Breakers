package com.omkarkarale.medlinkiot.models

data class DiagnosticResult(
    val components: List<DiagnosticComponent>,
    val temperature: Float
)
