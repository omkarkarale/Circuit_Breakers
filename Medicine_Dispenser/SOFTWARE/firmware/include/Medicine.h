#pragma once

#include <Arduino.h>

struct Medicine {
  uint8_t id;
  String name;
  uint8_t dispenserId;
  uint16_t pillsRemaining;
  bool enabled;

  Medicine();
};
