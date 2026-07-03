package com.omkarkarale.medlinkiot.ui

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.animateColorAsState
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.tween
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.items
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.text.input.VisualTransformation
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import coil.compose.AsyncImage
import com.omkarkarale.medlinkiot.models.Medicine
import com.omkarkarale.medlinkiot.models.LogEntry
import com.omkarkarale.medlinkiot.viewmodel.MedicationViewModel
import com.omkarkarale.medlinkiot.ui.theme.MyApplicationTheme
import androidx.compose.foundation.BorderStroke
import androidx.compose.ui.layout.layout
import kotlinx.coroutines.launch
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

enum class ScreenRoute {
    HOME,
    MEDICINES,
    DIAGNOSTICS,
    SETTINGS,
    MEDICINE_DETAILS,
    ADD_MEDICINE,
    LOGS,
    WIFI_SETUP,
    ABOUT
}

// Global Portrait Assets from spec
const val DOCTOR_PORTRAIT_URL = "https://lh3.googleusercontent.com/aida-public/AB6AXuDpppLKsAZXAQPj4lu8IuVCAzZwdG2nY6zL_qkv68BolfdN22NAuZTz8YGTyGny7V3gxR-HcALnIwlHEXa7_p0zCnqEV7LPj0jOGVO5dOZ3MCeMSu4CftPdMtsJhCWzDr0I8qrDh2wx-PBYYjkU0egA1DwHEeiBNPSBEaPPMF73j8a3KGX2oBMAxz-l0IwI9fI4S5Nj_88uW8MMsFN3mvDyCNRoCumAgabNciYZPOFVP_ImNMLtGhQ4Gg"
const val PATIENT_PORTRAIT_URL = "https://lh3.googleusercontent.com/aida-public/AB6AXuBHvurn5bZ558k-PDlaLLakbnHedDN5jyr9Lnp_mqQguIeKMBn_WIAr3WGiRrFvzAiYbJZ-9pyRlvFrEUgSXdVIQnfrFnB7S21-lGOTn9ij7Eu6GGxdlY4egJk2OZgmhmX2HuoO3I9xg2BeVjZITAj0hzNsp1g-8LVXe9UAKFapwtiqWEQIpspZ1jJLRjqjGbuz0NJ7IjR0KyhcocateXTKF_dzZdyEAvWHEKodSa2mr1hdC_SfkLluNQ"
const val TECH_PORTRAIT_URL = "https://lh3.googleusercontent.com/aida-public/AB6AXuD1jRsKiXwB5uTX7iac6lltjcMs11I0KrR3uDXf9PeWIcSSHhoQ9WfE-pFjYZPFStPz7cQoKzSRSzUmwVS4ErQHXKPTUldYDNzoaL-LFcBOSs4I6kwkLR0Hj_lQHOpJplpOplK_3xa9qvyvqtm_56vvbv6DrmsSxH4lf08y8CkntdYWpfc1hfn3Y4aDoHuZf3zn0gM0394aEG3xTpwkVnHTMw1wP4NFmJwIe9LpfBidqYc1WcKY3iv8cA"
const val WIFI_PORTRAIT_URL = "https://lh3.googleusercontent.com/aida-public/AB6AXuC7enPGJe9NWxWiOJ57VzHOS_R426llmibaCl2OEG6GSxRA1HAXccSKH1bWhCc8jur_TgOAW79FFztKQDYxc5pSPLSvY3SMsCbJywtaFpQTsn40xm2sxXQziKxN0NwzqWJbyhdj2dh1fPItbuLmrQ8HO0szVhOuJRJuqeaDnEiXiHO1m6hQgS2ixsiFwBDqrAkZcAkBBh8pAZG_yXgUGFkzm2xGGbSAybWedhIXR2fmsaPeTXQiOhfdnw"
const val TEAM_ALEX_URL = "https://lh3.googleusercontent.com/aida-public/AB6AXuDruzTEc8uB0IvzP7p6VpkvLSUxn8UXNRWjNpSNNrZKRJm-ksZwWzUzMEsG2tX0CtAqA9HP8G-DaL4jMzfrb4shys6aA4DzlfZ-L2eBL2orf1g-C8FzdlugkkCYDiwD1kiNJxIeNVq8QKVt7HxVR535-zmaggbm331buv5-iyJxBWaGxsleq2y_70qsiVe_eGGLLrE-Dm9fZyN57evq_VnkQXZZxf_FlIFzL4TRaqykM5-9v-MPhtyIGg"
const val TEAM_SARAH_URL = "https://lh3.googleusercontent.com/aida-public/AB6AXuBCtHr-dOPq9Rkqy4RL4HvXdrGYASJFy3fsooJn3ye_Kpi8ISX9qhtuyrqqqQjo3C1Y6TzxL-Hwx3SVbI1vXVQp8D0KfkPA1XEU8-i5gkP-dVa9_yEKRlkN_9d0yDLqSYomxI_tMeoxy4aXzvAaXez2kth6TUg63No0fp9jR7dA5p2HtIzbdHGIYZkui8drqSUwoH9WP_ShbKYMLTdn6bX4h2uMoJOF_8GFA1p8m46gxzOIe7NpR6RcAw"
const val TEAM_JORDAN_URL = "https://lh3.googleusercontent.com/aida-public/AB6AXuCGja_dPoI5uZvOqRbIw8O2BBmnn3FVoe_knvbzVI7Hr8W9fPphGNgYsmmvTtzKH8mPaWbSzyrreEpywth0Qkzk_HYYxyjecoiLBk7m_IL9YzHmZNnkNI-xyyOA4vCXY7XX1pwqjLFhuwSFFxJcNw6NMoJyR3oQTucLZnMXXp1fyTG-h_rngAxldP9U_8dlDGVksi7dNtZxI8jZVF3kNVGnw1oRoV7ba644Q9uDmjzGpomI8zF3FnEmSg"
const val SHOWCASE_IMAGE_URL = "https://lh3.googleusercontent.com/aida-public/AB6AXuAhqxsraLYcXf125TDbGfTWR0GvFG-h3et5EfJRFk0jxd4NfndAOlMn-iCFN2UfKEOhKKhz_JgDgDdzumuVaCAvr6Ejv4L9RgqkJL7cf4DwFpCTWzSLn3yQ1DcHfVGO3qm2FWJzuHzWnki5VgJnmyTBjTtPiZFVsUjqE3wPR83PyWqzjEQtcdP6fh09ZzvWx-8AjEcureRDHoF2SRnja3z6yTh4mxF9RVnCCdT_FLtAHHjDfuHgme7s5w"

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun MedLinkApp(
    viewModel: MedicationViewModel,
    modifier: Modifier = Modifier
) {
    var currentRoute by remember { mutableStateOf(ScreenRoute.HOME) }
    var selectedMedicationId by remember { mutableStateOf<Int?>(null) }
    
    val isDarkTheme by viewModel.isDarkTheme.collectAsStateWithLifecycle()
    val hubConnected by viewModel.hubConnected.collectAsStateWithLifecycle()
    val snackbarHostState = remember { SnackbarHostState() }
    val scope = rememberCoroutineScope()
    
    MyApplicationTheme(darkTheme = isDarkTheme) {
        Scaffold(
            snackbarHost = { SnackbarHost(snackbarHostState) },
            topBar = {
                // Determine topbar avatar image depending on current screen
                val avatarUrl = when(currentRoute) {
                    ScreenRoute.HOME -> DOCTOR_PORTRAIT_URL
                    ScreenRoute.MEDICINES -> PATIENT_PORTRAIT_URL
                    ScreenRoute.DIAGNOSTICS -> TECH_PORTRAIT_URL
                    else -> WIFI_PORTRAIT_URL
                }

                // Header matches spec style
                CenterAlignedTopAppBar(
                    title = {
                        Text(
                            text = "MedLink IoT",
                            fontWeight = FontWeight.Bold,
                            fontSize = 22.sp,
                            color = MaterialTheme.colorScheme.primary
                        )
                    },
                    navigationIcon = {
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            modifier = Modifier.padding(start = 12.dp)
                        ) {
                            Box(
                                modifier = Modifier
                                    .size(38.dp)
                                    .clip(CircleShape)
                                    .border(
                                        width = 1.5.dp,
                                        color = MaterialTheme.colorScheme.primary.copy(alpha = 0.15f),
                                        shape = CircleShape
                                    )
                            ) {
                                AsyncImage(
                                    model = avatarUrl,
                                    contentDescription = "User profile",
                                    modifier = Modifier.fillMaxSize(),
                                    contentScale = ContentScale.Crop
                                )
                            }
                        }
                    },
                    actions = {
                        IconButton(
                            onClick = { currentRoute = ScreenRoute.LOGS },
                            modifier = Modifier.testTag("notifications_button")
                        ) {
                            Icon(
                                imageVector = Icons.Default.Notifications,
                                contentDescription = "View notifications",
                                tint = MaterialTheme.colorScheme.primary
                            )
                        }
                    },
                    colors = TopAppBarDefaults.centerAlignedTopAppBarColors(
                        containerColor = MaterialTheme.colorScheme.background
                    )
                )
            },
            bottomBar = {
                // Suppressed navigation bar on focused sub-screens (Add, Details, Setup, About)
                val isSubScreen = currentRoute == ScreenRoute.ADD_MEDICINE ||
                        currentRoute == ScreenRoute.MEDICINE_DETAILS ||
                        currentRoute == ScreenRoute.WIFI_SETUP ||
                        currentRoute == ScreenRoute.ABOUT
                
                if (!isSubScreen) {
                    NavigationBar(
                        containerColor = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.4f),
                        tonalElevation = 8.dp
                    ) {
                        NavigationBarItem(
                            selected = currentRoute == ScreenRoute.HOME,
                            onClick = { currentRoute = ScreenRoute.HOME },
                            icon = { Icon(Icons.Default.Dashboard, "Home") },
                            label = { Text("Home", fontSize = 11.sp, fontWeight = FontWeight.Bold) }
                        )
                        NavigationBarItem(
                            selected = currentRoute == ScreenRoute.MEDICINES,
                            onClick = { currentRoute = ScreenRoute.MEDICINES },
                            icon = { Icon(Icons.Default.Medication, "Medicines") },
                            label = { Text("Medicines", fontSize = 11.sp, fontWeight = FontWeight.Bold) }
                        )
                        NavigationBarItem(
                            selected = currentRoute == ScreenRoute.DIAGNOSTICS,
                            onClick = { currentRoute = ScreenRoute.DIAGNOSTICS },
                            icon = { Icon(Icons.Default.MedicalServices, "Diagnostics") },
                            label = { Text("Diagnostics", fontSize = 11.sp, fontWeight = FontWeight.Bold) }
                        )
                        NavigationBarItem(
                            selected = currentRoute == ScreenRoute.SETTINGS,
                            onClick = { currentRoute = ScreenRoute.SETTINGS },
                            icon = { Icon(Icons.Default.Settings, "Settings") },
                            label = { Text("Settings", fontSize = 11.sp, fontWeight = FontWeight.Bold) }
                        )
                    }
                }
            },
            containerColor = MaterialTheme.colorScheme.background
        ) { innerPadding ->
            Box(
                modifier = modifier
                    .fillMaxSize()
                    .padding(innerPadding)
            ) {
                when (currentRoute) {
                    ScreenRoute.HOME -> {
                        HomeScreen(
                            viewModel = viewModel,
                            onNavigateToDetails = { medId ->
                                selectedMedicationId = medId
                                currentRoute = ScreenRoute.MEDICINE_DETAILS
                            },
                            onNavigateToAdd = {
                                currentRoute = ScreenRoute.ADD_MEDICINE
                            },
                            onNavigateToLogs = {
                                currentRoute = ScreenRoute.LOGS
                            }
                        )
                    }
                    ScreenRoute.MEDICINES -> {
                        MedicinesScreen(
                            viewModel = viewModel,
                            onNavigateToDetails = { medId ->
                                selectedMedicationId = medId
                                currentRoute = ScreenRoute.MEDICINE_DETAILS
                            },
                            onNavigateToAdd = {
                                currentRoute = ScreenRoute.ADD_MEDICINE
                            }
                        )
                    }
                    ScreenRoute.DIAGNOSTICS -> {
                        DiagnosticsScreen(
                            viewModel = viewModel,
                            snackbarHostState = snackbarHostState
                        )
                    }
                    ScreenRoute.SETTINGS -> {
                        SettingsScreen(
                            viewModel = viewModel,
                            onNavigateToWifi = { currentRoute = ScreenRoute.WIFI_SETUP },
                            onNavigateToAbout = { currentRoute = ScreenRoute.ABOUT }
                        )
                    }
                    ScreenRoute.MEDICINE_DETAILS -> {
                        MedicineDetailsScreen(
                            medicationId = selectedMedicationId,
                            viewModel = viewModel,
                            onBack = { currentRoute = ScreenRoute.MEDICINES },
                            snackbarHostState = snackbarHostState
                        )
                    }
                    ScreenRoute.ADD_MEDICINE -> {
                        AddMedicineScreen(
                            viewModel = viewModel,
                            onBack = { currentRoute = ScreenRoute.MEDICINES },
                            snackbarHostState = snackbarHostState
                        )
                    }
                    ScreenRoute.LOGS -> {
                        LogsTimelineScreen(
                            viewModel = viewModel,
                            onBack = { currentRoute = ScreenRoute.HOME }
                        )
                    }
                    ScreenRoute.WIFI_SETUP -> {
                        WifiSetupScreen(
                            viewModel = viewModel,
                            onBack = { currentRoute = ScreenRoute.SETTINGS },
                            snackbarHostState = snackbarHostState
                        )
                    }
                    ScreenRoute.ABOUT -> {
                        AboutScreen(
                            onBack = { currentRoute = ScreenRoute.SETTINGS }
                        )
                    }
                }
            }
        }
    }
}

