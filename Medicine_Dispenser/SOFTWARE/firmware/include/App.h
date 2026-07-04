#pragma once

#include "ApiManager.h"
#include "ApplicationState.h"
#include "DeviceService.h"
#include "Diagnostics.h"
#include "Logger.h"
#include "ModuleRegistry.h"
#include "StorageManager.h"
#include "WiFiManager.h"

// Root application coordinator.
class App {
 public:
  void begin();
  void update();
  ApplicationState getState() const;
  void changeState(ApplicationState nextState);

 private:
  Diagnostics     diagnostics_;
  WiFiManager     wifiManager_;
  StorageManager  storageManager_;
  DeviceService   deviceService_;
  ModuleRegistry  registry_;
  ApiManager      apiManager_;
  ApplicationState state_          = ApplicationState::BOOT;
  unsigned long   lastRunningLogMs_ = 0;
};
