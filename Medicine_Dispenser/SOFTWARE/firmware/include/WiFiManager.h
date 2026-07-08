#pragma once

/**
 * WiFiManager - ESP8266 Only
 *
 * Asynchronous, state-machine-driven WiFi manager.
 * Never blocks setup() or loop(). All networking logic runs via update().
 *
 * Boot path (no credentials):
 *   BOOT -> NO_CREDENTIALS -> START_AP -> AP_RUNNING
 *
 * Boot path (credentials exist):
 *   BOOT -> CONNECTING -> CONNECTED
 *   (on timeout or drop): FAILED/DISCONNECTED -> RECONNECTING -> ...
 *   (if max retries exceeded): -> START_AP -> AP_RUNNING
 */

#include <Arduino.h>
#include <ESP8266WiFi.h>

enum class WiFiManagerState {
  BOOT,
  NO_CREDENTIALS,
  START_AP,
  AP_RUNNING,
  CONNECTING,
  CONNECTED,
  DISCONNECTED,
  RECONNECTING,
  FAILED
};

class WiFiManager {
 public:
  // Call once in setup() — never blocks.
  void begin();

  // Call every loop() — drives the state machine.
  void update();

  // Schedule a background connection attempt (returns immediately).
  // State transitions to CONNECTING on next update().
  void scheduleConnect(const String& ssid, const String& password);

  // Query current state.
  WiFiManagerState getState() const { return state_; }
  bool isConnected()          const { return state_ == WiFiManagerState::CONNECTED; }
  bool isApRunning()          const { return state_ == WiFiManagerState::AP_RUNNING; }

  // Returns the current IP (AP or STA).
  String getIPString() const;

  // Returns SSID of STA or AP depending on current mode.
  String getActiveSSID() const;

  // Provide credentials before calling begin() if already loaded.
  void setCredentials(const String& ssid, const String& password);
  bool hasCredentials() const { return credentialsReady_; }

  // Signal from ApiManager that credentials were saved — trigger connection.
  void triggerConnect();

 private:
  // Transition helpers — each returns immediately.
  void enterState(WiFiManagerState next);
  void doStartAP();
  void doBeginConnect();

  // Max reconnect attempts before falling back to AP mode.
  static constexpr uint8_t  MAX_RECONNECT_ATTEMPTS = 5;
  // Connection timeout in milliseconds.
  static constexpr uint32_t CONNECT_TIMEOUT_MS     = 15000UL;
  // Delay between reconnect attempts.
  static constexpr uint32_t RECONNECT_INTERVAL_MS  = 5000UL;

  WiFiManagerState state_            = WiFiManagerState::BOOT;
  String           ssid_             = "";
  String           password_         = "";
  bool             credentialsReady_ = false;
  bool             connectScheduled_ = false;
  uint8_t          reconnectCount_   = 0;
  uint32_t         stateEnteredMs_   = 0;

  // AP SSID derived once from Chip ID.
  char apSSID_[24] = {};
};