// ---------------------------------------------------------------------------------
// 1. HOME SCREEN
// ---------------------------------------------------------------------------------
@Composable
fun HomeScreen(
    viewModel: MedicationViewModel,
    onNavigateToDetails: (Int) -> Unit,
    onNavigateToAdd: () -> Unit,
    onNavigateToLogs: () -> Unit,
    modifier: Modifier = Modifier
) {
    val medications by viewModel.medications.collectAsStateWithLifecycle()
    val hubConnected by viewModel.hubConnected.collectAsStateWithLifecycle()
    val hubBattery by viewModel.hubBattery.collectAsStateWithLifecycle()
    val countdownSeconds by viewModel.countdownSeconds.collectAsStateWithLifecycle()

    // Find first enabled medication to display as the active next dose
    val nextMed = medications.firstOrNull { it.isEnabled } ?: medications.firstOrNull()

    LazyColumn(
        modifier = modifier
            .fillMaxSize()
            .padding(horizontal = 16.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp),
        contentPadding = PaddingValues(top = 8.dp, bottom = 80.dp)
    ) {
        // Device Status Card
        item {
            Card(
                colors = CardDefaults.cardColors(
                    containerColor = MaterialTheme.colorScheme.surface
                ),
                shape = RoundedCornerShape(28.dp),
                border = BorderStroke(1.dp, MaterialTheme.colorScheme.outline.copy(alpha = 0.25f)),
                modifier = Modifier.fillMaxWidth()
            ) {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(16.dp),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.SpaceBetween
                ) {
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(12.dp)
                    ) {
                        val statusBg = if (hubConnected) MaterialTheme.colorScheme.secondaryContainer else MaterialTheme.colorScheme.errorContainer
                        val statusColor = if (hubConnected) MaterialTheme.colorScheme.onSecondaryContainer else MaterialTheme.colorScheme.onErrorContainer
                        Box(
                            modifier = Modifier
                                .size(40.dp)
                                .clip(CircleShape)
                                .background(statusBg),
                            contentAlignment = Alignment.Center
                        ) {
                            Icon(
                                imageVector = if (hubConnected) Icons.Default.Wifi else Icons.Default.Cancel,
                                contentDescription = "Status",
                                tint = statusColor,
                                modifier = Modifier.size(20.dp)
                            )
                        }
                        Column {
                            Text(
                                text = if (hubConnected) "Dispenser Connected" else "Dispenser Disconnected",
                                fontWeight = FontWeight.Bold,
                                fontSize = 16.sp,
                                color = MaterialTheme.colorScheme.onSurface
                            )
                            Text(
                                text = "Last sync 2 mins ago",
                                fontSize = 12.sp,
                                color = MaterialTheme.colorScheme.onSurfaceVariant
                            )
                        }
                    }
                    
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(4.dp)
                    ) {
                        Icon(
                            imageVector = Icons.Default.BatteryChargingFull,
                            contentDescription = "Battery",
                            tint = MaterialTheme.colorScheme.primary,
                            modifier = Modifier.size(16.dp)
                        )
                        Text(
                            text = "$hubBattery%",
                            fontWeight = FontWeight.Bold,
                            fontSize = 13.sp,
                            color = MaterialTheme.colorScheme.onSurface
                        )
                    }
                }
            }
        }

        // Active Next Dose Hero
        item {
            nextMed?.let { med ->
                Card(
                    colors = CardDefaults.cardColors(
                        containerColor = MaterialTheme.colorScheme.primaryContainer
                    ),
                    shape = RoundedCornerShape(28.dp),
                    modifier = Modifier
                        .fillMaxWidth()
                        .testTag("next_dose_card")
                ) {
                    Column(
                        modifier = Modifier.padding(20.dp)
                    ) {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.Top
                        ) {
                            Column {
                                Box(
                                    modifier = Modifier
                                        .clip(RoundedCornerShape(100.dp))
                                        .background(MaterialTheme.colorScheme.onPrimaryContainer)
                                        .padding(horizontal = 12.dp, vertical = 4.dp)
                                ) {
                                    Text(
                                        text = "Next Dose",
                                        fontWeight = FontWeight.Bold,
                                        fontSize = 12.sp,
                                        color = MaterialTheme.colorScheme.primaryContainer
                                    )
                                }
                                Spacer(modifier = Modifier.height(12.dp))
                                Text(
                                    text = "${med.name} ${med.dosage}",
                                    fontWeight = FontWeight.Black,
                                    fontSize = 26.sp,
                                    color = MaterialTheme.colorScheme.onPrimaryContainer
                                )
                                Row(
                                    verticalAlignment = Alignment.CenterVertically,
                                    horizontalArrangement = Arrangement.spacedBy(4.dp),
                                    modifier = Modifier.padding(top = 4.dp)
                                ) {
                                    Icon(
                                        imageVector = Icons.Default.Schedule,
                                        contentDescription = "Time",
                                        tint = MaterialTheme.colorScheme.onPrimaryContainer.copy(alpha = 0.75f),
                                        modifier = Modifier.size(14.dp)
                                    )
                                    Text(
                                        text = "Scheduled ${med.scheduleTimes.firstOrNull()?.time ?: "08:00 AM"}",
                                        fontSize = 13.sp,
                                        color = MaterialTheme.colorScheme.onPrimaryContainer.copy(alpha = 0.75f)
                                    )
                                }
                            }
                            Text(
                                text = "Slot #${med.slot}",
                                fontWeight = FontWeight.Bold,
                                fontSize = 14.sp,
                                color = MaterialTheme.colorScheme.onPrimaryContainer.copy(alpha = 0.8f)
                            )
                        }

                        Spacer(modifier = Modifier.height(24.dp))

                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.Bottom
                        ) {
                            Column {
                                Text(
                                    text = "DISPENSING IN",
                                    fontSize = 10.sp,
                                    fontWeight = FontWeight.Bold,
                                    letterSpacing = 1.sp,
                                    color = MaterialTheme.colorScheme.onPrimaryContainer.copy(alpha = 0.7f)
                                )
                                Text(
                                    text = viewModel.getFormattedCountdown(),
                                    fontWeight = FontWeight.Bold,
                                    fontSize = 32.sp,
                                    color = MaterialTheme.colorScheme.onPrimaryContainer
                                )
                            }

                            Button(
                                onClick = { onNavigateToDetails(med.id) },
                                colors = ButtonDefaults.buttonColors(
                                    containerColor = MaterialTheme.colorScheme.onPrimaryContainer,
                                    contentColor = MaterialTheme.colorScheme.primaryContainer
                                ),
                                shape = RoundedCornerShape(100.dp),
                                contentPadding = PaddingValues(horizontal = 20.dp, vertical = 10.dp),
                                modifier = Modifier.testTag("take_now_button")
                            ) {
                                Text("Take Now", fontWeight = FontWeight.Bold, fontSize = 14.sp)
                            }
                        }
                    }
                }
            } ?: Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .height(140.dp)
                    .background(
                        MaterialTheme.colorScheme.surface,
                        RoundedCornerShape(28.dp)
                    )
                    .border(BorderStroke(1.dp, MaterialTheme.colorScheme.outline.copy(alpha = 0.25f)), RoundedCornerShape(28.dp)),
                contentAlignment = Alignment.Center
            ) {
                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                    Text("No Active Medications", fontWeight = FontWeight.Bold, color = MaterialTheme.colorScheme.onSurfaceVariant)
                    Button(
                        onClick = onNavigateToAdd,
                        shape = RoundedCornerShape(100.dp),
                        modifier = Modifier.padding(top = 8.dp)
                    ) {
                        Text("Add Medicine")
                    }
                }
            }
        }

        // Daily Adherence Overview Card
        item {
            Card(
                colors = CardDefaults.cardColors(
                    containerColor = MaterialTheme.colorScheme.secondaryContainer
                ),
                shape = RoundedCornerShape(28.dp),
                modifier = Modifier.fillMaxWidth()
            ) {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(20.dp),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(20.dp)
                ) {
                    Box(
                        modifier = Modifier.size(80.dp),
                        contentAlignment = Alignment.Center
                    ) {
                        val primaryColor = MaterialTheme.colorScheme.primary
                        val strokeBg = Color.White.copy(alpha = 0.4f)
                        Canvas(modifier = Modifier.fillMaxSize()) {
                            drawArc(
                                color = strokeBg,
                                startAngle = 0f,
                                sweepAngle = 360f,
                                useCenter = false,
                                style = Stroke(width = 24f, cap = StrokeCap.Round)
                            )
                            drawArc(
                                color = primaryColor,
                                startAngle = -90f,
                                sweepAngle = 288f, // 80% progress
                                useCenter = false,
                                style = Stroke(width = 24f, cap = StrokeCap.Round)
                            )
                        }
                        Column(horizontalAlignment = Alignment.CenterHorizontally) {
                            Text(
                                text = "8/10",
                                fontWeight = FontWeight.Black,
                                fontSize = 18.sp,
                                color = MaterialTheme.colorScheme.primary
                            )
                            Text(
                                text = "Doses",
                                fontSize = 10.sp,
                                fontWeight = FontWeight.Bold,
                                color = MaterialTheme.colorScheme.onSecondaryContainer.copy(alpha = 0.7f)
                            )
                        }
                    }

                    Column {
                        Text(
                            text = "Daily Adherence",
                            fontWeight = FontWeight.Bold,
                            fontSize = 18.sp,
                            color = MaterialTheme.colorScheme.onSecondaryContainer
                        )
                        Spacer(modifier = Modifier.height(4.dp))
                        Text(
                            text = "You're doing great today! Only 2 doses remaining.",
                            fontSize = 13.sp,
                            color = MaterialTheme.colorScheme.onSecondaryContainer.copy(alpha = 0.8f)
                        )
                    }
                }
            }
        }

        // Quick Actions Bento Block Grid
        item {
            Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                Text(
                    text = "Quick Actions",
                    fontWeight = FontWeight.Bold,
                    fontSize = 18.sp,
                    color = MaterialTheme.colorScheme.onSurface,
                    modifier = Modifier.padding(horizontal = 4.dp)
                )
                
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(10.dp)
                ) {
                    QuickActionCard(
                        title = "Add Medicine",
                        icon = Icons.Default.AddCircle,
                        containerColor = MaterialTheme.colorScheme.tertiaryContainer,
                        iconColor = MaterialTheme.colorScheme.onTertiaryContainer,
                        textColor = MaterialTheme.colorScheme.onTertiaryContainer,
                        onClick = onNavigateToAdd,
                        modifier = Modifier.weight(1f)
                    )
                    QuickActionCard(
                        title = "Dispense Test",
                        icon = Icons.Default.PlayArrow,
                        containerColor = MaterialTheme.colorScheme.primaryContainer,
                        iconColor = MaterialTheme.colorScheme.onPrimaryContainer,
                        textColor = MaterialTheme.colorScheme.onPrimaryContainer,
                        onClick = {
                            if (nextMed != null) {
                                onNavigateToDetails(nextMed!!.id)
                            } else {
                                onNavigateToAdd()
                            }
                        },
                        modifier = Modifier.weight(1f)
                    )
                }

                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(10.dp)
                ) {
                    QuickActionCard(
                        title = "View Logs",
                        icon = Icons.Default.History,
                        containerColor = MaterialTheme.colorScheme.surface,
                        iconColor = MaterialTheme.colorScheme.primary,
                        textColor = MaterialTheme.colorScheme.onSurface,
                        onClick = onNavigateToLogs,
                        modifier = Modifier.weight(1f)
                    )
                    QuickActionCard(
                        title = "Emergency",
                        icon = Icons.Default.Warning,
                        containerColor = MaterialTheme.colorScheme.errorContainer,
                        iconColor = MaterialTheme.colorScheme.onErrorContainer,
                        textColor = MaterialTheme.colorScheme.onErrorContainer,
                        onClick = onNavigateToLogs,
                        modifier = Modifier.weight(1f)
                    )
                }
            }
        }
    }
}

@Composable
fun QuickActionCard(
    title: String,
    icon: ImageVector,
    containerColor: Color,
    iconColor: Color,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
    textColor: Color = MaterialTheme.colorScheme.onSurface
) {
    Card(
        colors = CardDefaults.cardColors(containerColor = containerColor),
        shape = RoundedCornerShape(24.dp),
        border = BorderStroke(1.dp, MaterialTheme.colorScheme.outline.copy(alpha = 0.15f)),
        modifier = modifier
            .height(96.dp)
            .clickable(onClick = onClick)
    ) {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(12.dp),
            verticalArrangement = Arrangement.Center,
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            Icon(
                imageVector = icon,
                contentDescription = title,
                tint = iconColor,
                modifier = Modifier.size(28.dp)
            )
            Spacer(modifier = Modifier.height(8.dp))
            Text(
                text = title,
                fontWeight = FontWeight.Bold,
                fontSize = 13.sp,
                color = textColor,
                textAlign = TextAlign.Center
            )
        }
    }
}

