#pragma once

// Central firmware identity and serial configuration.
namespace Config {
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
}  // namespace Config
