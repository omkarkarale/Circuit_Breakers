#include "ApiManager.h"
#include "SerialBridge.h"
#include "StorageManager.h"
#include "WiFiManager.h"
#include "TimeSource.h"
#include "Scheduler.h"
#include <ESP8266WiFi.h>
#include <LittleFS.h>
#include <sys/time.h>
#include <time.h>

ESP8266WebServer ApiManager::_server(80);
DNSServer        ApiManager::_dns;
bool             ApiManager::_dnsActive = false;

static unsigned long lastMegaTimeSync = 0;
static bool megaTimeSynced = false;

ApiManager::DiagResult ApiManager::_diag[10];
const char* ApiManager::_diagKeys[10] = {
    "wifi", "storage", "memory", "firmware",
    "rtc", "stepper1", "stepper2", "stepper3", "ir", "speaker"
};

void ApiManager::_addCors() {
    _server.sendHeader("Access-Control-Allow-Origin",  "*");
    _server.sendHeader("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS");
    _server.sendHeader("Access-Control-Allow-Headers", "Content-Type");
}

void ApiManager::_sendJson(int code, JsonDocument& doc) {
    _addCors();
    String body;
    serializeJson(doc, body);
    _server.send(code, "application/json", body);
}

void ApiManager::_sendError(int code, const String& msg) {
    JsonDocument doc;
    doc["success"] = false;
    doc["message"] = msg;
    _sendJson(code, doc);
}

int ApiManager::_diagIndex(const String& component) {
    for (int i = 0; i < 10; i++) {
        if (String(_diagKeys[i]) == component) return i;
    }
    return -1;
}

int ApiManager::_slotFromUri(const String& uri, int segIndex) {
    int count = 0;
    int start = 0;
    for (unsigned int i = 0; i < uri.length(); i++) {
        if (uri[i] == '/') {
            count++;
            if (count == segIndex) start = i + 1;
            if (count == segIndex + 1) return uri.substring(start, i).toInt();
        }
    }
    return uri.substring(start).toInt();
}

uint32_t ApiManager::_todayEpochForTime(const String& timeStr) {
    uint32_t e = TimeSource::getEpoch();
    uint32_t sod = e - (e % 86400UL); // start of day in UTC
    return sod + timeStr.substring(0, 2).toInt() * 3600UL + timeStr.substring(3, 5).toInt() * 60UL;
}

uint32_t ApiManager::_nextOccurrence(const String& timeStr) {
    uint32_t tgt = _todayEpochForTime(timeStr);
    uint32_t now = TimeSource::getEpoch();
    if (tgt <= now) {
        tgt += 86400UL;
    }
    return tgt;
}

