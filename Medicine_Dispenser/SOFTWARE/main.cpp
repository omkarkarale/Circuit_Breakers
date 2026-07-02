#include <Arduino.h>

#include "App.h"
#include "Config.h"
#include "Logger.h"

App app;

void setup() {
  Serial.begin(Config::serialBaudRate());

  Serial.println("================================");
  Serial.println(Config::firmwareName());
  Serial.print("Version ");
  Serial.println(Config::firmwareVersion());
  Serial.println("Booting...");

  Logger::begin();

  app.begin();

  Logger::info("System Ready");
  Serial.println("================================");
}

void loop() {
  app.update();
  delay(Config::mainLoopDelayMs());
}
