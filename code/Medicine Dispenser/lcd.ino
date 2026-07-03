#include <Wire.h>
#include <LiquidCrystal_I2C.h>

// Common I2C addresses: 0x27 or 0x3F
LiquidCrystal_I2C lcd(0x27, 16, 2);

void setup() {
  lcd.init();          // Initialize LCD
  lcd.backlight();     // Turn on backlight

  lcd.setCursor(0, 0);
  lcd.print("Hello World!");

  lcd.setCursor(0, 1);
  lcd.print("Arduino Mega");
}

void loop() {
}