void ApiManager::begin() {
    _server.on("/", HTTP_OPTIONS, _handleOptions);
    _server.onNotFound([]() {
        if (_server.method() == HTTP_OPTIONS) {
            _handleOptions();
            return;
        }
        auto st = WiFiManager::getState();
        if (st == WIFI_STATE_AP_RUNNING || st == WIFI_STATE_START_AP) {
            _handleCaptivePortal();
        } else {
            _sendError(404, "Not found");
        }
    });

    _server.on("/api/v1/status",       HTTP_GET,  _handleStatus);
    _server.on("/api/v1/capabilities", HTTP_GET,  _handleCapabilities);
    _server.on("/api/v1/info",         HTTP_GET,  _handleInfo);
    _server.on("/api/v1/home",         HTTP_GET,  _handleHome);
    _server.on("/api/v1/medicines",    HTTP_GET,  _handleGetMedicines);

    _server.on("/api/v1/medicines/1",        HTTP_PUT,    _handlePutMedicine);
    _server.on("/api/v1/medicines/2",        HTTP_PUT,    _handlePutMedicine);
    _server.on("/api/v1/medicines/3",        HTTP_PUT,    _handlePutMedicine);

    _server.on("/api/v1/medicines/1",        HTTP_DELETE, _handleDeleteMedicine);
    _server.on("/api/v1/medicines/2",        HTTP_DELETE, _handleDeleteMedicine);
    _server.on("/api/v1/medicines/3",        HTTP_DELETE, _handleDeleteMedicine);

    _server.on("/api/v1/medicines/1/refill", HTTP_POST,   _handleRefillMedicine);
    _server.on("/api/v1/medicines/2/refill", HTTP_POST,   _handleRefillMedicine);
    _server.on("/api/v1/medicines/3/refill", HTTP_POST,   _handleRefillMedicine);

    _server.on("/api/v1/dispense/1",   HTTP_POST, _handleDispense);
    _server.on("/api/v1/dispense/2",   HTTP_POST, _handleDispense);
    _server.on("/api/v1/dispense/3",   HTTP_POST, _handleDispense);

    _server.on("/api/v1/diagnostics",          HTTP_GET,  _handleGetDiagnostics);
    _server.on("/api/v1/diagnostics/test-all", HTTP_POST, _handleTestAll);

    const char* comps[] = {"wifi", "rtc", "stepper1", "stepper2", "stepper3", "ir", "speaker", "display", "storage", "memory"};
    for (const char* c : comps) {
        String p = "/api/v1/diagnostics/test/" + String(c);
        _server.on(p.c_str(), HTTP_POST, _handleTestComponent);
    }

    _server.on("/api/v1/settings",         HTTP_GET,  _handleGetSettings);
    _server.on("/api/v1/settings",         HTTP_PUT,  _handlePutSettings);
    _server.on("/api/v1/wifi/connect",     HTTP_POST, _handleWifiConnect);
    _server.on("/api/v1/wifi/start-setup", HTTP_POST, _handleWifiStartSetup);
    _server.on("/api/v1/wifi/forget",      HTTP_POST, _handleWifiForget);
    _server.on("/api/v1/device/reboot",        HTTP_POST, _handleReboot);
    _server.on("/api/v1/device/factory-reset", HTTP_POST, _handleFactoryReset);
    _server.on("/api/v1/device/time",          HTTP_POST, _handlePostTime);
    _server.on("/api/v1/logs",         HTTP_GET,  _handleGetLogs);
    _server.on("/api/v1/logs",         HTTP_POST, _handlePostLog);
    _server.on("/api/v1/logs",         HTTP_DELETE, _handleDeleteLogs);

    // Register SerialBridge event handler for pill count decrements and logs
    SerialBridge::setEventHandler([](const String& name, JsonVariant payload) {
        if (name == "dispense_complete") {
            int slot = payload["slot"].as<int>();
            bool detected = payload["detected"].as<bool>();
            
            String detail = "Slot " + String(slot) + (detected ? " (Pill detected)" : " (No pill detected)");
            StorageManager::appendLog("dispensed", detail);

            if (slot >= 1 && slot <= 3) {
                JsonDocument med = StorageManager::getMedicines();
                JsonArray arr = med.as<JsonArray>();
                for (JsonObject s : arr) {
                    if (s["slot"].as<int>() == slot) {
                        int rem = s["remainingPills"].as<int>();
                        int dose = s["dosePerReminder"].as<int>();
                        s["remainingPills"] = (rem >= dose) ? (rem - dose) : 0;
                        break;
                    }
                }
                StorageManager::setMedicines(med);
                Scheduler::checkLowMedicine(slot);
                _sendMedicineInfo(slot, true);
            }
        }
    });

    _dns.setTTL(300);
    _dns.setErrorReplyCode(DNSReplyCode::NoError);
    _server.begin();
    Serial.println(F("[API] HTTP server started on port 80"));
}

void ApiManager::update() {
    auto state = WiFiManager::getState();
    bool inAP = (state == WIFI_STATE_AP_RUNNING || state == WIFI_STATE_START_AP);
    
    if (inAP && !_dnsActive) {
        _dns.start(53, "*", IPAddress(192, 168, 4, 1));
        _dnsActive = true;
    } else if (!inAP && _dnsActive) {
        _dns.stop();
        _dnsActive = false;
    }

    if (_dnsActive) {
        _dns.processNextRequest();
    }
    
    _server.handleClient();

    // Background Mega RTC Sync if capability rtc is true
    if (SerialBridge::capabilitiesKnown() && SerialBridge::getCachedCapabilities()["rtc"].as<bool>()) {
        unsigned long now = millis();
        if (now - lastMegaTimeSync >= 30000 || lastMegaTimeSync == 0) {
            lastMegaTimeSync = now;
            Serial.println(F("[API] Synchronizing system time with Mega RTC..."));
            SerialBridge::sendCommand("get_time", [](bool ok, JsonVariant data) {
                if (ok && data["time"].is<uint32_t>()) {
                    uint32_t megaTime = data["time"].as<uint32_t>();
                    timeval tv = { (time_t)megaTime, 0 };
                    timezone tz = { 0, 0 };
                    settimeofday(&tv, &tz);
                    megaTimeSynced = true;
                    Serial.print(F("[API] Synced with Mega RTC. Epoch: "));
                    Serial.println(megaTime);
                }
            }, 3000);
        }
    }
}

