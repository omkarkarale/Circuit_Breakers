#include "Logger.h"
#include "StorageManager.h"
#include "TimeSource.h"

uint32_t Logger::getCurrentEpoch() {
    return TimeSource::getEpoch();
}

void Logger::log(LogType type, const String& detail) {
    String typeStr;
    switch (type) {
        case LOG_DISPENSED:          typeStr = "dispensed"; break;
        case LOG_REMINDER_TRIGGERED: typeStr = "reminder_triggered"; break;
        case LOG_MISSED:             typeStr = "missed"; break;
        case LOG_LOW_MEDICINE:       typeStr = "low_medicine"; break;
        case LOG_CONNECTION_LOST:    typeStr = "connection_lost"; break;
    }
    log(typeStr, detail);
}

void Logger::log(const String& typeStr, const String& detail) {
    uint32_t ts = getCurrentEpoch();
    Serial.print(F("[LOG] ["));
    Serial.print(ts);
    Serial.print(F("] "));
    Serial.print(typeStr);
    Serial.print(F(": "));
    Serial.println(detail);

    StorageManager::appendLog(typeStr, detail);
}