// ---------------------------------------------------------------------------------
// 2. MEDICINES SCREEN
// ---------------------------------------------------------------------------------
@Composable
fun MedicinesScreen(
    viewModel: MedicationViewModel,
    onNavigateToDetails: (Int) -> Unit,
    onNavigateToAdd: () -> Unit,
    modifier: Modifier = Modifier
) {
    val medications by viewModel.medications.collectAsStateWithLifecycle()
    var searchQuery by remember { mutableStateOf("") }

    val filteredMedications = medications.filter {
        it.name.contains(searchQuery, ignoreCase = true) ||
        it.type.contains(searchQuery, ignoreCase = true)
    }

    LazyColumn(
        modifier = modifier
            .fillMaxSize()
            .padding(horizontal = 16.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp),
        contentPadding = PaddingValues(top = 8.dp, bottom = 80.dp)
    ) {
        // Daily Adherence Success Banner
        item {
            Card(
                colors = CardDefaults.cardColors(
                    containerColor = MaterialTheme.colorScheme.primaryContainer
                ),
                shape = RoundedCornerShape(28.dp),
                modifier = Modifier.fillMaxWidth()
            ) {
                Column(
                    modifier = Modifier.padding(20.dp)
                ) {
                    Text(
                        text = "Daily Adherence",
                        fontSize = 12.sp,
                        fontWeight = FontWeight.SemiBold,
                        color = MaterialTheme.colorScheme.onPrimaryContainer.copy(alpha = 0.7f)
                    )
                    Text(
                        text = "94% Success",
                        fontWeight = FontWeight.Black,
                        fontSize = 24.sp,
                        color = MaterialTheme.colorScheme.onPrimaryContainer
                    )
                    Spacer(modifier = Modifier.height(4.dp))
                    Text(
                        text = "Great job! You've taken 5 out of 6 doses today.",
                        fontSize = 13.sp,
                        color = MaterialTheme.colorScheme.onPrimaryContainer.copy(alpha = 0.85f)
                    )
                    
                    Spacer(modifier = Modifier.height(14.dp))
                    LinearProgressIndicator(
                        progress = { 0.94f },
                        color = MaterialTheme.colorScheme.primary,
                        trackColor = MaterialTheme.colorScheme.onPrimaryContainer.copy(alpha = 0.15f),
                        strokeCap = StrokeCap.Round,
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(8.dp)
                    )
                }
            }
        }

        // Search Bar Filter
        item {
            OutlinedTextField(
                value = searchQuery,
                onValueChange = { searchQuery = it },
                placeholder = { Text("Search medicines...", fontSize = 14.sp) },
                leadingIcon = { Icon(Icons.Default.Search, "Search") },
                shape = RoundedCornerShape(28.dp),
                colors = OutlinedTextFieldDefaults.colors(
                    focusedContainerColor = MaterialTheme.colorScheme.surfaceContainerLow,
                    unfocusedContainerColor = MaterialTheme.colorScheme.surfaceContainerLow,
                    focusedBorderColor = MaterialTheme.colorScheme.primary,
                    unfocusedBorderColor = Color.Transparent
                ),
                modifier = Modifier
                    .fillMaxWidth()
                    .testTag("med_search_bar")
            )
        }

        // Active Slots Header
        item {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    text = "Smart Dispenser Slots",
                    fontWeight = FontWeight.Bold,
                    fontSize = 16.sp,
                    color = MaterialTheme.colorScheme.onSurface
                )
                
                TextButton(onClick = { viewModel.refillAll() }) {
                    Text("Refill All", fontWeight = FontWeight.Bold)
                }
            }
        }

        // Grid/List of Medicines
        if (filteredMedications.isEmpty()) {
            item {
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(vertical = 32.dp),
                    contentAlignment = Alignment.Center
                ) {
                    Column(horizontalAlignment = Alignment.CenterHorizontally) {
                        Icon(
                            imageVector = Icons.Default.Inbox,
                            contentDescription = "Empty",
                            tint = MaterialTheme.colorScheme.onSurfaceVariant,
                            modifier = Modifier.size(48.dp)
                        )
                        Spacer(modifier = Modifier.height(8.dp))
                        Text(
                            text = "No matching medicines found",
                            fontWeight = FontWeight.SemiBold,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                    }
                }
            }
        } else {
            items(filteredMedications) { med ->
                MedicineSlotCard(
                    medication = med,
                    onClick = { onNavigateToDetails(med.id) },
                    onToggleEnabled = { viewModel.toggleMedicationEnabled(med, it) }
                )
            }
        }

        // Add New Custom slot placeholder button
        if (medications.size < 3) {
            item {
                Card(
                    colors = CardDefaults.cardColors(
                        containerColor = Color.Transparent
                    ),
                    shape = RoundedCornerShape(28.dp),
                    border = BorderStroke(
                        width = 1.5.dp,
                        color = MaterialTheme.colorScheme.outlineVariant,
                    ),
                    modifier = Modifier
                        .fillMaxWidth()
                        .clickable(onClick = onNavigateToAdd)
                ) {
                    Column(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(24.dp),
                        horizontalAlignment = Alignment.CenterHorizontally,
                        verticalArrangement = Arrangement.Center
                    ) {
                        Box(
                            modifier = Modifier
                                .size(48.dp)
                                .clip(CircleShape)
                                .background(MaterialTheme.colorScheme.surfaceContainerHigh),
                            contentAlignment = Alignment.Center
                        ) {
                            Icon(Icons.Default.Add, "Add New Slot", tint = MaterialTheme.colorScheme.primary)
                        }
                        Spacer(modifier = Modifier.height(12.dp))
                        Text("Add New", fontWeight = FontWeight.Bold, fontSize = 16.sp)
                        Text(
                            "Sync with new dispenser slot",
                            fontSize = 12.sp,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                    }
                }
            }
        }

        // Weekly Adherence bar chart visualization
        item {
            Card(
                colors = CardDefaults.cardColors(
                    containerColor = MaterialTheme.colorScheme.surface
                ),
                shape = RoundedCornerShape(28.dp),
                border = BorderStroke(1.dp, MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.5f)),
                modifier = Modifier.fillMaxWidth()
            ) {
                Column(
                    modifier = Modifier.padding(16.dp)
                ) {
                    Text(
                        text = "Weekly Adherence",
                        fontWeight = FontWeight.Bold,
                        fontSize = 16.sp,
                        color = MaterialTheme.colorScheme.onSurface
                    )
                    Spacer(modifier = Modifier.height(16.dp))

                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(120.dp),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.Bottom
                    ) {
                        val days = listOf("Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun")
                        val progress = listOf(0.6f, 0.85f, 0.7f, 1.0f, 0.4f, 0.9f, 0.75f)
                        
                        days.forEachIndexed { idx, day ->
                            val heightFraction = progress[idx]
                            val isToday = day == "Thu"
                            val barColor = if (isToday) MaterialTheme.colorScheme.secondaryContainer else MaterialTheme.colorScheme.secondaryContainer.copy(alpha = 0.35f)
                            
                            Column(
                                horizontalAlignment = Alignment.CenterHorizontally,
                                verticalArrangement = Arrangement.Bottom,
                                modifier = Modifier
                                    .weight(1f)
                                    .fillMaxHeight()
                            ) {
                                Box(
                                    modifier = Modifier
                                        .fillMaxWidth(0.5f)
                                        .fillMaxHeight(heightFraction)
                                        .clip(RoundedCornerShape(topStart = 8.dp, topEnd = 8.dp))
                                        .background(barColor)
                                )
                                Spacer(modifier = Modifier.height(8.dp))
                                Text(
                                    text = day,
                                    fontSize = 11.sp,
                                    fontWeight = if (isToday) FontWeight.Bold else FontWeight.Normal,
                                    color = if (isToday) MaterialTheme.colorScheme.onSurface else MaterialTheme.colorScheme.onSurfaceVariant
                                )
                            }
                        }
                    }
                }
            }
        }
    }
}

@Composable
fun MedicineSlotCard(
    medication: Medicine,
    onClick: () -> Unit,
    onToggleEnabled: (Boolean) -> Unit,
    modifier: Modifier = Modifier
) {
    val opacity = if (medication.isEnabled) 1.0f else 0.5f
    val pillColor = remember(medication.colorHex) {
        try {
            Color(android.graphics.Color.parseColor(medication.colorHex))
        } catch (e: Exception) {
            Color(0xFF2196F3)
        }
    }

    Card(
        colors = CardDefaults.cardColors(
            containerColor = MaterialTheme.colorScheme.surfaceContainerLowest
        ),
        shape = RoundedCornerShape(24.dp),
        border = BorderStroke(1.dp, MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.4f)),
        modifier = modifier
            .fillMaxWidth()
            .clickable(onClick = onClick)
    ) {
        Column(
            modifier = Modifier
                .padding(16.dp)
                .fillMaxWidth()
        ) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.Top
            ) {
                Row(
                    horizontalArrangement = Arrangement.spacedBy(12.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Box(
                        modifier = Modifier
                            .size(44.dp)
                            .clip(RoundedCornerShape(14.dp))
                            .background(pillColor.copy(alpha = 0.15f)),
                        contentAlignment = Alignment.Center
                    ) {
                        Icon(
                            imageVector = Icons.Default.MedicalServices,
                            contentDescription = "Pill type",
                            tint = pillColor,
                            modifier = Modifier.size(24.dp)
                        )
                    }
                    Column {
                        Text(
                            text = medication.name,
                            fontWeight = FontWeight.Bold,
                            fontSize = 16.sp,
                            color = MaterialTheme.colorScheme.onSurface
                        )
                        Text(
                            text = "${medication.dosage} • ${medication.dosePerReminder} Pill Daily",
                            fontSize = 13.sp,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                    }
                }
                
                IconButton(onClick = onClick) {
                    Icon(
                        imageVector = Icons.Default.MoreVert,
                        contentDescription = "Options",
                        tint = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }
            }

            Spacer(modifier = Modifier.height(14.dp))
            HorizontalDivider(color = MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.25f))
            Spacer(modifier = Modifier.height(14.dp))

            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Row(
                    horizontalArrangement = Arrangement.spacedBy(16.dp)
                ) {
                    Column {
                        Text(
                            text = "Remaining",
                            fontSize = 10.sp,
                            fontWeight = FontWeight.SemiBold,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                        Text(
                            text = "${medication.pillsRemaining} Pills",
                            fontWeight = FontWeight.Bold,
                            fontSize = 13.sp,
                            color = if (medication.pillsRemaining < 10) MaterialTheme.colorScheme.error else MaterialTheme.colorScheme.onSurface
                        )
                    }
                    Column {
                        Text(
                            text = "Dispenser",
                            fontSize = 10.sp,
                            fontWeight = FontWeight.SemiBold,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                        Text(
                            text = "Slot #${medication.slot}",
                            fontWeight = FontWeight.Bold,
                            fontSize = 13.sp,
                            color = MaterialTheme.colorScheme.onSurface
                        )
                    }
                }

                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    if (medication.isEnabled) {
                        Icon(
                            imageVector = Icons.Default.Schedule,
                            contentDescription = "Active",
                            tint = MaterialTheme.colorScheme.primary,
                            modifier = Modifier.size(14.dp)
                        )
                        Text(
                            text = "Next: ${medication.scheduleTimes.firstOrNull()?.time ?: ""}",
                            fontSize = 12.sp,
                            fontWeight = FontWeight.Bold,
                            color = MaterialTheme.colorScheme.primary
                        )
                    } else {
                        Icon(
                            imageVector = Icons.Default.Cancel,
                            contentDescription = "Disabled",
                            tint = MaterialTheme.colorScheme.outline,
                            modifier = Modifier.size(14.dp)
                        )
                        Text(
                            text = "Disabled",
                            fontSize = 12.sp,
                            fontWeight = FontWeight.Bold,
                            color = MaterialTheme.colorScheme.outline
                        )
                    }

                    Switch(
                        checked = medication.isEnabled,
                        onCheckedChange = onToggleEnabled,
                        colors = SwitchDefaults.colors(
                            checkedThumbColor = Color.White,
                            checkedTrackColor = MaterialTheme.colorScheme.primary,
                            uncheckedThumbColor = MaterialTheme.colorScheme.outline,
                            uncheckedTrackColor = MaterialTheme.colorScheme.surfaceVariant
                        ),
                        modifier = Modifier.scaleScale(0.7f)
                    )
                }
            }
        }
    }
}

