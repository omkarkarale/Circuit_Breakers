# MedLink IoT ESP32 Smart Dispenser - REST API Firmware Contract

This document defines the REST API contract between the MedLink IoT Companion Mobile Application and the ESP32 Smart Box controller firmware. 

The API prefix for all endpoints is `/api/v1`.

---

## 1. System Telemetry & Dashboard

### GET `/api/v1/status`
Retrieve current network link connections, battery capacities, and chassis board diagnostics.

**Response JSON (200 OK):**
```json
{
  "connected": true,
  "deviceName": "Smart Dispenser Hub",
  "firmwareVersion": "v0.6.0",
  "uptimeSeconds": 3600,
  "batteryPercentage": 85,
  "batteryCharging": false,
  "wifiSSID": "Home_Network_5G",
  "ipAddress": "192.168.4.1",
  "signalStrength": -65,
  "temperature": 34.2,
  "nextDoseCountdown": 5037
}
```

---

### GET `/api/v1/dashboard`
Retrieve high-level metrics for home dashboard telemetry display (aggregates status, inventory, logs).

**Response JSON (200 OK):**
```json
{
  "deviceStatus": {
    "connected": true,
    "deviceName": "Smart Dispenser Hub",
    "firmwareVersion": "v0.6.0",
    "uptimeSeconds": 3600,
    "batteryPercentage": 85,
    "batteryCharging": false,
    "wifiSSID": "Home_Network_5G",
    "ipAddress": "192.168.4.1",
    "signalStrength": -65,
    "temperature": 34.2,
    "nextDoseCountdown": 5037
  },
  "nextDoseCountdown": 5037,
  "adherencePercentage": 92,
  "inventory": [],
  "recentLogs": []
}
```

---

## 2. Medications & Reminders

### GET `/api/v1/medicines`
Retrieve lists of all active schedules and load remaining capacities.

**Response JSON (200 OK):**
```json
[
  {
    "id": 1,
    "name": "Metformin",
    "type": "Tablet",
    "colorHex": "#2563eb",
    "slot": 1,
    "pillsRemaining": 24,
    "maxCapacity": 30,
    "dosePerReminder": 1,
    "repeatPattern": "Daily",
    "scheduleTimes": [
      { "id": 1, "time": "08:00 AM", "enabled": true }
    ],
    "isEnabled": true,
    "lastTakenTime": "2026-07-03T14:20:00Z",
    "streakDays": 5,
    "dosage": "500mg - Take after meals"
  }
]
```

---

### POST `/api/v1/medicines`
Add a new reminder schedule or update an existing one.

**Request JSON:**
```json
{
  "id": 1,
  "name": "Metformin",
  "type": "Tablet",
  "colorHex": "#2563eb",
  "slot": 1,
  "pillsRemaining": 24,
  "maxCapacity": 30,
  "dosePerReminder": 1,
  "repeatPattern": "Daily",
  "scheduleTimes": [
    { "id": 1, "time": "08:00 AM", "enabled": true }
  ],
  "isEnabled": true,
  "dosage": "500mg - Take after meals"
}
```

**Response JSON (200 OK / 201 Created):**
Returns the saved `ApiMedicine` object representing the confirmation.

---

### DELETE `/api/v1/medicines/{id}`
Remove a medication reminder configuration and unassign the hardware slot chamber.

**Response JSON (200 OK / 204 No Content):**
```json
{
  "success": true,
  "message": "Medication slot schedule unassigned successfully"
}
```

---

## 3. Operations & Diagnostic Testing

### POST `/api/v1/test/dispenser/{slot}`
Manual override command to rotate the stepper motor on Slot A1 (1), A2 (2), or A3 (3) to dispense 1 pill.

**Response JSON (200 OK):**
```json
{
  "success": true,
  "message": "Dispense sequence triggered on Slot #1. Actuator rotated 360 degrees."
}
```

---

### GET `/api/v1/diagnostics`
Query the diagnostic sensor results of all onboard hardware chassis components.

**Response JSON (200 OK):**
```json
{
  "temperature": 34.2,
  "components": [
    { "component": "STEPPER_MOTOR_1", "status": "OK", "lastTest": 1783084800000, "message": "Normal current load" },
    { "component": "STEPPER_MOTOR_2", "status": "OK", "lastTest": 1783084800000, "message": "Normal current load" },
    { "component": "STEPPER_MOTOR_3", "status": "WARNING", "lastTest": 1783084800000, "message": "Friction threshold warn" },
    { "component": "RTC_MODULE", "status": "OK", "lastTest": 1783084800000, "message": "RTC synchronized" },
    { "component": "IR_SENSOR", "status": "OK", "lastTest": 1783084800000, "message": "Signal beam nominal" },
    { "component": "SPEAKER", "status": "OK", "lastTest": 1783084800000, "message": "Sound level normal" },
    { "component": "OLED_DISPLAY", "status": "OK", "lastTest": 1783084800000, "message": "I2C write nominal" },
    { "component": "WIFI_STACK", "status": "OK", "lastTest": 1783084800000, "message": "RSSI stable" },
    { "component": "API_GATEWAY", "status": "OK", "lastTest": 1783084800000, "message": "Gateway active" }
  ]
}
```

---

### POST `/api/v1/test/audio`
Trigger a speaker audio driver chime test.

**Response JSON (200 OK):**
```json
{
  "success": true,
  "message": "DFPlayer chime test signal executed"
}
```

---

### POST `/api/v1/test/rtc`
Audit timekeeper DS3231 chip module checks.

**Response JSON (200 OK):**
```json
{
  "success": true,
  "message": "RTC module sync test passed"
}
```

---

### POST `/api/v1/test/ir`
Measure calibration frequencies of the IR drop beam sensor.

**Response JSON (200 OK):**
```json
{
  "success": true,
  "message": "IR beam sensor calibrated successfully"
}
```

---

## 4. Network & Controller Reboot

### POST `/api/v1/wifi/connect`
Configure new router SSID credentials.

**Request JSON:**
```json
{
  "ssid": "My_Home_SSID",
  "password": "mySecurePassword"
}
```

**Response JSON (200 OK):**
```json
{
  "success": true,
  "message": "Credentials updated. ESP32 connecting to SSID."
}
```

---

### POST `/api/v1/device/reboot`
Perform a controller reset.

**Response JSON (200 OK):**
```json
{
  "success": true,
  "message": "ESP32 soft reboot initiated"
}
```

---

## 5. Event History Logging

### GET `/api/v1/logs`
Retrieve historical activity logs of all take and diagnostic events.

**Response JSON (200 OK):**
```json
[
  {
    "id": 1,
    "medicationName": "Metformin",
    "dosage": "500mg Take after meals",
    "timestamp": 1783088400000,
    "status": "Taken",
    "description": "Dispensed successfully from SmartBox Slot A1.",
    "categoryDate": "Today"
  }
]
```
