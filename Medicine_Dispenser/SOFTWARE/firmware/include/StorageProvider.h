#pragma once

class StorageProvider {
 public:
  virtual ~StorageProvider() = default;

  virtual bool begin() = 0;
  virtual bool saveMedicines() = 0;
  virtual bool loadMedicines() = 0;
  virtual bool saveSchedules() = 0;
  virtual bool loadSchedules() = 0;
  virtual bool saveLogs() = 0;
  virtual bool loadLogs() = 0;
};
