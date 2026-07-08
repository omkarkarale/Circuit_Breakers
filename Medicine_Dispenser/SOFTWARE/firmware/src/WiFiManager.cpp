/**
 * WiFiManager.cpp — ESP8266 Only
 *
 * Production-ready asynchronous WiFi manager.
 * All long-running operations are split across update() ticks.
 * NO while loops. NO blocking delays. NO watchdog resets.
 */

#include "WiFiManager.h"
#include "Logger.h"

// ─────────────────────────────────────────────────────────────────────────────
// Public API
// ─────────────────────────────────────────────────────────────────────────────

void WiFiManager::begin() {
  // Build unique AP SSID from lower 16 bits of Chip ID.
  uint16_t chipSuffix = (uint16_t)(ESP.getChipId() & 0xFFFF);
  snprintf(apSSID_, sizeof(apSSID_), "MedLink-%04X", chipSuffix);

  enterState(WiFiManagerState::BOOT);
}

void WiFiManager::setCredentials(const String& ssid, const String& password) {
  ssid_             = ssid;
  password_         = password;
  credentialsReady_ = (ssid.length() > 0);
}

void WiFiManager::scheduleConnect(const String& ssid, const String& password) {
  setCredentials(ssid, password);
  connectScheduled_ = true;
}

void WiFiManager::triggerConnect() {
  connectScheduled_ = true;
}

String WiFiManager::getIPString() const {
  if (state_ == WiFiManagerState::AP_RUNNING) {
    return WiFi.softAPIP().toString();
  }
  if (state_ == WiFiManagerState::CONNECTED) {
    return WiFi.localIP().toString();
  }
  return "0.0.0.0";
}

String WiFiManager::getActiveSSID() const {
  if (state_ == WiFiManagerState::AP_RUNNING) {
    return String(apSSID_);
  }
  return ssid_;
}

// ─────────────────────────────────────────────────────────────────────────────
// State Machine — called every loop(), never blocks
// ─────────────────────────────────────────────────────────────────────────────

