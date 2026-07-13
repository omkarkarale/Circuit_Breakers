#include "StorageManager.h"
#include "TimeSource.h"
#include <LittleFS.h>

JsonDocument StorageManager::readJson(const char* path) {
    JsonDocument doc;
    if (!LittleFS.exists(path)) return doc;

    File f = LittleFS.open(path, "r");
    if (!f) return doc;

    DeserializationError err = deserializeJson(doc, f);
    f.close();

    if (err) {
        Serial.print(F("[SM] JSON parse error in "));
        Serial.print(path);
        Serial.print(F(": "));
        Serial.println(err.c_str());
        doc.clear();
    }
    return doc;
}

bool StorageManager::writeJson(const char* path, JsonDocument& doc) {
    String tmpPath = String(path) + ".tmp";

    File f = LittleFS.open(tmpPath.c_str(), "w");
    if (!f) {
        Serial.print(F("[SM] Cannot open tmp file: "));
        Serial.println(tmpPath);
        return false;
    }
    serializeJson(doc, f);
    f.close();

    // Atomic rename
    if (LittleFS.exists(path)) {
        LittleFS.remove(path);
    }
    if (!LittleFS.rename(tmpPath.c_str(), path)) {
        Serial.print(F("[SM] Rename failed: "));
        Serial.println(path);
        return false;
    }
    return true;
}

void StorageManager::buildDefaultMedicines(JsonDocument& doc) {
    doc.clear();
    JsonArray arr = doc.to<JsonArray>();
    for (int i = 1; i <= 3; i++) {
        JsonObject slot = arr.add<JsonObject>();
        slot["slot"]              = i;
        slot["assigned"]          = false;
        slot["name"]              = "";
        slot["type"]              = "";
        slot["remainingPills"]    = 0;
        slot["dosePerReminder"]   = 1;
        slot["notes"]             = "";
        slot["repeatFrequency"]   = "daily";
        JsonArray times = slot["times"].to<JsonArray>();
        times.add("08:00");
        slot["lowStockThreshold"] = 5;
    }
}

void StorageManager::ensureWifi() {
    JsonDocument existing = readJson(SM_FILE_WIFI);
    if (!existing.isNull() && !existing["ssid"].isNull()) return;

    JsonDocument doc;
    doc["ssid"]     = "";
    doc["password"] = "";
    writeJson(SM_FILE_WIFI, doc);
}

void StorageManager::ensureMedicines() {
    JsonDocument existing = readJson(SM_FILE_MEDICINES);
    if (!existing.isNull() && existing.is<JsonArray>()
            && existing.as<JsonArray>().size() == 3) return;

    JsonDocument doc;
    buildDefaultMedicines(doc);
    writeJson(SM_FILE_MEDICINES, doc);
}

void StorageManager::ensureLogs() {
    JsonDocument existing = readJson(SM_FILE_LOGS);
    if (!existing.isNull() && existing.is<JsonArray>()) return;

    JsonDocument doc;
    doc.to<JsonArray>();
    writeJson(SM_FILE_LOGS, doc);
}

void StorageManager::ensureSettings() {
    JsonDocument existing = readJson(SM_FILE_SETTINGS);
    if (!existing.isNull() && !existing["notifications"].isNull()) return;

    JsonDocument doc;
    JsonObject notif = doc["notifications"].to<JsonObject>();
    notif["medicineReminder"]   = true;
    notif["missedDoseAlert"]    = true;
    notif["lowMedicineAlert"]   = true;
    notif["deviceOfflineAlert"] = true;

    JsonObject access = doc["accessibility"].to<JsonObject>();
    access["textSize"]    = "normal";
    access["soundVolume"] = 80;

    writeJson(SM_FILE_SETTINGS, doc);
}

void StorageManager::ensureConfig() {
    JsonDocument existing = readJson(SM_FILE_CONFIG);
    if (!existing.isNull() && !existing["deviceId"].isNull()) return;

    char devId[20];
    snprintf(devId, sizeof(devId), "medlink-%06X", ESP.getChipId());

    JsonDocument doc;
    doc["deviceId"]        = devId;
    doc["firmwareVersion"] = "2.0.0";
    writeJson(SM_FILE_CONFIG, doc);
}

