#include "WiFiManager.h"
#include "StorageManager.h"
#include <ESP8266WiFi.h>
#include <ESP8266mDNS.h>
#include "Logger.h"

static MedLinkWiFiState currentState = WIFI_STATE_BOOT;
static String storedSSID = "";
static String storedPass = "";

static unsigned long connectingStartTime = 0;
static unsigned long reconnectStartTime = 0;
static unsigned long reconnectAttemptStartTime = 0;
static int reconnectAttempts = 0;
static bool reconnectTriggered = false;

static unsigned long lastProgressPrint = 0;

static WiFiEventHandler onStationConnectedHandler;
static WiFiEventHandler onStationDisconnectedHandler;
static WiFiEventHandler onStationGotIPHandler;

const char* decodeWifiStatus(int status) {
    switch (status) {
        case WL_IDLE_STATUS: return "WL_IDLE_STATUS";
        case WL_NO_SSID_AVAIL: return "WL_NO_SSID_AVAIL";
        case WL_SCAN_COMPLETED: return "WL_SCAN_COMPLETED";
        case WL_CONNECTED: return "WL_CONNECTED";
        case WL_CONNECT_FAILED: return "WL_CONNECT_FAILED";
        case WL_CONNECTION_LOST: return "WL_CONNECTION_LOST";
        case WL_DISCONNECTED: return "WL_DISCONNECTED";
        default: return "UNKNOWN";
    }
}

MedLinkWiFiState WiFiManager::getState() {
    return currentState;
}

const char* WiFiManager::getStateString(MedLinkWiFiState state) {
    switch (state) {
        case WIFI_STATE_BOOT: return "BOOT";
        case WIFI_STATE_NO_CREDENTIALS: return "NO_CREDENTIALS";
        case WIFI_STATE_START_AP: return "START_AP";
        case WIFI_STATE_AP_RUNNING: return "AP_RUNNING";
        case WIFI_STATE_CONNECTING: return "CONNECTING";
        case WIFI_STATE_CONNECTED: return "CONNECTED";
        case WIFI_STATE_DISCONNECTED: return "DISCONNECTED";
        case WIFI_STATE_RECONNECTING: return "RECONNECTING";
        case WIFI_STATE_FAILED: return "FAILED";
        default: return "UNKNOWN";
    }
}

void WiFiManager::transitionTo(MedLinkWiFiState newState) {
    uint32_t ts = Logger::getCurrentEpoch();
    Serial.print(F("["));
    Serial.print(ts);
    Serial.print(F("] STATE -> "));

    if (newState == WIFI_STATE_AP_RUNNING) {
        Serial.println(F("AP_MODE"));
    } else if (newState == WIFI_STATE_CONNECTING) {
        Serial.println(F("CONNECTING"));
    } else if (newState == WIFI_STATE_CONNECTED) {
        Serial.println(F("CONNECTED"));
    } else if (newState == WIFI_STATE_FAILED) {
        Serial.println(F("CONNECTION_FAILED"));
    } else {
        Serial.println(getStateString(newState));
    }

    currentState = newState;

    if (newState == WIFI_STATE_DISCONNECTED) {
        Logger::log(LOG_CONNECTION_LOST, "WiFi connection lost");
    }

    // Handle entering specific states
    if (newState == WIFI_STATE_CONNECTING) {
        WiFi.mode(WIFI_STA);
        Serial.println(F("Starting STA mode..."));
        Serial.println(F("Calling WiFi.begin()"));
        Serial.print(F("Target SSID: "));
        Serial.println(storedSSID);

        WiFi.begin(storedSSID.c_str(), storedPass.c_str());

        Serial.println(F("WiFi.begin() called successfully"));
        Serial.print(F("Current Mode: "));
        Serial.println(WiFi.getMode() == WIFI_STA ? "STA" : "OTHER");
        Serial.print(F("AutoReconnect: "));
        Serial.println(WiFi.getAutoReconnect() ? "true" : "false");
        Serial.print(F("Persistent: "));
        Serial.println(WiFi.getPersistent() ? "true" : "false");

        connectingStartTime = millis();
        lastProgressPrint = 0;
    }
    else if (newState == WIFI_STATE_RECONNECTING) {
        reconnectStartTime = millis();
        reconnectAttempts = 0;
        reconnectTriggered = false;
        lastProgressPrint = 0;
    }
    else if (newState == WIFI_STATE_CONNECTED) {
        Serial.println(F("========== CONNECTED =========="));
        Serial.print(F("SSID: "));
        Serial.println(WiFi.SSID());
        Serial.print(F("IP Address: "));
        Serial.println(WiFi.localIP().toString());
        Serial.print(F("Gateway: "));
        Serial.println(WiFi.gatewayIP().toString());
        Serial.print(F("Subnet: "));
        Serial.println(WiFi.subnetMask().toString());
        Serial.print(F("RSSI: "));
        Serial.print(WiFi.RSSI());
        Serial.println(F(" dBm"));
        Serial.println(F("Hostname: medlink"));

        Serial.println(F("Starting mDNS..."));
        if (MDNS.begin("medlink")) {
            Serial.println(F("mDNS started successfully"));
            Serial.println(F("Hostname: medlink.local"));
            MDNS.addService("http", "tcp", 80);
        } else {
            Serial.println(F("ERROR: Failed to start mDNS"));
        }
    }
}

