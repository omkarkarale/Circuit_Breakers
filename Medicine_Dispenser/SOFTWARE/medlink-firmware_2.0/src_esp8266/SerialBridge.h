#ifndef SERIAL_BRIDGE_H
#define SERIAL_BRIDGE_H

#include <Arduino.h>
#include <SoftwareSerial.h>
#include <ArduinoJson.h>
#include <functional>

using RespCallback = std::function<void(bool ok, JsonVariant data)>;
using EventHandler = std::function<void(const String& name, JsonVariant payload)>;

struct PendingCmd {
    int id = -1;
    unsigned long sentAt = 0;
    unsigned long timeoutMs = 2000;
    RespCallback callback;
    bool active = false;
};

class SerialBridge {
public:
    static void begin(SoftwareSerial& serial);
    static void setEventHandler(EventHandler handler);
    static int sendCommand(const String& op, JsonObject payload, RespCallback cb, unsigned long timeoutMs = 2000);
    static int sendCommand(const String& op, RespCallback cb, unsigned long timeoutMs = 2000);
    static void poll();
    static JsonDocument& getCachedCapabilities();
    static bool capabilitiesKnown();

private:
    static SoftwareSerial* _sw;
    static String _rxBuf;
    static PendingCmd _pending[8];
    static int _nextId;
    static EventHandler _onEvent;
    static JsonDocument _caps;
    static bool _capsKnown;
    static unsigned long _capsLastAttempt;

    static void _dispatchLine(const String& line);
    static void _checkTimeouts();
    static int _allocSlot();
    static void _writeLine(JsonDocument& doc);
};

#endif // SERIAL_BRIDGE_H