// ---------------------------------------------------------------------------------
// 3. MEDICINE DETAILS SCREEN
// ---------------------------------------------------------------------------------
@Composable
fun MedicineDetailsScreen(
    medicationId: Int?,
    viewModel: MedicationViewModel,
    onBack: () -> Unit,
    snackbarHostState: SnackbarHostState,
    modifier: Modifier = Modifier
) {
    val context = LocalContext.current
    val medications by viewModel.medications.collectAsStateWithLifecycle()
    val isTestingComponent by viewModel.isTestingComponent.collectAsStateWithLifecycle()
    val med = medications.firstOrNull { it.id == medicationId }

    if (med == null) {
        Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
            Column(horizontalAlignment = Alignment.CenterHorizontally) {
                Text("Medicine not found")
                Button(onClick = onBack, modifier = Modifier.padding(top = 12.dp)) {
                    Text("Go Back")
                }
            }
        }
        return
    }

    val pillColor = remember(med.colorHex) {
        try {
            Color(android.graphics.Color.parseColor(med.colorHex))
        } catch (e: Exception) {
            Color(0xFF004AC6)
        }
    }

    LazyColumn(
        modifier = modifier
            .fillMaxSize()
            .padding(horizontal = 16.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp),
        contentPadding = PaddingValues(top = 8.dp, bottom = 80.dp)
    ) {
        // Appbar Back anchor
        item {
            Row(
                modifier = Modifier.fillMaxWidth(),
                verticalAlignment = Alignment.CenterVertically
            ) {
                IconButton(onClick = onBack, modifier = Modifier.testTag("details_back_button")) {
                    Icon(Icons.AutoMirrored.Filled.ArrowBack, "Back")
                }
                Spacer(modifier = Modifier.width(8.dp))
                Text("Medicine Details", fontWeight = FontWeight.Bold, fontSize = 20.sp)
            }
        }

        // Large Badge Icon
        item {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(vertical = 12.dp),
                horizontalAlignment = Alignment.CenterHorizontally
            ) {
                Box(
                    modifier = Modifier
                        .size(96.dp)
                        .clip(CircleShape)
                        .background(pillColor.copy(alpha = 0.15f)),
                    contentAlignment = Alignment.Center
                ) {
                    Icon(
                        imageVector = Icons.Default.Healing,
                        contentDescription = "Pill icon",
                        tint = pillColor,
                        modifier = Modifier.size(48.dp)
                    )
                }
                Spacer(modifier = Modifier.height(12.dp))
                Text(med.name, fontWeight = FontWeight.Bold, fontSize = 26.sp)
                Text(
                    text = "${med.type} Medicine • Slot #${med.slot}",
                    fontSize = 14.sp,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
            }
        }

        // Inventory Status
        item {
            Card(
                colors = CardDefaults.cardColors(
                    containerColor = MaterialTheme.colorScheme.surfaceContainerLowest
                ),
                shape = RoundedCornerShape(28.dp),
                border = BorderStroke(1.dp, MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.4f)),
                modifier = Modifier.fillMaxWidth()
            ) {
                Column(
                    modifier = Modifier.padding(16.dp)
                ) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.Bottom
                    ) {
                        Column {
                            Text(
                                text = "INVENTORY STATUS",
                                fontSize = 11.sp,
                                fontWeight = FontWeight.Bold,
                                color = MaterialTheme.colorScheme.onSurfaceVariant,
                                letterSpacing = 0.5.sp
                            )
                            Spacer(modifier = Modifier.height(4.dp))
                            Row(verticalAlignment = Alignment.Bottom) {
                                Text(
                                    text = "${med.pillsRemaining}",
                                    fontWeight = FontWeight.Bold,
                                    fontSize = 24.sp
                                )
                                Text(
                                    text = " / ${med.maxCapacity} Pills remaining",
                                    fontSize = 13.sp,
                                    color = MaterialTheme.colorScheme.onSurfaceVariant
                                )
                            }
                        }
                        
                        val isLow = med.pillsRemaining < 10
                        Box(
                            modifier = Modifier
                                .clip(RoundedCornerShape(100.dp))
                                .background(
                                    if (isLow) MaterialTheme.colorScheme.errorContainer else MaterialTheme.colorScheme.secondaryContainer
                                )
                                .padding(horizontal = 12.dp, vertical = 4.dp)
                        ) {
                            Text(
                                text = if (isLow) "Low Stock" else "Safe",
                                fontWeight = FontWeight.Bold,
                                fontSize = 11.sp,
                                color = if (isLow) MaterialTheme.colorScheme.onErrorContainer else MaterialTheme.colorScheme.onSecondaryContainer
                            )
                        }
                    }

                    Spacer(modifier = Modifier.height(12.dp))
                    
                    val progressFraction = med.pillsRemaining.toFloat() / med.maxCapacity.toFloat()
                    LinearProgressIndicator(
                        progress = { progressFraction },
                        color = if (med.pillsRemaining < 10) MaterialTheme.colorScheme.error else MaterialTheme.colorScheme.secondary,
                        trackColor = MaterialTheme.colorScheme.surfaceVariant,
                        strokeCap = StrokeCap.Round,
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(10.dp)
                    )

                    Spacer(modifier = Modifier.height(10.dp))
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Icon(
                            imageVector = Icons.Default.Event,
                            contentDescription = "Event",
                            tint = MaterialTheme.colorScheme.onSurfaceVariant,
                            modifier = Modifier.size(14.dp)
                        )
                        Spacer(modifier = Modifier.width(6.dp))
                        Text(
                            text = "Estimated empty in 5 days (Friday)",
                            fontSize = 12.sp,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                    }
                }
            }
        }

        // Daily schedule
        item {
            Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                Text(
                    text = "Daily Schedule",
                    fontWeight = FontWeight.Bold,
                    fontSize = 14.sp,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
                
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    val alarms = med.scheduleTimes.map { it.time }
                    alarms.forEach { alarm ->
                        Box(
                            modifier = Modifier
                                .clip(RoundedCornerShape(16.dp))
                                .background(MaterialTheme.colorScheme.surfaceContainerHigh)
                                .padding(horizontal = 16.dp, vertical = 10.dp)
                        ) {
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                Icon(
                                    Icons.Default.Alarm,
                                    "Alarm",
                                    tint = MaterialTheme.colorScheme.primary,
                                    modifier = Modifier.size(16.dp)
                                )
                                Spacer(modifier = Modifier.width(6.dp))
                                Text(alarm.trim(), fontWeight = FontWeight.Bold, fontSize = 13.sp)
                            }
                        }
                    }
                }
                
                Text(
                    text = "Take with food as prescribed by physician.",
                    fontSize = 12.sp,
                    fontWeight = FontWeight.Medium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    modifier = Modifier.padding(top = 4.dp)
                )
            }
        }

        // Asymmetric context tiles
        item {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                Card(
                    modifier = Modifier.weight(1f),
                    shape = RoundedCornerShape(24.dp),
                    colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceContainerLow)
                ) {
                    Column(modifier = Modifier.padding(12.dp)) {
                        Icon(Icons.Default.History, "Last Taken", tint = MaterialTheme.colorScheme.primary)
                        Spacer(modifier = Modifier.height(6.dp))
                        Text("Last Taken", fontSize = 11.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                        Text(
                            text = med.lastTakenTime ?: "Never",
                            fontWeight = FontWeight.Bold,
                            fontSize = 13.sp,
                            color = MaterialTheme.colorScheme.onSurface
                        )
                    }
                }

                Card(
                    modifier = Modifier.weight(1f),
                    shape = RoundedCornerShape(24.dp),
                    colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceContainerLow)
                ) {
                    Column(modifier = Modifier.padding(12.dp)) {
                        Icon(Icons.Default.Star, "Streak", tint = MaterialTheme.colorScheme.primary)
                        Spacer(modifier = Modifier.height(6.dp))
                        Text("Adherence Streak", fontSize = 11.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                        Text(
                            text = "${med.streakDays} Days",
                            fontWeight = FontWeight.Bold,
                            fontSize = 14.sp,
                            color = MaterialTheme.colorScheme.onSurface
                        )
                    }
                }
            }
        }

        // Actions
        item {
            Column(
                modifier = Modifier.fillMaxWidth(),
                verticalArrangement = Arrangement.spacedBy(10.dp)
            ) {
                Button(
                    onClick = { viewModel.refillMedication(med) },
                    colors = ButtonDefaults.buttonColors(
                        containerColor = MaterialTheme.colorScheme.primary
                    ),
                    shape = RoundedCornerShape(28.dp),
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(48.dp)
                        .testTag("refill_inventory_button")
                ) {
                    Icon(Icons.Default.ShoppingCart, "Refill")
                    Spacer(modifier = Modifier.width(8.dp))
                    Text("Refill Inventory", fontWeight = FontWeight.Bold)
                }

                val isDispensingThis = isTestingComponent == "Slot #${med.slot}"
                Button(
                    onClick = {
                        viewModel.testDispense(med) { success ->
                            // Handled internally in logs
                        }
                    },
                    colors = ButtonDefaults.buttonColors(
                        containerColor = if (isDispensingThis) MaterialTheme.colorScheme.surfaceVariant else MaterialTheme.colorScheme.secondaryContainer,
                        contentColor = if (isDispensingThis) MaterialTheme.colorScheme.onSurfaceVariant else MaterialTheme.colorScheme.onSecondaryContainer
                    ),
                    shape = RoundedCornerShape(28.dp),
                    enabled = isTestingComponent == null,
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(48.dp)
                        .testTag("run_test_dispense_button")
                ) {
                    if (isDispensingThis) {
                        CircularProgressIndicator(modifier = Modifier.size(20.dp))
                        Spacer(modifier = Modifier.width(8.dp))
                        Text("Dispensing...", fontWeight = FontWeight.Bold)
                    } else {
                        Icon(Icons.Default.PlayArrow, "Dispense")
                        Spacer(modifier = Modifier.width(8.dp))
                        Text("Run Test Dispense", fontWeight = FontWeight.Bold)
                    }
                }

                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(10.dp)
                ) {
                    OutlinedButton(
                        onClick = {
                            viewModel.toggleMedicationEnabled(med, !med.isEnabled)
                        },
                        shape = RoundedCornerShape(28.dp),
                        modifier = Modifier
                            .weight(1f)
                            .height(48.dp)
                    ) {
                        Icon(if (med.isEnabled) Icons.Default.Cancel else Icons.Default.CheckCircle, "Toggle")
                        Spacer(modifier = Modifier.width(4.dp))
                        Text(if (med.isEnabled) "Disable" else "Enable", fontSize = 13.sp)
                    }

                    Button(
                        onClick = {
                            viewModel.deleteMedication(med.id, med.name)
                            onBack()
                        },
                        colors = ButtonDefaults.buttonColors(
                            containerColor = MaterialTheme.colorScheme.errorContainer,
                            contentColor = MaterialTheme.colorScheme.onErrorContainer
                        ),
                        shape = RoundedCornerShape(28.dp),
                        modifier = Modifier
                            .weight(1f)
                            .height(48.dp)
                            .testTag("delete_medication_button")
                    ) {
                        Icon(Icons.Default.Delete, "Delete")
                        Spacer(modifier = Modifier.width(4.dp))
                        Text("Delete", fontSize = 13.sp)
                    }
                }
            }
        }
    }
}

