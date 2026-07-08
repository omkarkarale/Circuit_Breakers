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

// Dynamic Hardware Capabilities Configuration
constexpr bool batterySupported = false;
constexpr bool temperatureSupported = false;
constexpr bool rtcSupported = true;
constexpr bool speakerSupported = true;
constexpr bool irSupported = true;
constexpr bool lcdSupported = true;

// ReMapped ESP8266 GPIO Pin Configuration
namespace Pins {
  // ULN2003 Stepper Motor 1 (Dispenser Slot 1)
  constexpr int MOTOR1_IN1 = 16; // D0
  constexpr int MOTOR1_IN2 = 5;  // D1
  constexpr int MOTOR1_IN3 = 4;  // D2
  constexpr int MOTOR1_IN4 = 0;  // D3

  // ULN2003 Stepper Motor 2 (Dispenser Slot 2)
  constexpr int MOTOR2_IN1 = 2;  // D4
  constexpr int MOTOR2_IN2 = 14; // D5
  constexpr int MOTOR2_IN3 = 12; // D6
  constexpr int MOTOR2_IN4 = 13; // D7

  // ULN2003 Stepper Motor 3 (Dispenser Slot 3)
  constexpr int MOTOR3_IN1 = 15; // D8
  constexpr int MOTOR3_IN2 = 3;  // RX
  constexpr int MOTOR3_IN3 = 1;  // TX
  constexpr int MOTOR3_IN4 = 9;  // SD2

  // IR Sensor Digital Input Pin
  constexpr int IR_SENSOR = 10;  // SD3

  // DFPlayer Mini Hardware Serial Pins
  constexpr int DFPLAYER_TX = 16;
  constexpr int DFPLAYER_RX = 17;

  // I2C OLED/LCD Display Configuration (0x27)
  constexpr int I2C_SDA = 4;
  constexpr int I2C_SCL = 5;
}
}  // namespace Config