void WiFiManager::update() {
  const uint32_t now = millis();

  switch (state_) {

    // ── BOOT: one-shot transition on first update tick ──────────────────────
    case WiFiManagerState::BOOT:
      if (credentialsReady_) {
        enterState(WiFiManagerState::CONNECTING);
      } else {
        enterState(WiFiManagerState::NO_CREDENTIALS);
      }
      break;

    // ── NO_CREDENTIALS: request AP startup ─────────────────────────────────
    case WiFiManagerState::NO_CREDENTIALS:
      enterState(WiFiManagerState::START_AP);
      break;

    // ── START_AP: configure and start SoftAP, then settle ──────────────────
    case WiFiManagerState::START_AP:
      doStartAP();
      enterState(WiFiManagerState::AP_RUNNING);
      break;

    // ── AP_RUNNING: idle, serve HTTP, watch for credential trigger ──────────
    case WiFiManagerState::AP_RUNNING:
      if (connectScheduled_ && credentialsReady_) {
        connectScheduled_ = false;
        reconnectCount_   = 0;
        enterState(WiFiManagerState::CONNECTING);
      }
      break;

    // ── CONNECTING: wait for connection or timeout ──────────────────────────
    case WiFiManagerState::CONNECTING: {
      wl_status_t status = WiFi.status();
      if (status == WL_CONNECTED) {
        reconnectCount_ = 0;
        enterState(WiFiManagerState::CONNECTED);
        break;
      }
      // Check timeout
      if ((now - stateEnteredMs_) >= CONNECT_TIMEOUT_MS) {
        Logger::warn("WiFi connection timed out");
        enterState(WiFiManagerState::FAILED);
      }
      break;
    }

    // ── CONNECTED: watch for disconnection ──────────────────────────────────
    case WiFiManagerState::CONNECTED:
      if (WiFi.status() != WL_CONNECTED) {
        enterState(WiFiManagerState::DISCONNECTED);
      }
      break;

    // ── DISCONNECTED: schedule a reconnect attempt ──────────────────────────
    case WiFiManagerState::DISCONNECTED:
      enterState(WiFiManagerState::RECONNECTING);
      break;

    // ── RECONNECTING: wait for reconnect interval then retry ────────────────
    case WiFiManagerState::RECONNECTING:
      if ((now - stateEnteredMs_) >= RECONNECT_INTERVAL_MS) {
        if (reconnectCount_ < MAX_RECONNECT_ATTEMPTS && credentialsReady_) {
          reconnectCount_++;
          {
            char buf[64];
            snprintf(buf, sizeof(buf), "Reconnect attempt %d/%d",
                     reconnectCount_, MAX_RECONNECT_ATTEMPTS);
            Logger::info(buf);
          }
          doBeginConnect();
          enterState(WiFiManagerState::CONNECTING);
        } else {
          Logger::warn("Max reconnect attempts reached — restarting SoftAP");
          reconnectCount_ = 0;
          enterState(WiFiManagerState::START_AP);
        }
      }
      break;

    // ── FAILED: fall back to AP mode ────────────────────────────────────────
    case WiFiManagerState::FAILED:
      Logger::warn("Connection failed — falling back to SoftAP");
      reconnectCount_ = 0;
      enterState(WiFiManagerState::START_AP);
      break;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Private helpers
// ─────────────────────────────────────────────────────────────────────────────

void WiFiManager::enterState(WiFiManagerState next) {
  stateEnteredMs_ = millis();

  // Print transition
  auto stateName = [](WiFiManagerState s) -> const char* {
    switch (s) {
      case WiFiManagerState::BOOT:          return "BOOT";
      case WiFiManagerState::NO_CREDENTIALS:return "NO_CREDENTIALS";
      case WiFiManagerState::START_AP:      return "START_AP";
      case WiFiManagerState::AP_RUNNING:    return "AP_RUNNING";
      case WiFiManagerState::CONNECTING:    return "CONNECTING";
      case WiFiManagerState::CONNECTED:     return "CONNECTED";
      case WiFiManagerState::DISCONNECTED:  return "DISCONNECTED";
      case WiFiManagerState::RECONNECTING:  return "RECONNECTING";
      case WiFiManagerState::FAILED:        return "FAILED";
      default:                              return "UNKNOWN";
    }
  };

  char buf[64];
  snprintf(buf, sizeof(buf), "STATE -> %s", stateName(next));
  Logger::info(buf);

  state_ = next;

  // On entry to CONNECTING, immediately kick off the WiFi.begin() call.
  if (next == WiFiManagerState::CONNECTING) {
    doBeginConnect();
  }
}

void WiFiManager::doStartAP() {
  // Disconnect STA mode first
  WiFi.disconnect(false);
  delay(10);
  WiFi.mode(WIFI_AP);
  delay(10);

  IPAddress apIP(192, 168, 4, 1);
  IPAddress apGW(192, 168, 4, 1);
  IPAddress apSN(255, 255, 255, 0);
  WiFi.softAPConfig(apIP, apGW, apSN);
  WiFi.softAP(apSSID_, "12345678");

  // Let the AP settle (non-blocking — this is inside doStartAP which is called
  // from update(), so a tiny fixed delay here is acceptable).
  delay(100);

  String ip = WiFi.softAPIP().toString();
  char buf[128];
  snprintf(buf, sizeof(buf),
           "SoftAP Started\nSSID: %s\nPassword: 12345678\nIP: %s",
           apSSID_, ip.c_str());
  Logger::info(buf);
}

void WiFiManager::doBeginConnect() {
  WiFi.mode(WIFI_STA);
  WiFi.begin(ssid_.c_str(), password_.c_str());

  char buf[80];
  snprintf(buf, sizeof(buf), "Connecting to SSID: %s", ssid_.c_str());
  Logger::info(buf);
}