// ---------------------------------------------------------------------------------
// 4. ADD MEDICINE SCREEN
// ---------------------------------------------------------------------------------
@Composable
fun AddMedicineScreen(
    viewModel: MedicationViewModel,
    onBack: () -> Unit,
    snackbarHostState: SnackbarHostState,
    modifier: Modifier = Modifier
) {
    val scope = rememberCoroutineScope()
    
    var medName by remember { mutableStateOf("") }
    var medDosage by remember { mutableStateOf("500mg") }
    var medType by remember { mutableStateOf("Tablet") }
    var medColor by remember { mutableStateOf("#4CAF50") } // Default Green
    var medSlot by remember { mutableStateOf(1) }
    var pillsRemaining by remember { mutableStateOf(30) }
    var dosePerReminder by remember { mutableStateOf(1) }
    var repeatPattern by remember { mutableStateOf("Daily") }
    
    val alarmTimes = remember { mutableStateListOf("08:00 AM", "09:00 PM") }

    LazyColumn(
        modifier = modifier
            .fillMaxSize()
            .padding(horizontal = 16.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp),
        contentPadding = PaddingValues(top = 8.dp, bottom = 120.dp)
    ) {
        // App bar Back anchor
        item {
            Row(
                modifier = Modifier.fillMaxWidth(),
                verticalAlignment = Alignment.CenterVertically
            ) {
                IconButton(onClick = onBack, modifier = Modifier.testTag("add_back_button")) {
                    Icon(Icons.AutoMirrored.Filled.ArrowBack, "Back")
                }
                Spacer(modifier = Modifier.width(8.dp))
                Text("Add Medicine", fontWeight = FontWeight.Bold, fontSize = 20.sp)
            }
        }

        // Details Form Box
        item {
            Card(
                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceContainerLowest),
                shape = RoundedCornerShape(28.dp),
                border = BorderStroke(1.dp, MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.4f)),
                modifier = Modifier.fillMaxWidth()
            ) {
                Column(
                    modifier = Modifier.padding(16.dp),
                    verticalArrangement = Arrangement.spacedBy(16.dp)
                ) {
                    Column {
                        Text("Medicine Details", fontWeight = FontWeight.Bold, fontSize = 18.sp)
                        Text(
                            "Identify and configure the medication for the smart dispenser.",
                            fontSize = 12.sp,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                    }

                    // Medicine Name Input
                    Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
                        Text("Medicine Name", fontWeight = FontWeight.Bold, fontSize = 13.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                        OutlinedTextField(
                            value = medName,
                            onValueChange = { medName = it },
                            placeholder = { Text("e.g. Metformin", fontSize = 14.sp) },
                            shape = RoundedCornerShape(24.dp),
                            singleLine = true,
                            modifier = Modifier
                                .fillMaxWidth()
                                .testTag("add_med_name_input")
                        )
                    }

                    // Medicine Dosage Input
                    Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
                        Text("Medicine Strength / Dosage", fontWeight = FontWeight.Bold, fontSize = 13.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                        OutlinedTextField(
                            value = medDosage,
                            onValueChange = { medDosage = it },
                            placeholder = { Text("e.g. 500mg", fontSize = 14.sp) },
                            shape = RoundedCornerShape(24.dp),
                            singleLine = true,
                            modifier = Modifier.fillMaxWidth()
                        )
                    }

                    // Type Selector - Pill type selection cards
                    Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
                        Text("Medicine Type", fontWeight = FontWeight.Bold, fontSize = 13.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.spacedBy(8.dp)
                        ) {
                            val types = listOf("Tablet", "Capsule", "Softgel")
                            types.forEach { type ->
                                val isSelected = medType == type
                                val cardBg = if (isSelected) MaterialTheme.colorScheme.secondaryContainer else MaterialTheme.colorScheme.surfaceContainerLow
                                val cardColor = if (isSelected) MaterialTheme.colorScheme.onSecondaryContainer else MaterialTheme.colorScheme.onSurfaceVariant
                                Box(
                                    modifier = Modifier
                                        .weight(1f)
                                        .clip(RoundedCornerShape(24.dp))
                                        .background(cardBg)
                                        .clickable { medType = type }
                                        .padding(vertical = 12.dp),
                                    contentAlignment = Alignment.Center
                                ) {
                                    Column(horizontalAlignment = Alignment.CenterHorizontally) {
                                        Icon(
                                            imageVector = when(type) {
                                                "Capsule" -> Icons.Default.Healing
                                                "Softgel" -> Icons.Default.MedicalServices
                                                else -> Icons.Default.Healing
                                            },
                                            contentDescription = type,
                                            tint = cardColor,
                                            modifier = Modifier.size(20.dp)
                                        )
                                        Spacer(modifier = Modifier.height(4.dp))
                                        Text(type, fontSize = 12.sp, fontWeight = FontWeight.Bold, color = cardColor)
                                    }
                                }
                            }
                        }
                    }

                    // Slot Selector & Color Picker Row
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(16.dp)
                    ) {
                        Column(
                            modifier = Modifier.weight(1f),
                            verticalArrangement = Arrangement.spacedBy(6.dp)
                        ) {
                            Text("Dispenser Slot", fontWeight = FontWeight.Bold, fontSize = 13.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.spacedBy(4.dp)
                            ) {
                                (1..3).forEach { slot ->
                                    val isSelected = medSlot == slot
                                    val bg = if (isSelected) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.surfaceContainerLow
                                    val color = if (isSelected) Color.White else MaterialTheme.colorScheme.onSurface
                                    Box(
                                        modifier = Modifier
                                            .weight(1f)
                                            .clip(RoundedCornerShape(20.dp))
                                            .background(bg)
                                            .clickable { medSlot = slot }
                                            .padding(vertical = 10.dp),
                                        contentAlignment = Alignment.Center
                                    ) {
                                        Text("$slot", fontWeight = FontWeight.Bold, color = color)
                                    }
                                }
                            }
                        }

                        Column(
                            modifier = Modifier.weight(1f),
                            verticalArrangement = Arrangement.spacedBy(6.dp)
                        ) {
                            Text("Pill Color", fontWeight = FontWeight.Bold, fontSize = 13.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.spacedBy(6.dp),
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                val colors = listOf("#F44336", "#2196F3", "#FFEB3B", "#4CAF50")
                                colors.forEach { color ->
                                    val isSelected = medColor == color
                                    val brushColor = Color(android.graphics.Color.parseColor(color))
                                    Box(
                                        modifier = Modifier
                                            .size(24.dp)
                                            .clip(CircleShape)
                                            .background(brushColor)
                                            .border(
                                                width = if (isSelected) 2.dp else 0.dp,
                                                color = if (isSelected) MaterialTheme.colorScheme.primary else Color.Transparent,
                                                shape = CircleShape
                                            )
                                            .clickable { medColor = color }
                                    )
                                }
                            }
                        }
                    }
                }
            }
        }

        // Inventory Stock & Dosage Adjuster Cards
        item {
            Card(
                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceContainerLowest),
                shape = RoundedCornerShape(28.dp),
                border = BorderStroke(1.dp, MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.4f)),
                modifier = Modifier.fillMaxWidth()
            ) {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(16.dp),
                    horizontalArrangement = Arrangement.spacedBy(16.dp)
                ) {
                    // Remaining Incrementer
                    Column(
                        modifier = Modifier.weight(1f),
                        verticalArrangement = Arrangement.spacedBy(6.dp)
                    ) {
                        Text("Pills Remaining", fontWeight = FontWeight.Bold, fontSize = 13.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(8.dp)
                        ) {
                            IconButton(
                                onClick = { if (pillsRemaining > 1) pillsRemaining-- },
                                modifier = Modifier
                                    .size(36.dp)
                                    .background(MaterialTheme.colorScheme.surfaceContainerHigh, CircleShape)
                            ) {
                                Text("-", fontWeight = FontWeight.Bold, fontSize = 16.sp)
                            }
                            Text(
                                text = "$pillsRemaining",
                                fontWeight = FontWeight.Bold,
                                fontSize = 16.sp,
                                modifier = Modifier.weight(1f),
                                textAlign = TextAlign.Center
                            )
                            IconButton(
                                onClick = { if (pillsRemaining < 50) pillsRemaining++ },
                                modifier = Modifier
                                    .size(36.dp)
                                    .background(MaterialTheme.colorScheme.surfaceContainerHigh, CircleShape)
                            ) {
                                Text("+", fontWeight = FontWeight.Bold, fontSize = 16.sp)
                            }
                        }
                    }

                    // Dosage Incrementer
                    Column(
                        modifier = Modifier.weight(1f),
                        verticalArrangement = Arrangement.spacedBy(6.dp)
                    ) {
                        Text("Dose Per Reminder", fontWeight = FontWeight.Bold, fontSize = 13.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(8.dp)
                        ) {
                            IconButton(
                                onClick = { if (dosePerReminder > 1) dosePerReminder-- },
                                modifier = Modifier
                                    .size(36.dp)
                                    .background(MaterialTheme.colorScheme.surfaceContainerHigh, CircleShape)
                            ) {
                                Text("-", fontWeight = FontWeight.Bold, fontSize = 16.sp)
                            }
                            Text(
                                text = "$dosePerReminder",
                                fontWeight = FontWeight.Bold,
                                fontSize = 16.sp,
                                modifier = Modifier.weight(1f),
                                textAlign = TextAlign.Center
                            )
                            IconButton(
                                onClick = { if (dosePerReminder < 5) dosePerReminder++ },
                                modifier = Modifier
                                    .size(36.dp)
                                    .background(MaterialTheme.colorScheme.surfaceContainerHigh, CircleShape)
                            ) {
                                Text("+", fontWeight = FontWeight.Bold, fontSize = 16.sp)
                            }
                        }
                    }
                }
            }
        }

        // Medicine Schedule Box
        item {
            Card(
                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceContainerLowest),
                shape = RoundedCornerShape(28.dp),
                border = BorderStroke(1.dp, MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.4f)),
                modifier = Modifier.fillMaxWidth()
            ) {
                Column(
                    modifier = Modifier.padding(16.dp),
                    verticalArrangement = Arrangement.spacedBy(16.dp)
                ) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Column {
                            Text("Medicine Schedule", fontWeight = FontWeight.Bold, fontSize = 16.sp)
                            Text("Set times and repetition frequency.", fontSize = 12.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                        }
                        Icon(Icons.Default.Alarm, "Clock", tint = MaterialTheme.colorScheme.primary)
                    }

                    // Pattern Pills
                    Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
                        Text("Repeat Pattern", fontWeight = FontWeight.Bold, fontSize = 13.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                            val patterns = listOf("Daily", "Weekdays", "Custom")
                            patterns.forEach { pattern ->
                                val isSelected = repeatPattern == pattern
                                val bg = if (isSelected) MaterialTheme.colorScheme.primaryContainer else MaterialTheme.colorScheme.surfaceContainerLow
                                val textCol = if (isSelected) MaterialTheme.colorScheme.onPrimaryContainer else MaterialTheme.colorScheme.onSurfaceVariant
                                Box(
                                    modifier = Modifier
                                        .clip(RoundedCornerShape(100.dp))
                                        .background(bg)
                                        .clickable { repeatPattern = pattern }
                                        .padding(horizontal = 16.dp, vertical = 6.dp)
                                ) {
                                    Text(pattern, fontSize = 13.sp, fontWeight = FontWeight.Bold, color = textCol)
                                }
                            }
                        }
                    }

                    // Multi Alarm items List
                    Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                        Text("Times of Day", fontWeight = FontWeight.Bold, fontSize = 13.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                        alarmTimes.forEachIndexed { idx, time ->
                            Row(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .clip(RoundedCornerShape(12.dp))
                                    .background(MaterialTheme.colorScheme.surfaceContainerLow)
                                    .padding(horizontal = 12.dp, vertical = 10.dp),
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Row(verticalAlignment = Alignment.CenterVertically) {
                                    Icon(
                                        imageVector = if (idx == 0) Icons.Default.WbSunny else Icons.Default.NightsStay,
                                        contentDescription = "Day/Night Icon",
                                        tint = MaterialTheme.colorScheme.primary,
                                        modifier = Modifier.size(16.dp)
                                    )
                                    Spacer(modifier = Modifier.width(8.dp))
                                    Text(time, fontWeight = FontWeight.Bold, fontSize = 14.sp)
                                }
                                
                                TextButton(
                                    onClick = { if (alarmTimes.size > 1) alarmTimes.removeAt(idx) }
                                ) {
                                    Text("Remove", color = MaterialTheme.colorScheme.error, fontWeight = FontWeight.Bold, fontSize = 13.sp)
                                }
                            }
                        }
                        
                        OutlinedButton(
                            onClick = {
                                if (alarmTimes.size < 4) {
                                    val newTime = when(alarmTimes.size) {
                                        1 -> "02:00 PM"
                                        2 -> "06:00 PM"
                                        else -> "11:00 PM"
                                    }
                                    alarmTimes.add(newTime)
                                }
                            },
                            shape = RoundedCornerShape(24.dp),
                            modifier = Modifier.fillMaxWidth()
                        ) {
                            Icon(Icons.Default.Add, "Add Time")
                            Spacer(modifier = Modifier.width(4.dp))
                            Text("Add Another Time", fontWeight = FontWeight.Bold)
                        }
                    }
                }
            }
        }

        // IoT sync advisory banner
        item {
            Card(
                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.primaryContainer),
                shape = RoundedCornerShape(28.dp),
                modifier = Modifier.fillMaxWidth()
            ) {
                Row(
                    modifier = Modifier.padding(16.dp),
                    horizontalArrangement = Arrangement.spacedBy(12.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Box(
                        modifier = Modifier
                            .size(40.dp)
                            .clip(CircleShape)
                            .background(MaterialTheme.colorScheme.onPrimaryContainer.copy(alpha = 0.12f)),
                        contentAlignment = Alignment.Center
                    ) {
                        Icon(Icons.Default.SettingsSuggest, "Sync", tint = MaterialTheme.colorScheme.onPrimaryContainer)
                    }
                    Column {
                        Text("IoT Sync Active", fontWeight = FontWeight.Bold, fontSize = 14.sp, color = MaterialTheme.colorScheme.onPrimaryContainer)
                        Text(
                            "Changes will be pushed to Dispenser MD-904 instantly upon saving.",
                            fontSize = 12.sp,
                            color = MaterialTheme.colorScheme.onPrimaryContainer.copy(alpha = 0.8f)
                        )
                    }
                }
            }
        }

        // Footer Action buttons
        item {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                OutlinedButton(
                    onClick = onBack,
                    shape = RoundedCornerShape(100.dp),
                    modifier = Modifier
                        .weight(1f)
                        .height(48.dp)
                ) {
                    Text("Cancel", fontWeight = FontWeight.Bold)
                }

                Button(
                    onClick = {
                        if (medName.isBlank()) {
                            scope.launch {
                                snackbarHostState.showSnackbar("Please enter a medicine name")
                            }
                            return@Button
                        }
                        
                        viewModel.addMedication(
                            name = medName,
                            dosage = medDosage,
                            type = medType,
                            colorHex = medColor,
                            slot = medSlot,
                            pillsRemaining = pillsRemaining,
                            dosePerReminder = dosePerReminder,
                            repeatPattern = repeatPattern,
                            scheduleTimes = alarmTimes.joinToString(", ")
                        )
                        onBack()
                    },
                    shape = RoundedCornerShape(100.dp),
                    modifier = Modifier
                        .weight(1.5f)
                        .height(48.dp)
                        .testTag("save_medicine_button")
                ) {
                    Text("Save Medicine", fontWeight = FontWeight.Bold)
                }
            }
        }
    }
}

