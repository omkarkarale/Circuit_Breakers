#include "StorageManager.h"
#include <LittleFS.h>
#include "DeviceService.h"
#include "Logger.h"

bool StorageManager::begin() {
  return true;
}

bool StorageManager::saveWiFi(const String& ssid, const String& password) {
  File f = LittleFS.open("/wifi.txt", "w");
  if (!f) return false;
  f.print("ssid="); f.println(ssid);
  f.print("password="); f.println(password);
  f.close();
  return true;
}

bool StorageManager::loadWiFi(String& ssid, String& password) {
  if (!LittleFS.exists("/wifi.txt")) return false;
  File f = LittleFS.open("/wifi.txt", "r");
  if (!f) return false;
  while (f.available()) {
    String line = f.readStringUntil('\n');
    line.trim();
    int eq = line.indexOf('=');
    if (eq == -1) continue;
    String key = line.substring(0, eq);
    String val = line.substring(eq + 1);
    if (key == "ssid") ssid = val;
    else if (key == "password") password = val;
  }
  f.close();
  return true;
}

bool StorageManager::saveMedicines(const void* medicines, size_t count) {
  File f = LittleFS.open("/medicines.txt", "w");
  if (!f) return false;
  const DeviceService::MedicineRecord* records = (const DeviceService::MedicineRecord*)medicines;
  for (size_t i = 0; i < count; i++) {
    if (records[i].base.id == 0) continue;
    f.print("id="); f.println(records[i].base.id);
    f.print("slot="); f.println(records[i].base.dispenserId);
    f.print("pillsRemaining="); f.println(records[i].base.pillsRemaining);
    f.print("enabled="); f.println(records[i].base.enabled ? 1 : 0);
    f.print("name="); f.println(records[i].base.name);
    f.print("colorHex="); f.println(records[i].colorHex);
    f.print("type="); f.println(records[i].type);
    f.print("dosage="); f.println(records[i].dosage);
    f.print("repeatPattern="); f.println(records[i].repeatPattern);
    f.print("maxCapacity="); f.println(records[i].maxCapacity);
    f.print("dosePerReminder="); f.println(records[i].dosePerReminder);
    f.print("lastTakenTime="); f.println(records[i].lastTakenTime);
    f.print("streakDays="); f.println(records[i].streakDays);
    f.println("---");
  }
  f.close();
  return true;
}

bool StorageManager::loadMedicines(void* medicines, size_t maxCount, size_t& loadedCount) {
  if (!LittleFS.exists("/medicines.txt")) {
    loadedCount = 0;
    return false;
  }
  File f = LittleFS.open("/medicines.txt", "r");
  if (!f) return false;
  DeviceService::MedicineRecord* records = (DeviceService::MedicineRecord*)medicines;
  memset(records, 0, sizeof(DeviceService::MedicineRecord) * maxCount);
  loadedCount = 0;
  
  size_t idx = 0;
  while (f.available() && idx < maxCount) {
    String line = f.readStringUntil('\n');
    line.trim();
    if (line == "---") {
      if (records[idx].base.id != 0) {
        idx++;
        loadedCount = idx;
      }
      continue;
    }
    int eq = line.indexOf('=');
    if (eq == -1) continue;
    String key = line.substring(0, eq);
    String val = line.substring(eq + 1);
    
    if (key == "id") records[idx].base.id = val.toInt();
    else if (key == "slot") records[idx].base.dispenserId = val.toInt();
    else if (key == "pillsRemaining") records[idx].base.pillsRemaining = val.toInt();
    else if (key == "enabled") records[idx].base.enabled = (val.toInt() == 1);
    else if (key == "name") strncpy(records[idx].base.name, val.c_str(), sizeof(records[idx].base.name) - 1);
    else if (key == "colorHex") strncpy(records[idx].colorHex, val.c_str(), sizeof(records[idx].colorHex) - 1);
    else if (key == "type") strncpy(records[idx].type, val.c_str(), sizeof(records[idx].type) - 1);
    else if (key == "dosage") strncpy(records[idx].dosage, val.c_str(), sizeof(records[idx].dosage) - 1);
    else if (key == "repeatPattern") strncpy(records[idx].repeatPattern, val.c_str(), sizeof(records[idx].repeatPattern) - 1);
    else if (key == "maxCapacity") records[idx].maxCapacity = val.toInt();
    else if (key == "dosePerReminder") records[idx].dosePerReminder = val.toInt();
    else if (key == "lastTakenTime") records[idx].lastTakenTime = val.toInt();
    else if (key == "streakDays") records[idx].streakDays = val.toInt();
  }
  f.close();
  return true;
}