void ApiManager::_handleOptions() {
    _addCors();
    _server.send(204);
}

void ApiManager::_handleCaptivePortal() {
    _addCors();
    _server.send(200, "text/html",
        "<!DOCTYPE html><html><head><meta charset='utf-8'><title>MedLink Setup</title></head><body>"
        "<h2>MedLink Wi-Fi Setup</h2>"
        "<form method='POST' action='/api/v1/wifi/connect'>"
        "<label>SSID: <input name='ssid' required></label><br>"
        "<label>Password: <input name='password' type='password'></label><br>"
        "<button type='submit'>Connect</button></form></body></html>");
}

void ApiManager::_handleStatus() {
    bool connected = (WiFiManager::getState() == WIFI_STATE_CONNECTED);
    bool rtcAvailable = SerialBridge::capabilitiesKnown() && SerialBridge::getCachedCapabilities()["rtc"].as<bool>();
    bool synced = rtcAvailable ? megaTimeSynced : TimeSource::isSynced();
    uint32_t t = TimeSource::getEpoch();

    JsonDocument doc;
    doc["success"] = true;
    doc["message"] = "ok";
    doc["connected"] = connected;
    doc["ssid"] = connected ? WiFi.SSID() : "";
    doc["ipAddress"] = connected ? WiFi.localIP().toString() : "";
    doc["time"] = t;
    doc["timeSynced"] = synced;
    _sendJson(200, doc);
}

void ApiManager::_handleCapabilities() {
    JsonDocument doc;
    doc["success"] = true;
    doc["message"] = "ok";
    JsonObject data = doc["data"].to<JsonObject>();
    if (SerialBridge::capabilitiesKnown()) {
        for (JsonPair kv : SerialBridge::getCachedCapabilities().as<JsonObject>()) {
            data[kv.key()] = kv.value();
        }
    }
    data["storage"] = true;
    data["wifi"] = true;
    data["memory"] = true;
    _sendJson(200, doc);
}

void ApiManager::_handleInfo() {
    JsonDocument cfg = StorageManager::getConfig();
    JsonDocument doc;
    doc["success"] = true;
    doc["message"] = "ok";
    doc["firmwareVersion"] = cfg["firmwareVersion"];
    doc["deviceId"] = cfg["deviceId"];
    _sendJson(200, doc);
}

void ApiManager::_handleHome() {
    JsonDocument med = StorageManager::getMedicines();
    JsonArray slots = med.as<JsonArray>();
    uint32_t now = TimeSource::getEpoch();

    JsonDocument doc;
    doc["success"] = true;
    doc["message"] = "ok";
    JsonArray nextDoses = doc["nextDoses"].to<JsonArray>();
    JsonArray todaySched = doc["todaySchedule"].to<JsonArray>();

    struct SE {
        int slot;
        String name;
        String time;
        uint32_t epoch;
        int dose;
        int rem;
        String notes;
    };
    SE upcoming[18];
    int upCnt = 0;
    uint32_t soonest = 0xFFFFFFFFUL;

    for (JsonObject s : slots) {
        if (!s["assigned"].as<bool>()) continue;
        int slotN = s["slot"].as<int>();
        String name = s["name"].as<String>();
        int dose = s["dosePerReminder"].as<int>();
        int rem = s["remainingPills"].as<int>();
        String notes = s["notes"].as<String>();

        for (JsonVariant tv : s["times"].as<JsonArray>()) {
            String ts = tv.as<String>();
            uint32_t ep = _nextOccurrence(ts);
            if (ep < soonest) soonest = ep;
            if (upCnt < 18) {
                upcoming[upCnt++] = {slotN, name, ts, ep, dose, rem, notes};
            }
        }
    }

    if (soonest != 0xFFFFFFFFUL) {
        for (int i = 0; i < upCnt; i++) {
            if (upcoming[i].epoch == soonest) {
                JsonObject nd = nextDoses.add<JsonObject>();
                nd["slot"] = upcoming[i].slot;
                nd["medicineName"] = upcoming[i].name;
                nd["dose"] = upcoming[i].dose;
                nd["scheduledTime"] = upcoming[i].time;
                nd["countdownSeconds"] = (soonest > now) ? (int)(soonest - now) : 0;
            }
        }
    }

    // Sort schedule by time
    for (int i = 1; i < upCnt; i++) {
        SE k = upcoming[i];
        int j = i - 1;
        while (j >= 0 && upcoming[j].epoch > k.epoch) {
            upcoming[j + 1] = upcoming[j];
            j--;
        }
        upcoming[j + 1] = k;
    }

    int added = 0;
    for (int i = 0; i < upCnt && added < 3; i++) {
        if (upcoming[i].epoch - now > 86400UL) continue;
        JsonObject se = todaySched.add<JsonObject>();
        se["slot"] = upcoming[i].slot;
        se["medicineName"] = upcoming[i].name;
        se["scheduledTime"] = upcoming[i].time;
        se["remainingPills"] = upcoming[i].rem;
        se["dose"] = upcoming[i].dose;
        se["notes"] = upcoming[i].notes;
        added++;
    }

    JsonDocument logs = StorageManager::getLogs();
    JsonArray la = logs.as<JsonArray>();
    JsonArray recent = doc["recentActivity"].to<JsonArray>();
    int lsz = la.size();
    int lstart = (lsz > 10) ? lsz - 10 : 0;
    for (int i = lsz - 1; i >= lstart; i--) {
        recent.add(la[i]);
    }

    _sendJson(200, doc);
}

