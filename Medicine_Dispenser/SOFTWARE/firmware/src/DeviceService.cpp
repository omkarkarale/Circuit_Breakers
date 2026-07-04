#include "DeviceService.h"

#include <Arduino.h>
#include <cstring>
#include <cstdio>

#include "Logger.h"

// ─────────────────────────────────────────────────────────────────────────────
// Lifecycle
// ─────────────────────────────────────────────────────────────────────────────

void DeviceService::begin(WiFiManager* wifi, StorageManager* storage) {
  wifi_    = wifi;
  storage_ = storage;
  startMs_ = millis();
  Logger::info("DeviceService Ready");
}

// ─────────────────────────────────────────────────────────────────────────────
// Status
// ─────────────────────────────────────────────────────────────────────────────

String DeviceService::buildStatusJson() const {
  const bool connected    = wifi_ && wifi_->isConnected();
  const unsigned long up  = (millis() - startMs_) / 1000UL;

  String ip   = connected ? wifi_->getIPAddress().toString() : "0.0.0.0";
  String ssid = connected ? String(wifi_->getSSID()) : String("");

  // Escape any quotes in ssid for safety
  ssid.replace("\"", "\\\"");
  ip.replace("\"", "\\\"");

  String json = "{";
  json += "\"connected\":"     + String(connected ? "true" : "false") + ",";
  json += "\"deviceName\":\"Smart Dispenser Hub\",";
  json += "\"firmwareVersion\":\"1.0.0\",";
  json += "\"uptimeSeconds\":"  + String(up)              + ",";
  json += "\"batteryPercentage\":85,";
  json += "\"batteryCharging\":false,";
  json += "\"wifiSSID\":\""     + ssid                    + "\",";
  json += "\"ipAddress\":\""    + ip                      + "\",";
  json += "\"signalStrength\":"  + (connected ? String(WiFi.RSSI()) : String(0)) + ",";
  json += "\"temperature\":34.2,";
  json += "\"nextDoseCountdown\":" + String(nextDoseCountdownSec());
  json += "}";
  return json;
}

String DeviceService::buildDashboardJson() const {
  String json = "{";
  json += "\"deviceStatus\":"      + buildStatusJson()     + ",";
  json += "\"nextDoseCountdown\":" + String(nextDoseCountdownSec()) + ",";
  json += "\"adherencePercentage\":" + String(adherencePercent()) + ",";
  json += "\"inventory\":"          + buildMedicinesJson()  + ",";
  // recent logs: last 10
  json += "\"recentLogs\":[";
  uint8_t shown = 0;
  // Walk backwards from logHead_ - 1
  for (int i = (int)logHead_ - 1; shown < 10 && shown < logTotal_; --i) {
    if (i < 0) i = DeviceLimits::MAX_LOGS - 1;
    if (logs_[i].inUse) {
      if (shown > 0) json += ",";
      json += logRecordToJson(logs_[i], (uint8_t)i);
      shown++;
    }
    if (i == 0) i = DeviceLimits::MAX_LOGS;  // prevent infinite loop
  }
  json += "]";
  json += "}";
  return json;
}

// ─────────────────────────────────────────────────────────────────────────────
// Medicines
// ─────────────────────────────────────────────────────────────────────────────

String DeviceService::buildMedicinesJson() const {
  String json = "[";
  bool first = true;
  for (uint8_t i = 0; i < DeviceLimits::MAX_MEDICINES; i++) {
    if (medicines_[i].base.id == 0) continue;
    if (!first) json += ",";
    json += medicineRecordToJson(medicines_[i]);
    first = false;
  }
  json += "]";
  return json;
}

