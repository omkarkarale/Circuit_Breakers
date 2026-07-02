#include "App.h"

void App::begin() {
  diagnostics_.begin();
  Logger::info("Diagnostics Ready");
  Logger::info("Application Ready");
}

void App::update() {
  diagnostics_.update();
}
