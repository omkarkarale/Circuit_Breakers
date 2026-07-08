#pragma once

#include <Arduino.h>

#include "LogEntry.h"
#include "Medicine.h"
#include "Schedule.h"
#include "WiFiManager.h"

class StorageManager;

// Maximum in-memory records
namespace DeviceLimits {
constexpr uint8_t MAX_MEDICINES = 10;
constexpr uint8_t MAX_SCHEDULES = 30;
constexpr uint8_t MAX_LOGS      = 50;
}  // namespace DeviceLimits

// Extended medicine record (superset of the bare Medicine struct)
struct MedicineRecord {
  Medicine     base;
  char         colorHex[8]       = "#ffffff";
  char         type[16]          = "Tablet";
  char         dosage[64]        = "";
  char         repeatPattern[16] = "Daily";
  uint16_t     maxCapacity       = 30;
  uint8_t      dosePerReminder   = 1;
  uint32_t     lastTakenTime     = 0;
  uint8_t      streakDays        = 0;
};

// Extended schedule record
struct ScheduleRecord {
  Schedule base;
  bool     inUse = false;
};

// Extended log record
struct LogRecord {
  LogEntry base;
  char     medicineName[32] = "";
  char     dosageStr[64]    = "";
  bool     inUse            = false;
};

/**
 * DeviceService
 *
 * Single service layer between ApiManager (HTTP) and firmware modules
 * (WiFiManager, StorageManager, hardware stubs).
 *
 * ApiManager only calls DeviceService methods.
 * DeviceService owns in-memory state and delegates persistence to
 * StorageManager when available.
 */
class DeviceService {
 public:
  // Lifecycle
  void begin(WiFiManager* wifi, StorageManager* storage);

  // ── Status & telemetry ────────────────────────────────────────────────────
  String buildStatusJson() const;
  String buildDashboardJson() const;

  // ── Medicines ─────────────────────────────────────────────────────────────
  String buildMedicinesJson() const;
  // Returns assigned id on success, 0 on failure (full / storage error).
  uint8_t addMedicine(const String& name, uint8_t slot,
                      uint16_t pillsRemaining, uint16_t maxCapacity,
                      uint8_t dosePerReminder, bool enabled,
                      const String& colorHex, const String& type,
                      const String& dosage, const String& repeatPattern);
  bool updateMedicine(uint8_t id, const String& name, uint8_t slot,
                      uint16_t pillsRemaining, uint16_t maxCapacity,
                      uint8_t dosePerReminder, bool enabled,
                      const String& colorHex, const String& type,
                      const String& dosage, const String& repeatPattern);
  bool deleteMedicine(uint8_t id);
  bool medicineExists(uint8_t id) const;

  // ── Schedules (attached to medicines) ────────────────────────────────────
  bool addSchedule(uint8_t medicineId, uint8_t hour, uint8_t minute,
                   bool enabled);

  // ── Logs ─────────────────────────────────────────────────────────────────
  String buildLogsJson() const;
  void appendLog(uint8_t medicineId, uint8_t slot, DispenseResult result,
                 uint16_t durationMs = 0);

  // ── Dispense (stub — motor driver added in later phase) ──────────────────
  bool triggerDispense(uint8_t slot);

  // ── Hardware test stubs ───────────────────────────────────────────────────
  bool testMotor();
  bool testAudio();
  bool testRtc();
  bool testIr();

  // ── Diagnostics ───────────────────────────────────────────────────────────
  String buildDiagnosticsJson() const;

  // ── WiFi ──────────────────────────────────────────────────────────────────
  bool connectWifi(const String& ssid, const String& password);

  // ── Reboot ────────────────────────────────────────────────────────────────
  void reboot();
  void saveWifiCredentials(const String& ssid, const String& password);

  // Array reference getters
  MedicineRecord* getMedicines() { return medicines_; }
  ScheduleRecord* getSchedules() { return schedules_; }
  LogRecord* getLogs() { return logs_; }
  uint8_t& getMedicineCount() { return medicineCount_; }
  uint8_t& getScheduleCount() { return scheduleCount_; }
  uint8_t& getLogHead() { return logHead_; }
  uint8_t& getLogTotal() { return logTotal_; }

 private:

  // JSON helpers
  String medicineRecordToJson(const MedicineRecord& rec) const;
  String logRecordToJson(const LogRecord& rec, uint8_t index) const;
  String scheduleToJson(uint8_t medicineId) const;
  const char* dispenseResultStr(DispenseResult r) const;
  uint8_t nextMedicineId() const;
  uint8_t logCount() const;
  uint8_t adherencePercent() const;
  int32_t nextDoseCountdownSec() const;

  WiFiManager*    wifi_    = nullptr;
  StorageManager* storage_ = nullptr;

  // Hardware drivers pointers
  class RTC_DS3231*          rtc_      = nullptr;
  class LiquidCrystal_I2C*   lcd_      = nullptr;
  class DFRobotDFPlayerMini* player_   = nullptr;
  class Stepper*             stepper1_ = nullptr;
  class Stepper*             stepper2_ = nullptr;
  class Stepper*             stepper3_ = nullptr;

  MedicineRecord  medicines_[DeviceLimits::MAX_MEDICINES] = {};
  ScheduleRecord  schedules_[DeviceLimits::MAX_SCHEDULES] = {};
  LogRecord       logs_[DeviceLimits::MAX_LOGS]           = {};
  uint8_t         medicineCount_ = 0;
  uint8_t         scheduleCount_ = 0;
  uint8_t         logHead_       = 0;   // circular index
  uint8_t         logTotal_      = 0;   // total written (capped at MAX_LOGS)
  unsigned long   startMs_       = 0;
};