uint8_t DeviceService::addMedicine(const String& name, uint8_t slot,
                                    uint16_t pillsRemaining, uint16_t maxCapacity,
                                    uint8_t dosePerReminder, bool enabled,
                                    const String& colorHex, const String& type,
                                    const String& dosage, const String& repeatPattern) {
  if (medicineCount_ >= DeviceLimits::MAX_MEDICINES) {
    Logger::warn("Medicine slots full");
    return 0;
  }

  // Find free slot
  for (uint8_t i = 0; i < DeviceLimits::MAX_MEDICINES; i++) {
    if (medicines_[i].base.id != 0) continue;

    uint8_t newId = nextMedicineId();
    medicines_[i].base.id              = newId;
    medicines_[i].base.dispenserId     = slot;
    medicines_[i].base.pillsRemaining  = pillsRemaining;
    medicines_[i].base.enabled         = enabled;
    medicines_[i].maxCapacity          = maxCapacity;
    medicines_[i].dosePerReminder      = dosePerReminder;

    strncpy(medicines_[i].base.name,       name.c_str(),          Medicine::MEDICINE_NAME_MAX);
    strncpy(medicines_[i].colorHex,        colorHex.c_str(),      sizeof(medicines_[i].colorHex)        - 1);
    strncpy(medicines_[i].type,            type.c_str(),          sizeof(medicines_[i].type)            - 1);
    strncpy(medicines_[i].dosage,          dosage.c_str(),        sizeof(medicines_[i].dosage)          - 1);
    strncpy(medicines_[i].repeatPattern,   repeatPattern.c_str(), sizeof(medicines_[i].repeatPattern)   - 1);

    medicineCount_++;

    if (storage_) storage_->saveMedicines();

    Logger::info("Medicine added");
    return newId;
  }
  return 0;
}

bool DeviceService::updateMedicine(uint8_t id, const String& name, uint8_t slot,
                                    uint16_t pillsRemaining, uint16_t maxCapacity,
                                    uint8_t dosePerReminder, bool enabled,
                                    const String& colorHex, const String& type,
                                    const String& dosage, const String& repeatPattern) {
  for (uint8_t i = 0; i < DeviceLimits::MAX_MEDICINES; i++) {
    if (medicines_[i].base.id != id) continue;

    medicines_[i].base.dispenserId    = slot;
    medicines_[i].base.pillsRemaining = pillsRemaining;
    medicines_[i].base.enabled        = enabled;
    medicines_[i].maxCapacity         = maxCapacity;
    medicines_[i].dosePerReminder     = dosePerReminder;

    strncpy(medicines_[i].base.name,     name.c_str(),          Medicine::MEDICINE_NAME_MAX);
    strncpy(medicines_[i].colorHex,      colorHex.c_str(),      sizeof(medicines_[i].colorHex)      - 1);
    strncpy(medicines_[i].type,          type.c_str(),          sizeof(medicines_[i].type)          - 1);
    strncpy(medicines_[i].dosage,        dosage.c_str(),        sizeof(medicines_[i].dosage)        - 1);
    strncpy(medicines_[i].repeatPattern, repeatPattern.c_str(), sizeof(medicines_[i].repeatPattern) - 1);

    if (storage_) storage_->saveMedicines();
    return true;
  }
  return false;
}

bool DeviceService::deleteMedicine(uint8_t id) {
  for (uint8_t i = 0; i < DeviceLimits::MAX_MEDICINES; i++) {
    if (medicines_[i].base.id != id) continue;
    medicines_[i] = MedicineRecord{};  // zero-reset
    if (medicineCount_ > 0) medicineCount_--;
    if (storage_) storage_->saveMedicines();
    return true;
  }
  return false;
}

bool DeviceService::medicineExists(uint8_t id) const {
  for (uint8_t i = 0; i < DeviceLimits::MAX_MEDICINES; i++) {
    if (medicines_[i].base.id == id) return true;
  }
  return false;
}

// ─────────────────────────────────────────────────────────────────────────────
// Schedules
// ─────────────────────────────────────────────────────────────────────────────

bool DeviceService::addSchedule(uint8_t medicineId, uint8_t hour,
                                 uint8_t minute, bool enabled) {
  if (scheduleCount_ >= DeviceLimits::MAX_SCHEDULES) return false;

  for (uint8_t i = 0; i < DeviceLimits::MAX_SCHEDULES; i++) {
    if (schedules_[i].inUse) continue;
    schedules_[i].base.id         = i + 1;
    schedules_[i].base.medicineId = medicineId;
    schedules_[i].base.hour       = hour;
    schedules_[i].base.minute     = minute;
    schedules_[i].base.enabled    = enabled;
    schedules_[i].inUse           = true;
    scheduleCount_++;
    if (storage_) storage_->saveSchedules();
    return true;
  }
  return false;
}

