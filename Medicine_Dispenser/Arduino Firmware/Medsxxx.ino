// ============================================================================
// Medicine Dispenser
// ----------------------------------------------------------------------------
// A stepper-motor based automatic medicine dispenser.
// - Keeps time using an RTC (DS3231) and displays it on a 16x2 I2C LCD.
// - Stores up to 3 medicines (one per slot) with custom dosing schedules
//   (up to 5 doses/day, on chosen days of the week) in EEPROM so the
//   schedule survives power loss.
// - When a scheduled dose time is reached, it announces/dispenses the
//   medicine, plays an audio prompt (DFPlayer Mini MP3 module), and waits
//   for an IR sensor to detect that the medicine has been picked up.
// - Medicine schedules can be programmed/updated over Serial (e.g. from an
//   ESP8266 companion board or a PC) using a simple comma-separated protocol.
// ============================================================================

#include <Stepper.h>              // Library to drive 28BYJ-48 stepper motors via ULN2003 driver
#include <DFRobotDFPlayerMini.h>  // Library for the DFPlayer Mini MP3 module (audio prompts)
#include <Wire.h>                 // I2C communication (used by LCD and RTC)
#include <LiquidCrystal_I2C.h>    // I2C-based 16x2 character LCD driver
#include <RTClib.h>               // Real-Time Clock (DS3231) library
#include <EEPROM.h>               // Non-volatile storage so medicine schedules persist across reboots

#define IR 7  // Digital pin connected to the IR "pill tray" sensor

unsigned long old_time;                       // Last millis() timestamp the LCD time/date was refreshed
unsigned long timer;                          // (Unused elsewhere) general-purpose timer variable
int lastDispenseMinute = -1;                  // Minute of the last dispense event, used to avoid re-triggering within the same minute
int lastDispenseHour = -1;                    // Hour of the last dispense event, used to avoid re-triggering within the same minute
unsigned long lastReminder = 0;               // millis() timestamp of the last audio reminder played while waiting for pickup
unsigned long MissedAlarm = 0;                // millis() timestamp of the last audio reminder played while waiting for pickup
const unsigned long reminderInterval = 5000;  // 5 seconds - how often to repeat the "take your medicine" reminder sound

String message;  // Buffer holding the most recent line read from Serial (from ESP8266/PC)

RTC_DS3231 rtc;  // RTC object used to read the current date/time
// Common I2C addresses: 0x27 or 0x3F
LiquidCrystal_I2C lcd(0x27, 16, 2);  // LCD object: I2C address 0x27, 16 columns x 2 rows
DFRobotDFPlayerMini player;          // MP3 player object for audio prompts




// Stepper motor configuration for the three dispenser slots
const int stepsPerRevolution = 2048;  // 28BYJ-48 full revolution (steps needed for one full turn)
// IN1, IN3, IN2, IN4 pins on ULN2003
Stepper myStepper1(stepsPerRevolution, 24, 26, 25, 27);  // Stepper motor for slot 1
Stepper myStepper2(stepsPerRevolution, 44, 46, 45, 47);  // Stepper motor for slot 2
Stepper myStepper3(stepsPerRevolution, 34, 36, 35, 37);  // Stepper motor for slot 3


// Data structure describing a single medicine's schedule and metadata
struct Medicine {

  char medicineName[16];  // Medicine name (15 chars + '\0')

  byte slot;  // 1, 2 or 3

  byte dosesPerDay;  // Number of times per day (1-5)

  byte hour[5];    // Hours for each dose
  byte minute[5];  // Minutes for each dose

  bool days[7];  // Sunday, Monday, Tuesday, Wednesday,
                 // Thursday, Friday, Saturday

  bool enabled;  // Medicine active or not
};

Medicine medicines[3];  // Holds the schedule/config for each of the 3 dispenser slots (index 0-2 = slot 1-3)

//Indroduction function
// Displays a welcome message on the LCD and plays a startup sound.
void introduction() {
  lcd.setCursor(0, 0);
  lcd.print(F("Medicine"));
  lcd.setCursor(0, 1);
  lcd.print(F("Dispenser Ready"));
  player.play(4);  // Play startup/ready audio track #4
}

