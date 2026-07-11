#ifndef WIFI_MANAGER_H
#define WIFI_MANAGER_H

#include <Arduino.h>

enum MedLinkWiFiState {
    WIFI_STATE_BOOT,
    WIFI_STATE_NO_CREDENTIALS,
    WIFI_STATE_START_AP,
    WIFI_STATE_AP_RUNNING,
    WIFI_STATE_CONNECTING,
    WIFI_STATE_CONNECTED,
    WIFI_STATE_DISCONNECTED,
    WIFI_STATE_RECONNECTING,
    WIFI_STATE_FAILED
};

class WiFiManager {
public:
    static void begin();
    static void update();
    static MedLinkWiFiState getState();
    static const char* getStateString(MedLinkWiFiState state);
    static void setNewCredentials(const String& ssid, const String& pass);
    static void forceStartAP();
    static void forgetCredentials();

private:
    static void transitionTo(MedLinkWiFiState newState);
};

#endif // WIFI_MANAGER_H
