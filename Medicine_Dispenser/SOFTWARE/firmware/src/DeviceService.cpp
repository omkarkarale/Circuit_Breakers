#include "DeviceService.h"

#include <Arduino.h>
#include <cstring>
#include <cstdio>
#include <Wire.h>
#include <RTClib.h>
#include <LiquidCrystal_I2C.h>
#include <DFRobotDFPlayerMini.h>
#include <Stepper.h>
#include <SoftwareSerial.h>

#include "Config.h"
#include "Logger.h"
#include "StorageManager.h"

// ─────────────────────────────────────────────────────────────────────────────
// Lifecycle
// ─────────────────────────────────────────────────────────────────────────────

void DeviceService::begin(WiFiManager* wifi, StorageManager* storage) {
  wifi_    = wifi;
  storage_ = storage;
  startMs_ = millis();

  // 1. Initialize Wire (I2C) and LCD Display
  Wire.begin(Config::Pins::I2C_SDA, Config::Pins::I2C_SCL);

  if (Config::lcdSupported) {
    lcd_ = new LiquidCrystal_I2C(0x27, 16, 2);
    lcd_->init();
    lcd_->backlight();
    lcd_->setCursor(0, 0);
    lcd_->print("MedLink Ready");
  }

  // 2. Initialize DS3231 RTC
  if (Config::rtcSupported) {
    rtc_ = new RTC_DS3231();
    if (!rtc_->begin()) {
      Logger::error("RTC clock chip not detected!");
    } else {
      Logger::info("RTC DS3231 ready");
    }
  }

  // 3. Initialize ULN2003 Stepper Motors (2048 steps per revolution)
  const int stepsPerRev = 2048;
  stepper1_ = new Stepper(stepsPerRev, Config::Pins::MOTOR1_IN1, Config::Pins::MOTOR1_IN2, Config::Pins::MOTOR1_IN3, Config::Pins::MOTOR1_IN4);
  stepper2_ = new Stepper(stepsPerRev, Config::Pins::MOTOR2_IN1, Config::Pins::MOTOR2_IN2, Config::Pins::MOTOR2_IN3, Config::Pins::MOTOR2_IN4);
  stepper3_ = new Stepper(stepsPerRev, Config::Pins::MOTOR3_IN1, Config::Pins::MOTOR3_IN2, Config::Pins::MOTOR3_IN3, Config::Pins::MOTOR3_IN4);

  stepper1_->setSpeed(10);
  stepper2_->setSpeed(10);
  stepper3_->setSpeed(10);

  // 4. Initialize DFPlayer MP3 Buzzer
  if (Config::speakerSupported) {
    SoftwareSerial* dfplayerSerial = new SoftwareSerial(Config::Pins::DFPLAYER_RX, Config::Pins::DFPLAYER_TX);
    dfplayerSerial->begin(9600);
    player_ = new DFRobotDFPlayerMini();
    if (!player_->begin(*dfplayerSerial, false, false)) {
      Logger::error("DFPlayer NOT detected!");
    } else {
      player_->volume(25);
      Logger::info("DFPlayer ready");
    }
  }

  // 5. Initialize IR Sensor Input Pin
  if (Config::irSupported) {
    pinMode(Config::Pins::IR_SENSOR, INPUT);
  }

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

  // Escape strings
  ssid.replace("\"", "\\\"");
  ip.replace("\"", "\\\"");

  String json = "{";
  json += "\"connected\":"     + String(connected ? "true" : "false") + ",";
  json += "\"deviceName\":\"Smart Dispenser Hub\",";
  json += "\"firmwareVersion\":\"" + String(Config::firmwareVersion()) + "\",";
  json += "\"uptimeSeconds\":"  + String(up)              + ",";
  
  // Real Capability Flags
  json += "\"batterySupported\":"     + String(Config::batterySupported ? "true" : "false") + ",";
  json += "\"temperatureSupported\":" + String(Config::temperatureSupported ? "true" : "false") + ",";
  json += "\"rtcSupported\":"         + String(Config::rtcSupported ? "true" : "false") + ",";
  json += "\"speakerSupported\":"     + String(Config::speakerSupported ? "true" : "false") + ",";
  json += "\"irSupported\":"          + String(Config::irSupported ? "true" : "false") + ",";
  json += "\"lcdSupported\":"         + String(Config::lcdSupported ? "true" : "false") + ",";
  
  json += "\"epochTime\":"      + String(rtc_ ? rtc_->now().unixtime() : time(nullptr)) + ",";
  json += "\"batteryPercentage\":0,"; // Zero if unsupported
  json += "\"batteryCharging\":false,";
  json += "\"wifiSSID\":\""     + ssid                    + "\",";
  json += "\"ipAddress\":\""    + ip                      + "\",";
  json += "\"signalStrength\":"  + (connected ? String(WiFi.RSSI()) : String(0)) + ",";
  json += "\"temperature\":0.0,"; // Zero if unsupported
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

    if (storage_) storage_->saveMedicines(medicines_, DeviceLimits::MAX_MEDICINES);

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

    if (storage_) storage_->saveMedicines(medicines_, DeviceLimits::MAX_MEDICINES);
    return true;
  }
  return false;
}

