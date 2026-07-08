/**
 * main.cpp — MedLink IoT Smart Medicine Dispenser
 *
 * Boot sequence (strictly ordered, all steps print logs):
 *   1. Serial + Logger
 *   2. LittleFS
 *   3. StorageManager
 *   4. Load WiFi credentials
 *   5. WiFiManager (async — does NOT block)
 *   6. ApiManager  (HTTP server — works in both AP and STA mode)
 *   7. DeviceService (hardware init)
 *   8. loop()
 *
 * loop() is fully non-blocking:
 *   wifiManager.update() -> apiManager.update() -> deviceService.update() -> yield() -> delay(5)
 */

#include <Arduino.h>
#include <LittleFS.h>

#include "Config.h"
#include "Logger.h"
#include "StorageManager.h"
#include "WiFiManager.h"
#include "DeviceService.h"
#include "ApiManager.h"

StorageManager storageManager;
WiFiManager    wifiManager;
DeviceService  deviceService;
ApiManager     apiManager;

void setup() {
  // ── Step 1: Serial & Logger ───────────────────────────────────────────────
  Serial.begin(Config::serialBaudRate());
  delay(200);  // Give host a moment to open the monitor
  Serial.println();
  Serial.println("========================================");
  Serial.println("  MedLink IoT Smart Dispenser  Booting");
  Serial.println("========================================");

  Logger::begin();
  Logger::info("Logger Ready");

  // ── Step 2: LittleFS ──────────────────────────────────────────────────────
  Logger::info("Mounting LittleFS...");
  if (!LittleFS.begin()) {
    Logger::error("LittleFS mount FAILED — filesystem may need formatting");
  } else {
    Logger::info("LittleFS Mounted");
  }

  // ── Step 3: StorageManager ────────────────────────────────────────────────
  Logger::info("Initializing StorageManager...");
  storageManager.begin();
  Logger::info("Storage Ready");

  // ── Step 4: Load WiFi credentials ─────────────────────────────────────────
  Logger::info("Loading WiFi credentials...");
  String wifiSSID, wifiPassword;
  bool hasCredentials = storageManager.loadWiFi(wifiSSID, wifiPassword);
  if (hasCredentials && wifiSSID.length() > 0) {
    char buf[80];
    snprintf(buf, sizeof(buf), "Credentials Found — SSID: %s", wifiSSID.c_str());
    Logger::info(buf);
    wifiManager.setCredentials(wifiSSID, wifiPassword);
  } else {
    Logger::info("No Credentials Found");
  }

  // ── Step 5: WiFiManager (async — never blocks) ────────────────────────────
  Logger::info("Starting WiFiManager...");
  wifiManager.begin();
  Logger::info("WiFiManager Ready");

  // ── Step 6: Load application state from storage ───────────────────────────
  // Medicines
  {
    size_t loadedMeds = 0;
    if (storageManager.loadMedicines(deviceService.getMedicines(),
                                     DeviceLimits::MAX_MEDICINES, loadedMeds)) {
      deviceService.getMedicineCount() = static_cast<uint8_t>(loadedMeds);
      char buf[64];
      snprintf(buf, sizeof(buf), "Loaded %d medicine(s)", (int)loadedMeds);
      Logger::info(buf);
    }
  }
  // Schedules
  {
    size_t loadedSched = 0;
    if (storageManager.loadSchedules(deviceService.getSchedules(),
                                     DeviceLimits::MAX_SCHEDULES, loadedSched)) {
      deviceService.getScheduleCount() = static_cast<uint8_t>(loadedSched);
      char buf[64];
      snprintf(buf, sizeof(buf), "Loaded %d schedule(s)", (int)loadedSched);
      Logger::info(buf);
    }
  }
  // Logs
  {
    uint8_t logHead = 0, logTotal = 0;
    if (storageManager.loadLogs(deviceService.getLogs(),
                                DeviceLimits::MAX_LOGS, logHead, logTotal)) {
      deviceService.getLogHead()  = logHead;
      deviceService.getLogTotal() = logTotal;
      char buf[64];
      snprintf(buf, sizeof(buf), "Loaded %d log entry/entries", (int)logTotal);
      Logger::info(buf);
    }
  }

  // ── Step 7: ApiManager ────────────────────────────────────────────────────
  Logger::info("Starting ApiManager...");
  apiManager.begin(&deviceService, &wifiManager, &storageManager);
  // "HTTP Server Started" is logged inside begin()

  // ── Step 8: DeviceService (hardware init) ─────────────────────────────────
  Logger::info("Starting DeviceService...");
  deviceService.begin(&wifiManager, &storageManager);
  // "DeviceService Ready" is logged inside begin()

  Logger::info("========================================");
  Logger::info("Ready");
  Logger::info("========================================");
}

void loop() {
  wifiManager.update();    // Drives async state machine
  apiManager.update();     // Handles incoming HTTP clients
  yield();                 // Feed the ESP8266 background tasks
  delay(5);
}
