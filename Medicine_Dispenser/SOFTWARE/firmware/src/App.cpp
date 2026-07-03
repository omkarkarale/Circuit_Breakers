#include "App.h"

#include <Arduino.h>
#include <cstdio>

#include "Config.h"

namespace {
const char* stateName(ApplicationState state) {
  switch (state) {
    case ApplicationState::BOOT:
      return "BOOT";
    case ApplicationState::INITIALIZING:
      return "INITIALIZING";
    case ApplicationState::READY:
      return "READY";
    case ApplicationState::ERROR:
      return "ERROR";
  }

  return "UNKNOWN";
}
}  // namespace

void App::begin() {
  diagnostics_.begin();
  Logger::info("Diagnostics Ready");
  registry_.begin();
  Logger::info("Module Registry Ready");
  Logger::info("Application Ready");
}

void App::update() {
  diagnostics_.update();

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

ApplicationState App::getState() const {
  return state_;
}

void App::changeState(ApplicationState nextState) {
  char transitionMessage[32];
  snprintf(transitionMessage,
           sizeof(transitionMessage),
           "%s -> %s",
           stateName(state_),
           stateName(nextState));

  Logger::info("Changing State:");
  Logger::info(transitionMessage);

  state_ = nextState;
}
