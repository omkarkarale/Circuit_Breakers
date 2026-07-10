void setup() {
  Serial.begin(9600);      // PC
  Serial3.begin(9600);     // ESP8266

  Serial.println("Mega Ready");
}

void loop() {
  // PC -> ESP8266
  while (Serial.available()) {
    Serial3.write(Serial.read());
  }

  // ESP8266 -> PC
  while (Serial3.available()) {
    Serial.write(Serial3.read());
  }
}