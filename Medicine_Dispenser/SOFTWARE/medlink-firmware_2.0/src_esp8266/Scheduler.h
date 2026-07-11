#ifndef SCHEDULER_H
#define SCHEDULER_H

#include <Arduino.h>

class Scheduler {
public:
    static void begin();
    static void update();

    static void checkLowMedicine(int slot);
    static void resetLowWarned(int slot);
};

#endif // SCHEDULER_H
