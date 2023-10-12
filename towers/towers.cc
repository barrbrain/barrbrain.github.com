#include <cstdint>

class IntSet {
  private:
  uint32_t *raw;
  uint32_t length;
  uint32_t min;

  public:
  static uint32_t const raw_length(uint32_t l) { return (l >> 5) + 1; }
  IntSet(uint32_t *r, uint32_t l): raw(r), length(l), min(raw_length(l)) {}

  const bool empty() {
    return min == raw_length(length);
  }

  uint32_t next() {
    uint32_t i = min << 5;
    uint32_t v = raw[min];
    for (uint32_t m = 1; v & -m; m <<= 1, i++) {
      if (v & m) return i;
    }
    return length;
  }

  bool const operator&(uint32_t i) {
    if (i >= length) return false;
    return (raw[i >> 5] & (1 << (i & 31))) != 0;
  }

  void operator^=(uint32_t i) {
    if (i >= length) return;
    uint32_t m = 1 << (i & 31);
    uint32_t n = i >> 5;
    raw[n] ^= m;
    if (raw[n] & m) {
      if (n < min) min = n;
    } else {
      if (n == min) {
        uint32_t max = raw_length(length);
        while (n < max && !raw[n]) n++;
        min = n;
      }
    }
  }

  bool operator|=(uint32_t i) {
    bool v = *this & i;
    if (!v) *this ^= i;
    return v;
  }
};
