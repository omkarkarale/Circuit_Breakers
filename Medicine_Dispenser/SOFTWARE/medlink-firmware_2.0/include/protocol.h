#ifndef PROTOCOL_H
#define PROTOCOL_H

#include <Arduino.h>
#include <ArduinoJson.h>

/*
 * MedLink Serial Protocol Definition
 * ==================================
 * Single source of truth for both src_esp8266 and src_mega code.
 *
 * PROTOCOL SPECIFICATION & MESSAGE SHAPES:
 * ----------------------------------------
 * 1. get_capabilities
 *    - Cmd:  {"type":"cmd", "id":<int>, "op":"get_capabilities"}
 *    - Resp: {"type":"resp", "id":<int>, "ok":true, "data":{"rtc":bool,"speaker":bool,"display":bool,"ir":bool,"steppers":[bool,bool,bool]}}
 *
 * 2. test
 *    - Cmd:  {"type":"cmd", "id":<int>, "op":"test", "component":"rtc"|"stepper"|"ir"|"speaker"|"display", "slot":int?}
 *    - Resp: {"type":"resp", "id":<int>, "ok":bool, "data":{"pass":bool,"detail":string}}
 *
 * 3. dispense
 *    - Cmd:  {"type":"cmd", "id":<int>, "op":"dispense", "slot":1-3}
 *    - Resp: {"type":"resp", "id":<int>, "ok":bool, "data":{"status":"started"}}
 *    - Evt:  {"type":"evt", "name":"dispense_complete", "data":{"slot":n,"detected":bool}}
 *
 * 4. get_status
 *    - Cmd:  {"type":"cmd", "id":<int>, "op":"get_status"}
 *    - Resp: {"type":"resp", "id":<int>, "ok":bool, "data":{"state":string,"last_dispense":long}}
 *
 * 5. get_time
 *    - Cmd:  {"type":"cmd", "id":<int>, "op":"get_time"}
 *    - Resp: {"type":"resp", "id":<int>, "ok":bool, "data":{"time":long}}
 *
 * 6. set_time
 *    - Cmd:  {"type":"cmd", "id":<int>, "op":"set_time", "time":long}
 *    - Resp: {"type":"resp", "id":<int>, "ok":bool}
 *
 * 7. lcd
 *    - Cmd:  {"type":"cmd", "id":<int>, "op":"lcd", "line1":string,"line2":string}
 *    - Resp: {"type":"resp", "id":<int>, "ok":bool}
 *
 * 8. play_sound
 *    - Cmd:  {"type":"cmd", "id":<int>, "op":"play_sound", "melody":string}
 *    - Resp: {"type":"resp", "id":<int>, "ok":bool}
 *
 * 9. ping
 *    - Cmd:  {"type":"cmd", "id":<int>, "op":"ping"}
 *    - Resp: {"type":"resp", "id":<int>, "ok":bool}
 */

// Message Types
constexpr const char* MSG_TYPE_CMD = "cmd";
constexpr const char* MSG_TYPE_RESP = "resp";
constexpr const char* MSG_TYPE_EVT = "evt";

// Command Operations
constexpr const char* OP_PING = "ping";
constexpr const char* OP_GET_CAPABILITIES = "get_capabilities";
constexpr const char* OP_DISPENSE = "dispense";
constexpr const char* OP_GET_STATUS = "get_status";
constexpr const char* OP_GET_TIME = "get_time";
constexpr const char* OP_SET_TIME = "set_time";
constexpr const char* OP_LCD = "lcd";
constexpr const char* OP_PLAY_SOUND = "play_sound";
constexpr const char* OP_TEST = "test";

// Event Names
constexpr const char* EVT_IR_DETECTED = "ir_detected";
constexpr const char* EVT_DISPENSE_COMPLETE = "dispense_complete";
constexpr const char* EVT_TEST_COMPLETE = "test_complete";
constexpr const char* EVT_ERROR = "error";

// Protocol Message representation
struct ProtocolMessage {
    String type;          // "cmd", "resp", "evt"
    int id = -1;          // Message ID (-1 if none)
    String opOrName;      // Command "op" or Event "name"
    bool ok = false;      // Response success status (for resp)
    JsonDocument payload; // Fully owned parsed JSON payload (ArduinoJson v7 JsonDocument)
};

// Safely parses one line of JSON into ProtocolMessage, returning false on parse failure or missing required fields.
inline bool parseLine(const String& line, ProtocolMessage& out) {
    // Reset output struct fields
    out.type = "";
    out.id = -1;
    out.opOrName = "";
    out.ok = false;
    out.payload.clear();

    DeserializationError error = deserializeJson(out.payload, line);
    if (error) {
        return false;
    }

    // Required: "type" must be a string
    if (!out.payload["type"].is<const char*>()) {
        return false;
    }
    out.type = out.payload["type"].as<String>();

    // Optional: "id"
    if (out.payload["id"].is<int>()) {
        out.id = out.payload["id"].as<int>();
    } else {
        out.id = -1;
    }

    // Check type-specific fields
    if (out.type == MSG_TYPE_CMD) {
        if (!out.payload["op"].is<const char*>()) {
            return false;
        }
        out.opOrName = out.payload["op"].as<String>();
    } 
    else if (out.type == MSG_TYPE_EVT) {
        if (!out.payload["name"].is<const char*>()) {
            return false;
        }
        out.opOrName = out.payload["name"].as<String>();
    } 
    else if (out.type == MSG_TYPE_RESP) {
        if (!out.payload["ok"].is<bool>()) {
            return false;
        }
        out.ok = out.payload["ok"].as<bool>();
    } 
    else {
        // Unknown message type
        return false;
    }

    return true;
}

#endif // PROTOCOL_H
