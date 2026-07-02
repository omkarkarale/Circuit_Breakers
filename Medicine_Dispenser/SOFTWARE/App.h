#pragma once

#include "Diagnostics.h"
#include "Logger.h"

// Root application coordinator. Feature modules will be owned from here.
class App {
 public:
  void begin();
  void update();

 private:
  Diagnostics diagnostics_;
};