// Reads the current time from the RTC and refreshes the LCD display
// (date/day on row 2, time on row 1), but only once per second to avoid
// unnecessary I2C traffic/flicker.
void CheckTime() {

  const char* daysOfWeek[] = { "Sun", "Mon", "Tue", "Wed", "Thur", "Fri", "Sat" };
  DateTime now = rtc.now();          // Get current date/time from RTC
  if (millis() - old_time > 1000) {  // Only update the display once per second
    // Line 2: Date
    lcd.setCursor(0, 1);
    lcd.print(now.day());
    lcd.print('/');

    if (now.month() < 10) lcd.print('0');  // Zero-pad single digit months
    lcd.print(now.month());
    lcd.print('/');

    lcd.print(now.year());
    lcd.print("  ");
    lcd.print(daysOfWeek[now.dayOfTheWeek()]);  // Print abbreviated day name

    // Line 1: Time
    lcd.setCursor(0, 0);
    lcd.print("TIME: ");

    if (now.hour() < 10) lcd.print('0');  // Zero-pad single digit hours
    lcd.print(now.hour());
    lcd.print(':');

    if (now.minute() < 10) lcd.print('0');  // Zero-pad single digit minutes
    lcd.print(now.minute());
    lcd.print(':');

    if (now.second() < 10) lcd.print('0');  // Zero-pad single digit seconds
    lcd.print(now.second());
    old_time = millis();  // Remember when we last refreshed the display
  }
}

// Dispenses medicine for whichever slots are flagged true in Dispenser_slot[],
// shows each medicine's name on the LCD, then prompts the user to take their
// medicine and waits (blocking) until the IR sensor detects pickup, repeating
// the audio reminder every `reminderInterval` ms while waiting.
void Dispense(bool Dispenser_slot[]) {
  // Debug: print which slots are being dispensed this round
  for (int s = 0; s < 3; s++) {
    Serial.print("Slot");
    Serial.print(s);
    Serial.print(":");
    Serial.println(Dispenser_slot[s]);
  }
  // Slot 1: show medicine name if flagged for dispensing
  if (Dispenser_slot[0]) {
    lcd.clear();
    lcd.setCursor(0, 0);
    lcd.print(medicines[0].medicineName);
    delay(4000);
  }
  // Slot 2: show medicine name if flagged for dispensing
  if (Dispenser_slot[1]) {
    lcd.clear();
    lcd.setCursor(0, 0);
    lcd.print(medicines[1].medicineName);
    delay(4000);
  }
  // Slot 3: show medicine name if flagged for dispensing
  if (Dispenser_slot[2]) {
    lcd.clear();
    lcd.setCursor(0, 0);
    lcd.print(medicines[2].medicineName);
      myStepper3.step(stepsPerRevolution); // One full revolution clockwise

    delay(4000);
  }
  // Prompt the user to take their medicine
  lcd.clear();
  lcd.setCursor(0, 0);
  lcd.print("Please Take Your");
  lcd.setCursor(3, 1);
  lcd.print("Medicines");
  player.play(1);  // Play "take your medicine" audio track #1
  lastReminder = millis();
  MissedAlarm = millis();  // Start the reminder repeat timer

  // Wait here until the IR sensor goes LOW (medicine picked up),
  // re-playing the reminder sound periodically while waiting.
  while (digitalRead(IR) == HIGH) {

    if (millis() - lastReminder >= reminderInterval) {
      player.play(1);
      lastReminder = millis();
    }
    if (millis() - MissedAlarm >= 20000) {
      lcd.clear();
      lcd.setCursor(0, 0);
      lcd.print("Medicine Missed");
      delay(2000);
      break;
    }
  }

  // Medicine picked up
  lcd.clear();
  lcd.setCursor(3, 1);
  lcd.print("Thank You");
  delay(4000);
}

