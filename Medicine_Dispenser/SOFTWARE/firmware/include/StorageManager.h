#pragma once

#include <Arduino.h>

class StorageManager {
 public:
  bool begin();

  // Medicines
  bool saveMedicines(const void* medicines, size_t count);
  bool loadMedicines(void* medicines, size_t maxCount, size_t& loadedCount);

  // Schedules
  bool saveSchedules(const void* schedules, size_t count);
  bool loadSchedules(void* schedules, size_t maxCount, size_t& loadedCount);

  // Logs
  bool saveLogs(const void* logs, size_t count, uint8_t head, uint8_t total);
  bool loadLogs(void* logs, size_t maxCount, uint8_t& head, uint8_t& total);

  // WiFi credentials
  bool saveWiFi(const String& ssid, const String& password);
  bool loadWiFi(String& ssid, String& password);
};
