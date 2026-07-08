#pragma once

#include <ESP8266WebServer.h>

#include "Config.h"
#include "DeviceService.h"
#include "WiFiManager.h"
#include "StorageManager.h"

/**
 * ApiManager
 *
 * Owns the HTTP server. Registers all /api/v1/... routes and delegates
 * every request to DeviceService. Does NOT contain business logic.
 * Holds pointers to WiFiManager and StorageManager for provisioning only.
 */
class ApiManager {
 public:
  void begin(DeviceService* service, WiFiManager* wifi, StorageManager* storage);
  void update();
  void start();
  void stop();
  bool isRunning() const;

 private:
  // Route registration
  void configureRoutes();

  // CORS & response helpers
  void addCorsHeaders();
  void sendJson(int code, const String& body);
  void sendSuccess(const String& message = "OK");
  void sendError(int code, const String& error);

  // Utility: extract numeric id from URI path suffix
  uint8_t extractIdFromUri();

  // String helper (no ArduinoJson dependency)
  String extractJsonString(const String& json, const String& key);

  // GET handlers
  void handleRoot();
  void handleStatus();
  void handleDashboard();
  void handleMedicines();
  void handleLogs();
  void handleDiagnostics();

  // POST handlers — medicines
  void handlePostMedicine();

  // PUT handler
  void handlePutMedicine();

  // DELETE handler
  void handleDeleteMedicine();

  // POST handlers — dispense / tests
  void handleDispense();   // POST /api/v1/test/dispenser/{slot}
  void handleTestMotor();
  void handleTestAudio();
  void handleTestRtc();
  void handleTestIr();

  // POST handlers — device
  void handleWifiConnect();   // NON-BLOCKING: saves creds and schedules connect
  void handleDeviceReboot();

  // OPTIONS preflight (CORS)
  void handleOptions();

  ESP8266WebServer  server_{Config::DEFAULT_HTTP_PORT};
  DeviceService*    service_         = nullptr;
  WiFiManager*      wifi_            = nullptr;
  StorageManager*   storage_         = nullptr;
  bool              routesConfigured_ = false;
  bool              running_          = false;
};