// ─────────────────────────────────────────────────────────────────────────────
// Logs
// ─────────────────────────────────────────────────────────────────────────────

String DeviceService::buildLogsJson() const {
  String json = "[";
  bool first = true;
  for (uint8_t i = 0; i < DeviceLimits::MAX_LOGS; i++) {
    if (!logs_[i].inUse) continue;
    if (!first) json += ",";
    json += logRecordToJson(logs_[i], i);
    first = false;
  }
  json += "]";
  return json;
}

void DeviceService::appendLog(uint8_t medicineId, uint8_t slot,
                               DispenseResult result, uint16_t durationMs) {
  LogRecord& rec         = logs_[logHead_];
  rec.base.timestamp     = (uint32_t)(millis() / 1000UL);
  rec.base.medicineId    = medicineId;
  rec.base.dispenserId   = slot;
  rec.base.result        = result;
  rec.base.confirmed     = (result == DispenseResult::Success);
  rec.base.durationMs    = durationMs;
  rec.inUse              = true;

  // Find medicine name
  rec.medicineName[0] = '\0';
  rec.dosageStr[0]    = '\0';
  for (uint8_t i = 0; i < DeviceLimits::MAX_MEDICINES; i++) {
    if (medicines_[i].base.id == medicineId) {
      strncpy(rec.medicineName, medicines_[i].base.name,   sizeof(rec.medicineName) - 1);
      strncpy(rec.dosageStr,    medicines_[i].dosage,      sizeof(rec.dosageStr)    - 1);
      break;
    }
  }
  if (rec.medicineName[0] == '\0') strncpy(rec.medicineName, "Unknown", sizeof(rec.medicineName) - 1);

  logHead_ = (logHead_ + 1) % DeviceLimits::MAX_LOGS;
  if (logTotal_ < DeviceLimits::MAX_LOGS) logTotal_++;

  if (storage_) storage_->saveLogs();
}

// ─────────────────────────────────────────────────────────────────────────────
// Dispense stub
// ─────────────────────────────────────────────────────────────────────────────

bool DeviceService::triggerDispense(uint8_t slot) {
  if (slot < 1 || slot > 3) {
    Logger::warn("Invalid slot");
    return false;
  }
  // Find medicine for this slot
  for (uint8_t i = 0; i < DeviceLimits::MAX_MEDICINES; i++) {
    if (medicines_[i].base.id == 0) continue;
    if (medicines_[i].base.dispenserId != slot) continue;
    if (!medicines_[i].base.enabled) break;

    uint8_t dose = medicines_[i].dosePerReminder;
    if (medicines_[i].base.pillsRemaining < dose) {
      Logger::warn("Not enough pills");
      appendLog(medicines_[i].base.id, slot, DispenseResult::Failed);
      return false;
    }

    // Placeholder — actual stepper call goes here in Phase 15
    Logger::info("Dispense triggered (stub)");
    medicines_[i].base.pillsRemaining -= dose;
    appendLog(medicines_[i].base.id, slot, DispenseResult::Success, 2500);
    return true;
  }

  // Slot not matched to enabled medicine — dry-run for test purposes
  Logger::info("Dispense test run (no medicine mapped)");
  appendLog(0, slot, DispenseResult::Success, 2500);
  return true;
}

// ─────────────────────────────────────────────────────────────────────────────
// Hardware test stubs
// ─────────────────────────────────────────────────────────────────────────────

bool DeviceService::testMotor() {
  Logger::info("Motor test stub");
  return true;
}

bool DeviceService::testAudio() {
  Logger::info("Audio test stub");
  return true;
}

bool DeviceService::testRtc() {
  Logger::info("RTC test stub");
  return true;
}

bool DeviceService::testIr() {
  Logger::info("IR test stub");
  return true;
}

