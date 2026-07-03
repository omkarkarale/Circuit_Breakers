#pragma once

#include <cstddef>

#include "Manager.h"

class ModuleRegistry {
 public:
  static constexpr std::size_t MAX_MODULES = 10;

  bool registerManager(Manager* manager);
  void begin();
  void update();
  std::size_t count() const;

 private:
  Manager* managers_[MAX_MODULES] = {};
  std::size_t count_ = 0;
};
