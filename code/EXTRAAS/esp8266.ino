#include <ESP8266WiFi.h>
#include <ESP8266WebServer.h>
#include <SoftwareSerial.h>

// RX, TX
SoftwareSerial MegaSerial(D5, D6);

ESP8266WebServer server(80);

const char* ssid = "ESP8266_CHAT";
const char* password = "12345678";

String webpage = R"rawliteral(
<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<title>ESP8266 Chat</title>
</head>
<body>
<h2>ESP8266 → Arduino Mega</h2>

<input type="text" id="msg" placeholder="Enter message">
<button onclick="sendMsg()">Send</button>

<script>
function sendMsg(){
  var m=document.getElementById("msg").value;
  fetch("/send?msg="+encodeURIComponent(m));
  document.getElementById("msg").value="";
}
</script>

</body>
</html>
)rawliteral";

void handleRoot()
{
  server.send(200, "text/html", webpage);
}

void handleSend()
{
  if(server.hasArg("msg"))
  {
    String msg = server.arg("msg");

    MegaSerial.println(msg);     // Send to Arduino Mega

    Serial.print("Sent: ");
    Serial.println(msg);

    server.send(200, "text/plain", "Message Sent");
  }
  else
  {
    server.send(200, "text/plain", "No Message");
  }
}

void setup()
{
  Serial.begin(9600);
  MegaSerial.begin(9600);

  WiFi.softAP(ssid, password);

  Serial.println();
  Serial.print("IP Address: ");
  Serial.println(WiFi.softAPIP());

  server.on("/", handleRoot);
  server.on("/send", handleSend);

  server.begin();
}

void loop()
{
  server.handleClient();

  // Receive from Mega
  while(MegaSerial.available())
  {

    Serial.write(MegaSerial.read());
  }
}