bool StorageManager::saveSchedules(const void* schedules, size_t count) {
  File f = LittleFS.open("/schedules.txt", "w");
  if (!f) return false;
  const DeviceService::ScheduleRecord* records = (const DeviceService::ScheduleRecord*)schedules;
  for (size_t i = 0; i < count; i++) {
    if (!records[i].inUse) continue;
    f.print("id="); f.println(records[i].base.id);
    f.print("medicineId="); f.println(records[i].base.medicineId);
    f.print("hour="); f.println(records[i].base.hour);
    f.print("minute="); f.println(records[i].base.minute);
    f.print("enabled="); f.println(records[i].base.enabled ? 1 : 0);
    f.print("inUse="); f.println(records[i].inUse ? 1 : 0);
    f.println("---");
  }
  f.close();
  return true;
}

bool StorageManager::loadSchedules(void* schedules, size_t maxCount, size_t& loadedCount) {
  if (!LittleFS.exists("/schedules.txt")) {
    loadedCount = 0;
    return false;
  }
  File f = LittleFS.open("/schedules.txt", "r");
  if (!f) return false;
  DeviceService::ScheduleRecord* records = (DeviceService::ScheduleRecord*)schedules;
  memset(records, 0, sizeof(DeviceService::ScheduleRecord) * maxCount);
  loadedCount = 0;
  
  size_t idx = 0;
  while (f.available() && idx < maxCount) {
    String line = f.readStringUntil('\n');
    line.trim();
    if (line == "---") {
      if (records[idx].inUse) {
        idx++;
        loadedCount = idx;
      }
      continue;
    }
    int eq = line.indexOf('=');
    if (eq == -1) continue;
    String key = line.substring(0, eq);
    String val = line.substring(eq + 1);
    
    if (key == "id") records[idx].base.id = val.toInt();
    else if (key == "medicineId") records[idx].base.medicineId = val.toInt();
    else if (key == "hour") records[idx].base.hour = val.toInt();
    else if (key == "minute") records[idx].base.minute = val.toInt();
    else if (key == "enabled") records[idx].base.enabled = (val.toInt() == 1);
    else if (key == "inUse") records[idx].inUse = (val.toInt() == 1);
  }
  f.close();
  return true;
}

bool StorageManager::saveLogs(const void* logs, size_t count, uint8_t head, uint8_t total) {
  File f = LittleFS.open("/logs.txt", "w");
  if (!f) return false;
  f.print("head="); f.println(head);
  f.print("total="); f.println(total);
  const DeviceService::LogRecord* records = (const DeviceService::LogRecord*)logs;
  for (size_t i = 0; i < count; i++) {
    if (!records[i].inUse) continue;
    f.print("timestamp="); f.println(records[i].base.timestamp);
    f.print("medicineId="); f.println(records[i].base.medicineId);
    f.print("dispenserId="); f.println(records[i].base.dispenserId);
    f.print("result="); f.println((int)records[i].base.result);
    f.print("confirmed="); f.println(records[i].base.confirmed ? 1 : 0);
    f.print("durationMs="); f.println(records[i].base.durationMs);
    f.print("medicineName="); f.println(records[i].medicineName);
    f.print("dosageStr="); f.println(records[i].dosageStr);
    f.print("inUse="); f.println(records[i].inUse ? 1 : 0);
    f.println("---");
  }
  f.close();
  return true;
}

bool StorageManager::loadLogs(void* logs, size_t maxCount, uint8_t& head, uint8_t& total) {
  head = 0;
  total = 0;
  if (!LittleFS.exists("/logs.txt")) {
    return false;
  }
  File f = LittleFS.open("/logs.txt", "r");
  if (!f) return false;
  DeviceService::LogRecord* records = (DeviceService::LogRecord*)logs;
  memset(records, 0, sizeof(DeviceService::LogRecord) * maxCount);
  
  size_t idx = 0;
  while (f.available() && idx < maxCount) {
    String line = f.readStringUntil('\n');
    line.trim();
    if (line == "---") {
      if (records[idx].inUse) {
        idx++;
      }
      continue;
    }
    int eq = line.indexOf('=');
    if (eq == -1) continue;
    String key = line.substring(0, eq);
    String val = line.substring(eq + 1);
    
    if (key == "head") head = val.toInt();
    else if (key == "total") total = val.toInt();
    else if (key == "timestamp") records[idx].base.timestamp = val.toInt();
    else if (key == "medicineId") records[idx].base.medicineId = val.toInt();
    else if (key == "dispenserId") records[idx].base.dispenserId = val.toInt();
    else if (key == "result") records[idx].base.result = (DispenseResult)val.toInt();
    else if (key == "confirmed") records[idx].base.confirmed = (val.toInt() == 1);
    else if (key == "durationMs") records[idx].base.durationMs = val.toInt();
    else if (key == "medicineName") strncpy(records[idx].medicineName, val.c_str(), sizeof(records[idx].medicineName) - 1);
    else if (key == "dosageStr") strncpy(records[idx].dosageStr, val.c_str(), sizeof(records[idx].dosageStr) - 1);
    else if (key == "inUse") records[idx].inUse = (val.toInt() == 1);
  }
  f.close();
  return true;
}
