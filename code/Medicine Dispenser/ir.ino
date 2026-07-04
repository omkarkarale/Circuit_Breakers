#include "S:\Arduino\libraries\DigitalPower\DigitalPower.h"

void setup() {
  Serial.begin(115200);
  DigitalPower(5,6);
  pinMode(7,INPUT);
}

void loop() {
  // Main loop code here
  int IR = digitalRead(7);
  if(IR == LOW) {
    Serial.println("IR signal detected");
  } else {
    Serial.println("No IR signal");
  }
}