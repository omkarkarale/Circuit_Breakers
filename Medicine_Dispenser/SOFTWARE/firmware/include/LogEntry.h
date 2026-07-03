#pragma once

#include <stdint.h>

#include "DispenseResult.h"

struct LogEntry {
  uint32_t timestamp;
  uint8_t medicineId;
  uint8_t dispenserId;
  DispenseResult result;
  bool confirmed;
  uint16_t durationMs;

  LogEntry();
};
