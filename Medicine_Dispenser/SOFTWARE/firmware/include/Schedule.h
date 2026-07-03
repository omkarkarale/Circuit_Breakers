#pragma once

#include <stdint.h>

struct Schedule {
  uint8_t id;
  uint8_t medicineId;
  uint8_t hour;
  uint8_t minute;
  bool enabled;

  Schedule();
};