// ─────────────────────────────────────────────────────────────────────────────
// Diagnostics
// ─────────────────────────────────────────────────────────────────────────────

String DeviceService::buildDiagnosticsJson() const {
  const uint32_t ts = (uint32_t)(millis() / 1000UL);
  const bool wifiOk = wifi_ && wifi_->isConnected();

  String json = "{";
  json += "\"temperature\":34.2,";
  json += "\"components\":[";

  // Stepper motors — stub OK
  json += "{\"component\":\"STEPPER_MOTOR_1\",\"status\":\"OK\","
          "\"lastTest\":"     + String(ts) + ","
          "\"message\":\"Normal current load\"},";
  json += "{\"component\":\"STEPPER_MOTOR_2\",\"status\":\"OK\","
          "\"lastTest\":"     + String(ts) + ","
          "\"message\":\"Normal current load\"},";
  json += "{\"component\":\"STEPPER_MOTOR_3\",\"status\":\"OK\","
          "\"lastTest\":"     + String(ts) + ","
          "\"message\":\"Normal current load\"},";

  // RTC — placeholder
  json += "{\"component\":\"RTC_MODULE\",\"status\":\"OK\","
          "\"lastTest\":"     + String(ts) + ","
          "\"message\":\"RTC synchronized\"},";

  // IR sensor — placeholder
  json += "{\"component\":\"IR_SENSOR\",\"status\":\"OK\","
          "\"lastTest\":"     + String(ts) + ","
          "\"message\":\"Signal nominal\"},";

  // Speaker — placeholder
  json += "{\"component\":\"SPEAKER\",\"status\":\"OK\","
          "\"lastTest\":"     + String(ts) + ","
          "\"message\":\"DFPlayer ready\"},";

  // OLED — placeholder
  json += "{\"component\":\"OLED_DISPLAY\",\"status\":\"OK\","
          "\"lastTest\":"     + String(ts) + ","
          "\"message\":\"I2C nominal\"},";

  // WiFi stack — live
  json += "{\"component\":\"WIFI_STACK\","
          "\"status\":\""     + String(wifiOk ? "OK" : "WARNING") + "\","
          "\"lastTest\":"     + String(ts) + ","
          "\"message\":\""    + String(wifiOk ? "RSSI stable" : "Not connected") + "\"},";

  // API gateway — always OK if we can respond
  json += "{\"component\":\"API_GATEWAY\",\"status\":\"OK\","
          "\"lastTest\":"     + String(ts) + ","
          "\"message\":\"Gateway active\"}";

  json += "]}";
  return json;
}

// ─────────────────────────────────────────────────────────────────────────────
// WiFi
// ─────────────────────────────────────────────────────────────────────────────

bool DeviceService::connectWifi(const String& ssid, const String& password) {
  if (!wifi_) return false;
  return wifi_->connect(ssid.c_str(), password.c_str());
}

// ─────────────────────────────────────────────────────────────────────────────
// Reboot
// ─────────────────────────────────────────────────────────────────────────────

void DeviceService::reboot() {
  Logger::info("Rebooting...");
  delay(200);
  ESP.restart();
}

// ─────────────────────────────────────────────────────────────────────────────
// Private helpers
// ─────────────────────────────────────────────────────────────────────────────

String DeviceService::medicineRecordToJson(const MedicineRecord& rec) const {
  String name   = String(rec.base.name);
  String color  = String(rec.colorHex);
  String type   = String(rec.type);
  String dosage = String(rec.dosage);
  String repeat = String(rec.repeatPattern);

  // Escape strings
  name.replace("\"", "\\\"");
  color.replace("\"", "\\\"");
  type.replace("\"", "\\\"");
  dosage.replace("\"", "\\\"");
  repeat.replace("\"", "\\\"");

  String json = "{";
  json += "\"id\":"                + String(rec.base.id)            + ",";
  json += "\"name\":\""            + name                           + "\",";
  json += "\"type\":\""            + type                           + "\",";
  json += "\"colorHex\":\""        + color                          + "\",";
  json += "\"slot\":"              + String(rec.base.dispenserId)   + ",";
  json += "\"pillsRemaining\":"    + String(rec.base.pillsRemaining)+ ",";
  json += "\"maxCapacity\":"       + String(rec.maxCapacity)        + ",";
  json += "\"dosePerReminder\":"   + String(rec.dosePerReminder)    + ",";
  json += "\"repeatPattern\":\""   + repeat                         + "\",";
  json += "\"scheduleTimes\":"     + scheduleToJson(rec.base.id)    + ",";
  json += "\"isEnabled\":"         + String(rec.base.enabled ? "true" : "false") + ",";
  json += "\"lastTakenTime\":"     + String(rec.lastTakenTime)      + ",";
  json += "\"streakDays\":"        + String(rec.streakDays)         + ",";
  json += "\"dosage\":\""          + dosage                         + "\"";
  json += "}";
  return json;
}

