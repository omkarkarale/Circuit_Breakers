#include "ApiManager.h"

#include <ESP8266WiFi.h>

#include "Logger.h"

// ─────────────────────────────────────────────────────────────────────────────
// Lifecycle
// ─────────────────────────────────────────────────────────────────────────────

void ApiManager::begin(DeviceService* service, WiFiManager* wifi, StorageManager* storage) {
  service_ = service;
  wifi_    = wifi;
  storage_ = storage;
  configureRoutes();
  server_.begin();
  running_ = true;
  Logger::info("HTTP Server Started");
}

void ApiManager::update() {
  if (!running_) return;
  server_.handleClient();
}

void ApiManager::start() {
  if (running_) return;
  configureRoutes();
  server_.begin();
  running_ = true;
  Logger::info("Server Started");
}

void ApiManager::stop() {
  if (!running_) return;
  server_.stop();
  running_ = false;
  Logger::info("Server Stopped");
}

bool ApiManager::isRunning() const { return running_; }

// ─────────────────────────────────────────────────────────────────────────────
// Route Registration
// ─────────────────────────────────────────────────────────────────────────────

void ApiManager::configureRoutes() {
  if (routesConfigured_) return;

  // Root / health
  server_.on("/",           HTTP_GET,     [this]() { handleRoot(); });
  server_.on("/health",     HTTP_GET,     [this]() { sendSuccess("healthy"); });

  // Status & dashboard
  server_.on("/api/v1/status",    HTTP_GET,  [this]() { handleStatus(); });
  server_.on("/api/v1/dashboard", HTTP_GET,  [this]() { handleDashboard(); });

  // Medicines collection
  server_.on("/api/v1/medicines", HTTP_GET,  [this]() { handleMedicines(); });
  server_.on("/api/v1/medicines", HTTP_POST, [this]() { handlePostMedicine(); });

  // Logs & diagnostics
  server_.on("/api/v1/logs",        HTTP_GET, [this]() { handleLogs(); });
  server_.on("/api/v1/diagnostics", HTTP_GET, [this]() { handleDiagnostics(); });

  // Test endpoints
  server_.on("/api/v1/test/motor", HTTP_POST, [this]() { handleTestMotor(); });
  server_.on("/api/v1/test/audio", HTTP_POST, [this]() { handleTestAudio(); });
  server_.on("/api/v1/test/rtc",   HTTP_POST, [this]() { handleTestRtc(); });
  server_.on("/api/v1/test/ir",    HTTP_POST, [this]() { handleTestIr(); });

  // WiFi & reboot
  server_.on("/api/v1/wifi/connect",  HTTP_POST, [this]() { handleWifiConnect(); });
  server_.on("/api/v1/device/reboot", HTTP_POST, [this]() { handleDeviceReboot(); });

  // OPTIONS preflight for all /api/* paths
  server_.on("/api/v1/status",         HTTP_OPTIONS, [this]() { handleOptions(); });
  server_.on("/api/v1/dashboard",      HTTP_OPTIONS, [this]() { handleOptions(); });
  server_.on("/api/v1/medicines",      HTTP_OPTIONS, [this]() { handleOptions(); });
  server_.on("/api/v1/logs",           HTTP_OPTIONS, [this]() { handleOptions(); });
  server_.on("/api/v1/diagnostics",    HTTP_OPTIONS, [this]() { handleOptions(); });
  server_.on("/api/v1/wifi/connect",   HTTP_OPTIONS, [this]() { handleOptions(); });
  server_.on("/api/v1/device/reboot",  HTTP_OPTIONS, [this]() { handleOptions(); });

  // Not-found handler catches /api/v1/medicines/{id} and /api/v1/test/dispenser/{slot}
  server_.onNotFound([this]() {
    const String uri = server_.uri();

    // PUT /api/v1/medicines/{id}
    if (server_.method() == HTTP_PUT && uri.startsWith("/api/v1/medicines/")) {
      handlePutMedicine();
      return;
    }
    // DELETE /api/v1/medicines/{id}
    if (server_.method() == HTTP_DELETE && uri.startsWith("/api/v1/medicines/")) {
      handleDeleteMedicine();
      return;
    }
    // POST /api/v1/test/dispenser/{slot}
    if (server_.method() == HTTP_POST && uri.startsWith("/api/v1/test/dispenser/")) {
      handleDispense();
      return;
    }
    // OPTIONS preflight on dynamic paths
    if (server_.method() == HTTP_OPTIONS) {
      handleOptions();
      return;
    }

    sendError(404, "Route not found");
  });

  routesConfigured_ = true;
}