void ApiManager::_handleGetMedicines() {
    JsonDocument med = StorageManager::getMedicines();
    JsonArray slots = med.as<JsonArray>();
    uint32_t now = TimeSource::getEpoch();

    JsonDocument doc;
    doc["success"] = true;
    doc["message"] = "ok";
    JsonArray out = doc["data"].to<JsonArray>();

    for (JsonObject s : slots) {
        JsonObject copy = out.add<JsonObject>();
        for (JsonPair kv : s) {
            copy[kv.key()] = kv.value();
        }

        bool asgn = s["assigned"].as<bool>();
        int rem = s["remainingPills"].as<int>();
        int thresh = s["lowStockThreshold"].as<int>();

        int td = 0;
        if (asgn) {
            for (JsonVariant tv : s["times"].as<JsonArray>()) {
                if (_todayEpochForTime(tv.as<String>()) > now) td++;
            }
        }
        copy["todayRemainingDoses"] = td;

        String st = "unassigned";
        if (asgn) {
            if (rem == 0) st = "empty";
            else if (rem <= thresh) st = "low";
            else st = "ok";
        }
        copy["status"] = st;
    }
    _sendJson(200, doc);
}

void ApiManager::_handlePutMedicine() {
    int slot = _slotFromUri(_server.uri(), 4);
    if (slot < 1 || slot > 3) {
        _sendError(400, "Slot must be 1-3");
        return;
    }

    JsonDocument bd;
    if (deserializeJson(bd, _server.arg("plain"))) {
        _sendError(400, "Invalid JSON");
        return;
    }

    if (!bd["name"].is<JsonVariant>() || bd["name"].as<String>().length() == 0) {
        _sendError(400, "Field 'name' required");
        return;
    }

    JsonDocument med = StorageManager::getMedicines();
    JsonArray arr = med.as<JsonArray>();
    for (JsonObject s : arr) {
        if (s["slot"].as<int>() == slot) {
            s["assigned"] = true;
            if (bd["name"].is<JsonVariant>())              s["name"] = bd["name"];
            if (bd["type"].is<JsonVariant>())              s["type"] = bd["type"];
            if (bd["remainingPills"].is<JsonVariant>())    s["remainingPills"] = bd["remainingPills"];
            if (bd["dosePerReminder"].is<JsonVariant>())   s["dosePerReminder"] = bd["dosePerReminder"];
            if (bd["notes"].is<JsonVariant>())             s["notes"] = bd["notes"];
            if (bd["repeatFrequency"].is<JsonVariant>())   s["repeatFrequency"] = bd["repeatFrequency"];
            if (bd["times"].is<JsonArray>())               s["times"] = bd["times"];
            if (bd["lowStockThreshold"].is<JsonVariant>()) s["lowStockThreshold"] = bd["lowStockThreshold"];
            break;
        }
    }

    StorageManager::setMedicines(med);
    Scheduler::resetLowWarned(slot);
    _sendMedicineInfo(slot, true);



    JsonDocument resp;
    resp["success"] = true;
    resp["message"] = "Slot updated";
    _sendJson(200, resp);
}