void WiFiManager::begin() {
    onStationConnectedHandler = WiFi.onStationModeConnected([](const WiFiEventStationModeConnected& evt) {
        Serial.print(F("[WiFi Event] Station Connected. SSID: "));
        Serial.println(evt.ssid);
    });
    onStationDisconnectedHandler = WiFi.onStationModeDisconnected([](const WiFiEventStationModeDisconnected& evt) {
        Serial.print(F("[WiFi Event] Disconnected. Reason: "));
        Serial.println((int)evt.reason);
    });
    onStationGotIPHandler = WiFi.onStationModeGotIP([](const WiFiEventStationModeGotIP& evt) {
        Serial.print(F("[WiFi Event] Got IP: "));
        Serial.println(evt.ip.toString());
    });

    transitionTo(WIFI_STATE_BOOT);
}

void WiFiManager::update() {
    if (currentState == WIFI_STATE_CONNECTED) {
        MDNS.update();
    }

    switch (currentState) {
        case WIFI_STATE_BOOT: {
            String ssid, pass;
            if (StorageManager::getWifiCreds(ssid, pass)) {
                storedSSID = ssid;
                storedPass = pass;
                transitionTo(WIFI_STATE_CONNECTING);
            } else {
                transitionTo(WIFI_STATE_NO_CREDENTIALS);
            }
            break;
        }

        case WIFI_STATE_NO_CREDENTIALS: {
            transitionTo(WIFI_STATE_START_AP);
            break;
        }

        case WIFI_STATE_START_AP: {
            WiFi.mode(WIFI_AP);
            
            // Get MAC address and construct SSID MedLink-XXXX
            String mac = WiFi.macAddress();
            String last4 = mac.substring(12);
            last4.replace(":", "");
            last4.toUpperCase();
            String apSSID = "MedLink-" + last4;
            String apPassword = "12345678";

            IPAddress local_IP(192, 168, 4, 1);
            IPAddress gateway(192, 168, 4, 1);
            IPAddress subnet(255, 255, 255, 0);
            
            WiFi.softAPConfig(local_IP, gateway, subnet);
            WiFi.softAP(apSSID.c_str(), apPassword.c_str());

            Serial.print("SoftAP Configured. SSID: ");
            Serial.print(apSSID);
            Serial.print(", Password: ");
            Serial.print(apPassword);
            Serial.println(", IP: 192.168.4.1");

            transitionTo(WIFI_STATE_AP_RUNNING);
            break;
        }

        case WIFI_STATE_AP_RUNNING: {
            break;
        }

        case WIFI_STATE_CONNECTING: {
            if (WiFi.status() == WL_CONNECTED) {
                transitionTo(WIFI_STATE_CONNECTED);
            } else if (millis() - connectingStartTime >= 15005) {
                Serial.println(F("Connection timeout after 15 seconds"));
                
                int st = WiFi.status();
                Serial.println(F("========== CONNECTION FAILED =========="));
                Serial.print(F("Final Status: "));
                Serial.print(st);
                Serial.print(F(" ("));
                Serial.print(decodeWifiStatus(st));
                Serial.println(F(")"));
                Serial.println(F("Reason: Timeout waiting for connection. Incorrect credentials or router range issues."));

                // Get SoftAP name
                String mac = WiFi.macAddress();
                String last4 = mac.substring(12);
                last4.replace(":", "");
                last4.toUpperCase();
                String apSSID = "MedLink-" + last4;

                Serial.println(F("Returning to Access Point mode"));
                Serial.print(F("AP Name: "));
                Serial.println(apSSID);
                Serial.println(F("IP: 192.168.4.1"));

                transitionTo(WIFI_STATE_FAILED);
            } else {
                unsigned long now = millis();
                if (lastProgressPrint == 0 || now - lastProgressPrint >= 1000) {
                    lastProgressPrint = now;
                    int elapsedSec = (now - connectingStartTime) / 1000;
                    int st = WiFi.status();
                    Serial.println(F("Waiting for Wi-Fi..."));
                    Serial.print(F("Status = "));
                    Serial.print(st);
                    Serial.print(F(" ("));
                    Serial.print(decodeWifiStatus(st));
                    Serial.println(F(")"));
                    Serial.print(F("Elapsed = "));
                    Serial.print(elapsedSec);
                    Serial.println(F("s"));
                }
            }
            break;
        }

        case WIFI_STATE_CONNECTED: {
            if (WiFi.status() != WL_CONNECTED) {
                transitionTo(WIFI_STATE_DISCONNECTED);
            }
            break;
        }

        case WIFI_STATE_DISCONNECTED: {
            transitionTo(WIFI_STATE_RECONNECTING);
            break;
        }

        case WIFI_STATE_RECONNECTING: {
            if (!reconnectTriggered) {
                if (millis() - reconnectStartTime >= 5000) {
                    reconnectTriggered = true;
                    reconnectAttempts++;
                    
                    Serial.println(F("Starting STA mode..."));
                    Serial.println(F("Calling WiFi.begin()"));
                    Serial.print(F("Target SSID: "));
                    Serial.println(storedSSID);
                    
                    WiFi.begin(storedSSID.c_str(), storedPass.c_str());

                    Serial.println(F("WiFi.begin() called successfully"));
                    Serial.print(F("Current Mode: "));
                    Serial.println(WiFi.getMode() == WIFI_STA ? "STA" : "OTHER");
                    Serial.print(F("AutoReconnect: "));
                    Serial.println(WiFi.getAutoReconnect() ? "true" : "false");
                    Serial.print(F("Persistent: "));
                    Serial.println(WiFi.getPersistent() ? "true" : "false");

                    reconnectAttemptStartTime = millis();
                    lastProgressPrint = 0;
                }
            } else {
                if (WiFi.status() == WL_CONNECTED) {
                    transitionTo(WIFI_STATE_CONNECTED);
                } else if (millis() - reconnectAttemptStartTime >= 10000) {
                    // Reconnect attempt timed out
                    Serial.println(F("Reconnection attempt timed out."));
                    reconnectTriggered = false;
                    reconnectStartTime = millis();
                    
                    if (reconnectAttempts >= 5) {
                        Serial.println(F("Reconnection failed 5 times."));
                        
                        int st = WiFi.status();
                        Serial.println(F("========== CONNECTION FAILED =========="));
                        Serial.print(F("Final Status: "));
                        Serial.print(st);
                        Serial.print(F(" ("));
                        Serial.print(decodeWifiStatus(st));
                        Serial.println(F(")"));
                        Serial.println(F("Reason: Retry attempts exhausted. Router down or credentials outdated."));

                        String mac = WiFi.macAddress();
                        String last4 = mac.substring(12);
                        last4.replace(":", "");
                        last4.toUpperCase();
                        String apSSID = "MedLink-" + last4;

                        Serial.println(F("Returning to Access Point mode"));
                        Serial.print(F("AP Name: "));
                        Serial.println(apSSID);
                        Serial.println(F("IP: 192.168.4.1"));

                        transitionTo(WIFI_STATE_START_AP);
                    }
                } else {
                    unsigned long now = millis();
                    if (lastProgressPrint == 0 || now - lastProgressPrint >= 1000) {
                        lastProgressPrint = now;
                        int elapsedSec = (now - reconnectAttemptStartTime) / 1000;
                        int st = WiFi.status();
                        Serial.println(F("Waiting for Wi-Fi..."));
                        Serial.print(F("Status = "));
                        Serial.print(st);
                        Serial.print(F(" ("));
                        Serial.print(decodeWifiStatus(st));
                        Serial.println(F(")"));
                        Serial.print(F("Elapsed = "));
                        Serial.print(elapsedSec);
                        Serial.println(F("s"));
                    }
                }
            }
            break;
        }

        case WIFI_STATE_FAILED: {
            transitionTo(WIFI_STATE_START_AP);
            break;
        }
    }
}

void WiFiManager::setNewCredentials(const String& ssid, const String& pass) {
    storedSSID = ssid;
    storedPass = pass;
    StorageManager::setWifiCreds(ssid, pass);
    transitionTo(WIFI_STATE_CONNECTING);
}

void WiFiManager::forceStartAP() {
    transitionTo(WIFI_STATE_START_AP);
}

void WiFiManager::forgetCredentials() {
    storedSSID = "";
    storedPass = "";
    StorageManager::clearWifiCreds();
    forceStartAP();
}