// ─────────────────────────────────────────────────────────────────────────────
// CORS & Response Helpers
// ─────────────────────────────────────────────────────────────────────────────

void ApiManager::addCorsHeaders() {
  server_.sendHeader("Access-Control-Allow-Origin",  "*");
  server_.sendHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  server_.sendHeader("Access-Control-Allow-Headers", "Content-Type");
}

void ApiManager::sendJson(int code, const String& body) {
  addCorsHeaders();
  server_.send(code, "application/json", body);
}

void ApiManager::sendSuccess(const String& message) {
  String escaped = message;
  escaped.replace("\"", "\\\"");
  sendJson(200, "{\"success\":true,\"message\":\"" + escaped + "\"}");
}

void ApiManager::sendError(int code, const String& error) {
  String escaped = error;
  escaped.replace("\"", "\\\"");
  sendJson(code, "{\"success\":false,\"error\":\"" + escaped + "\"}");
}

void ApiManager::handleOptions() {
  addCorsHeaders();
  server_.send(204, "text/plain", "");
}

// Extract trailing numeric id from the request URI (e.g. /api/v1/medicines/3 → 3)
uint8_t ApiManager::extractIdFromUri() {
  const String uri = server_.uri();
  int lastSlash    = uri.lastIndexOf('/');
  if (lastSlash < 0) return 0;
  String idStr = uri.substring(lastSlash + 1);
  return (uint8_t)idStr.toInt();
}

// Extract a string value from a simple JSON object by key (no ArduinoJson dependency)
String ApiManager::extractJsonString(const String& json, const String& key) {
  String searchKey = "\"" + key + "\"";
  int keyIdx = json.indexOf(searchKey);
  if (keyIdx < 0) return "";
  int colonIdx = json.indexOf(':', keyIdx + searchKey.length());
  if (colonIdx < 0) return "";
  int valStart = colonIdx + 1;
  while (valStart < (int)json.length() && json[valStart] == ' ') valStart++;
  if (valStart >= (int)json.length()) return "";
  if (json[valStart] == '"') {
    int valEnd = json.indexOf('"', valStart + 1);
    if (valEnd < 0) return "";
    return json.substring(valStart + 1, valEnd);
  }
  int valEnd = valStart;
  while (valEnd < (int)json.length() && json[valEnd] != ',' && json[valEnd] != '}') valEnd++;
  String result = json.substring(valStart, valEnd);
  result.trim();
  return result;
}

// ─────────────────────────────────────────────────────────────────────────────
// GET Handlers
// ─────────────────────────────────────────────────────────────────────────────

void ApiManager::handleRoot() {
  String json = "{";
  json += "\"name\":\"MedLink IoT Smart Dispenser\",";
  json += "\"firmware\":\"1.0.0\",";
  json += "\"board\":\"ESP8266\",";
  json += "\"api\":\"/api/v1\"";
  json += "}";
  sendJson(200, json);
}

void ApiManager::handleStatus() {
  if (!service_) { sendError(500, "Service unavailable"); return; }
  sendJson(200, service_->buildStatusJson());
}

void ApiManager::handleDashboard() {
  if (!service_) { sendError(500, "Service unavailable"); return; }
  sendJson(200, service_->buildDashboardJson());
}

void ApiManager::handleMedicines() {
  if (!service_) { sendError(500, "Service unavailable"); return; }
  sendJson(200, service_->buildMedicinesJson());
}