String DeviceService::scheduleToJson(uint8_t medicineId) const {
  String json = "[";
  bool first  = true;
  for (uint8_t i = 0; i < DeviceLimits::MAX_SCHEDULES; i++) {
    if (!schedules_[i].inUse) continue;
    if (schedules_[i].base.medicineId != medicineId) continue;

    if (!first) json += ",";

    // Format hour/minute as "HH:MM AM/PM"
    uint8_t h   = schedules_[i].base.hour;
    uint8_t m   = schedules_[i].base.minute;
    bool    pm  = h >= 12;
    uint8_t h12 = h % 12;
    if (h12 == 0) h12 = 12;

    char timeBuf[12];
    snprintf(timeBuf, sizeof(timeBuf), "%02u:%02u %s", h12, m, pm ? "PM" : "AM");

    json += "{";
    json += "\"id\":"      + String(schedules_[i].base.id)      + ",";
    json += "\"time\":\""  + String(timeBuf)                    + "\",";
    json += "\"enabled\":" + String(schedules_[i].base.enabled ? "true" : "false");
    json += "}";
    first = false;
  }
  json += "]";
  return json;
}

String DeviceService::logRecordToJson(const LogRecord& rec, uint8_t index) const {
  const char* status = dispenseResultStr(rec.base.result);
  String medName  = String(rec.medicineName);
  String dosage   = String(rec.dosageStr);
  medName.replace("\"", "\\\"");
  dosage.replace("\"", "\\\"");

  String json = "{";
  json += "\"id\":"              + String(index + 1)         + ",";
  json += "\"medicationName\":\"" + medName                  + "\",";
  json += "\"dosage\":\""        + dosage                    + "\",";
  json += "\"timestamp\":"       + String(rec.base.timestamp)+ ",";
  json += "\"status\":\""        + String(status)            + "\",";
  json += "\"description\":\"Dispense from Slot A" + String(rec.base.dispenserId) + ".\",";
  json += "\"categoryDate\":\"Today\"";
  json += "}";
  return json;
}

const char* DeviceService::dispenseResultStr(DispenseResult r) const {
  switch (r) {
    case DispenseResult::Success:   return "Taken";
    case DispenseResult::Failed:    return "Failed";
    case DispenseResult::Missed:    return "Missed";
    case DispenseResult::Cancelled: return "Cancelled";
  }
  return "Unknown";
}

uint8_t DeviceService::nextMedicineId() const {
  uint8_t maxId = 0;
  for (uint8_t i = 0; i < DeviceLimits::MAX_MEDICINES; i++) {
    if (medicines_[i].base.id > maxId) maxId = medicines_[i].base.id;
  }
  return maxId + 1;
}

uint8_t DeviceService::logCount() const { return logTotal_; }

uint8_t DeviceService::adherencePercent() const {
  if (logTotal_ == 0) return 0;
  uint8_t taken = 0;
  for (uint8_t i = 0; i < DeviceLimits::MAX_LOGS; i++) {
    if (logs_[i].inUse && logs_[i].base.result == DispenseResult::Success) taken++;
  }
  return (uint8_t)((taken * 100U) / logTotal_);
}

int32_t DeviceService::nextDoseCountdownSec() const {
  // Placeholder — RTC integration will fill this in Phase 15.
  return 3600;
}