bool StorageManager::begin() {
    if (!LittleFS.begin()) {
        Serial.println(F("[SM] LittleFS mount failed. Formatting..."));
        LittleFS.format();
        if (!LittleFS.begin()) {
            Serial.println(F("[SM] LittleFS mount still failed!"));
            return false;
        }
    }
    Serial.println(F("[SM] LittleFS mounted."));

    ensureWifi();
    ensureMedicines();
    ensureLogs();
    ensureSettings();
    ensureConfig();

    return true;
}

bool StorageManager::getWifiCreds(String& ssid, String& pass) {
    JsonDocument doc = readJson(SM_FILE_WIFI);
    if (doc.isNull()) {
        ssid = "";
        pass = "";
        return false;
    }

    ssid = doc["ssid"].as<String>();
    pass = doc["password"].as<String>();
    return ssid.length() > 0;
}

void StorageManager::setWifiCreds(const String& ssid, const String& pass) {
    JsonDocument doc;
    doc["ssid"]     = ssid;
    doc["password"] = pass;
    writeJson(SM_FILE_WIFI, doc);
}

void StorageManager::clearWifiCreds() {
    JsonDocument doc;
    doc["ssid"]     = "";
    doc["password"] = "";
    writeJson(SM_FILE_WIFI, doc);
}

JsonDocument StorageManager::getMedicines() {
    JsonDocument doc = readJson(SM_FILE_MEDICINES);
    if (!doc.isNull() && doc.is<JsonArray>()
            && doc.as<JsonArray>().size() == 3) {
        return doc;
    }

    buildDefaultMedicines(doc);
    writeJson(SM_FILE_MEDICINES, doc);
    return doc;
}

void StorageManager::setMedicines(JsonDocument& doc) {
    if (doc.is<JsonArray>()) {
        JsonArray arr = doc.as<JsonArray>();
        // Trim elements beyond 3
        while (arr.size() > 3) {
            arr.remove(arr.size() - 1);
        }

        // Pad if less than 3
        for (int i = (int)arr.size() + 1; i <= 3; i++) {
            JsonObject slot = arr.add<JsonObject>();
            slot["slot"]              = i;
            slot["assigned"]          = false;
            slot["name"]              = "";
            slot["type"]              = "";
            slot["remainingPills"]    = 0;
            slot["dosePerReminder"]   = 1;
            slot["notes"]             = "";
            slot["repeatFrequency"]   = "daily";
            JsonArray times = slot["times"].to<JsonArray>();
            times.add("08:00");
            slot["lowStockThreshold"] = 5;
        }
    }
    writeJson(SM_FILE_MEDICINES, doc);
}

JsonDocument StorageManager::getLogs() {
    JsonDocument doc = readJson(SM_FILE_LOGS);
    if (doc.isNull() || !doc.is<JsonArray>()) {
        doc.to<JsonArray>();
    }
    return doc;
}

void StorageManager::appendLog(const String& type, const String& detail) {
    JsonDocument doc = getLogs();
    JsonArray arr = doc.as<JsonArray>();

    // If size reaches 200, clear logs
    if (arr.size() >= 200) {
        arr.clear();
        JsonObject systemEntry = arr.add<JsonObject>();
        systemEntry["ts"]     = TimeSource::getEpoch();
        systemEntry["type"]   = "connection";
        systemEntry["detail"] = "Logs auto-cleared (reached limit of 200 entries)";
    }

    JsonObject entry = arr.add<JsonObject>();
    entry["ts"]     = TimeSource::getEpoch();
    entry["type"]   = type;
    entry["detail"] = detail;

    writeJson(SM_FILE_LOGS, doc);
}

void StorageManager::clearLogs() {
    JsonDocument doc;
    doc.to<JsonArray>();
    writeJson(SM_FILE_LOGS, doc);
}

JsonDocument StorageManager::getSettings() {
    JsonDocument doc = readJson(SM_FILE_SETTINGS);
    if (doc.isNull() || doc["notifications"].isNull()) {
        ensureSettings();
        doc = readJson(SM_FILE_SETTINGS);
    }
    return doc;
}

void StorageManager::setSettings(JsonDocument& doc) {
    writeJson(SM_FILE_SETTINGS, doc);
}

JsonDocument StorageManager::getConfig() {
    JsonDocument doc = readJson(SM_FILE_CONFIG);
    if (doc.isNull() || doc["deviceId"].isNull()) {
        ensureConfig();
        doc = readJson(SM_FILE_CONFIG);
    }
    return doc;
}

void StorageManager::setConfig(JsonDocument& doc) {
    writeJson(SM_FILE_CONFIG, doc);
}
