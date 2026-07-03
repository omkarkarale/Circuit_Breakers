#include "ApiManager.h"

#include <WiFi.h>

#include "Logger.h"

void ApiManager::begin() {
  configureRoutes();
  Logger::info("API Manager Ready");
  start();
}

void ApiManager::update() {
  if (!running_) {
    return;
  }

  server_.handleClient();
}

void ApiManager::start() {
  if (running_) {
    return;
  }

  configureRoutes();
  server_.begin();
  running_ = true;
  Logger::info("Server Started");
}

void ApiManager::stop() {
  if (!running_) {
    return;
  }

  server_.stop();
  running_ = false;
  Logger::info("Server Stopped");
}

bool ApiManager::isRunning() const {
  return running_;
}

void ApiManager::configureRoutes() {
  if (routesConfigured_) {
    return;
  }

  server_.on("/", HTTP_GET, [this]() { handleRoot(); });
  server_.on("/status", HTTP_GET, [this]() { handleStatus(); });
  server_.on("/health", HTTP_GET, [this]() { handleHealth(); });
  server_.on("/diagnostics", HTTP_GET, [this]() { handleDiagnostics(); });
  server_.on("/medicines", HTTP_GET, [this]() { handleMedicines(); });
  routesConfigured_ = true;
}

void ApiManager::sendJson(const String& body) {
  server_.send(200, "application/json", body);
}

void ApiManager::handleRoot() {
  String response = "{";
  response += "\"name\":\"Medicine Dispenser\",";
  response += "\"version\":\"0.5.0\"";
  response += "}";
  sendJson(response);
}

void ApiManager::handleStatus() {
  const bool wifiConnected = WiFi.status() == WL_CONNECTED;

  String response = "{";
  response += "\"status\":\"ready\",";
  response += "\"wifi\":\"";
  response += wifiConnected ? "connected" : "disconnected";
  response += "\"";
  response += "}";
  sendJson(response);
}

void ApiManager::handleHealth() {
  sendJson("{\"healthy\":true}");
}

void ApiManager::handleDiagnostics() {
  sendJson("{\"diagnostics\":\"not implemented\"}");
}

void ApiManager::handleMedicines() {
  sendJson("[]");
}
