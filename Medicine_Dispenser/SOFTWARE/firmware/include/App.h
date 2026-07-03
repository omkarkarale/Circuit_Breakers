#pragma once

#include "ApplicationState.h"
#include "Diagnostics.h"
#include "Logger.h"
#include "ModuleRegistry.h"

// Root application coordinator. Feature modules will be owned from here.
class App {
 public:
  void begin();
  void update();
  ApplicationState getState() const;
  void changeState(ApplicationState nextState);

 private:
  Diagnostics diagnostics_;
  ModuleRegistry registry_;
  ApplicationState state_ = ApplicationState::BOOT;
  unsigned long lastRunningLogMs_ = 0;
};
