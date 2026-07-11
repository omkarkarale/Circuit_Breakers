#include <Arduino.h>
#include <SoftwareSerial.h>
#include <ArduinoJson.h>
#include <protocol.h>
#include "WiFiManager.h"
#include "TimeSource.h"
#include "StorageManager.h"
#include "SerialBridge.h"
#include "ApiManager.h"
#include "Scheduler.h"

// SoftwareSerial RX = D5, TX = D6 for communication
SoftwareSerial swSerial(D5, D6);

unsigned long lastPingTime = 0;

void setup() {
  // Initialize Hardware Serial (USB) for debugging
  Serial.begin(115200);
  delay(500);
  Serial.println("ESP8266 Medlink Node Started.");

  // Initialize Software Serial at 9600 baud
  swSerial.begin(9600);

  // Initialize all subsystems
  StorageManager::begin();
  SerialBridge::begin(swSerial);
  WiFiManager::begin();
  TimeSource::begin();
  ApiManager::begin();
  Scheduler::begin();
}

void loop() {
  // Update state machines and poll serial link
  WiFiManager::update();
  TimeSource::update();
  SerialBridge::poll();
  ApiManager::update();
  Scheduler::update();

  unsigned long currentTime = millis();
  
  // Every 1000ms, send the ping command over SoftwareSerial
  if (currentTime - lastPingTime >= 1000) {
    lastPingTime = currentTime;
    swSerial.println("{\"type\":\"cmd\",\"id\":1,\"op\":\"ping\"}");
  }
}