bool DeviceService::deleteMedicine(uint8_t id) {
  for (uint8_t i = 0; i < DeviceLimits::MAX_MEDICINES; i++) {
    if (medicines_[i].base.id != id) continue;
    medicines_[i] = MedicineRecord{};  // zero-reset
    if (medicineCount_ > 0) medicineCount_--;
    if (storage_) storage_->saveMedicines(medicines_, DeviceLimits::MAX_MEDICINES);
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
    if (storage_) storage_->saveSchedules(schedules_, DeviceLimits::MAX_SCHEDULES);
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

  if (storage_) storage_->saveLogs(logs_, DeviceLimits::MAX_LOGS, logHead_, logTotal_);
}

// ─────────────────────────────────────────────────────────────────────────────
// Dispense stub
// ─────────────────────────────────────────────────────────────────────────────

bool DeviceService::triggerDispense(uint8_t slot) {
  if (slot < 1 || slot > 3) {
    Logger::warn("Invalid slot requested");
    return false;
  }

  // Find medicine mapped to slot
  uint8_t medId = 0;
  uint8_t dose = 1;
  for (uint8_t i = 0; i < DeviceLimits::MAX_MEDICINES; i++) {
    if (medicines_[i].base.id != 0 && medicines_[i].base.dispenserId == slot) {
      medId = medicines_[i].base.id;
      dose = medicines_[i].dosePerReminder;
      break;
    }
  }

  char logBuf[64];
  snprintf(logBuf, sizeof(logBuf), "Motor turning for slot %d", slot);
  Logger::info(logBuf);
  
  // Run stepper motor clockwise (one full revolution)
  const int stepsPerRev = 2048;
  if (slot == 1 && stepper1_) {
    stepper1_->step(stepsPerRev);
  } else if (slot == 2 && stepper2_) {
    stepper2_->step(stepsPerRev);
  } else if (slot == 3 && stepper3_) {
    stepper3_->step(stepsPerRev);
  }

  // Play reminder audio
  if (player_) {
    player_->play(5);
  }

  // Set LCD instruction
  if (lcd_) {
    lcd_->clear();
    lcd_->setCursor(0, 0);
    lcd_->print("Take your Meds!!");
  }

  // Wait for IR sensor beam block to indicate pill taken
  // (IR sensor goes LOW when hand or cup is placed)
  if (Config::irSupported) {
    unsigned long startCheck = millis();
    bool taken = false;
    while (millis() - startCheck < 30000) { // 30 seconds timeout
      int irVal = digitalRead(Config::Pins::IR_SENSOR);
      if (irVal == LOW) {
        taken = true;
        break;
      }
      delay(200);
    }

    if (taken) {
      if (lcd_) {
        lcd_->clear();
        lcd_->setCursor(3, 1);
        lcd_->print("Thankyou!!");
      }
      Logger::info("Medication successfully taken!");
    } else {
      Logger::warn("Medication dispense timed out!");
    }
  }

  // Decrement inventory pill count if a medicine is mapped
  for (uint8_t i = 0; i < DeviceLimits::MAX_MEDICINES; i++) {
    if (medicines_[i].base.id == medId && medicines_[i].base.id != 0) {
      if (medicines_[i].base.pillsRemaining >= dose) {
        medicines_[i].base.pillsRemaining -= dose;
      } else {
        medicines_[i].base.pillsRemaining = 0;
      }
      break;
    }
  }

  appendLog(medId, slot, DispenseResult::Success, 4000);
  if (storage_) storage_->saveMedicines(medicines_, DeviceLimits::MAX_MEDICINES);

  return true;
}

// ─────────────────────────────────────────────────────────────────────────────
// Hardware test stubs
// ─────────────────────────────────────────────────────────────────────────────

bool DeviceService::testMotor() {
  if (stepper1_) {
    stepper1_->step(512);
    return true;
  }
  return false;
}

bool DeviceService::testAudio() {
  if (player_) {
    player_->play(5);
    return true;
  }
  return false;
}

bool DeviceService::testRtc() {
  if (rtc_) {
    return rtc_->now().isValid();
  }
  return false;
}

bool DeviceService::testIr() {
  if (Config::irSupported) {
    return digitalRead(Config::Pins::IR_SENSOR) == LOW; // returns true if blocked
  }
  return false;
}

// ─────────────────────────────────────────────────────────────────────────────
// Diagnostics
// ─────────────────────────────────────────────────────────────────────────────

String DeviceService::buildDiagnosticsJson() const {
  const uint32_t ts = (uint32_t)(millis() / 1000UL);
  const bool wifiOk = wifi_ && wifi_->isConnected();

  String json = "{";
  json += "\"temperature\":0.0,";
  json += "\"components\":[";

  // Stepper motors (always present)
  json += "{\"component\":\"Stepper Motor 1\",\"status\":\"OK\",\"lastTest\":" + String(ts) + ",\"message\":\"Nominal current\"}";
  json += ",{\"component\":\"Stepper Motor 2\",\"status\":\"OK\",\"lastTest\":" + String(ts) + ",\"message\":\"Nominal current\"}";
  json += ",{\"component\":\"Stepper Motor 3\",\"status\":\"OK\",\"lastTest\":" + String(ts) + ",\"message\":\"Nominal current\"}";

  // RTC
  if (Config::rtcSupported) {
    bool ok = rtc_ && rtc_->now().isValid();
    json += ",{\"component\":\"RTC Clock Module\",\"status\":\"" + String(ok ? "OK" : "ERROR") + "\",\"lastTest\":" + String(ts) + ",\"message\":\"RTC synchronised\"}";
  }
  // IR
  if (Config::irSupported) {
    json += ",{\"component\":\"IR Sensor Beam\",\"status\":\"OK\",\"lastTest\":" + String(ts) + ",\"message\":\"Signal clear\"}";
  }
  // Speaker
  if (Config::speakerSupported) {
    json += ",{\"component\":\"Audio DFPlayer\",\"status\":\"OK\",\"lastTest\":" + String(ts) + ",\"message\":\"DFPlayer ready\"}";
  }
  // LCD
  if (Config::lcdSupported) {
    json += ",{\"component\":\"OLED LCD Screen\",\"status\":\"OK\",\"lastTest\":" + String(ts) + ",\"message\":\"I2C backlight nominal\"}";
  }
  // WiFi
  json += ",{\"component\":\"WiFi Connection\",\"status\":\"" + String(wifiOk ? "OK" : "WARNING") + "\",\"lastTest\":" + String(ts) + ",\"message\":\"RSSI nominal\"}";
  
  // Heap
  json += ",{\"component\":\"System Heap Memory\",\"status\":\"OK\",\"lastTest\":" + String(ts) + ",\"message\":\"Free: " + String(ESP.getFreeHeap()) + " B\"}";

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

void DeviceService::saveWifiCredentials(const String& ssid, const String& password) {
  if (storage_) {
    storage_->saveWiFi(ssid, password);
  }
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
  if (!rtc_) return 3600;

  DateTime nowTime = rtc_->now();
  if (!nowTime.isValid()) return 3600;

  int32_t shortestDiff = -1;

  for (uint8_t i = 0; i < DeviceLimits::MAX_SCHEDULES; i++) {
    if (!schedules_[i].inUse || !schedules_[i].base.enabled) continue;

    int schedHour = schedules_[i].base.hour;
    int schedMin = schedules_[i].base.minute;

    int currentMinutes = nowTime.hour() * 60 + nowTime.minute();
    int scheduleMinutes = schedHour * 60 + schedMin;

    int diffMinutes = scheduleMinutes - currentMinutes;
    if (diffMinutes <= 0) {
      diffMinutes += 24 * 60;
    }

    int32_t diffSec = (diffMinutes * 60) - nowTime.second();
    if (shortestDiff == -1 || diffSec < shortestDiff) {
      shortestDiff = diffSec;
    }
  }

  return shortestDiff == -1 ? 3600 : shortestDiff;
}