void ApiManager::_handleDeleteMedicine() {
    int slot = _slotFromUri(_server.uri(), 4);
    if (slot < 1 || slot > 3) {
        _sendError(400, "Slot must be 1-3");
        return;
    }

    JsonDocument med = StorageManager::getMedicines();
    JsonArray arr = med.as<JsonArray>();
    for (JsonObject s : arr) {
        if (s["slot"].as<int>() == slot) {
            s["assigned"] = false;
            s["type"] = "";
            s["remainingPills"] = 0;
            s["dosePerReminder"] = 1;
            s["notes"] = "";
            s["repeatFrequency"] = "daily";
            s["times"].to<JsonArray>().add("08:00");
            s["lowStockThreshold"] = 5;
            break;
        }
    }

    StorageManager::setMedicines(med);
    Scheduler::resetLowWarned(slot);
    _sendMedicineInfo(slot, false);

    StorageManager::appendLog("medicine_removed", "Slot " + String(slot) + " cleared (medicine removed)");

    JsonDocument resp;
    resp["success"] = true;
    resp["message"] = "Slot reset";
    _sendJson(200, resp);
}

void ApiManager::_handleRefillMedicine() {
    int slot = _slotFromUri(_server.uri(), 4);
    if (slot < 1 || slot > 3) {
        _sendError(400, "Slot must be 1-3");
        return;
    }

    JsonDocument bd;
    if (deserializeJson(bd, _server.arg("plain")) || !bd["quantity"].is<JsonVariant>()) {
        _sendError(400, "Body requires {quantity:int}");
        return;
    }

    int qty = bd["quantity"].as<int>();
    if (qty <= 0) {
        _sendError(400, "quantity must be positive");
        return;
    }

    JsonDocument med = StorageManager::getMedicines();
    JsonArray arr = med.as<JsonArray>();
    int total = 0;
    for (JsonObject s : arr) {
        if (s["slot"].as<int>() == slot) {
            total = s["remainingPills"].as<int>() + qty;
            s["remainingPills"] = total;
            break;
        }
    }

    StorageManager::setMedicines(med);
    Scheduler::resetLowWarned(slot);
    _sendMedicineInfo(slot, true);

    StorageManager::appendLog("refill", "Slot " + String(slot) + " refilled with " + String(qty) + " pills (total: " + String(total) + ")");

    JsonDocument resp;
    resp["success"] = true;
    resp["message"] = "Refilled";
    resp["remainingPills"] = total;
    _sendJson(200, resp);
}

void ApiManager::_handleDispense() {
    int slot = _slotFromUri(_server.uri(), 4);
    if (slot < 1 || slot > 3) {
        _sendError(400, "Slot must be 1-3");
        return;
    }

    JsonDocument& caps = SerialBridge::getCachedCapabilities();
    JsonArray steppers = caps["steppers"].as<JsonArray>();
    if (SerialBridge::capabilitiesKnown() && steppers.size() >= (size_t)slot && !steppers[slot - 1].as<bool>()) {
        JsonDocument r;
        r["success"] = false;
        r["message"] = "This slot's hardware isn't installed yet";
        _sendJson(200, r);
        return;
    }

    int capturedSlot = slot;
    JsonDocument pl;
    pl["slot"] = slot;
    JsonObject plObj = pl.as<JsonObject>();
    
    bool done = false;
    bool commandSuccess = false;
    String errorMessage = "";

    SerialBridge::sendCommand("dispense", plObj, [&done, &commandSuccess, &errorMessage](bool ok, JsonVariant data) {
        commandSuccess = ok;
        if (!ok) {
            errorMessage = data["error"].as<String>();
            if (errorMessage.length() == 0) {
                errorMessage = "Unknown error";
            }
        }
        done = true;
    }, 3000);

    unsigned long timeoutTime = millis() + 3200;
    while (!done && millis() < timeoutTime) {
        SerialBridge::poll();
        yield();
    }

    JsonDocument r;
    if (!done) {
        r["success"] = false;
        r["message"] = "timeout";
        _sendJson(200, r);
    } else if (commandSuccess) {
        r["success"] = true;
        r["message"] = "Dispense started";
        r["slot"] = capturedSlot;
        _sendJson(200, r);
    } else {
        r["success"] = false;
        r["message"] = errorMessage;
        _sendJson(200, r);
    }
}