void ApiManager::handleLogs() {
  if (!service_) { sendError(500, "Service unavailable"); return; }
  sendJson(200, service_->buildLogsJson());
}

void ApiManager::handleDiagnostics() {
  if (!service_) { sendError(500, "Service unavailable"); return; }
  sendJson(200, service_->buildDiagnosticsJson());
}

// ─────────────────────────────────────────────────────────────────────────────
// Medicine CRUD
// ─────────────────────────────────────────────────────────────────────────────


static int extractJsonInt(const String& body, const String& key) {
  String search = "\"" + key + "\":";
  int start = body.indexOf(search);
  if (start < 0) return 0;
  start += search.length();
  // skip leading spaces
  while (start < (int)body.length() && body[start] == ' ') start++;
  int end = start;
  while (end < (int)body.length() &&
         (isDigit(body[end]) || body[end] == '-')) end++;
  if (end == start) return 0;
  return body.substring(start, end).toInt();
}

static bool extractJsonBool(const String& body, const String& key) {
  String search = "\"" + key + "\":";
  int start = body.indexOf(search);
  if (start < 0) return false;
  start += search.length();
  while (start < (int)body.length() && body[start] == ' ') start++;
  return body.indexOf("true", start) == start;
}

void ApiManager::handlePostMedicine() {
  if (!service_) { sendError(500, "Service unavailable"); return; }

  const String body = server_.arg("plain");
  if (body.length() == 0) { sendError(400, "Empty body"); return; }

  String name          = extractJsonString(body, "name");
  String colorHex      = extractJsonString(body, "colorHex");
  String type          = extractJsonString(body, "type");
  String dosage        = extractJsonString(body, "dosage");
  String repeatPattern = extractJsonString(body, "repeatPattern");
  int    slot          = extractJsonInt(body, "slot");
  int    remaining     = extractJsonInt(body, "pillsRemaining");
  int    maxCap        = extractJsonInt(body, "maxCapacity");
  int    dose          = extractJsonInt(body, "dosePerReminder");
  bool   enabled       = extractJsonBool(body, "isEnabled");

  if (name.length() == 0) { sendError(400, "Missing name field"); return; }
  if (slot < 1 || slot > 3) { sendError(400, "Invalid slot (1-3)"); return; }

  if (colorHex.length()      == 0) colorHex      = "#2563eb";
  if (type.length()          == 0) type          = "Tablet";
  if (repeatPattern.length() == 0) repeatPattern = "Daily";
  if (maxCap  == 0) maxCap  = 30;
  if (dose    == 0) dose    = 1;

  uint8_t newId = service_->addMedicine(
    name, (uint8_t)slot, (uint16_t)remaining, (uint16_t)maxCap,
    (uint8_t)dose, enabled, colorHex, type, dosage, repeatPattern);

  if (newId == 0) {
    sendError(507, "Storage full");
    return;
  }

  String resp = "{\"success\":true,\"id\":" + String(newId) + "}";
  sendJson(201, resp);
}

void ApiManager::handlePutMedicine() {
  if (!service_) { sendError(500, "Service unavailable"); return; }

  uint8_t id = extractIdFromUri();
  if (id == 0) { sendError(400, "Invalid id"); return; }
  if (!service_->medicineExists(id)) { sendError(404, "Medicine not found"); return; }

  const String body = server_.arg("plain");
  if (body.length() == 0) { sendError(400, "Empty body"); return; }

  String name          = extractJsonString(body, "name");
  String colorHex      = extractJsonString(body, "colorHex");
  String type          = extractJsonString(body, "type");
  String dosage        = extractJsonString(body, "dosage");
  String repeatPattern = extractJsonString(body, "repeatPattern");
  int    slot          = extractJsonInt(body, "slot");
  int    remaining     = extractJsonInt(body, "pillsRemaining");
  int    maxCap        = extractJsonInt(body, "maxCapacity");
  int    dose          = extractJsonInt(body, "dosePerReminder");
  bool   enabled       = extractJsonBool(body, "isEnabled");

  if (name.length() == 0) { sendError(400, "Missing name field"); return; }
  if (colorHex.length()      == 0) colorHex      = "#2563eb";
  if (type.length()          == 0) type          = "Tablet";
  if (repeatPattern.length() == 0) repeatPattern = "Daily";
  if (maxCap == 0) maxCap = 30;
  if (dose   == 0) dose   = 1;

  bool ok = service_->updateMedicine(
    id, name, (uint8_t)slot, (uint16_t)remaining, (uint16_t)maxCap,
    (uint8_t)dose, enabled, colorHex, type, dosage, repeatPattern);

  ok ? sendSuccess("Updated") : sendError(404, "Medicine not found");
}

