/**
 * MedLink IoT - ESP32 Smart Medicine Dispenser
 * REST API Firmware Contract Specification
 * Version: 1.0.0 | Board: ESP32-S3 / ESP32-WROOM
 *
 * Base URL: http://<device-ip>/api/v1
 * All responses: Content-Type: application/json
 * All timestamps:  Unix epoch (seconds, uint32_t)
 */

# API_SPEC.md — REST API Specification

---

## Overview

| Property       | Value                        |
|----------------|------------------------------|
| Base URL       | `http://<device-ip>/api/v1`  |
| Protocol       | HTTP/1.1                     |
| Content-Type   | `application/json`           |
| Auth           | None (LAN-only)              |
| Timestamps     | Unix epoch (uint32_t)        |
| Firmware       | v1.0.0                       |

---

## Endpoints

---

### GET `/api/v1/status`

Returns current device telemetry state.

**Response 200:**
```json
{
  "connected": true,
  "deviceName": "Smart Dispenser Hub",
  "firmwareVersion": "1.0.0",
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

Aggregated dashboard summary: status + inventory + recent logs.

**Response 200:**
```json
{
  "deviceStatus": { /* same as /status */ },
  "nextDoseCountdown": 5037,
  "adherencePercentage": 92,
  "inventory": [ /* array of Medicine objects */ ],
  "recentLogs": [ /* last 10 LogEntry objects */ ]
}
```

---

### GET `/api/v1/medicines`

List all configured medication slots.

**Response 200:**
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

Create a new medication slot.

**Request Body:** Medicine object (same structure as GET, `id` optional — server assigns)

**Response 201:**
```json
{ "success": true, "id": 2 }
```

---

### PUT `/api/v1/medicines/{id}`

Update an existing medication slot by numeric ID.

**Request Body:** Medicine object (partial fields allowed)

**Response 200:**
```json
{ "success": true }
```

**Response 404:**
```json
{ "success": false, "error": "Medicine not found" }
```

---

### DELETE `/api/v1/medicines/{id}`

Remove a medication slot by numeric ID.

**Response 200:**
```json
{ "success": true }
```

**Response 404:**
```json
{ "success": false, "error": "Medicine not found" }
```

---

### GET `/api/v1/logs`

Retrieve history of dispense and diagnostic events.

**Response 200:**
```json
[
  {
    "id": 1,
    "medicationName": "Metformin",
    "dosage": "500mg Take after meals",
    "timestamp": 1783088400,
    "status": "Taken",
    "description": "Dispensed successfully from Slot A1.",
    "categoryDate": "Today"
  }
]
```

---

### GET `/api/v1/diagnostics`

Returns hardware diagnostic status for all onboard components.

**Response 200:**
```json
{
  "temperature": 34.2,
  "components": [
    { "component": "STEPPER_MOTOR_1", "status": "OK", "lastTest": 1783084800, "message": "Normal current load" },
    { "component": "STEPPER_MOTOR_2", "status": "OK", "lastTest": 1783084800, "message": "Normal current load" },
    { "component": "STEPPER_MOTOR_3", "status": "WARNING", "lastTest": 1783084800, "message": "Friction threshold" },
    { "component": "RTC_MODULE",      "status": "OK", "lastTest": 1783084800, "message": "RTC synchronized" },
    { "component": "IR_SENSOR",       "status": "OK", "lastTest": 1783084800, "message": "Signal nominal" },
    { "component": "SPEAKER",         "status": "OK", "lastTest": 1783084800, "message": "Sound normal" },
    { "component": "OLED_DISPLAY",    "status": "OK", "lastTest": 1783084800, "message": "I2C nominal" },
    { "component": "WIFI_STACK",      "status": "OK", "lastTest": 1783084800, "message": "RSSI stable" },
    { "component": "API_GATEWAY",     "status": "OK", "lastTest": 1783084800, "message": "Gateway active" }
  ]
}
```

---

### POST `/api/v1/test/dispenser/{slot}`

Trigger a manual dispense on slot 1–3.

**Response 200:**
```json
{ "success": true, "message": "Dispense triggered on Slot #1." }
```

---

### POST `/api/v1/test/motor`

Run motor actuator test on all slots.

**Response 200:**
```json
{ "success": true, "message": "Motor sweep test complete." }
```

---

### POST `/api/v1/test/audio`

Trigger DFPlayer/buzzer chime test.

**Response 200:**
```json
{ "success": true, "message": "Audio chime test executed." }
```

---

### POST `/api/v1/test/rtc`

Verify DS3231 RTC module sync.

**Response 200:**
```json
{ "success": true, "message": "RTC sync verified." }
```

---

### POST `/api/v1/test/ir`

Calibrate IR beam drop sensor.

**Response 200:**
```json
{ "success": true, "message": "IR beam calibration successful." }
```

---

### POST `/api/v1/wifi/connect`

Update WiFi SSID credentials and reconnect.

**Request Body:**
```json
{ "ssid": "MyNetwork", "password": "mypass" }
```

**Response 200:**
```json
{ "success": true, "message": "Connecting to MyNetwork." }
```

---

### POST `/api/v1/device/reboot`

Perform a soft reboot of the ESP32 controller.

**Response 200:**
```json
{ "success": true, "message": "Rebooting..." }
```

---

## Error Responses

| Status | Meaning                         |
|--------|---------------------------------|
| 200    | OK                              |
| 201    | Created                         |
| 400    | Bad Request / Missing fields    |
| 404    | Resource not found              |
| 500    | Internal firmware error         |
| 507    | Insufficient storage            |

---

## CORS

The firmware sets the following headers on every response to support local LAN companion app access:

```
Access-Control-Allow-Origin: *
Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS
Access-Control-Allow-Headers: Content-Type
```
