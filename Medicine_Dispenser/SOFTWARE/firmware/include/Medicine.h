#pragma once

#include <stdint.h>

struct Medicine {
  static constexpr uint8_t MEDICINE_NAME_MAX = 32;

  uint8_t  id;
  char     name[MEDICINE_NAME_MAX + 1];
  uint8_t  dispenserId;
  uint16_t pillsRemaining;
  bool     enabled;

  Medicine();
};
