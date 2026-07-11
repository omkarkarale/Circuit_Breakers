#include "SerialBridge.h"
#include <protocol.h>

SoftwareSerial* SerialBridge::_sw = nullptr;
String SerialBridge::_rxBuf = "";
PendingCmd SerialBridge::_pending[8];
int SerialBridge::_nextId = 1;
EventHandler SerialBridge::_onEvent = nullptr;
JsonDocument SerialBridge::_caps;
bool SerialBridge::_capsKnown = false;
unsigned long SerialBridge::_capsLastAttempt = 0;

void SerialBridge::begin(SoftwareSerial& serial) {
    _sw = &serial;
    _rxBuf = "";
    _capsKnown = false;
    _capsLastAttempt = 0;
    for (int i = 0; i < 8; i++) {
        _pending[i].active = false;
    }
}

void SerialBridge::setEventHandler(EventHandler handler) {
    _onEvent = handler;
}

int SerialBridge::_allocSlot() {
    for (int i = 0; i < 8; i++) {
        if (!_pending[i].active) return i;
    }
    return -1;
}

void SerialBridge::_writeLine(JsonDocument& doc) {
    if (!_sw) return;
    serializeJson(doc, *_sw);
    _sw->println();
}

int SerialBridge::sendCommand(const String& op, JsonObject payload, RespCallback cb, unsigned long timeoutMs) {
    int slot = _allocSlot();
    if (slot < 0) {
        Serial.println(F("[SB] Queue full, dropping command"));
        JsonDocument errDoc;
        errDoc["error"] = "queue_full";
        cb(false, errDoc.as<JsonVariant>());
        return -1;
    }

    int id = _nextId++;
    if (_nextId > 30000) _nextId = 1;

    _pending[slot].id = id;
    _pending[slot].sentAt = millis();
    _pending[slot].timeoutMs = timeoutMs;
    _pending[slot].callback = cb;
    _pending[slot].active = true;

    JsonDocument doc;
    doc["type"] = MSG_TYPE_CMD;
    doc["id"] = id;
    doc["op"] = op;
    for (JsonPair kv : payload) {
        doc[kv.key()] = kv.value();
    }

    _writeLine(doc);
    return id;
}

int SerialBridge::sendCommand(const String& op, RespCallback cb, unsigned long timeoutMs) {
    JsonDocument empty;
    return sendCommand(op, empty.as<JsonObject>(), cb, timeoutMs);
}

void SerialBridge::poll() {
    // 1. Read SoftwareSerial
    while (_sw && _sw->available() > 0) {
        char c = _sw->read();
        if (c == '\n') {
            _dispatchLine(_rxBuf);
            _rxBuf = "";
        } else if (c != '\r') {
            if (_rxBuf.length() < 512) {
                _rxBuf += c;
            }
        }
    }

    // 2. Check timeouts
    _checkTimeouts();

    // 3. Capability polling
    if (!_capsKnown) {
        unsigned long now = millis();
        if (now - _capsLastAttempt >= 5000 || _capsLastAttempt == 0) {
            _capsLastAttempt = now;
            Serial.println(F("[SB] Querying Mega capabilities..."));
            sendCommand("get_capabilities", [](bool ok, JsonVariant data) {
                if (ok) {
                    _capsKnown = true;
                    _caps.clear();
                    _caps.set(data);
                    Serial.println(F("[SB] Capabilities cached."));
                }
            }, 3000);
        }
    }
}

void SerialBridge::_checkTimeouts() {
    unsigned long now = millis();
    for (int i = 0; i < 8; i++) {
        if (!_pending[i].active) continue;
        if (now - _pending[i].sentAt >= _pending[i].timeoutMs) {
            _pending[i].active = false;
            JsonDocument errDoc;
            errDoc["error"] = "timeout";
            if (_pending[i].callback) {
                _pending[i].callback(false, errDoc.as<JsonVariant>());
            }
        }
    }
}

void SerialBridge::_dispatchLine(const String& line) {
    String trimmed = line;
    trimmed.trim();
    if (trimmed.length() == 0) return;

    Serial.print(F("[SB] Incoming line: "));
    Serial.println(trimmed);

    ProtocolMessage msg;
    if (!parseLine(trimmed, msg)) {
        Serial.println(F("[SB] Error: failed to parse JSON line."));
        return;
    }

    if (msg.type == MSG_TYPE_RESP) {
        // Route response to callback
        for (int i = 0; i < 8; i++) {
            if (_pending[i].active && _pending[i].id == msg.id) {
                _pending[i].active = false;
                if (_pending[i].callback) {
                    JsonVariant dataNode = msg.payload["data"];
                    if (dataNode.isNull()) {
                        dataNode = msg.payload.as<JsonVariant>();
                    }
                    _pending[i].callback(msg.ok, dataNode);
                }
                return;
            }
        }
    } 
    else if (msg.type == MSG_TYPE_EVT) {
        if (_onEvent) {
            JsonVariant dataNode = msg.payload["data"];
            if (dataNode.isNull()) {
                dataNode = msg.payload.as<JsonVariant>();
            }
            _onEvent(msg.opOrName, dataNode);
        }
    }
}

JsonDocument& SerialBridge::getCachedCapabilities() {
    return _caps;
}

bool SerialBridge::capabilitiesKnown() {
    return _capsKnown;
}
