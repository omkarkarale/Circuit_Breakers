#include "TimeSource.h"
#include "WiFiManager.h"
#include <time.h>

static unsigned long lastNtpCheck = 0;
static bool hasSyncedOnce = false;

void TimeSource::begin() {
    // Initial configuration of NTP servers with 0 offset
    configTime(19800, 0, "pool.ntp.org", "time.nist.gov");
}

void TimeSource::update() {
    // Only attempt NTP checks if we are fully connected to the network
    if (WiFiManager::getState() != WIFI_STATE_CONNECTED) {
        return;
    }

    // Check periodically every 3 minutes (180000 ms)
    if (millis() - lastNtpCheck >= 180000 || lastNtpCheck == 0) {
        lastNtpCheck = millis();

        time_t now = time(nullptr);
        if (now > 1577836800) { // Year > 2020
            if (!hasSyncedOnce) {
                Serial.print("NTP Time Synchronized fallback. Current epoch: ");
                Serial.println((uint32_t)now);
                hasSyncedOnce = true;
            }
        } else {
            // Not synchronized yet, re-trigger configuration
            configTime(0, 0, "pool.ntp.org", "time.nist.gov");
        }
    }
}

uint32_t TimeSource::getEpoch() {
    return (uint32_t)time(nullptr);
}

bool TimeSource::isSynced() {
    return time(nullptr) > 1577836800; // Year > 2020
}
