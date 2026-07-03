# Smart Medicine Dispenser - PROJECT BIBLE

Version: 1.0

This document is the single source of truth for the firmware architecture.

Any AI-generated code must follow this document.

---

# Project Goal

Develop a production-quality Smart Medicine Dispenser using ESP32.

The firmware must be:

- Modular
- Easy to maintain
- Easy to test
- Hardware-independent where possible
- Expandable

---

# Hardware

Controller

- ESP32 DevKit

Components

- DS3231 RTC
- OLED Display
- 3 Stepper Motors
- ULN2003 Drivers
- DFPlayer Mini
- Speaker
- IR Sensor
- Single Push Button

---

# Software Architecture

Application Layer

- App
- MedicineManager
- Scheduler
- DispenseManager
- AlarmManager
- StorageManager
- ApiManager
- DeviceManager
- DiagnosticsManager
- Logger

Driver Layer

- RTC Driver
- OLED Driver
- Stepper Driver
- Audio Driver
- IR Driver
- WiFi Driver
- Button Driver

Business logic must never directly access hardware.

---

# Coding Rules

Use modern C++.

Use #pragma once.

Separate declarations and implementations.

One class per file.

No dynamic allocation.

No std::vector.

Use constexpr whenever possible.

Keep functions short.

Do not use delay() except for a tiny delay in main loop.

No global variables except the App instance.

---

# Application Lifecycle

BOOT

↓

INITIALIZING

↓

READY

↓

ERROR

---

# Folder Structure

firmware/

include/

src/

lib/

test/

data/

---

# Development Workflow

Each phase must:

- Compile
- Run
- Be reviewed
- Be committed

Never modify unrelated files.

Only modify files listed in the current task.

---

# Current Version

Phase 1

Firmware Foundation

Status:

Complete

---

# Current Progress

## Current Firmware Version

v0.4.0

---

# Completed Phases

## Phase 0

Planning

Status: Complete

---

## Phase 1

Firmware Foundation

Completed:

- PlatformIO project
- Logger
- App
- Diagnostics
- Config
- Boot sequence

Status: Complete

---

## Phase 2.1

Application Core

Completed:

- Application lifecycle
- ApplicationState
- App state machine
- Manager base class

Status: Complete

---

## Phase 2.2

Module Registration

Completed:

- ModuleRegistry
- Fixed-size manager registry
- Duplicate protection
- Null protection
- Manager update loop

Status: Complete

---

## Phase 3.1

Core Data Models

Completed:

- Medicine
- Schedule
- DispenseTask
- LogEntry
- DispenseResult

Status: Complete

---

Phase 3.2

Storage Layer

Status: Complete

---

# Current Phase

Phase 4

Wi-Fi Manager

Status: Ready
---

# Frozen Roadmap

✅ Phase 0 Planning

✅ Phase 1 Firmware Foundation

✅ Phase 2 Application Core

✅ Phase 3.1 Data Models

✅ Phase 3.2 Storage

🟢 Phase 4 Wi-Fi Manager

⬜ Phase 5 REST API

⬜ Phase 6 Android App MVP

⬜ Phase 7 Scheduler

⬜ Phase 8 Hardware Drivers

⬜ Phase 9 Integration

⬜ Phase 10 Polish