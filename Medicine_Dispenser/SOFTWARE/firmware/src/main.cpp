#include <Arduino.h>
#include <LittleFS.h>

#include "Config.h"
#include "Logger.h"
#include "StorageManager.h"
#include "WiFiManager.h"
#include "DeviceService.h"
#include "ApiManager.h"

StorageManager storageManager;
WiFiManager wifiManager;
DeviceService deviceService;
ApiManager apiManager;

void setup() {
  Serial.begin(Config::serialBaudRate());
  Serial.println("================================");
  Serial.println("MedLink IoT Smart Dispenser");
  Serial.println("================================");

  Logger::begin();

  if (!LittleFS.begin()) {
    Logger::error("LittleFS mount failed!");
  } else {
    Logger::info("LittleFS mounted successfully");
  }

  storageManager.begin();
  wifiManager.begin();

  // Load WiFi credentials
  String wifiSSID, wifiPassword;
  if (storageManager.loadWiFi(wifiSSID, wifiPassword)) {
    wifiManager.connect(wifiSSID.c_str(), wifiPassword.c_str());
  } else {
    Logger::warn("No saved WiFi credentials - Starting SoftAP");
    wifiManager.startAP();
  }

  // Load medicines
  size_t loadedMeds = 0;
  if (storageManager.loadMedicines(deviceService.getMedicines(), DeviceLimits::MAX_MEDICINES, loadedMeds)) {
    deviceService.getMedicineCount() = loadedMeds;
    char buf[64];
    snprintf(buf, sizeof(buf), "Loaded %d medicines from storage", (int)loadedMeds);
    Logger::info(buf);
  }

  // Load schedules
  size_t loadedSchedules = 0;
  if (storageManager.loadSchedules(deviceService.getSchedules(), DeviceLimits::MAX_SCHEDULES, loadedSchedules)) {
    deviceService.getScheduleCount() = loadedSchedules;
    char buf[64];
    snprintf(buf, sizeof(buf), "Loaded %d schedules from storage", (int)loadedSchedules);
    Logger::info(buf);
  }

  // Load logs
  uint8_t logHead = 0;
  uint8_t logTotal = 0;
  if (storageManager.loadLogs(deviceService.getLogs(), DeviceLimits::MAX_LOGS, logHead, logTotal)) {
    deviceService.getLogHead() = logHead;
    deviceService.getLogTotal() = logTotal;
    char buf[64];
    snprintf(buf, sizeof(buf), "Loaded %d logs from storage (head=%d)", (int)logTotal, (int)logHead);
    Logger::info(buf);
  }

  deviceService.begin(&wifiManager, &storageManager);
  apiManager.begin(&deviceService);

  Logger::info("System Ready");
}

void loop() {
  wifiManager.update();
  apiManager.update();
  delay(Config::mainLoopDelayMs());
}