// Checks the current time against every enabled medicine's schedule and
// triggers dispensing for any medicine whose dose time matches "now".
// Ensures dispensing only happens once per matching minute.
void AlertMedicine() {
  DateTime now = rtc.now();

  // Already dispensed during this minute
  if (now.hour() == lastDispenseHour && now.minute() == lastDispenseMinute) {
    return;
  }

  bool Dispenser_slot[3] = { false, false, false };  // Which slots need to dispense this round
  bool dispenseNow = false;                          // Whether any slot matched the current time

  for (int i = 0; i < 3; i++) {

    if (!medicines[i].enabled)  // Skip disabled/empty slots
      continue;

    if (!medicines[i].days[now.dayOfTheWeek()])  // Skip if not scheduled for today
      continue;

    // Check each configured dose time for this medicine
    for (int j = 0; j < medicines[i].dosesPerDay; j++) {

      if (medicines[i].hour[j] == now.hour() && medicines[i].minute[j] == now.minute()) {

        Serial.print(medicines[i].medicineName);
        Serial.println(" is dispensed");

        Dispenser_slot[i] = true;  // Mark this slot for dispensing
        dispenseNow = true;
        break;  // No need to check remaining doses for this medicine
      }
    }
  }

  if (dispenseNow) {
    Dispense(Dispenser_slot);  // Perform the actual dispensing/pickup sequence

    // Remember this minute so we don't dispense again until the next match
    lastDispenseHour = now.hour();
    lastDispenseMinute = now.minute();
  }
}

// Prints the full configuration of all 3 medicine slots to Serial,
// for debugging/verification purposes.
void DisplayMedicines() {
  const char* days[] = {
    "Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"
  };

  for (int i = 0; i < 3; i++) {
    Serial.println("======================");
    Serial.print("Slot: ");
    Serial.println(i + 1);

    Serial.print("Medicine: ");
    Serial.println(medicines[i].medicineName);

    Serial.print("Doses: ");
    Serial.println(medicines[i].dosesPerDay);

    Serial.print("Times: ");

    // Print each configured dose time (HH:MM)
    for (int j = 0; j < medicines[i].dosesPerDay; j++) {
      Serial.print(medicines[i].hour[j]);
      Serial.print(":");

      if (medicines[i].minute[j] < 10)
        Serial.print('0');  // Zero-pad single digit minutes

      Serial.print(medicines[i].minute[j]);
      Serial.print("  ");
    }

    Serial.println();

    Serial.print("Days: ");

    // Print which days of the week this medicine is scheduled
    for (int j = 0; j < 7; j++) {
      if (medicines[i].days[j]) {
        Serial.print(days[j]);
        Serial.print(" ");
      }
    }

    Serial.println();

    Serial.print("Enabled: ");
    Serial.println(medicines[i].enabled);
  }
}

// Parses a comma-separated medicine definition string (received over Serial)
// and stores it both in RAM (medicines[]) and in EEPROM for persistence.
//
// Expected format (comma-separated):
//   name,slot,dosesPerDay,HH:MM,HH:MM,HH:MM,HH:MM,HH:MM,day0,day1,...,day6,enabled
//   - Unused dose slots are marked "99:99"
//   - Days not scheduled are marked "X"; scheduled days are given as their index (0-6)
void NewMedicine(char* data) {
  Medicine med;

  char* token;

  //---------------- Medicine Name ----------------
  token = strtok(data, ",");
  strcpy(med.medicineName, token);

  //---------------- Slot ----------------
  token = strtok(NULL, ",");
  med.slot = atoi(token);

  //---------------- Doses Per Day ----------------
  token = strtok(NULL, ",");
  med.dosesPerDay = atoi(token);

  //---------------- Five Times ----------------
  // Always parse exactly 5 dose-time fields (unused ones are "99:99" placeholders)
  for (int i = 0; i < 5; i++) {
    token = strtok(NULL, ",");

    if (strcmp(token, "99:99") == 0) {
      med.hour[i] = 255;  // 255 marks an unused/inactive dose slot
      med.minute[i] = 255;
    } else {
      sscanf(token, "%hhu:%hhu",
             &med.hour[i],
             &med.minute[i]);
    }
  }

  //---------------- Clear Days ----------------
  for (int i = 0; i < 7; i++)
    med.days[i] = false;

  //---------------- Seven Day Fields ----------------
  // Each field is either "X" (not scheduled) or a day index 0-6 (scheduled)
  for (int i = 0; i < 7; i++) {
    token = strtok(NULL, ",");

    if (strcmp(token, "X") != 0) {
      byte day = atoi(token);

      if (day < 7)
        med.days[day] = true;
    }
  }

  //---------------- Enabled ----------------
  token = strtok(NULL, ",");

  med.enabled = atoi(token);

  //---------------- Save in RAM ----------------
  medicines[med.slot - 1] = med;  // Slots are 1-indexed in the protocol, 0-indexed in the array

  //---------------- Save in EEPROM ----------------
  int address = (med.slot - 1) * sizeof(Medicine);  // Each slot gets its own fixed-size EEPROM block

  EEPROM.put(address, medicines[med.slot - 1]);

  Serial.println("Medicine Saved Successfully");
  lcd.clear();
  lcd.setCursor(0, 0);
  lcd.print("Data Stored");
  delay(2000);
}

