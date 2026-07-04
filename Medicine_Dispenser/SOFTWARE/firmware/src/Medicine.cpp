#include "Medicine.h"

#include <cstring>

Medicine::Medicine()
    : id(0), dispenserId(0), pillsRemaining(0), enabled(false) {
  std::memset(name, 0, sizeof(name));
}
