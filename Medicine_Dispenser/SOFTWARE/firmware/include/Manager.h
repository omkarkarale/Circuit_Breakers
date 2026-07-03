#pragma once

class Manager {
 public:
  virtual ~Manager() = default;

  virtual void begin() = 0;
  virtual void update() = 0;
};
