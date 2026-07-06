#include "S:\Arduino\libraries\DigitalPower\DigitalPower.h"

void setup() {
  Serial.begin(115200);
  pinMode(8,INPUT);
}

void loop() {
  // Main loop code here
  int IR = digitalRead(8);
  if(IR == LOW) {
    Serial.println("IR signal detected");
  } else {
    Serial.println("No IR signal");
  }
}