 #include <Stepper.h>
#include "S:\Arduino\libraries\DigitalPower\DigitalPower.h"

const int stepsPerRevolution = 2048; // 28BYJ-48 full revolution

// IN1, IN3, IN2, IN4 pins on ULN2003
Stepper myStepper1(stepsPerRevolution, 24,26,25,27);
Stepper myStepper2(stepsPerRevolution, 44,46,45,47);
Stepper myStepper3 (stepsPerRevolution, 34,36,35,37);

void setup() {
  myStepper1.setSpeed(10); // RPM
  myStepper2.setSpeed(10); // RPM
  myStepper3.setSpeed(10); // RPM
  Serial.begin(115200);
}

void loop() {
  Serial.println("Clockwise");
  myStepper1.step(stepsPerRevolution); // One full revolution clockwise
  Serial.println("Clockwise1");
  myStepper2.step(stepsPerRevolution); // One full revolution clockwise
  Serial.println("Clockwise2");
  myStepper3.step(stepsPerRevolution); // One full revolution clockwise
  Serial.println("Clockwise3");
  delay(1000);

  Serial.println("Counterclockwise");
  myStepper1.step(-stepsPerRevolution); // One full revolution counterclockwise
  myStepper2.step(-stepsPerRevolution); // One full revolution counterclockwise
  myStepper3.step(-stepsPerRevolution); // One full revolution counterclockwise
  delay(1000);
}