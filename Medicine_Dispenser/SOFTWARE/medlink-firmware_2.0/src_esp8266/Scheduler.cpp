#include "Scheduler.h"
#include "StorageManager.h"
#include "Logger.h"
#include "SerialBridge.h"
#include "TimeSource.h"

struct TriggeredEvent {
    int slot;
    uint32_t targetEpoch;
    bool dispensed;
    bool missedLogged;
};

#define MAX_TRACKED_EVENTS 32
static TriggeredEvent trackedEvents[MAX_TRACKED_EVENTS];
static int trackedEventCount = 0;

static bool lowWarned[3] = {false, false, false};
static unsigned long lastCheckMillis = 0;

void Scheduler::begin() {
    trackedEventCount = 0;
    for (int i = 0; i < 3; i++) {
        lowWarned[i] = false;
    }
    lastCheckMillis = 0;
}

static bool isDispensedInLogs(int slot, uint32_t startTs, uint32_t endTs) {
    JsonDocument logs = StorageManager::getLogs();
    JsonArray arr = logs.as<JsonArray>();
    String slotStr = "Slot " + String(slot);
    for (JsonObject entry : arr) {
        if (entry["type"].as<String>() == "dispensed") {
            uint32_t ts = entry["ts"].as<uint32_t>();
            String detail = entry["detail"].as<String>();
            if (ts >= startTs && ts <= endTs && detail.indexOf(slotStr) != -1) {
                return true;
            }
        }
    }
    return false;
}