void ApiManager::_handleGetDiagnostics() {
    JsonDocument& caps = SerialBridge::getCachedCapabilities();
    JsonArray steppers = caps["steppers"].as<JsonArray>();
    
    JsonDocument doc;
    doc["success"] = true;
    doc["message"] = "ok";
    JsonObject data = doc["data"].to<JsonObject>();

    auto addEntry = [&](const char* key) {
        int idx = _diagIndex(key);
        JsonObject e = data[key].to<JsonObject>();
        e["status"] = _diag[idx].known ? (_diag[idx].pass ? "ok" : "fail") : "unknown";
        e["lastChecked"] = _diag[idx].known ? (int)_diag[idx].checkedAt : 0;
        e["detail"] = _diag[idx].detail;
    };

    addEntry("wifi");
    addEntry("storage");
    addEntry("memory");
    addEntry("firmware");

    if (caps["rtc"].as<bool>())     addEntry("rtc");
    if (caps["ir"].as<bool>())      addEntry("ir");
    if (caps["speaker"].as<bool>()) addEntry("speaker");
    if (caps["display"].as<bool>()) addEntry("display");

    for (int i = 0; i < 3; i++) {
        if (steppers.size() > (size_t)i && steppers[i].as<bool>()) {
            addEntry(("stepper" + String(i + 1)).c_str());
        }
    }

    _sendJson(200, doc);
}

void ApiManager::_sendMedicineInfo(int slotNum, bool enabled) {
    JsonDocument med = StorageManager::getMedicines();
    JsonArray arr = med.as<JsonArray>();
    for (JsonObject s : arr) {
        if (s["slot"].as<int>() == slotNum) {
            String name = s["name"].as<String>();
            int dose = s["dosePerReminder"].as<int>();
            JsonArray times = s["times"].as<JsonArray>();
            
            String timeStr = "";
            for (int i = 0; i < 5; i++) {
                if (times.size() > (size_t)i) {
                    timeStr += times[i].as<String>();
                } else {
                    timeStr += "99:99";
                }
                if (i < 4) {
                    timeStr += ",";
                }
            }
            
            String freq = s["repeatFrequency"].as<String>();
            freq.toLowerCase();
            
            bool active[7] = {false, false, false, false, false, false, false};
            if (freq == "daily") {
                for (int i = 0; i < 7; i++) active[i] = true;
            } else {
                if (freq.indexOf("sunday") != -1)    active[0] = true;
                if (freq.indexOf("monday") != -1)    active[1] = true;
                if (freq.indexOf("tuesday") != -1)   active[2] = true;
                if (freq.indexOf("wednesday") != -1) active[3] = true;
                if (freq.indexOf("thursday") != -1)  active[4] = true;
                if (freq.indexOf("friday") != -1)    active[5] = true;
                if (freq.indexOf("saturday") != -1)  active[6] = true;
            }
            
            String dayNoStr = "";
            int count = 0;
            for (int d = 0; d < 7; d++) {
                if (active[d]) {
                    if (count > 0) dayNoStr += ",";
                    dayNoStr += String(d);
                    count++;
                }
            }
            for (int i = count; i < 7; i++) {
                if (i > 0) dayNoStr += ",";
                dayNoStr += "X";
            }

            int enabledFlag = enabled ? 1 : 0;
            
            String cmd = "New_med=" + name + "," + String(slotNum) + "," + String(dose) + "," + timeStr + "," + dayNoStr + "," + String(enabledFlag);
            SerialBridge::sendLine(cmd);
            break;
        }
    }
}

