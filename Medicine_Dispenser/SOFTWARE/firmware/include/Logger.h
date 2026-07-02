#pragma once

#include <Arduino.h>

// Lightweight application logger that routes messages through Serial.
class Logger {
 public:
  static void begin();

  static void info(const char* message);
  static void warn(const char* message);
  static void error(const char* message);
};