// ---------------------------------------------------------------------------------
// 5. LOGS / TIMELINE SCREEN
// ---------------------------------------------------------------------------------
@Composable
fun LogsTimelineScreen(
    viewModel: MedicationViewModel,
    onBack: () -> Unit,
    modifier: Modifier = Modifier
) {
    val logs by viewModel.logs.collectAsStateWithLifecycle()
    var logsSearchQuery by remember { mutableStateOf("") }

    val filteredLogs = logs.filter {
        it.medicationName.contains(logsSearchQuery, ignoreCase = true) ||
        it.description.contains(logsSearchQuery, ignoreCase = true) ||
        it.status.contains(logsSearchQuery, ignoreCase = true)
    }

    val todayLogs = filteredLogs.filter { it.categoryDate == "Today" }
    val yesterdayLogs = filteredLogs.filter { it.categoryDate == "Yesterday" }

    LazyColumn(
        modifier = modifier
            .fillMaxSize()
            .padding(horizontal = 16.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp),
        contentPadding = PaddingValues(top = 8.dp, bottom = 80.dp)
    ) {
        // Appbar Back anchor
        item {
            Row(
                modifier = Modifier.fillMaxWidth(),
                verticalAlignment = Alignment.CenterVertically
            ) {
                IconButton(onClick = onBack, modifier = Modifier.testTag("logs_back_button")) {
                    Icon(Icons.AutoMirrored.Filled.ArrowBack, "Back")
                }
                Spacer(modifier = Modifier.width(8.dp))
                Text("Medicine Logs", fontWeight = FontWeight.Bold, fontSize = 20.sp)
            }
        }

        // Live filtration search bar
        item {
            OutlinedTextField(
                value = logsSearchQuery,
                onValueChange = { logsSearchQuery = it },
                placeholder = { Text("Search logs...", fontSize = 14.sp) },
                leadingIcon = { Icon(Icons.Default.Search, "Search") },
                shape = RoundedCornerShape(28.dp),
                colors = OutlinedTextFieldDefaults.colors(
                    focusedContainerColor = MaterialTheme.colorScheme.surfaceContainerLow,
                    unfocusedContainerColor = MaterialTheme.colorScheme.surfaceContainerLow,
                    focusedBorderColor = MaterialTheme.colorScheme.primary,
                    unfocusedBorderColor = Color.Transparent
                ),
                modifier = Modifier
                    .fillMaxWidth()
                    .testTag("logs_search_bar")
            )
        }

        // Timeline: Today Section
        if (todayLogs.isNotEmpty()) {
            item {
                Text(
                    text = "TODAY",
                    fontSize = 11.sp,
                    fontWeight = FontWeight.Bold,
                    letterSpacing = 1.sp,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    modifier = Modifier.padding(horizontal = 4.dp, vertical = 4.dp)
                )
            }

            items(todayLogs) { log ->
                TimelineLogItem(log = log)
            }
        }

        // Timeline: Yesterday Section
        if (yesterdayLogs.isNotEmpty()) {
            item {
                Spacer(modifier = Modifier.height(8.dp))
                Text(
                    text = "YESTERDAY",
                    fontSize = 11.sp,
                    fontWeight = FontWeight.Bold,
                    letterSpacing = 1.sp,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    modifier = Modifier.padding(horizontal = 4.dp, vertical = 4.dp)
                )
            }

            items(yesterdayLogs) { log ->
                TimelineLogItem(log = log)
            }
        }

        if (todayLogs.isEmpty() && yesterdayLogs.isEmpty()) {
            item {
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(vertical = 48.dp),
                    contentAlignment = Alignment.Center
                ) {
                    Column(horizontalAlignment = Alignment.CenterHorizontally) {
                        Icon(Icons.Default.Info, "Empty", tint = MaterialTheme.colorScheme.outline)
                        Spacer(modifier = Modifier.height(8.dp))
                        Text("No logged history matches your search.")
                    }
                }
            }
        }
    }
}

@Composable
fun TimelineLogItem(
    log: LogEntry,
    modifier: Modifier = Modifier
) {
    val statusColor = when (log.status) {
        "Taken" -> MaterialTheme.colorScheme.secondary
        "Cancelled" -> MaterialTheme.colorScheme.outline
        "Failed" -> MaterialTheme.colorScheme.error
        else -> MaterialTheme.colorScheme.error // Missed
    }

    val statusContainerColor = when (log.status) {
        "Taken" -> MaterialTheme.colorScheme.secondaryContainer
        "Cancelled" -> MaterialTheme.colorScheme.surfaceContainerLow
        "Failed" -> MaterialTheme.colorScheme.errorContainer
        else -> MaterialTheme.colorScheme.errorContainer // Missed
    }

    val icon = when (log.status) {
        "Taken" -> Icons.Default.CheckCircle
        "Cancelled" -> Icons.Default.Cancel
        "Failed" -> Icons.Default.Error
        else -> Icons.Default.History // Missed
    }

    Row(
        modifier = modifier
            .fillMaxWidth()
            .testTag("log_item_${log.medicationName.lowercase()}"),
        horizontalArrangement = Arrangement.spacedBy(16.dp),
        verticalAlignment = Alignment.Top
    ) {
        // Icon with vertical indicator connection bar
        Column(horizontalAlignment = Alignment.CenterHorizontally) {
            Box(
                modifier = Modifier
                    .size(40.dp)
                    .clip(CircleShape)
                    .background(statusContainerColor),
                contentAlignment = Alignment.Center
            ) {
                Icon(
                    imageVector = icon,
                    contentDescription = log.status,
                    tint = statusColor,
                    modifier = Modifier.size(20.dp)
                )
            }
        }

        // Context details
        Card(
            colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceContainerLowest),
            shape = RoundedCornerShape(20.dp),
            border = BorderStroke(1.dp, MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.35f)),
            modifier = Modifier.weight(1f)
        ) {
            Column(modifier = Modifier.padding(14.dp)) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Column {
                        Text(log.medicationName, fontWeight = FontWeight.Bold, fontSize = 16.sp)
                        val formatter = remember { SimpleDateFormat("hh:mm AM", Locale.getDefault()) }
                        val timeString = formatter.format(Date(log.timestamp))
                        Text(
                            text = "$timeString • ${log.dosage}",
                            fontSize = 12.sp,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                    }
                    
                    Box(
                        modifier = Modifier
                            .clip(RoundedCornerShape(100.dp))
                            .background(statusContainerColor)
                            .padding(horizontal = 10.dp, vertical = 2.dp)
                    ) {
                        Text(
                            text = log.status,
                            fontSize = 10.sp,
                            fontWeight = FontWeight.Bold,
                            color = statusColor
                        )
                    }
                }
                
                Spacer(modifier = Modifier.height(8.dp))
                Text(
                    text = log.description,
                    fontSize = 13.sp,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
            }
        }
    }
}

// ---------------------------------------------------------------------------------
// 6. ENGINEERING DIAGNOSTICS SCREEN
// ---------------------------------------------------------------------------------
@Composable
fun DiagnosticsScreen(
    viewModel: MedicationViewModel,
    snackbarHostState: SnackbarHostState,
    modifier: Modifier = Modifier
) {
    val scope = rememberCoroutineScope()
    val componentStates by viewModel.componentStates.collectAsStateWithLifecycle()
    val isTestingComponent by viewModel.isTestingComponent.collectAsStateWithLifecycle()
    val isFullDiagnosing by viewModel.isFullDiagnosing.collectAsStateWithLifecycle()
    val temperature by viewModel.temperature.collectAsStateWithLifecycle()

    LazyColumn(
        modifier = modifier
            .fillMaxSize()
            .padding(horizontal = 16.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp),
        contentPadding = PaddingValues(top = 8.dp, bottom = 100.dp)
    ) {
        item {
            Column(modifier = Modifier.padding(vertical = 4.dp)) {
                Text("System Diagnostics", fontWeight = FontWeight.Bold, fontSize = 24.sp)
                Text("Engineering level hardware health monitor", fontSize = 13.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
            }
        }

        // Live grid layout of hardware channels
        item {
            Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                componentStates.entries.chunked(2).forEach { rowComponents ->
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(10.dp)
                    ) {
                        rowComponents.forEach { (name, status) ->
                            DiagnosticComponentCard(
                                name = name,
                                status = status,
                                isTesting = isTestingComponent == name,
                                onTest = { viewModel.runComponentTest(name) },
                                modifier = Modifier.weight(1f)
                            )
                        }
                        
                        // Handle odd element to balance visual spacing
                        if (rowComponents.size == 1) {
                            Spacer(modifier = Modifier.weight(1f))
                        }
                    }
                }
            }
        }

        // Real-time temperature slider
        item {
            Card(
                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.primaryContainer),
                shape = RoundedCornerShape(28.dp),
                modifier = Modifier.fillMaxWidth()
            ) {
                Column(
                    modifier = Modifier.padding(20.dp)
                ) {
                    Text(
                        text = "Internal Temperature",
                        fontSize = 13.sp,
                        fontWeight = FontWeight.Medium,
                        color = MaterialTheme.colorScheme.onPrimaryContainer.copy(alpha = 0.75f)
                    )
                    Row(
                        verticalAlignment = Alignment.Bottom,
                        horizontalArrangement = Arrangement.spacedBy(8.dp),
                        modifier = Modifier.padding(vertical = 4.dp)
                    ) {
                        Text(
                            text = String.format(Locale.US, "%.1f°C", temperature),
                            fontWeight = FontWeight.Black,
                            fontSize = 32.sp,
                            color = MaterialTheme.colorScheme.onPrimaryContainer
                        )
                        Text(
                            text = "Safe Range",
                            fontSize = 12.sp,
                            fontWeight = FontWeight.Bold,
                            color = MaterialTheme.colorScheme.onPrimaryContainer.copy(alpha = 0.7f),
                            modifier = Modifier.padding(bottom = 6.dp)
                        )
                    }

                    Spacer(modifier = Modifier.height(12.dp))
                    
                    // Custom linear indicator slider
                    val temperatureFraction = (temperature - 15f) / (50f - 15f) // map range 15 to 50
                    LinearProgressIndicator(
                        progress = { temperatureFraction },
                        color = MaterialTheme.colorScheme.primary,
                        trackColor = MaterialTheme.colorScheme.onPrimaryContainer.copy(alpha = 0.15f),
                        strokeCap = StrokeCap.Round,
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(8.dp)
                    )
                }
            }
        }

        // Full system diag button trigger
        item {
            Button(
                onClick = {
                    viewModel.runFullDiagnostics {
                        scope.launch {
                            snackbarHostState.showSnackbar("Audit completed successfully. System nominal.")
                        }
                    }
                },
                colors = ButtonDefaults.buttonColors(
                    containerColor = MaterialTheme.colorScheme.primary
                ),
                shape = RoundedCornerShape(28.dp),
                enabled = !isFullDiagnosing && isTestingComponent == null,
                modifier = Modifier
                    .fillMaxWidth()
                    .height(52.dp)
                    .testTag("run_full_diagnostics_button")
            ) {
                if (isFullDiagnosing) {
                    CircularProgressIndicator(color = Color.White, modifier = Modifier.size(20.dp))
                    Spacer(modifier = Modifier.width(8.dp))
                    Text("Running Diagnostic Audit...", fontWeight = FontWeight.Bold)
                } else {
                    Icon(Icons.Default.Refresh, "Audit")
                    Spacer(modifier = Modifier.width(8.dp))
                    Text("Run Full System Diagnostic", fontWeight = FontWeight.Bold)
                }
            }
        }
    }
}

