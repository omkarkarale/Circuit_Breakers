#include "WiFiManager.h"

#include <cstring>
#include <cstdio>

#include "Config.h"
#include "Logger.h"

void WiFiManager::begin() {
  state_ = WiFiManagerState::DISCONNECTED;
}

void WiFiManager::update() {
  if (state_ == WiFiManagerState::CONNECTING) {
    if (WiFi.status() == WL_CONNECTED) {
      state_ = WiFiManagerState::CONNECTED;
      Logger::info("WiFi Connected");
      return;
    }

    const unsigned long currentMs = millis();
    if (currentMs - connectionStartedMs_ >= Config::WIFI_CONNECT_TIMEOUT_MS) {
      WiFi.disconnect(false);
      Logger::warn("WiFi Connection Failed - Starting SoftAP");
      startAP();
    }
    return;
  }

  if (state_ == WiFiManagerState::CONNECTED && WiFi.status() != WL_CONNECTED) {
    state_ = WiFiManagerState::DISCONNECTED;
    Logger::warn("WiFi Disconnected");
  }
}

bool WiFiManager::connect(const char* ssid, const char* password) {
  if (ssid == nullptr || ssid[0] == '\0' || password == nullptr) {
    state_ = WiFiManagerState::FAILED;
    Logger::warn("WiFi Credentials Missing");
    return false;
  }

  copyCredentials(ssid, password);
  credentialsSupplied_ = true;
  connectionStartedMs_ = millis();
  state_ = WiFiManagerState::CONNECTING;

  WiFi.mode(WIFI_AP_STA);
  WiFi.begin(ssid_, password_);
  
  char logBuf[64];
  snprintf(logBuf, sizeof(logBuf), "Connecting to SSID: %s", ssid_);
  Logger::info(logBuf);
  
  return true;
}

void WiFiManager::disconnect() {
  WiFi.disconnect(true);
  state_ = WiFiManagerState::DISCONNECTED;
  Logger::info("WiFi Disconnected");
}

bool WiFiManager::isConnected() const {
  return (state_ == WiFiManagerState::CONNECTED && WiFi.status() == WL_CONNECTED) ||
         (state_ == WiFiManagerState::AP_MODE); // HTTP endpoints are active in AP mode too
}

IPAddress WiFiManager::getIPAddress() const {
  if (state_ == WiFiManagerState::AP_MODE) {
    return WiFi.softAPIP();
  }
  if (WiFi.status() != WL_CONNECTED) {
    return IPAddress();
  }
  return WiFi.localIP();
}

const char* WiFiManager::getSSID() const {
  return ssid_;
}

WiFiManagerState WiFiManager::getState() const {
  return state_;
}

void WiFiManager::startAP() {
  state_ = WiFiManagerState::AP_MODE;

  char apSSID[32];
  snprintf(apSSID, sizeof(apSSID), "MedLink-%04X", (uint16_t)(ESP.getChipId() & 0xFFFF));

  WiFi.mode(WIFI_AP);
  WiFi.softAP(apSSID, "12345678");

  char logBuf[128];
  snprintf(logBuf, sizeof(logBuf), "SoftAP Active: SSID=%s IP=%s", apSSID, WiFi.softAPIP().toString().c_str());
  Logger::info(logBuf);
}

void WiFiManager::copyCredentials(const char* ssid, const char* password) {
  std::strncpy(ssid_, ssid, MAX_SSID_LENGTH);
  ssid_[MAX_SSID_LENGTH] = '\0';

  std::strncpy(password_, password, MAX_PASSWORD_LENGTH);
  password_[MAX_PASSWORD_LENGTH] = '\0';
}
