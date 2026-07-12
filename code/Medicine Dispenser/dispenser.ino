#include <Stepper.h>
#include <DFRobotDFPlayerMini.h>
#include <Wire.h>
#include <LiquidCrystal_I2C.h>
#include <RTClib.h>
#include <EEPROM.h>
#define IR 8
unsigned long old_time;
unsigned long timer;
int lastDispenseMinute = -1;
int lastDispenseHour = -1;
unsigned long lastReminder = 0;
const unsigned long reminderInterval = 5000;   // 5 seconds

String message;

RTC_DS3231 rtc;
// Common I2C addresses: 0x27 or 0x3F
LiquidCrystal_I2C lcd(0x27, 16, 2);
DFRobotDFPlayerMini player;




const int stepsPerRevolution = 2048;  // 28BYJ-48 full revolution
// IN1, IN3, IN2, IN4 pins on ULN2003
Stepper myStepper1(stepsPerRevolution, 24, 26, 25, 27);
Stepper myStepper2(stepsPerRevolution, 44, 46, 45, 47);
Stepper myStepper3(stepsPerRevolution, 34, 36, 35, 37);


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

Medicine medicines[3];

//Indroduction function
void introduction() {
  lcd.setCursor(0, 0);
  lcd.print(F("Medicine"));
  lcd.setCursor(0, 1);
  lcd.print(F("Dispenser Ready"));
  player.play(4);
}

void CheckTime() {

  const char* daysOfWeek[] = { "Sun", "Mon", "Tue", "Wed", "Thur", "Fri", "Sat" };
  DateTime now = rtc.now();
  if (millis() - old_time > 1000) {
    // Line 2: Date
    lcd.setCursor(0, 1);
    lcd.print(now.day());
    lcd.print('/');

    if (now.month() < 10) lcd.print('0');
    lcd.print(now.month());
    lcd.print('/');

    lcd.print(now.year());
    lcd.print("  ");
    lcd.print(daysOfWeek[now.dayOfTheWeek()]);

    // Line 1: Time
    lcd.setCursor(0, 0);
    lcd.print("TIME: ");

    if (now.hour() < 10) lcd.print('0');
    lcd.print(now.hour());
    lcd.print(':');

    if (now.minute() < 10) lcd.print('0');
    lcd.print(now.minute());
    lcd.print(':');

    if (now.second() < 10) lcd.print('0');
    lcd.print(now.second());
    old_time = millis();
  }
}

void Dispense(bool Dispenser_slot[]) {
  for (int s = 0; s < 3; s++) {
    Serial.print("Slot");
    Serial.print(s);
    Serial.print(":");
    Serial.println(Dispenser_slot[s]);
  }
  if (Dispenser_slot[0]) {
    lcd.clear();
    lcd.setCursor(0, 0);
    lcd.print(medicines[0].medicineName);
    delay(4000);
  }
  if (Dispenser_slot[1]) {
    lcd.clear();
    lcd.setCursor(0, 0);
    lcd.print(medicines[1].medicineName);
    delay(4000);
  }
  if (Dispenser_slot[2]) {
    lcd.clear();
    lcd.setCursor(0, 0);
    lcd.print(medicines[2].medicineName);
    delay(4000);
  }
    lcd.clear();
    lcd.setCursor(0, 0);
    lcd.print("Please Take Your");
    lcd.setCursor(3, 1);
    lcd.print("Medicines");
  player.play(1);
  lastReminder = millis();

  while (digitalRead(IR) == HIGH) {

    if (millis() - lastReminder >= reminderInterval) {
      player.play(1);
      lastReminder = millis();
    }
  }

  // Medicine picked up
  lcd.clear();
  lcd.setCursor(3, 1);
  lcd.print("Thank You");
  delay(4000);
}
void AlertMedicine() {
  DateTime now = rtc.now();

  // Already dispensed during this minute
  if (now.hour() == lastDispenseHour &&
      now.minute() == lastDispenseMinute) {
    return;
  }

  bool Dispenser_slot[3] = {false, false, false};
  bool dispenseNow = false;

  for (int i = 0; i < 3; i++) {

    if (!medicines[i].enabled)
      continue;

    if (!medicines[i].days[now.dayOfTheWeek()])
      continue;

    for (int j = 0; j < medicines[i].dosesPerDay; j++) {

      if (medicines[i].hour[j] == now.hour() &&
          medicines[i].minute[j] == now.minute()) {

        Serial.print(medicines[i].medicineName);
        Serial.println(" is dispensed");

        Dispenser_slot[i] = true;
        dispenseNow = true;
        break;
      }
    }
  }

  if (dispenseNow) {
    Dispense(Dispenser_slot);

    // Remember this minute
    lastDispenseHour = now.hour();
    lastDispenseMinute = now.minute();
  }
}
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

    for (int j = 0; j < medicines[i].dosesPerDay; j++) {
      Serial.print(medicines[i].hour[j]);
      Serial.print(":");

      if (medicines[i].minute[j] < 10)
        Serial.print('0');

      Serial.print(medicines[i].minute[j]);
      Serial.print("  ");
    }

    Serial.println();

    Serial.print("Days: ");

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
  for (int i = 0; i < 5; i++) {
    token = strtok(NULL, ",");

    if (strcmp(token, "99:99") == 0) {
      med.hour[i] = 255;
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
  medicines[med.slot - 1] = med;

  //---------------- Save in EEPROM ----------------
  int address = (med.slot - 1) * sizeof(Medicine);

  EEPROM.put(address, medicines[med.slot - 1]);

  Serial.println("Medicine Saved Successfully");
  lcd.clear();
  lcd.setCursor(0, 0);
  lcd.print("Data Stored");
}
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

void Debug_Machine() {
  lcd.clear();
  lcd.setCursor(0, 1);
  lcd.print("Debugging......");
  delay(2000);
  DisplayMedicines();
}

void Serial_ESP() {
  // while (Serial3.available()) {
  //   Serial.write(Serial3.read());
  // }
  char data[100];
  if (Serial.available()) {
    message = Serial.readStringUntil('\n');
    Serial.println(message);
    int pos = message.indexOf('=');
    String key = message.substring(0, pos);
    String value = message.substring(pos + 1);

    if (key == "New_med") {
      value.toCharArray(data, sizeof(data));
      NewMedicine(data);
    } else if (key == "Debug") {
      Debug_Machine();
      Empty_Slot();

  }
}
}

void setup() {
  myStepper1.setSpeed(10);  // RPM
  myStepper2.setSpeed(10);  // RPM
  myStepper3.setSpeed(10);  // RPM

  Wire.begin();  // Uses Mega pins 20 and 21
  Serial.begin(9600);
  Serial2.begin(9600);
  Serial3.begin(9600);  // ESP8266

  for (int i = 0; i < 3; i++) {
    EEPROM.get(i * sizeof(Medicine), medicines[i]);
  }

  if (!rtc.begin()) {
    Serial.println("RTC not found");
    while (1)
      ;
  }

  // Uncomment once to set the time
  // rtc.adjust(DateTime(F(__DATE__), F(__TIME__)));

  pinMode(IR, INPUT);

  lcd.init();         // Initialize LCD
  lcd.backlight();  // Turn on backlight


  // DFPlayer --------------------------------------------------------------
  if (player.begin(Serial2)) {
    player.volume(25);
  } else {
    Serial.println(F("DFPlayer NOT detected!"));
  }
  //Machine Start
  introduction();
  delay(4000);
}
void loop() {
  CheckTime();
  AlertMedicine();
  Serial_ESP();
}