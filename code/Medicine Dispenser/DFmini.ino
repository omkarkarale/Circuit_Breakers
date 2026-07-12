#include <DFRobotDFPlayerMini.h>

DFRobotDFPlayerMini player;

void setup() { 
  Serial.begin(115200);
  Serial2.begin(9600);

  Serial.println("Checking DFPlayer...");

  if (!player.begin(Serial2)) {
    Serial.println("DFPlayer NOT detected!");
    while (1);
  }

  Serial.println("DFPlayer detected successfully!");
  player.volume(25);
  // player.play(1);
  // delay(4000);  
  player.play(4);
  delay(4000);
}

void loop() {
}