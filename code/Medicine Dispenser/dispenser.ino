#include <Wire.h>
#include <RTClib.h>
#include <LiquidCrystal_I2C.h>
#include <DFRobotDFPlayerMini.h>
#include "S:\Arduino\libraries\DigitalPower\DigitalPower.h"

DFRobotDFPlayerMini player;

// Common I2C addresses: 0x27 or 0x3F
LiquidCrystal_I2C lcd(0x27, 16, 2);
RTC_DS3231 rtc;
bool TakeMeds = false;
void setup() {
  Serial.begin(115200);
  Serial3.begin(9600);
   lcd.init();          // Initialize LCD
  lcd.backlight();     // Turn on backlight
  Wire.begin(); // Uses Mega pins 20 and 21
  DigitalPower(5,6);
  
  Serial.println("Checking DFPlayer...");

  if (!player.begin(Serial3)) {
    Serial.println("DFPlayer NOT detected!");
    while (1);
      player.volume(25);
  }

  if (!rtc.begin()) {
    Serial.println("RTC not found");
    while (1);
  }

  // Uncomment once to set the time
  // rtc.adjust(DateTime(F(__DATE__), F(__TIME__)));

}

void loop() {
  lcd.clear();
  int IR = digitalRead(7);
  DateTime now = rtc.now();

  // Serial.print(now.day());
  // Serial.print("/");
  // Serial.print(now.month());
  // Serial.print("/");
  // Serial.print(now.year());

  Serial.print(" ");
  lcd.setCursor(4, 0);

  lcd.print(now.hour());
  lcd.print(":");
  lcd.print(now.minute());
  lcd.print(":");
  lcd.print(now.second());
  if (now.hour() == 15 && now.minute() == 2) {


    if (IR == HIGH && TakeMeds == false) {
      lcd.setCursor(0, 1);
      lcd.print("Take your Meds!!");
      player.play(5);
      delay(4000);
    } 
    else if (IR == LOW) {
        lcd.setCursor(3, 1);
        lcd.print("Thankyou!!");
        delay(2000);
        TakeMeds = true;

      }
  }
  delay(1000);

} 