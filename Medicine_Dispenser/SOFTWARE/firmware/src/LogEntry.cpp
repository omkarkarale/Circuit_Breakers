#include "LogEntry.h"

LogEntry::LogEntry()
    : timestamp(0),
      medicineId(0),
      dispenserId(0),
      result(DispenseResult::Failed),
      confirmed(false),
      durationMs(0) {}
