package com.omkarkarale.medlinkiot

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.activity.viewModels
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.ui.Modifier
import com.omkarkarale.medlinkiot.ui.MedLinkApp
import com.omkarkarale.medlinkiot.viewmodel.MedicationViewModel
import com.omkarkarale.medlinkiot.repository.FakeMedicineRepositoryImpl
import com.omkarkarale.medlinkiot.repository.FakeDeviceRepositoryImpl

class MainActivity : ComponentActivity() {
  
  private val viewModel: MedicationViewModel by viewModels {
    MedicationViewModel.Factory(
      FakeMedicineRepositoryImpl(),
      FakeDeviceRepositoryImpl()
    )
  }

  override fun onCreate(savedInstanceState: Bundle?) {
    super.onCreate(savedInstanceState)
    enableEdgeToEdge()
    setContent {
      MedLinkApp(
        viewModel = viewModel,
        modifier = Modifier.fillMaxSize()
      )
    }
  }
}
