#pragma once

#include <stdint.h>

struct DispenseTask {
  uint8_t medicineId;
  uint8_t dispenserId;
  uint32_t scheduledTime;
  bool confirmed;
  bool completed;

  DispenseTask();
};
