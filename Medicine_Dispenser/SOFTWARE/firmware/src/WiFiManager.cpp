#include "WiFiManager.h"

#include <cstring>
#include <cstdio>

#include "Config.h"
#include "Logger.h"

void WiFiManager::begin() {
  state_ = WiFiManagerState::BOOT;
  credentialsSupplied_ = false;
}

void WiFiManager::setNoCredentials() {
  state_ = WiFiManagerState::NO_CREDENTIALS;
}

void WiFiManager::update() {
  if (state_ == WiFiManagerState::NO_CREDENTIALS) {
    state_ = WiFiManagerState::AP_MODE;
    return;
  }

  if (state_ == WiFiManagerState::AP_MODE) {
    Logger::info("Starting Access Point...");
    WiFi.mode(WIFI_AP);
    delay(10);
    WiFi.softAP("MedLink-Setup", "12345678");
    delay(10);

    String ipStr = WiFi.softAPIP().toString();
    char logBuf[192];
    snprintf(logBuf, sizeof(logBuf), 
             "Access Point Started\nSSID: MedLink-Setup\nPassword: 12345678\nIP Address: %s", 
             ipStr.c_str());
    Logger::info(logBuf);

    state_ = WiFiManagerState::WAIT_FOR_SETUP;
    return;
  }

  if (state_ == WiFiManagerState::CONNECTING) {
    if (WiFi.status() == WL_CONNECTED) {
      state_ = WiFiManagerState::CONNECTED;
      Logger::info("WiFi Connected");
      return;
    }

    const unsigned long currentMs = millis();
    if (currentMs - connectionStartedMs_ >= Config::WIFI_CONNECT_TIMEOUT_MS) {
      WiFi.disconnect(false);
      Logger::warn("WiFi Connection Failed - Transitioning to AP mode");
      state_ = WiFiManagerState::NO_CREDENTIALS;
    }
    return;
  }

  if (state_ == WiFiManagerState::CONNECTED && WiFi.status() != WL_CONNECTED) {
    state_ = WiFiManagerState::DISCONNECTED;
    Logger::warn("WiFi Disconnected - Reconnecting");
    state_ = WiFiManagerState::CONNECTING;
    connectionStartedMs_ = millis();
    WiFi.begin(ssid_, password_);
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
  
  char logBuf[128];
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
         (state_ == WiFiManagerState::AP_MODE) ||
         (state_ == WiFiManagerState::WAIT_FOR_SETUP);
}

IPAddress WiFiManager::getIPAddress() const {
  if (state_ == WiFiManagerState::AP_MODE || state_ == WiFiManagerState::WAIT_FOR_SETUP) {
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
  state_ = WiFiManagerState::NO_CREDENTIALS;
}

void WiFiManager::copyCredentials(const char* ssid, const char* password) {
  std::strncpy(ssid_, ssid, MAX_SSID_LENGTH);
  ssid_[MAX_SSID_LENGTH] = '\0';

  std::strncpy(password_, password, MAX_PASSWORD_LENGTH);
  password_[MAX_PASSWORD_LENGTH] = '\0';
}
