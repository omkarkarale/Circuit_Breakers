#ifndef STORAGE_MANAGER_H
#define STORAGE_MANAGER_H

#include <Arduino.h>
#include <ArduinoJson.h>

// File paths
#define SM_FILE_WIFI "/wifi.json"
#define SM_FILE_MEDICINES "/medicines.json"
#define SM_FILE_LOGS "/logs.json"
#define SM_FILE_SETTINGS "/settings.json"
#define SM_FILE_CONFIG "/config.json"

class StorageManager {
public:
    static bool begin();

    // WiFi
    static bool getWifiCreds(String& ssid, String& pass);
    static void setWifiCreds(const String& ssid, const String& pass);
    static void clearWifiCreds();

    // Medicines
    static JsonDocument getMedicines();
    static void setMedicines(JsonDocument& doc);

    // Logs
    static JsonDocument getLogs();
    static bool getLogs(JsonVariant target);
    static void appendLog(const String& type, const String& detail);
    static void clearLogs();

    // Settings
    static JsonDocument getSettings();
    static void setSettings(JsonDocument& doc);

    // Config
    static JsonDocument getConfig();
    static void setConfig(JsonDocument& doc);

private:
    static JsonDocument readJson(const char* path);
    static bool readJson(const char* path, JsonVariant target);
    static bool writeJson(const char* path, JsonDocument& doc);
    
    static void ensureWifi();
    static void ensureMedicines();
    static void ensureLogs();
    static void ensureSettings();
    static void ensureConfig();

    static void buildDefaultMedicines(JsonDocument& doc);
};

#endif // STORAGE_MANAGER_H
