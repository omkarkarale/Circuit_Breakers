#include "Logger.h"

void Logger::begin() {
  Serial.println("Logger Ready");
}

void Logger::info(const char* message) {
  Serial.println(message);
}

void Logger::warn(const char* message) {
  Serial.print("WARN: ");
  Serial.println(message);
}

void Logger::error(const char* message) {
  Serial.print("ERROR: ");
  Serial.println(message);
}
