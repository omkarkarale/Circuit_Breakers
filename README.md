<h1 align="center">⚡ Circuit Breakers</h1>
<h3 align="center">MakerMania 2026 — Innovation Project Workbook</h3>

<p align="center">
  <img src="https://img.shields.io/badge/MakerMania-2026-blue?style=for-the-badge" alt="MakerMania 2026"/>
  <img src="https://img.shields.io/badge/Team-Circuit%20Breakers-orange?style=for-the-badge" alt="Team Circuit Breakers"/>
  <img src="https://img.shields.io/badge/Department-ECS-green?style=for-the-badge" alt="ECS Department"/>
</p>

<div align="center">

### 🛠️ Technologies Used

[![Arduino IDE](https://img.shields.io/badge/Arduino-IDE-00979D?style=for-the-badge&logo=arduino&logoColor=white)](https://www.arduino.cc/)
[![ESP32](https://img.shields.io/badge/ESP32-Microcontroller-E7352C?style=for-the-badge&logo=espressif&logoColor=white)](https://www.espressif.com/en/products/socs/esp32)
[![C++](https://img.shields.io/badge/C++-Firmware-00599C?style=for-the-badge&logo=cplusplus&logoColor=white)](https://isocpp.org/)
[![Fusion 360](https://img.shields.io/badge/Fusion_360-3D_CAD-0696D7?style=for-the-badge&logo=autodesk&logoColor=white)](https://www.autodesk.com/products/fusion-360/overview)
[![LaserCAD](https://img.shields.io/badge/LaserCAD-Laser_Cutting-D35400?style=for-the-badge&logo=adobe&logoColor=white)]()

</div>

<p align="center">
  <strong>Program Duration:</strong> 1 June 2026 – 4 July 2026 &nbsp;·&nbsp;
  <strong>Location:</strong> MBF Tinkerers' Lab 007 &nbsp;·&nbsp;
  <strong>Team Size:</strong> 3 Students
</p>

<p align="center">
  <em>Identify a real-world problem and develop an innovative, patentable, and implementable solution.</em>
</p>

<p align="center">
  <a href="https://youtu.be/VeL1t_9wYrM?si=e5plWxUvcQX88zFm"><strong>📺 Advertisement Video</strong></a>
  &nbsp;&nbsp;|&nbsp;&nbsp;
  <a href="https://canva.link/8ibtr7vefrchxkn"><strong>📊 SCAMPER Presentation</strong></a>
</p>

---

## 📑 Table of Contents

| # | Section | # | Section |
|:-:|---------|:-:|---------|
| 1 | [Team Identity](#1-team-identity) | 9 | [Testing & Validation](#9-testing--validation) |
| 2 | [Problem Discovery](#2-problem-discovery) | 10 | [Innovation Assessment](#10-innovation-assessment) |
| 3 | [User Research](#3-user-research) | 11 | [Intellectual Property](#11-intellectual-property) |
| 4 | [Problem Framing](#4-problem-framing) | 12 | [Business & Deployment](#12-business--deployment) |
| 5 | [Solution Ideation](#5-solution-ideation) | 13 | [Final Demonstration](#13-final-demonstration) |
| 6 | [System Design](#6-system-design) | 14 | [Reflection](#14-reflection) |
| 7 | [Technical Planning](#7-technical-planning) | 15 | [Deliverables Checklist](#15-final-deliverables-checklist) |
| 8 | [Prototype Development](#8-prototype-development) | — | [Final Pitch](#-makermania-final-pitch) |

---

## 📂 Repository Structure

```text
MakerMania-2026-CircuitBreakers/
├── README.md                         # Project workbook (this file)
├── Instruction.md                    # GitHub workflow guide
├── 3D SPOOL.f3d                      # Main spool CAD model
├── Medicine_Dispenser/
│   ├── Component_list.txt            # Project hardware list
│   └── ELECTRONICS/                  # KiCad electronics project files
├── cad/
│   ├── tmp.txt
│   └── USELESS/                      # Old / unused CAD reference files
├── code/
│   └── Arduino/
│       ├── led_chaser.ino            # ESP32 LED chaser
│       ├── potentiometer.ino         # Potentiometer-controlled LEDs
│       └── binary_counter.ino        # Binary counter display
├── docs/
│   ├── Birdex.pdf
│   └── tmp.txt
├── images/                           # Sketches, photos, diagrams
└── Training Material/
    ├── Fusion 360/                   # CAD keychain design practice files
    ├── KiCad/                        # KiCad training material
    └── Laser/                        # Laser-cut ID and design files
```

---

# 1. Team Identity

## 1.1 Team Name and Photo

> **Team Name:** Circuit Breakers
>
> *Add your team photo below once uploaded to `images/`.*
>
> 
> <p align="center">
>   <img src="images/team-photo.jpg" width="500" alt="Circuit Breakers Team Photo">
> </p>
> 

## 1.2 Team Members

| Name | Department | Year |
|:-----|:-----------|:-----|
| Ekansh Bansode | ECS | 2025-26 |
| Omkar Karale | ECS | 2025-26 |
| Rajnarayan Hazra | ECS | 2024-25 |

---

# 2. Problem Discovery

## 2.1 Observation Area

Where did you conduct your observations?

- [ ] Hostel
- [ ] Canteen
- [ ] Workshop
- [x] Hospital
- [ ] Public Transport
- [x] Home
- [x] Other: Elderly care and caregiver support

---

## 2.2 AEIOU Observation Sheet

### Activities

| Activity | Description | Code |
|:---------|:------------|:-----|
| Medicine Scheduling | Users need to take different medicines at fixed times throughout the day. | Smart Medicine Sorting and Reminder Device |
| Dose Identification | Users must identify the correct medicine compartment and dosage. | OLED, LED indicators, voice guidance |
| Medicine Retrieval | The device rotates the spool to the correct compartment and guides the user. | 28BYJ-48 stepper + ULN2003 |

### Environment

> What conditions affect them?

The device is intended for homes, bedside tables, clinics, and elderly care spaces. Users may face forgetfulness, low vision, difficulty reading labels, or confusion when multiple medicines look similar.

### Interactions

> Who or what are they interacting with?

The user interacts with push buttons, the OLED display, buzzer alerts, voice announcements, LEDs, the rotating medicine spool, and the medicine compartments. Caregivers can use ESP32 Wi-Fi/Bluetooth connectivity for schedule setup and notifications.

### Objects

> What tools or products are used?

ESP32 DevKit, DS3231 RTC, 0.96" OLED, 28BYJ-48 stepper motor, ULN2003 driver, DFPlayer Mini, speaker, 3 push buttons, active buzzer, IR sensor, LEDs / NeoPixel ring, 5V adapter or 18650 battery, recycled 3D printer filament spool, and medicine compartments.

### Users

> Who are the primary users?

The primary users are elderly patients and people with complex medication schedules. Secondary users include caregivers, family members, and healthcare workers.

---

## 2.3 Observation Log

| # | Observation | Evidence | Pain Point |
|:-:|-------------|----------|------------|
| 1 | Elderly users may forget medicine timings. | Daily medicine routines often depend on alarms, handwritten notes, or caregiver reminders. | Missed doses reduce treatment effectiveness. |
| 2 | Multiple medicines can create confusion. | Similar tablets or unclear compartments make selection difficult. | Users may take the wrong medicine or dosage. |
| 3 | Caregivers cannot always monitor intake in person. | Family members may be away during scheduled medicine times. | No reliable confirmation that medicine was accessed. |

---

# 3. User Research

## 3.1 Interview Summary

| Metric | Value |
|:-------|:------|
| Users interviewed | Elderly users, family members, and caregivers |
| Interview dates | June 2026 |
| Methods used | Informal interviews, observation, and discussion of daily medicine routines |

## 3.2 Key Quotes

> **1.** "A normal alarm tells the time, but it does not tell which medicine to take."
>
> **2.** "It is difficult to remember tablets when there are many doses in one day."
>
> **3.** "Caregivers need to know whether the medicine was actually accessed."

---

## 3.3 User Persona

| Attribute | Details |
|:----------|:--------|
| **Name** | Mr. Sharma |
| **Age** | 68 years |
| **Occupation** | Retired |
| **Goals** | Take medicines on time, avoid confusion, and remain independent. |
| **Frustrations** | Forgetting doses, reading small labels, and depending on family members. |
| **Needs** | Clear reminders, voice guidance, visible compartment indication, and simple operation. |

---

# 4. Problem Framing

## Problem Statement

> **User** elderly patients and people with complex medication schedules **needs a way to** identify and take the correct medicine at the correct time **because** missed doses, wrong doses, and dependency on caregivers can affect health and independence.

---

## How Might We Questions

1. How might we help elderly users identify the correct medicine without confusion?
2. How might we make medicine reminders clearer than a normal phone alarm?
3. How might we help caregivers receive confirmation of medicine access?

---

## Opportunity Ranking

| Criteria | Score (1–5) | Notes |
|:---------|:----------:|:------|
| Severity | 5 | Incorrect or missed medication can directly affect health. |
| Frequency | 5 | Medicines are often taken daily and multiple times per day. |
| Feasibility | 4 | Uses affordable and commonly available components. |
| Novelty | 4 | Combines recycled spool design, voice guidance, LEDs, motorized positioning, and IoT. |
| Market Potential | 4 | Useful for elderly care, home healthcare, and caregiver support. |
| **Total** | **22/25** | Strong real-world problem with practical implementation scope. |

---

# 5. Solution Ideation

## Brainstormed Ideas

| Idea | Advantages | Challenges |
|:-----|:-----------|:-----------|
| Mobile medicine reminder app | Easy to update schedules and send notifications | Does not physically guide medicine selection |
| Alarm-based pill box | Simple and low cost | User still needs to open the correct compartment |
| Smart rotating medicine organizer | Provides reminder, sorting, voice guidance, visual indication, and access detection | Requires motor calibration and reliable mechanical alignment |

---

## Selected Concept

> Why was this concept chosen?

The selected concept is a Smart Medicine Sorting and Reminder Device built using a recycled 3D printer filament spool. It solves both reminder and medicine identification problems by alerting the user, rotating to the correct compartment, lighting the correct slot, giving voice instructions, and detecting compartment access.

---

# 6. System Design

## High-Level Description

> Explain your solution.

The Smart Medicine Sorting and Reminder Device is an IoT-enabled healthcare solution that helps elderly patients and individuals with complex medication schedules take medicines on time and correctly. Medicines are preloaded into weekly compartments inside a recycled 3D printer filament spool. The ESP32 checks scheduled times using the DS3231 RTC. At the correct time, the buzzer sounds, the DFPlayer Mini plays a voice reminder, LEDs indicate the correct compartment, the OLED shows medicine information, and the stepper motor rotates the spool to the correct slot. The IR sensor can detect access and support logging or caregiver notification.

---

## Block Diagram

> Insert diagram here.

```html
<p align="center">
  <img src="images/block-diagram.png" width="600" alt="System Block Diagram">
</p>
```

---

## Inputs

> List sensors, user inputs, data sources.

| Input | Type | Purpose |
|:------|:-----|:--------|
| Push buttons | Digital input | Configure schedules and navigate menus |
| DS3231 RTC | Time input | Provides accurate real-time scheduling |
| IR sensor | Digital sensor | Detects compartment access or medicine retrieval |
| ESP32 Wi-Fi/Bluetooth | Wireless input | Enables mobile app connectivity and caregiver setup |

---

## Outputs

> List displays, actuators, software outputs.

| Output | Type | Purpose |
|:-------|:-----|:--------|
| OLED display | Visual display | Shows current time, status, and medication information |
| DFPlayer Mini + speaker | Audio output | Gives voice reminders and dosage instructions |
| Active buzzer | Audio alert | Alerts the user at medicine time |
| LED indicators / NeoPixel ring | Visual indicator | Illuminates the correct medicine compartment |
| 28BYJ-48 stepper motor | Actuator | Rotates the spool to the correct slot |

---

# 7. Technical Planning

## Electronics

| Component | Qty | Purpose |
|:----------|:---:|:--------|
| ESP32 DevKit | 1 | Main controller and Wi-Fi/Bluetooth connectivity |
| DS3231 RTC Module | 1 | Accurate real-time clock for medicine schedules |
| 0.96" OLED Display | 1 | Displays time, status, and medicine information |
| 28BYJ-48 Stepper Motor | 1 | Rotates the medicine spool |
| ULN2003 Motor Driver | 1 | Drives the stepper motor |
| DFPlayer Mini + Speaker | 1 set | Plays voice reminders and dosage instructions |
| Push Buttons | 3 | Menu navigation and schedule configuration |
| Active Buzzer | 1 | Provides reminder alert |
| IR Sensor | 1 | Detects access or retrieval |
| LED Indicators / NeoPixel Ring | 1 set | Highlights the correct compartment |
| 5V Adapter or 18650 Battery | 1 | Power supply |

---

## Software

| Tool / Library | Purpose |
|:---------------|:--------|
| Arduino IDE | Firmware development for ESP32 |
| ESP32 Arduino Core | ESP32 programming and wireless features |
| RTC library | DS3231 timekeeping and schedule checking |
| OLED display library | Displaying time, status, and medicine details |
| Stepper motor library | Controlling spool rotation |
| DFPlayer Mini library | Playing audio reminder files |
| Wi-Fi / Bluetooth libraries | Mobile app connectivity and caregiver notifications |

---

## Mechanical / CAD

> Describe fabricated components.

| Component | Process | Material | Notes |
|:----------|:--------|:---------|:------|
| Recycled spool organizer | Upcycling / CAD modification | 3D printer filament spool | Main circular medicine enclosure |
| Medicine compartments | 3D printing / laser cutting | PLA / acrylic / cardboard prototype material | Weekly medicine slots |
| Motor mount | 3D CAD | PLA / acrylic | Holds stepper motor in alignment |
| Electronics housing | 3D CAD / laser cutting | PLA / acrylic | Protects ESP32, RTC, motor driver, and audio module |

---

# 8. Prototype Development

## Version 1

| Field | Details |
|:------|:--------|
| **Description** | Basic circular medicine organizer concept using a recycled 3D printer filament spool with marked compartments. |
| **Lessons Learned** | Compartments must be clearly visible, easy to access, and aligned with the rotation mechanism. |

---

## Version 2

| Field | Details |
|:------|:--------|
| **Description** | ESP32-based prototype with RTC scheduling, buzzer reminder, OLED display, and stepper-based rotation. |
| **Lessons Learned** | Accurate timing, motor calibration, and simple feedback are essential for reliable use. |

---

## Final Prototype

| Field | Details |
|:------|:--------|
| **Description** | IoT-enabled medicine sorting and reminder device with voice guidance, LED indication, motorized compartment positioning, OLED status display, push-button controls, and IR access detection. |

```html
<p align="center">
  <img src="images/prototype-final.jpg" width="500" alt="Final Prototype">
</p>
```

---

# 9. Testing & Validation

## Testing Plan

| # | Test | Success Criteria | Result |
|:-:|-----|:-----------------|:------:|
| 1 | RTC schedule reminder | Reminder activates at the programmed time | ⬜ |
| 2 | Motor positioning | Spool rotates to the correct compartment | ⬜ |
| 3 | Voice, LED, and sensor feedback | Correct audio plays, correct slot lights, and access is detected | ⬜ |

---

## User Feedback

| User | Feedback | Action Taken |
|:-----|:---------|:-------------|
| Elderly user | Voice reminders are easier to understand than only a buzzer. | Added DFPlayer Mini and speaker for audio guidance. |
| Caregiver | Correct slot indication is important to avoid confusion. | Added LED / NeoPixel visual guidance. |

---

# 10. Innovation Assessment

## Existing Solutions

> List competing products.

| Product / Patent | Strengths | Weaknesses |
|:-----------------|:----------|:-----------|
| Basic pill organizer | Low cost and simple | No automatic reminder, voice guidance, or access detection |
| Phone alarm reminder | Easy to set and portable | Does not identify the correct medicine or compartment |
| Smart pill dispenser | Automated and connected | Often costly and less sustainable |

---

## What Makes This Different?

This project combines a recycled 3D printer filament spool, motorized compartment positioning, voice guidance, LED indication, IoT connectivity, and low-cost electronics. It supports elderly users and caregivers while promoting sustainability through upcycling.

---

## Innovation Score

| Parameter | Score (1–5) | Justification |
|:----------|:----------:|:--------------|
| Novelty | 4 | Uses a recycled spool as the main circular medicine organizer. |
| Technical Depth | 4 | Integrates ESP32, RTC, motor control, audio, display, sensor, and wireless features. |
| Feasibility | 4 | Uses low-cost and easily available components. |
| Impact | 5 | Helps reduce missed doses and incorrect medicine intake. |
| Scalability | 4 | Can be expanded with app support, cloud logs, and caregiver alerts. |

---

# 11. Intellectual Property

## Prior Art Search

> Patents / Products Found:

| Reference | Relevance | Differentiation |
|:----------|:----------|:----------------|
| Traditional pill boxes | Organize medicines by day and time | No motorized slot positioning, voice guidance, or IoT logging |
| Electronic reminder pill boxes | Provide alarm-based reminders | Limited support for identifying the correct compartment |
| Smart pill dispensers | Automate medicine dispensing | Higher cost and not based on recycled spool enclosure |

---

## Novel Features

1. Recycled filament spool converted into a circular smart medicine organizer.
2. Motorized compartment positioning combined with LED and voice guidance.
3. ESP32-based low-cost system with access detection and caregiver connectivity.

---

## Provisional Patent Draft

| Section | Content |
|:--------|:--------|
| **Title** | Smart Medicine Sorting and Reminder Device Using Recycled Spool-Based Compartment Mechanism |
| **Abstract** | An IoT-enabled medicine organizer that uses a recycled filament spool as a circular storage mechanism. The system provides scheduled reminders, motorized compartment positioning, visual indication, voice guidance, and optional access detection for medicine retrieval. |
| **Problem** | Elderly patients and users with complex medicine schedules often miss doses or take incorrect medicines due to confusion, forgetfulness, or lack of caregiver support. |
| **Solution** | A low-cost smart organizer that stores weekly medicine doses, alerts the user at scheduled times, rotates to the correct compartment, lights the slot, announces instructions, and detects access. |
| **Claims** | Spool-based compartment design, scheduled motorized positioning, combined voice and LED medicine guidance, and caregiver notification support through ESP32 connectivity. |

---

# 12. Business & Deployment

| Topic | Details |
|:------|:--------|
| **Target Users** | Elderly patients, people with chronic illnesses, caregivers, families, clinics, and home healthcare providers |
| **Estimated Cost** | Low-cost prototype using ESP32, RTC, OLED, motor, audio module, buttons, buzzer, IR sensor, and recycled spool body |
| **Market Opportunity** | Growing demand for elderly care, home healthcare, medication adherence tools, and affordable assistive devices |
| **Sustainability Considerations** | Reuses discarded 3D printer filament spools and promotes upcycling in healthcare device design |

---

# 13. Final Demonstration

## Prototype Images

```html
<p align="center">
  <img src="images/demo-1.jpg" width="300" alt="Demo 1">
  <img src="images/demo-2.jpg" width="300" alt="Demo 2">
</p>
```

---

## Demonstration Video Link

> [Advertisement Video](https://youtu.be/VeL1t_9wYrM?si=e5plWxUvcQX88zFm)

---

## GitHub Repository

> `https://github.com/<your-username>/MakerMania-2026-CircuitBreakers`

---

## Presentation Link

> [Project Presentation on Canva](https://canva.link/8ibtr7vefrchxkn)

---

# 14. Reflection

| Question | Response |
|:---------|:---------|
| **What Worked Well?** | The project combines healthcare, IoT, automation, accessibility, and sustainability in one practical solution. |
| **What Failed?** | Mechanical alignment, motor accuracy, and sensor placement need careful testing and iteration. |
| **Key Learnings** | Healthcare devices must be reliable, simple to use, and clear through both audio and visual feedback. |

---

## Next Steps

- [ ] Patent Filing
- [ ] Startup Exploration
- [ ] Product Development
- [ ] Research Publication
- [ ] Competition Submission

---

# 15. Final Deliverables Checklist

| Deliverable | Status |
|:------------|:------:|
| Problem Discovery Complete | ✅ |
| User Interviews Complete | ⬜ |
| Persona Created | ✅ |
| Problem Statement Finalized | ✅ |
| System Design Complete | ✅ |
| Prototype Demonstrated | ⬜ |
| Testing Completed | ⬜ |
| Patent Draft Prepared | ✅ |
| Presentation Submitted | ⬜ |
| GitHub Repository Updated | ✅ |

---

# 🎤 MAKERMANIA FINAL PITCH

<p align="center">
  <strong>Presentation Time:</strong> 5 Minutes &nbsp;·&nbsp;
  <strong>Q&amp;A:</strong> 3 Minutes
</p>

Each team will present:

| # | Topic |
|:-:|-------|
| 1 | Problem: missed and incorrect medicine intake |
| 2 | User Research: elderly users and caregivers need clearer reminders |
| 3 | Insights: voice, light, and physical positioning reduce confusion |
| 4 | Solution: smart rotating medicine organizer using a recycled spool |
| 5 | Prototype Demo: reminder, voice instruction, LED indication, and motor rotation |
| 6 | Innovation & Patentability: low-cost IoT device with sustainable spool mechanism |
| 7 | Future Roadmap: app connectivity, caregiver alerts, logging, and refined enclosure |

---

<p align="center">
  <sub>MakerMania 2026 · MBF Tinkerers' Lab 007 · Circuit Breakers</sub>
</p>
