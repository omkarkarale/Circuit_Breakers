#pragma once

#include <stdint.h>

// Central firmware identity and serial configuration.
namespace Config {
constexpr const char* DEFAULT_AP_NAME = "MedicineDispenser";
constexpr uint16_t DEFAULT_HTTP_PORT = 80;
constexpr unsigned long WIFI_CONNECT_TIMEOUT_MS = 15000;

constexpr const char* firmwareName() {
  return "Medicine Dispenser Firmware";
}

constexpr const char* firmwareVersion() {
  return "0.1.0";
}

constexpr unsigned long serialBaudRate() {
  return 115200;
}

constexpr unsigned long mainLoopDelayMs() {
  return 5;
}

constexpr unsigned long applicationRunningIntervalMs() {
  return 1000;
}
}  // namespace Config