@Composable
fun DiagnosticComponentCard(
    name: String,
    status: String,
    isTesting: Boolean,
    onTest: () -> Unit,
    modifier: Modifier = Modifier
) {
    val statusBg = when(status) {
        "WORKING" -> MaterialTheme.colorScheme.secondaryContainer
        "WARNING" -> MaterialTheme.colorScheme.tertiaryContainer
        else -> MaterialTheme.colorScheme.errorContainer
    }

    val statusColor = when(status) {
        "WORKING" -> MaterialTheme.colorScheme.onSecondaryContainer
        "WARNING" -> MaterialTheme.colorScheme.onTertiaryContainer
        else -> MaterialTheme.colorScheme.onErrorContainer
    }

    Card(
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceContainerLowest),
        shape = RoundedCornerShape(24.dp),
        border = BorderStroke(
            width = 1.dp,
            color = if (status == "WARNING") MaterialTheme.colorScheme.tertiary else MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.35f)
        ),
        modifier = modifier.testTag("diag_card_${name.lowercase().replace(" ", "_")}")
    ) {
        Column(
            modifier = Modifier.padding(12.dp)
        ) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.Top
            ) {
                Box(
                    modifier = Modifier
                        .size(32.dp)
                        .clip(RoundedCornerShape(10.dp))
                        .background(statusBg),
                    contentAlignment = Alignment.Center
                ) {
                    Icon(
                        imageVector = when(name) {
                            "WiFi Stack" -> Icons.Default.Wifi
                            "OLED Display" -> Icons.Default.PlayArrow
                            "Speaker" -> Icons.Default.VolumeUp
                            else -> Icons.Default.Build
                        },
                        contentDescription = name,
                        tint = statusColor,
                        modifier = Modifier.size(16.dp)
                    )
                }

                Box(
                    modifier = Modifier
                        .clip(RoundedCornerShape(100.dp))
                        .background(statusBg)
                        .padding(horizontal = 6.dp, vertical = 2.dp)
                ) {
                    Text(
                        text = status,
                        fontSize = 8.sp,
                        fontWeight = FontWeight.Bold,
                        color = statusColor
                    )
                }
            }

            Spacer(modifier = Modifier.height(10.dp))
            Text(name, fontWeight = FontWeight.Bold, fontSize = 13.sp, maxLines = 1, overflow = TextOverflow.Ellipsis)
            Text(
                text = when(name) {
                    "IR Sensor" -> if (status == "OFFLINE") "No Signal Received" else "Calibrated online"
                    "Stepper Motor 3" -> if (status == "WARNING") "High Friction" else "Nominal status"
                    "RTC Module" -> "Precision: 0.2ms"
                    "REST API Gateway" -> "secure.medlink.io"
                    else -> "Operational"
                },
                fontSize = 11.sp,
                color = if (status == "OFFLINE" || status == "WARNING") statusColor else MaterialTheme.colorScheme.onSurfaceVariant,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis
            )

            Spacer(modifier = Modifier.height(12.dp))
            
            OutlinedButton(
                onClick = onTest,
                enabled = !isTesting,
                shape = RoundedCornerShape(20.dp),
                contentPadding = PaddingValues(0.dp),
                modifier = Modifier
                    .fillMaxWidth()
                    .height(32.dp)
            ) {
                if (isTesting) {
                    CircularProgressIndicator(modifier = Modifier.size(14.dp), strokeWidth = 2.dp)
                } else {
                    Text(if (status == "OFFLINE") "Reset" else "Test", fontSize = 11.sp, fontWeight = FontWeight.Bold)
                }
            }
        }
    }
}

// ---------------------------------------------------------------------------------
// 7. SETTINGS SCREEN
// ---------------------------------------------------------------------------------
@Composable
fun SettingsScreen(
    viewModel: MedicationViewModel,
    onNavigateToWifi: () -> Unit,
    onNavigateToAbout: () -> Unit,
    modifier: Modifier = Modifier
) {
    val hubConnected by viewModel.hubConnected.collectAsStateWithLifecycle()
    val wifiSSID by viewModel.wifiSSID.collectAsStateWithLifecycle()
    val isDarkTheme by viewModel.isDarkTheme.collectAsStateWithLifecycle()

    LazyColumn(
        modifier = modifier
            .fillMaxSize()
            .padding(horizontal = 16.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp),
        contentPadding = PaddingValues(top = 8.dp, bottom = 80.dp)
    ) {
        item {
            Column(modifier = Modifier.padding(vertical = 4.dp)) {
                Text("App & Device Settings", fontWeight = FontWeight.Bold, fontSize = 24.sp)
                Text("Manage configuration options and system preferences.", fontSize = 13.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
            }
        }

        // Connection status card
        item {
            Card(
                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceContainerLowest),
                shape = RoundedCornerShape(28.dp),
                border = BorderStroke(1.dp, MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.4f)),
                modifier = Modifier.fillMaxWidth()
            ) {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(16.dp),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Column {
                        Text("Hub Status", fontWeight = FontWeight.Bold, fontSize = 16.sp)
                        Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(4.dp)) {
                            Icon(
                                imageVector = Icons.Default.CheckCircle,
                                contentDescription = "Active",
                                tint = MaterialTheme.colorScheme.secondary,
                                modifier = Modifier.size(14.dp)
                            )
                            Text(
                                text = "Connected",
                                fontSize = 12.sp,
                                fontWeight = FontWeight.Bold,
                                color = MaterialTheme.colorScheme.secondary
                            )
                        }
                    }

                    Box(
                        modifier = Modifier.size(48.dp),
                        contentAlignment = Alignment.Center
                    ) {
                        CircularProgressIndicator(
                            progress = { 0.82f },
                            color = MaterialTheme.colorScheme.primary,
                            trackColor = MaterialTheme.colorScheme.surfaceVariant,
                            strokeCap = StrokeCap.Round,
                            modifier = Modifier.fillMaxSize()
                        )
                        Text("82%", fontSize = 11.sp, fontWeight = FontWeight.Bold)
                    }
                }
            }
        }

        // Device preferences category
        item {
            Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(6.dp),
                    modifier = Modifier.padding(start = 4.dp)
                ) {
                    Icon(Icons.Default.Build, "Device icon", tint = MaterialTheme.colorScheme.outline, modifier = Modifier.size(16.dp))
                    Text("DEVICE", fontWeight = FontWeight.Bold, fontSize = 11.sp, letterSpacing = 1.sp, color = MaterialTheme.colorScheme.outline)
                }

                Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
                    // WiFi Config row
                    SettingsItemRow(
                        title = "WiFi Config",
                        subtitle = wifiSSID,
                        icon = Icons.Default.Wifi,
                        onClick = onNavigateToWifi,
                        modifier = Modifier.testTag("settings_wifi_config")
                    )

                    // Firmware row
                    SettingsItemRow(
                        title = "Firmware Version",
                        subtitle = "v2.4.1 (Up to date)",
                        icon = Icons.Default.SystemUpdate,
                        badgeText = "Latest",
                        onClick = {}
                    )

                    // Reset button row
                    SettingsItemRow(
                        title = "Restart Device",
                        subtitle = "Reboot your IoT hub",
                        icon = Icons.Default.Refresh,
                        isDanger = true,
                        onClick = {}
                    )
                }
            }
        }

        // App config category
        item {
            Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(6.dp),
                    modifier = Modifier.padding(start = 4.dp)
                ) {
                    Icon(Icons.Default.Settings, "Config icon", tint = MaterialTheme.colorScheme.outline, modifier = Modifier.size(16.dp))
                    Text("APP SETTINGS", fontWeight = FontWeight.Bold, fontSize = 11.sp, letterSpacing = 1.sp, color = MaterialTheme.colorScheme.outline)
                }

                Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
                    // Dark Theme switch row
                    Card(
                        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceContainerLowest),
                        shape = RoundedCornerShape(12.dp),
                        border = BorderStroke(1.dp, MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.3f))
                    ) {
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(16.dp),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Row(
                                horizontalArrangement = Arrangement.spacedBy(12.dp),
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Box(
                                    modifier = Modifier
                                        .size(36.dp)
                                        .clip(CircleShape)
                                        .background(MaterialTheme.colorScheme.surfaceContainerHigh),
                                    contentAlignment = Alignment.Center
                                ) {
                                    Icon(Icons.Default.NightsStay, "Dark Mode", tint = MaterialTheme.colorScheme.primary)
                                }
                                Text("Dark Mode", fontWeight = FontWeight.Bold, fontSize = 15.sp)
                            }
                            
                            Switch(
                                checked = isDarkTheme,
                                onCheckedChange = { viewModel.toggleTheme() },
                                modifier = Modifier.testTag("dark_mode_switch")
                            )
                        }
                    }

                    // Notifications preferences
                    SettingsItemRow(
                        title = "Notifications",
                        subtitle = "Reminders, Health Alerts",
                        icon = Icons.Default.Notifications,
                        onClick = {}
                    )

                    // Volume row
                    SettingsItemRow(
                        title = "Sound",
                        subtitle = "Chime at 80%",
                        icon = Icons.Default.VolumeUp,
                        onClick = {}
                    )
                }
            }
        }

        // About category settings
        item {
            Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(6.dp),
                    modifier = Modifier.padding(start = 4.dp)
                ) {
                    Icon(Icons.Default.Info, "System info", tint = MaterialTheme.colorScheme.outline, modifier = Modifier.size(16.dp))
                    Text("SYSTEM", fontWeight = FontWeight.Bold, fontSize = 11.sp, letterSpacing = 1.sp, color = MaterialTheme.colorScheme.outline)
                }

                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(10.dp)
                ) {
                    // About block
                    Card(
                        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceContainerLowest),
                        shape = RoundedCornerShape(12.dp),
                        border = BorderStroke(1.dp, MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.3f)),
                        modifier = Modifier
                            .weight(1f)
                            .height(84.dp)
                            .clickable(onClick = onNavigateToAbout)
                    ) {
                        Column(
                            modifier = Modifier
                                .fillMaxSize()
                                .padding(12.dp),
                            verticalArrangement = Arrangement.Center
                        ) {
                            Text("About", fontWeight = FontWeight.Bold, fontSize = 14.sp)
                            Text("Legal & Credits", fontSize = 11.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                        }
                    }

                    // Developer Mode details block
                    Card(
                        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceContainerLowest),
                        shape = RoundedCornerShape(12.dp),
                        border = BorderStroke(1.dp, MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.3f)),
                        modifier = Modifier
                            .weight(1f)
                            .height(84.dp)
                    ) {
                        Row(
                            modifier = Modifier
                                .fillMaxSize()
                                .padding(12.dp),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Column {
                                Text("Developer Mode", fontWeight = FontWeight.Bold, fontSize = 14.sp)
                                Text("Engineering logs", fontSize = 11.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                            }
                            Box(
                                modifier = Modifier
                                    .clip(RoundedCornerShape(100.dp))
                                    .background(MaterialTheme.colorScheme.surfaceContainerLow)
                                    .padding(horizontal = 8.dp, vertical = 2.dp)
                            ) {
                                Text("DISABLED", fontSize = 8.sp, fontWeight = FontWeight.Bold, color = MaterialTheme.colorScheme.outline)
                            }
                        }
                    }
                }
            }
        }
    }
}

@Composable
fun SettingsItemRow(
    title: String,
    subtitle: String,
    icon: ImageVector,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
    badgeText: String? = null,
    isDanger: Boolean = false
) {
    Card(
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceContainerLowest),
        shape = RoundedCornerShape(20.dp),
        border = BorderStroke(1.dp, MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.3f)),
        modifier = modifier
            .fillMaxWidth()
            .clickable(onClick = onClick)
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(14.dp),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Row(
                horizontalArrangement = Arrangement.spacedBy(12.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                Box(
                    modifier = Modifier
                        .size(36.dp)
                        .clip(CircleShape)
                        .background(
                            if (isDanger) MaterialTheme.colorScheme.errorContainer else MaterialTheme.colorScheme.surfaceContainerHigh
                        ),
                    contentAlignment = Alignment.Center
                ) {
                    Icon(
                        imageVector = icon,
                        contentDescription = title,
                        tint = if (isDanger) MaterialTheme.colorScheme.error else MaterialTheme.colorScheme.primary
                    )
                }
                Column {
                    Text(
                        text = title,
                        fontWeight = FontWeight.Bold,
                        fontSize = 15.sp,
                        color = if (isDanger) MaterialTheme.colorScheme.error else MaterialTheme.colorScheme.onSurface
                    )
                    Text(subtitle, fontSize = 12.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                }
            }

            if (badgeText != null) {
                Box(
                    modifier = Modifier
                        .clip(RoundedCornerShape(100.dp))
                        .background(MaterialTheme.colorScheme.secondaryContainer)
                        .padding(horizontal = 8.dp, vertical = 2.dp)
                ) {
                    Text(badgeText, fontSize = 9.sp, fontWeight = FontWeight.Bold, color = MaterialTheme.colorScheme.onSecondaryContainer)
                }
            } else {
                Icon(Icons.Default.ChevronRight, "Navigate", tint = MaterialTheme.colorScheme.outline)
            }
        }
    }
}