bool ApiManager::_runDiagTest(const String& component, String& detail) {
    bool pass = false;
    if (component == "wifi") {
        pass = (WiFi.status() == WL_CONNECTED);
        detail = pass ? ("RSSI=" + String(WiFi.RSSI()) + "dBm") : "Not connected";
    } 
    else if (component == "storage") {
        FSInfo info;
        pass = LittleFS.info(info);
        detail = pass ? ("Used=" + String(info.usedBytes) + "/" + String(info.totalBytes)) : "LittleFS info failed";
    } 
    else if (component == "memory") {
        uint32_t f = ESP.getFreeHeap();
        pass = f > 4096;
        detail = "FreeHeap=" + String(f) + " bytes";
    } 
    else if (component == "firmware") {
        JsonDocument c = StorageManager::getConfig();
        pass = true;
        detail = "v" + c["firmwareVersion"].as<String>();
    } 
    else {
        String unoComp = component;
        int slot = -1;
        if (component.startsWith("stepper")) {
            unoComp = "stepper";
            slot = component.substring(7).toInt();
        }
        
        bool done = false;
        bool commandSuccess = false;
        String errorMsg = "";
        
        JsonDocument pl;
        pl["component"] = unoComp;
        if (slot >= 1) {
            pl["slot"] = slot;
        }
        JsonObject plObj = pl.as<JsonObject>();
        
        SerialBridge::sendCommand("test", plObj, [&done, &commandSuccess, &pass, &detail, &errorMsg](bool ok, JsonVariant d) {
            commandSuccess = ok;
            if (ok) {
                pass = d["pass"].as<bool>();
                detail = d["detail"].as<String>();
            } else {
                errorMsg = d["error"].as<String>();
            }
            done = true;
        }, 5000);
        
        unsigned long dl = millis() + 5200;
        while (!done && millis() < dl) {
            SerialBridge::poll();
            yield();
        }
        
        if (!done) {
            pass = false;
            detail = "timeout";
        } else if (!commandSuccess) {
            pass = false;
            detail = errorMsg;
        }
    }
    
    int idx = _diagIndex(component);
    if (idx >= 0) {
        _diag[idx].known = true;
        _diag[idx].pass = pass;
        _diag[idx].detail = detail;
        _diag[idx].checkedAt = TimeSource::getEpoch();
    }
    
    return pass;
}

void ApiManager::_handleTestComponent() {
    String uri = _server.uri();
    String comp = uri.substring(uri.lastIndexOf('/') + 1);

    SerialBridge::sendLine("Debug=" + comp);

    JsonDocument doc;
    doc["success"] = true;
    doc["message"] = "Diagnostic command sent";
    _sendJson(200, doc);
}

void ApiManager::_handleTestAll() {
    SerialBridge::sendLine("Debug=wifi");
    SerialBridge::sendLine("Debug=storage");
    SerialBridge::sendLine("Debug=memory");
    SerialBridge::sendLine("Debug=rtc");
    SerialBridge::sendLine("Debug=stepper1");
    SerialBridge::sendLine("Debug=stepper2");
    SerialBridge::sendLine("Debug=stepper3");
    SerialBridge::sendLine("Debug=ir");
    SerialBridge::sendLine("Debug=speaker");
    SerialBridge::sendLine("Debug=display");

    JsonDocument doc;
    doc["success"] = true;
    doc["message"] = "Diagnostic command sent";
    _sendJson(200, doc);
}

void ApiManager::_handleGetSettings() {
    JsonDocument s = StorageManager::getSettings();
    JsonDocument doc;
    doc["success"] = true;
    doc["message"] = "ok";
    doc["data"] = s;
    _sendJson(200, doc);
}

void ApiManager::_handlePutSettings() {
    JsonDocument ns;
    if (deserializeJson(ns, _server.arg("plain"))) {
        _sendError(400, "Invalid JSON");
        return;
    }

    if (!ns["notifications"].is<JsonObject>()) {
        _sendError(400, "Missing notifications");
        return;
    }

    StorageManager::setSettings(ns);
    StorageManager::appendLog("setting_change", "Notification settings updated");
    JsonDocument resp;
    resp["success"] = true;
    resp["message"] = "Settings saved";
    _sendJson(200, resp);
}

void ApiManager::_handleWifiConnect() {
    String ssid;
    String pass;
    if (_server.hasArg("ssid")) {
        ssid = _server.arg("ssid");
        pass = _server.arg("password");
    } else {
        JsonDocument d;
        deserializeJson(d, _server.arg("plain"));
        ssid = d["ssid"].as<String>();
        pass = d["password"].as<String>();
    }

    if (ssid.length() == 0) {
        _sendError(400, "ssid required");
        return;
    }

    Serial.println(F("========== WiFi Provisioning =========="));
    Serial.println(F("Received Wi-Fi credentials"));
    Serial.print(F("SSID: "));
    Serial.println(ssid);
    Serial.print(F("Password Length: "));
    Serial.println(pass.length());
    Serial.println(F("Saving credentials..."));

    WiFiManager::setNewCredentials(ssid, pass);
    JsonDocument resp;
    resp["success"] = true;
    resp["message"] = "Connecting...";
    _sendJson(200, resp);
}

