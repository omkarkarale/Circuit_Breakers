#pragma once

#include <Arduino.h>
#include <ESP8266WiFi.h>

enum class WiFiManagerState {
  BOOT,
  NO_CREDENTIALS,
  AP_MODE,
  WAIT_FOR_SETUP,
  CONNECTING,
  CONNECTED,
  DISCONNECTED,
  FAILED
};

class WiFiManager {
 public:
  void begin();
  void update();
  bool connect(const char* ssid, const char* password);
  void disconnect();
  bool isConnected() const;
  IPAddress getIPAddress() const;
  const char* getSSID() const;
  WiFiManagerState getState() const;
  void startAP();
  void setNoCredentials();

 private:
  static constexpr size_t MAX_SSID_LENGTH = 32;
  static constexpr size_t MAX_PASSWORD_LENGTH = 64;

  void copyCredentials(const char* ssid, const char* password);

  char ssid_[MAX_SSID_LENGTH + 1] = {};
  char password_[MAX_PASSWORD_LENGTH + 1] = {};
  bool credentialsSupplied_ = false;
  WiFiManagerState state_ = WiFiManagerState::BOOT;
  unsigned long connectionStartedMs_ = 0;
};
