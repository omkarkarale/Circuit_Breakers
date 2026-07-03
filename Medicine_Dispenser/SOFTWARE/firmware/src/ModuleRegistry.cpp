#include "ModuleRegistry.h"

bool ModuleRegistry::registerManager(Manager* manager) {
  if (manager == nullptr) {
    return false;
  }

  for (std::size_t index = 0; index < count_; ++index) {
    if (managers_[index] == manager) {
      return false;
    }
  }

  if (count_ >= MAX_MODULES) {
    return false;
  }

  managers_[count_] = manager;
  ++count_;
  return true;
}

void ModuleRegistry::begin() {
  for (std::size_t index = 0; index < count_; ++index) {
    managers_[index]->begin();
  }
}

void ModuleRegistry::update() {
  for (std::size_t index = 0; index < count_; ++index) {
    managers_[index]->update();
  }
}

std::size_t ModuleRegistry::count() const {
  return count_;
}
