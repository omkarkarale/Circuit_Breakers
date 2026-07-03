#include "App.h"

#include <Arduino.h>
#include <cstdio>

#include "Config.h"

namespace {
const char* stateName(ApplicationState state) {
  switch (state) {
    case ApplicationState::BOOT:        return "BOOT";
    case ApplicationState::INITIALIZING: return "INITIALIZING";
    case ApplicationState::READY:       return "READY";
    case ApplicationState::ERROR:       return "ERROR";
  }
  return "UNKNOWN";
}
}  // namespace

void App::begin() {
  diagnostics_.begin();
  Logger::info("Diagnostics Ready");

  // Register WiFiManager in the update loop
  registry_.registerManager(&wifiManager_);
  registry_.begin();
  Logger::info("Module Registry Ready");

  // Wire DeviceService with available managers
  deviceService_.begin(&wifiManager_, &storageManager_);
  Logger::info("Device Service Ready");

  // Pass DeviceService into ApiManager
  apiManager_.begin(&deviceService_);
  Logger::info("Application Ready");
}

void App::update() {
  diagnostics_.update();
  apiManager_.update();

  if (state_ == ApplicationState::BOOT) {
    changeState(ApplicationState::INITIALIZING);
    return;
  }

  if (state_ == ApplicationState::INITIALIZING) {
    changeState(ApplicationState::READY);
    return;
  }

  if (state_ == ApplicationState::READY) {
    registry_.update();

    const unsigned long currentMs = millis();
    if (currentMs - lastRunningLogMs_ >= Config::applicationRunningIntervalMs()) {
      Logger::info("Application Running");
      lastRunningLogMs_ = currentMs;
    }
  }
}

ApplicationState App::getState() const { return state_; }

void App::changeState(ApplicationState nextState) {
  char buf[32];
  snprintf(buf, sizeof(buf), "%s -> %s",
           stateName(state_), stateName(nextState));
  Logger::info("Changing State:");
  Logger::info(buf);
  state_ = nextState;
}
