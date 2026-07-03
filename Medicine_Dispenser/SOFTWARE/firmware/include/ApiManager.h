#pragma once

#include <WebServer.h>

#include "Config.h"

class ApiManager {
 public:
  void begin();
  void update();
  void start();
  void stop();
  bool isRunning() const;

 private:
  void configureRoutes();
  void sendJson(const String& body);
  void handleRoot();
  void handleStatus();
  void handleHealth();
  void handleDiagnostics();
  void handleMedicines();

  WebServer server_{Config::DEFAULT_HTTP_PORT};
  bool routesConfigured_ = false;
  bool running_ = false;
};