void ApiManager::_handleWifiStartSetup() {
    WiFiManager::forceStartAP();
    JsonDocument r;
    r["success"] = true;
    r["message"] = "AP started";
    _sendJson(200, r);
}

void ApiManager::_handleWifiForget() {
    WiFiManager::forgetCredentials();
    JsonDocument r;
    r["success"] = true;
    r["message"] = "Credentials cleared";
    _sendJson(200, r);
}

void ApiManager::_handleReboot() {
    JsonDocument r;
    r["success"] = true;
    r["message"] = "Rebooting...";
    _sendJson(200, r);
    delay(200);
    ESP.restart();
}

void ApiManager::_handleFactoryReset() {
    const char* files[] = {"/wifi.json", "/medicines.json", "/logs.json", "/settings.json", "/config.json"};
    for (const char* f : files) {
        LittleFS.remove(f);
    }
    StorageManager::begin();
    JsonDocument r;
    r["success"] = true;
    r["message"] = "Factory reset done. Rebooting...";
    _sendJson(200, r);
    delay(300);
    ESP.restart();
}

void ApiManager::_handleGetLogs() {
    JsonDocument doc;
    doc["success"] = true;
    doc["message"] = "ok";
    StorageManager::getLogs(doc["data"]);
    _sendJson(200, doc);
}

void ApiManager::_handlePostLog() {
    JsonDocument d;
    DeserializationError error = deserializeJson(d, _server.arg("plain"));
    if (error) {
        _sendError(400, "Invalid JSON");
        return;
    }
    
    String type = d["type"].as<String>();
    String detail = d["detail"].as<String>();
    
    if (type.length() > 0 && detail.length() > 0) {
        StorageManager::appendLog(type, detail);
        
        JsonDocument r;
        r["success"] = true;
        r["message"] = "Log appended";
        _sendJson(200, r);
    } else {
        _sendError(400, "type and detail required");
    }
}

void ApiManager::_handleDeleteLogs() {
    StorageManager::clearLogs();
    
    JsonDocument r;
    r["success"] = true;
    r["message"] = "Logs cleared";
    _sendJson(200, r);
}

void ApiManager::_handlePostTime() {
    JsonDocument d;
    deserializeJson(d, _server.arg("plain"));
    if (d["time"].is<uint32_t>()) {
        uint32_t epoch = d["time"].as<uint32_t>();
        // Add 1 second to compensate for Wi-Fi and Serial transmission/processing delays
        epoch += 1;
        timeval tv = { (time_t)epoch, 0 };
        timezone tz = { 0, 0 };
        settimeofday(&tv, &tz);
        megaTimeSynced = true;
        
        // Configure POSIX timezone for IST (UTC+5:30)
        setenv("TZ", "IST-5:30", 1);
        tzset();

        Serial.print(F("[API] System time set from phone: "));
        Serial.println(epoch);
        
        time_t rawtime = (time_t)epoch;
        struct tm* timeinfo = localtime(&rawtime);
        
        char timeStr[128];
        snprintf(timeStr, sizeof(timeStr), "Time=rtc(%d,%d,%d,%d,%d,%d)",
                 timeinfo->tm_year + 1900,
                 timeinfo->tm_mon + 1,
                 timeinfo->tm_mday,
                 timeinfo->tm_hour,
                 timeinfo->tm_min,
                 timeinfo->tm_sec);
        
        SerialBridge::sendLine(timeStr);
        
        // Also sync it to Mega RTC if capabilities rtc is true
        if (SerialBridge::capabilitiesKnown() && SerialBridge::getCachedCapabilities()["rtc"].as<bool>()) {
            JsonDocument pl;
            pl["time"] = epoch;
            JsonObject plObj = pl.as<JsonObject>();
            SerialBridge::sendCommand("set_time", plObj, [](bool ok, JsonVariant data) {
                if (ok) {
                    Serial.println(F("[API] Successfully set time on Mega RTC"));
                }
            }, 3000);
        }
        
        JsonDocument resp;
        resp["success"] = true;
        resp["message"] = "Time synchronized";
        _sendJson(200, resp);
    } else {
        _sendError(400, "time required");
    }
}
