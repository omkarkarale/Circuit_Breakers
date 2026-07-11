#ifndef TIME_SOURCE_H
#define TIME_SOURCE_H

#include <Arduino.h>

class TimeSource {
public:
    static void begin();
    static void update();
    static uint32_t getEpoch();
    static bool isSynced();
};

#endif // TIME_SOURCE_H