void Scheduler::update() {
    unsigned long nowMillis = millis();
    if (lastCheckMillis != 0 && (nowMillis - lastCheckMillis < 30000)) {
        return;
    }
    lastCheckMillis = nowMillis;

    // Check if time is synchronized (needs at least one sync)
    uint32_t currentEpoch = Logger::getCurrentEpoch();
    if (currentEpoch < 1600000000UL) {
        // Not synchronized yet
        return;
    }

    // Clean up tracked events older than 2 hours (7200 seconds)
    for (int i = 0; i < trackedEventCount; ) {
        if (trackedEvents[i].targetEpoch < currentEpoch - 7200) {
            for (int j = i + 1; j < trackedEventCount; j++) {
                trackedEvents[j - 1] = trackedEvents[j];
            }
            trackedEventCount--;
        } else {
            i++;
        }
    }

    uint32_t sod = currentEpoch - (currentEpoch % 86400UL);
    JsonDocument med = StorageManager::getMedicines();
    JsonArray slots = med.as<JsonArray>();

    for (JsonObject s : slots) {
        bool assigned = s["assigned"].as<bool>();
        if (!assigned) continue;

        int slotNum = s["slot"].as<int>();
        String medName = s["name"].as<String>();
        JsonArray times = s["times"].as<JsonArray>();

        for (JsonVariant tv : times) {
            String ts = tv.as<String>();
            if (ts.length() < 5) continue;
            int h = ts.substring(0, 2).toInt();
            int m = ts.substring(3, 5).toInt();

            // Evaluate yesterday's and today's times
            uint32_t todayTarget = sod + h * 3600UL + m * 60UL;
            uint32_t yesterdayTarget = todayTarget - 86400UL;

            uint32_t candidates[2] = { yesterdayTarget, todayTarget };

            for (int c = 0; c < 2; c++) {
                uint32_t tEpoch = candidates[c];

                // Must be within the 2-hour window we care about
                if (tEpoch < currentEpoch - 7200 || tEpoch > currentEpoch + 300) {
                    continue;
                }

                // Check active reminder window (current time within 30 minutes of tEpoch)
                if (currentEpoch >= tEpoch && currentEpoch < tEpoch + 1800) {
                    // Check if already tracked
                    bool found = false;
                    for (int i = 0; i < trackedEventCount; i++) {
                        if (trackedEvents[i].slot == slotNum && trackedEvents[i].targetEpoch == tEpoch) {
                            found = true;
                            break;
                        }
                    }

                    if (!found) {
                        // Add to tracked list
                        int insertIdx = -1;
                        if (trackedEventCount < MAX_TRACKED_EVENTS) {
                            insertIdx = trackedEventCount++;
                        } else {
                            // Shift left
                            for (int i = 1; i < MAX_TRACKED_EVENTS; i++) {
                                trackedEvents[i - 1] = trackedEvents[i];
                            }
                            insertIdx = MAX_TRACKED_EVENTS - 1;
                        }
                        trackedEvents[insertIdx] = { slotNum, tEpoch, false, false };

                        // Log reminder_triggered
                        Logger::log(LOG_REMINDER_TRIGGERED, "Slot " + String(slotNum) + ", name=" + medName + ", time=" + ts);

                        // Trigger dispense via SerialBridge
                        JsonDocument pl;
                        pl["slot"] = slotNum;
                        JsonObject plObj = pl.as<JsonObject>();

                        SerialBridge::sendCommand("dispense", plObj, [slotNum, tEpoch](bool ok, JsonVariant data) {
                            if (ok) {
                                Serial.printf("[Scheduler] Auto-dispense started for slot %d\n", slotNum);
                                for (int i = 0; i < trackedEventCount; i++) {
                                    if (trackedEvents[i].slot == slotNum && trackedEvents[i].targetEpoch == tEpoch) {
                                        trackedEvents[i].dispensed = true;
                                        break;
                                    }
                                }
                            } else {
                                Serial.printf("[Scheduler] Auto-dispense trigger failed for slot %d: %s\n", slotNum, data["error"].as<const char*>());
                            }
                        }, 3000);
                    }
                }
                // Check missed dose window (current time past 30 minutes grace window, but under 2 hours)
                else if (currentEpoch >= tEpoch + 1800 && currentEpoch < tEpoch + 7200) {
                    int eventIdx = -1;
                    for (int i = 0; i < trackedEventCount; i++) {
                        if (trackedEvents[i].slot == slotNum && trackedEvents[i].targetEpoch == tEpoch) {
                            eventIdx = i;
                            break;
                        }
                    }

                    if (eventIdx >= 0) {
                        if (!trackedEvents[eventIdx].dispensed && !trackedEvents[eventIdx].missedLogged) {
                            // Verify with logs to prevent false alarms
                            if (!isDispensedInLogs(slotNum, tEpoch, tEpoch + 1800)) {
                                Logger::log(LOG_MISSED, "Slot " + String(slotNum) + ", name=" + medName + ", time=" + ts);
                            }
                            trackedEvents[eventIdx].missedLogged = true;
                        }
                    } else {
                        // Offline or rebooted - check logs to decide
                        if (!isDispensedInLogs(slotNum, tEpoch, tEpoch + 1800)) {
                            Logger::log(LOG_MISSED, "Slot " + String(slotNum) + ", name=" + medName + ", time=" + ts);
                        }
                        // Track it to prevent repeated logging
                        int insertIdx = -1;
                        if (trackedEventCount < MAX_TRACKED_EVENTS) {
                            insertIdx = trackedEventCount++;
                        } else {
                            for (int i = 1; i < MAX_TRACKED_EVENTS; i++) {
                                trackedEvents[i - 1] = trackedEvents[i];
                            }
                              insertIdx = MAX_TRACKED_EVENTS - 1;
                        }
                        trackedEvents[insertIdx] = { slotNum, tEpoch, false, true };
                    }
                }
            }
        }
    }
}

void Scheduler::checkLowMedicine(int slotNum) {
    if (slotNum < 1 || slotNum > 3) return;
    JsonDocument med = StorageManager::getMedicines();
    JsonArray arr = med.as<JsonArray>();
    for (JsonObject s : arr) {
        if (s["slot"].as<int>() == slotNum) {
            bool assigned = s["assigned"].as<bool>();
            if (!assigned) return;
            int rem = s["remainingPills"].as<int>();
            int thresh = s["lowStockThreshold"].as<int>();
            String name = s["name"].as<String>();

            if (rem <= thresh) {
                if (!lowWarned[slotNum - 1]) {
                    lowWarned[slotNum - 1] = true;
                    Logger::log(LOG_LOW_MEDICINE, "Slot " + String(slotNum) + ", name=" + name + ", remaining=" + String(rem));
                }
            }
            break;
        }
    }
}

void Scheduler::resetLowWarned(int slotNum) {
    if (slotNum >= 1 && slotNum <= 3) {
        lowWarned[slotNum - 1] = false;
    }
}
