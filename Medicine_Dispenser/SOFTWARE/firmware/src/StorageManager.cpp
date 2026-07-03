#include "StorageManager.h"

bool StorageManager::begin() {
  if (provider_ == nullptr) {
    return false;
  }

  return provider_->begin();
}

bool StorageManager::saveMedicines() {
  if (provider_ == nullptr) {
    return false;
  }

  return provider_->saveMedicines();
}

bool StorageManager::loadMedicines() {
  if (provider_ == nullptr) {
    return false;
  }

  return provider_->loadMedicines();
}

bool StorageManager::saveSchedules() {
  if (provider_ == nullptr) {
    return false;
  }

  return provider_->saveSchedules();
}

bool StorageManager::loadSchedules() {
  if (provider_ == nullptr) {
    return false;
  }

  return provider_->loadSchedules();
}

bool StorageManager::saveLogs() {
  if (provider_ == nullptr) {
    return false;
  }

  return provider_->saveLogs();
}

bool StorageManager::loadLogs() {
  if (provider_ == nullptr) {
    return false;
  }

  return provider_->loadLogs();
}

bool StorageManager::setProvider(StorageProvider* provider) {
  if (provider == nullptr) {
    return false;
  }

  provider_ = provider;
  return true;
}