void ApiManager::handleDeleteMedicine() {
  if (!service_) { sendError(500, "Service unavailable"); return; }

  uint8_t id = extractIdFromUri();
  if (id == 0) { sendError(400, "Invalid id"); return; }

  bool ok = service_->deleteMedicine(id);
  ok ? sendSuccess("Deleted") : sendError(404, "Medicine not found");
}

// ─────────────────────────────────────────────────────────────────────────────
// Dispense & Tests
// ─────────────────────────────────────────────────────────────────────────────

void ApiManager::handleDispense() {
  if (!service_) { sendError(500, "Service unavailable"); return; }

  // Extract slot from URI: /api/v1/test/dispenser/{slot}
  const String uri = server_.uri();
  int lastSlash    = uri.lastIndexOf('/');
  uint8_t slot     = (lastSlash >= 0) ? (uint8_t)uri.substring(lastSlash + 1).toInt() : 0;

  if (slot < 1 || slot > 3) {
    sendError(400, "Invalid slot (1-3)");
    return;
  }

  bool ok = service_->triggerDispense(slot);
  if (ok) {
    String msg = "Dispense triggered on Slot #" + String(slot) + ".";
    sendSuccess(msg);
  } else {
    sendError(500, "Dispense failed");
  }
}

void ApiManager::handleTestMotor() {
  if (!service_) { sendError(500, "Service unavailable"); return; }
  service_->testMotor()
    ? sendSuccess("Motor sweep test complete.")
    : sendError(500, "Motor test failed");
}

void ApiManager::handleTestAudio() {
  if (!service_) { sendError(500, "Service unavailable"); return; }
  service_->testAudio()
    ? sendSuccess("Audio chime test executed.")
    : sendError(500, "Audio test failed");
}

void ApiManager::handleTestRtc() {
  if (!service_) { sendError(500, "Service unavailable"); return; }
  service_->testRtc()
    ? sendSuccess("RTC sync verified.")
    : sendError(500, "RTC test failed");
}

void ApiManager::handleTestIr() {
  if (!service_) { sendError(500, "Service unavailable"); return; }
  service_->testIr()
    ? sendSuccess("IR beam calibration successful.")
    : sendError(500, "IR test failed");
}

// ─────────────────────────────────────────────────────────────────────────────
// WiFi & Reboot
// ─────────────────────────────────────────────────────────────────────────────

void ApiManager::handleWifiConnect() {
  const String body = server_.arg("plain");
  String ssid       = extractJsonString(body, "ssid");
  String password   = extractJsonString(body, "password");

  if (ssid.length() == 0) { sendError(400, "Missing ssid field"); return; }

  // 1. Persist credentials immediately
  if (storage_) {
    storage_->saveWiFi(ssid, password);
    Logger::info("WiFi credentials saved to LittleFS");
  }

  // 2. Schedule background connect (returns immediately)
  if (wifi_) {
    wifi_->scheduleConnect(ssid, password);
    Logger::info("WiFi connection scheduled");
  }

  // 3. Respond immediately — never block
  sendJson(200, "{\"success\":true,\"message\":\"Connecting...\",\"ssid\":\"" + ssid + "\"}");
}

void ApiManager::handleDeviceReboot() {
  if (!service_) { sendError(500, "Service unavailable"); return; }
  sendSuccess("Rebooting...");
  service_->reboot();  // Does not return
}
