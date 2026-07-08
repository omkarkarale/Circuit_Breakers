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

  Logger::info("Boot Phase 1: Initializing Filesystem...");
  if (!LittleFS.begin()) {
    Logger::error("LittleFS mount failed!");
  } else {
    Logger::info("LittleFS mounted successfully");
  }

  Logger::info("Boot Phase 2: Starting StorageManager...");
  storageManager.begin();
  Logger::info("StorageManager initialized");

  Logger::info("Boot Phase 3: Starting WiFiManager...");
  wifiManager.begin();
  Logger::info("WiFiManager initialized");

  // Load WiFi credentials
  String wifiSSID, wifiPassword;
  if (storageManager.loadWiFi(wifiSSID, wifiPassword)) {
    char buf[128];
    snprintf(buf, sizeof(buf), "Saved credentials found. SSID: %s", wifiSSID.c_str());
    Logger::info(buf);
    wifiManager.connect(wifiSSID.c_str(), wifiPassword.c_str());
  } else {
    Logger::warn("No saved WiFi credentials - Setting SoftAP request");
    wifiManager.setNoCredentials();
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

  Logger::info("Boot Phase 4: Starting DeviceService...");
  deviceService.begin(&wifiManager, &storageManager);
  Logger::info("DeviceService initialized");

  Logger::info("Boot Phase 5: Starting ApiManager...");
  apiManager.begin(&deviceService);
  Logger::info("REST Server Started");

  Logger::info("System Ready");
}

void loop() {
  wifiManager.update();
  apiManager.update();
  yield();
  delay(5);
}