// ---------------------------------------------------------------------------------
// 8. WI-FI SETUP SCREEN
// ---------------------------------------------------------------------------------
@Composable
fun WifiSetupScreen(
    viewModel: MedicationViewModel,
    onBack: () -> Unit,
    snackbarHostState: SnackbarHostState,
    modifier: Modifier = Modifier
) {
    val scope = rememberCoroutineScope()
    val isConnectingWifi by viewModel.isConnectingWifi.collectAsStateWithLifecycle()
    val hubConnected by viewModel.hubConnected.collectAsStateWithLifecycle()
    
    var ssid by remember { mutableStateOf("") }
    var password by remember { mutableStateOf("") }
    var passwordVisible by remember { mutableStateOf(false) }

    LazyColumn(
        modifier = modifier
            .fillMaxSize()
            .padding(horizontal = 16.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp),
        contentPadding = PaddingValues(top = 8.dp, bottom = 80.dp)
    ) {
        // Appbar Back anchor
        item {
            Row(
                modifier = Modifier.fillMaxWidth(),
                verticalAlignment = Alignment.CenterVertically
            ) {
                IconButton(onClick = onBack, modifier = Modifier.testTag("wifi_back_button")) {
                    Icon(Icons.AutoMirrored.Filled.ArrowBack, "Back")
                }
                Spacer(modifier = Modifier.width(8.dp))
                Text("Wi-Fi Setup", fontWeight = FontWeight.Bold, fontSize = 20.sp)
            }
        }

        // Connection status details banner
        item {
            Card(
                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceContainerLowest),
                shape = RoundedCornerShape(28.dp),
                border = BorderStroke(1.dp, MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.4f)),
                modifier = Modifier.fillMaxWidth()
            ) {
                Column(
                    modifier = Modifier.padding(16.dp)
                ) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Column {
                            Text("Connection Status", fontSize = 11.sp, fontWeight = FontWeight.Bold, color = MaterialTheme.colorScheme.onSurfaceVariant)
                            Text(
                                text = if (hubConnected) "Connected" else "Disconnected",
                                fontWeight = FontWeight.Bold,
                                fontSize = 18.sp,
                                color = if (hubConnected) MaterialTheme.colorScheme.secondary else MaterialTheme.colorScheme.error,
                                modifier = Modifier.testTag("wifi_status_text")
                            )
                        }
                        
                        Icon(
                            imageVector = Icons.Default.Wifi,
                            contentDescription = "Signal Strength",
                            tint = if (hubConnected) MaterialTheme.colorScheme.secondary else MaterialTheme.colorScheme.outline,
                            modifier = Modifier.size(24.dp)
                        )
                    }
                    Spacer(modifier = Modifier.height(10.dp))
                    Text(
                        "Please configure your WiFi settings to sync your IoT smart pill dispenser with our healthcare network.",
                        fontSize = 13.sp,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }
            }
        }

        // Handshake visualizer
        item {
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .height(160.dp)
                    .clip(RoundedCornerShape(28.dp))
                    .background(MaterialTheme.colorScheme.surfaceContainerLow),
                contentAlignment = Alignment.Center
            ) {
                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                    Icon(
                        Icons.Default.SettingsInputAntenna,
                        "Router antenna",
                        tint = MaterialTheme.colorScheme.primary,
                        modifier = Modifier.size(48.dp)
                    )
                    Spacer(modifier = Modifier.height(8.dp))
                    Text(
                        if (isConnectingWifi) "Synchronizing network..." else "Handshake idle",
                        fontSize = 13.sp,
                        fontWeight = FontWeight.Bold,
                        color = MaterialTheme.colorScheme.primary
                    )
                }
            }
        }

        // SSID & Password Fields
        item {
            Card(
                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceContainerLowest),
                shape = RoundedCornerShape(28.dp),
                border = BorderStroke(1.dp, MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.4f)),
                modifier = Modifier.fillMaxWidth()
            ) {
                Column(
                    modifier = Modifier.padding(16.dp),
                    verticalArrangement = Arrangement.spacedBy(16.dp)
                ) {
                    Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
                        Text("Network Name (SSID)", fontWeight = FontWeight.Bold, fontSize = 13.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                        OutlinedTextField(
                            value = ssid,
                            onValueChange = { ssid = it },
                            placeholder = { Text("Search for networks...", fontSize = 14.sp) },
                            singleLine = true,
                            shape = RoundedCornerShape(24.dp),
                            modifier = Modifier
                                .fillMaxWidth()
                                .testTag("wifi_ssid_input")
                        )
                    }

                    Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
                        Text("Password", fontWeight = FontWeight.Bold, fontSize = 13.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                        OutlinedTextField(
                            value = password,
                            onValueChange = { password = it },
                            placeholder = { Text("••••••••", fontSize = 14.sp) },
                            singleLine = true,
                            shape = RoundedCornerShape(24.dp),
                            visualTransformation = if (passwordVisible) VisualTransformation.None else PasswordVisualTransformation(),
                            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Password),
                            trailingIcon = {
                                val image = if (passwordVisible) Icons.Default.Visibility else Icons.Default.VisibilityOff
                                IconButton(onClick = { passwordVisible = !passwordVisible }) {
                                    Icon(image, "Password visibility toggle")
                                }
                            },
                            modifier = Modifier
                                .fillMaxWidth()
                                .testTag("wifi_password_input")
                        )
                    }
                }
            }
        }

        // Connect button
        item {
            Button(
                onClick = {
                    if (ssid.isBlank()) {
                        scope.launch { snackbarHostState.showSnackbar("Please enter an SSID network name") }
                        return@Button
                    }
                    viewModel.updateWifiSSID(ssid)
                    viewModel.updateWifiPassword(password)
                    viewModel.connectDevice {
                        scope.launch { snackbarHostState.showSnackbar("Device connection successful!") }
                        onBack()
                    }
                },
                shape = RoundedCornerShape(100.dp),
                enabled = !isConnectingWifi,
                modifier = Modifier
                    .fillMaxWidth()
                    .height(52.dp)
                    .testTag("connect_device_button")
            ) {
                if (isConnectingWifi) {
                    CircularProgressIndicator(color = Color.White, modifier = Modifier.size(20.dp))
                    Spacer(modifier = Modifier.width(8.dp))
                    Text("Connecting Device...", fontWeight = FontWeight.Bold)
                } else {
                    Text("Connect Device", fontWeight = FontWeight.Bold)
                }
            }
        }
    }
}

// ---------------------------------------------------------------------------------
// 9. ABOUT / CREDITS SCREEN
// ---------------------------------------------------------------------------------
@Composable
fun AboutScreen(
    onBack: () -> Unit,
    modifier: Modifier = Modifier
) {
    LazyColumn(
        modifier = modifier
            .fillMaxSize()
            .padding(horizontal = 16.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp),
        contentPadding = PaddingValues(top = 8.dp, bottom = 80.dp)
    ) {
        // Appbar Back anchor
        item {
            Row(
                modifier = Modifier.fillMaxWidth(),
                verticalAlignment = Alignment.CenterVertically
            ) {
                IconButton(onClick = onBack, modifier = Modifier.testTag("about_back_button")) {
                    Icon(Icons.AutoMirrored.Filled.ArrowBack, "Back")
                }
                Spacer(modifier = Modifier.width(8.dp))
                Text("About MedLink IoT", fontWeight = FontWeight.Bold, fontSize = 20.sp)
            }
        }

        // Brand Identity Section
        item {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(vertical = 12.dp),
                horizontalAlignment = Alignment.CenterHorizontally
            ) {
                Box(
                    modifier = Modifier
                        .size(80.dp)
                        .clip(RoundedCornerShape(24.dp))
                        .background(MaterialTheme.colorScheme.primaryContainer),
                    contentAlignment = Alignment.Center
                ) {
                    Icon(
                        Icons.Default.Medication,
                        "App Logo icon",
                        tint = MaterialTheme.colorScheme.onPrimaryContainer,
                        modifier = Modifier.size(40.dp)
                    )
                }
                Spacer(modifier = Modifier.height(12.dp))
                Text("MedLink IoT", fontWeight = FontWeight.Bold, fontSize = 24.sp)
                Text(
                    text = "v1.0.0 Stable Build",
                    fontWeight = FontWeight.Bold,
                    color = MaterialTheme.colorScheme.primary,
                    fontSize = 13.sp
                )
            }
        }

        // Hardware details photography banner
        item {
            Card(
                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceContainerLowest),
                shape = RoundedCornerShape(28.dp),
                border = BorderStroke(1.dp, MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.4f)),
                modifier = Modifier.fillMaxWidth()
            ) {
                Column {
                    Box(
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(180.dp)
                    ) {
                        AsyncImage(
                            model = SHOWCASE_IMAGE_URL,
                            contentDescription = "Smart Dispenser Showcase",
                            modifier = Modifier.fillMaxSize(),
                            contentScale = ContentScale.Crop
                        )
                        Box(
                            modifier = Modifier
                                .fillMaxSize()
                                .background(
                                    Brush.verticalGradient(
                                        colors = listOf(Color.Transparent, Color.Black.copy(alpha = 0.65f))
                                    )
                                )
                        )
                        Text(
                            text = "SmartDispenser™ Mk-II Integration",
                            color = Color.White,
                            fontWeight = FontWeight.Bold,
                            fontSize = 15.sp,
                            modifier = Modifier
                                .align(Alignment.BottomStart)
                                .padding(16.dp)
                        )
                    }
                }
            }
        }

        // Bento Specs Grid list
        item {
            Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                // Spec item 1
                Card(
                    colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceContainerLowest),
                    shape = RoundedCornerShape(24.dp),
                    border = BorderStroke(1.dp, MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.35f))
                ) {
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(14.dp),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Row(
                            horizontalArrangement = Arrangement.spacedBy(12.dp),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Box(
                                modifier = Modifier
                                    .size(40.dp)
                                    .clip(CircleShape)
                                    .background(MaterialTheme.colorScheme.secondaryContainer),
                                contentAlignment = Alignment.Center
                            ) {
                                Icon(Icons.Default.Memory, "Spec Icon", tint = MaterialTheme.colorScheme.onSecondaryContainer)
                            }
                            Column {
                                Text("ESP32 Firmware", fontSize = 11.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                                Text("v2.4.1-stable", fontWeight = FontWeight.Bold, fontSize = 15.sp)
                            }
                        }
                        Icon(Icons.Default.CheckCircle, "Verified Badge", tint = MaterialTheme.colorScheme.secondary)
                    }
                }

                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(10.dp)
                ) {
                    // Spec card 2
                    Card(
                        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceContainerLowest),
                        shape = RoundedCornerShape(24.dp),
                        border = BorderStroke(1.dp, MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.35f)),
                        modifier = Modifier.weight(1f)
                    ) {
                        Column(modifier = Modifier.padding(14.dp)) {
                            Icon(Icons.Default.WorkspacePremium, "Premium tag", tint = MaterialTheme.colorScheme.primary)
                            Spacer(modifier = Modifier.height(10.dp))
                            Text("Event", fontSize = 11.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                            Text("HealthTech Hack", fontWeight = FontWeight.Bold, fontSize = 13.sp)
                        }
                    }

                    // Spec card 3
                    Card(
                        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceContainerLowest),
                        shape = RoundedCornerShape(24.dp),
                        border = BorderStroke(1.dp, MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.35f)),
                        modifier = Modifier.weight(1f)
                    ) {
                        Column(modifier = Modifier.padding(14.dp)) {
                            Icon(Icons.Default.CloudDone, "Cloud online", tint = MaterialTheme.colorScheme.secondary)
                            Spacer(modifier = Modifier.height(10.dp))
                            Text("Cloud API", fontSize = 11.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                            Text("Operational", fontWeight = FontWeight.Bold, fontSize = 13.sp)
                        }
                    }
                }
            }
        }

        // Dev team directory cards
        item {
            Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                Text(
                    text = "Development Team",
                    fontWeight = FontWeight.Bold,
                    fontSize = 18.sp,
                    color = MaterialTheme.colorScheme.onSurface,
                    modifier = Modifier.padding(horizontal = 4.dp)
                )

                val members = listOf(
                    Triple("Alex Rivera", "Full-Stack Lead", TEAM_ALEX_URL),
                    Triple("Sarah Chen", "IoT Hardware Architect", TEAM_SARAH_URL),
                    Triple("Jordan Smith", "UI/UX Designer", TEAM_JORDAN_URL)
                )

                members.forEach { (name, role, url) ->
                    Card(
                        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceContainer),
                        shape = RoundedCornerShape(24.dp),
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(12.dp),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Box(
                                modifier = Modifier
                                    .size(44.dp)
                                    .clip(CircleShape)
                            ) {
                                AsyncImage(
                                    model = url,
                                    contentDescription = name,
                                    modifier = Modifier.fillMaxSize(),
                                    contentScale = ContentScale.Crop
                                )
                            }
                            Spacer(modifier = Modifier.width(12.dp))
                            Column(modifier = Modifier.weight(1f)) {
                                Text(name, fontWeight = FontWeight.Bold, fontSize = 14.sp)
                                Text(role, fontSize = 11.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                            }
                            Icon(
                                imageVector = Icons.Default.AlternateEmail,
                                contentDescription = "Contact",
                                tint = MaterialTheme.colorScheme.outline,
                                modifier = Modifier.size(16.dp)
                            )
                        }
                    }
                }
            }
        }

        // Privacy Policy Footers
        item {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(vertical = 16.dp),
                horizontalAlignment = Alignment.CenterHorizontally,
                verticalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                Row(
                    horizontalArrangement = Arrangement.spacedBy(16.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text("Privacy Policy", fontSize = 12.sp, color = MaterialTheme.colorScheme.primary)
                    Text("•", fontSize = 12.sp, color = MaterialTheme.colorScheme.outlineVariant)
                    Text("Terms of Service", fontSize = 12.sp, color = MaterialTheme.colorScheme.primary)
                    Text("•", fontSize = 12.sp, color = MaterialTheme.colorScheme.outlineVariant)
                    Text("Open Source", fontSize = 12.sp, color = MaterialTheme.colorScheme.primary)
                }
                
                Text(
                    text = "© 2026 MedLink Technologies. Built for healthcare resilience. All rights reserved.",
                    fontSize = 10.sp,
                    textAlign = TextAlign.Center,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    modifier = Modifier.padding(horizontal = 24.dp)
                )
            }
        }
    }
}

// Extension to scale modifiers easily for customized smaller switches
fun Modifier.scaleScale(scale: Float): Modifier = this.then(
    Modifier.layout { measurable, constraints ->
        val placeable = measurable.measure(constraints)
        layout(
            (placeable.width * scale).toInt(),
            (placeable.height * scale).toInt()
        ) {
            placeable.placeRelative(
                ((placeable.width * (scale - 1)) / 2).toInt(),
                ((placeable.height * (scale - 1)) / 2).toInt()
            )
        }
    }
)
