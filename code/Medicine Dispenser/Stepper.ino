 #include <Stepper.h>
#include "S:\Arduino\libraries\DigitalPower\DigitalPower.h"

const int stepsPerRevolution = 2048; // 28BYJ-48 full revolution

// IN1, IN3, IN2, IN4 pins on ULN2003
Stepper myStepper1(stepsPerRevolution, 26,28,27,29);
Stepper myStepper2(stepsPerRevolution, 30,32,31,33);
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
  myStepper2.step(stepsPerRevolution); // One full revolution clockwise
  myStepper3.step(stepsPerRevolution); // One full revolution clockwise
  delay(1000);

  Serial.println("Counterclockwise");
  myStepper1.step(-stepsPerRevolution); // One full revolution counterclockwise
  myStepper2.step(-stepsPerRevolution); // One full revolution counterclockwise
  myStepper3.step(-stepsPerRevolution); // One full revolution counterclockwise
  delay(1000);
}