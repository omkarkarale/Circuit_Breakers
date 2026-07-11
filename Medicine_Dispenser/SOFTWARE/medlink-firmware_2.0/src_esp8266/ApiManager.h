#ifndef API_MANAGER_H
#define API_MANAGER_H

#include <Arduino.h>
#include <ArduinoJson.h>
#include <ESP8266WebServer.h>
#include <DNSServer.h>

class ApiManager {
public:
    static void begin();
    static void update();

private:
    static ESP8266WebServer _server;
    static DNSServer        _dns;
    static bool             _dnsActive;

    struct DiagResult {
        bool     known      = false;
        bool     pass       = false;
        String   detail     = "";
        uint32_t checkedAt  = 0;
    };

    static DiagResult _diag[10];
    static const char* _diagKeys[10];

    static void _addCors();
    static void _sendJson(int code, JsonDocument& doc);
    static void _sendError(int code, const String& msg);

    // Route handlers
    static void _handleStatus();
    static void _handleCapabilities();
    static void _handleInfo();
    static void _handleHome();
    static void _handleGetMedicines();
    static void _handlePutMedicine();
    static void _handleDeleteMedicine();
    static void _handleRefillMedicine();
    static void _handleDispense();
    static void _handleGetDiagnostics();
    static void _handleTestComponent();
    static void _handleTestAll();
    static void _handleGetSettings();
    static void _handlePutSettings();
    static void _handleWifiConnect();
    static void _handleWifiStartSetup();
    static void _handleWifiForget();
    static void _handleReboot();
    static void _handleFactoryReset();
    static void _handleGetLogs();
    static void _handleCaptivePortal();
    static void _handleOptions();

    // Helpers
    static bool _runDiagTest(const String& component, String& detail);
    static int  _diagIndex(const String& component);
    static int  _slotFromUri(const String& uri, int segIndex);
    static uint32_t _nextOccurrence(const String& timeStr);
    static uint32_t _todayEpochForTime(const String& timeStr);
};

#endif // API_MANAGER_H
