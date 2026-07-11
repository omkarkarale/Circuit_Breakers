#ifndef LOGGER_H
#define LOGGER_H

#include <Arduino.h>

enum LogType {
    LOG_DISPENSED,
    LOG_REMINDER_TRIGGERED,
    LOG_MISSED,
    LOG_LOW_MEDICINE,
    LOG_CONNECTION_LOST
};

class Logger {
public:
    static void log(LogType type, const String& detail);
    static void log(const String& typeStr, const String& detail);

    static uint32_t getCurrentEpoch();
};

#endif // LOGGER_H