// Reports (over Serial) which slots currently have no medicine configured (disabled).
void Empty_Slot() {
  Serial.println('\n');
  for (int i = 0; i < 3; i++) {
    if (medicines[i].enabled == 0) {
      Serial.print("Slot:");
      Serial.print(i + 1);
      Serial.println(" is empty.");
    }
  }
}

// Shows a "Debugging" message on the LCD, then dumps all medicine
// configurations to Serial via DisplayMedicines().
void Debug_Machine() {
  lcd.clear();
  lcd.setCursor(0, 1);
  lcd.print("Debugging......");
  delay(2000);
  // DisplayMedicines();
}
void UpdateRTC(String value) {

  int date[3];
  int time[3];

  if (sscanf(value.c_str(),
             "rtc(%d,%d,%d,%d,%d,%d)",
             &date[0], &date[1], &date[2],
             &time[0], &time[1], &time[2]) == 6) {

    rtc.adjust(DateTime(
      date[0],   // Year
      date[1],   // Month
      date[2],   // Day
      time[0],   // Hour
      time[1],   // Minute
      time[2]    // Second
    ));

  }
  else {
    Serial3.println("Invalid RTC format");
  }
}

// Listens on the main Serial port for commands sent from a companion
// device (e.g. ESP8266) or PC, in the form "key=value", and dispatches:
//   New_med=<data>  -> parse and store a new medicine schedule
//   Debug=<...>     -> dump current medicine configuration/status
void Serial_ESP() {

  char data[100];
  if (Serial3.available()) {
    message = Serial3.readStringUntil('\n');  // Read one line of input
    Serial.println(message);                  // Echo it back for debugging
    int pos = message.indexOf('=');           // Split into key/value on '='
    String key = message.substring(0, pos);
    String value = message.substring(pos + 1);

    if (key == "New_med") {
      value.toCharArray(data, sizeof(data));
      NewMedicine(data);
    } 
      if (key == "Time") {
        UpdateRTC(value);
      // Debug_Machine();
      // Empty_Slot();
    }
     if(key == "Debug"){
      if(value == "speaker"){
        player.play(4);
        Serial.println("Speaker started");
        delay(4000);
      }
    }
  }
    if (Serial.available()) {
      message = Serial.readStringUntil('\n');  // Read one line of input
      Serial3.println(message);
    
  }
}

// Arduino setup routine: initializes all peripherals (steppers, I2C bus,
// Serial ports, RTC, IR sensor, LCD, DFPlayer) and restores saved medicine
// schedules from EEPROM before showing the ready screen.
void setup() {
  myStepper1.setSpeed(10);  // RPM
  myStepper2.setSpeed(10);  // RPM
  myStepper3.setSpeed(10);  // RPM

  Wire.begin();         // Uses Mega pins 20 and 21
  Serial.begin(9600);   // Main Serial (USB / debug / command interface)
  Serial2.begin(9600);  // Used by DFPlayer Mini
  Serial3.begin(9600);  // ESP8266

  // Restore all 3 medicine schedules from EEPROM into RAM
  for (int i = 0; i < 3; i++) {
    EEPROM.get(i * sizeof(Medicine), medicines[i]);
  }

  // Halt if the RTC module isn't detected - nothing else can work without it
  if (!rtc.begin()) {
    Serial.println("RTC not found");
    while (1)
      ;
  }

  // Uncomment once to set the time
  // rtc.adjust(DateTime(F(__DATE__), F(__TIME__)));

  pinMode(IR, INPUT);  // IR pickup sensor

  lcd.init();       // Initialize LCD
  lcd.backlight();  // Turn on backlight


  // DFPlayer --------------------------------------------------------------
  if (player.begin(Serial2)) {
    player.volume(25);  // Set default playback volume (0-30)
  } else {
    Serial.println(F("DFPlayer NOT detected!"));
  }
  //Machine Start
  introduction();  // Show ready screen / play startup sound
  delay(4000);
}

// Main loop: continuously refresh the clock display, check whether any
// medicine is due, and listen for incoming Serial commands.
void loop() {
  CheckTime();
  AlertMedicine();
  Serial_ESP();
}
