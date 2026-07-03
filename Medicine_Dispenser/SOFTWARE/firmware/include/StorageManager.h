#pragma once

#include "StorageProvider.h"

class StorageManager {
 public:
  bool begin();
  bool saveMedicines();
  bool loadMedicines();
  bool saveSchedules();
  bool loadSchedules();
  bool saveLogs();
  bool loadLogs();
  bool setProvider(StorageProvider* provider);

 private:
  StorageProvider* provider_ = nullptr;
};
