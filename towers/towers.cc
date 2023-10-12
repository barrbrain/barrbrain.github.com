#include <cstddef>
#include <cstdint>

class IntSet {
  private:
  uint32_t *raw;
  uint32_t length;
  uint32_t min;

  public:
  static uint32_t const raw_length(uint32_t l) { return (l >> 5) + 1; }
  IntSet(uint32_t *r, uint32_t l): raw(r), length(l), min(raw_length(l)) {}
  IntSet(): IntSet(NULL, 0) {}

  const bool empty() {
    return min == raw_length(length);
  }

  uint32_t const next() {
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

  bool operator^=(uint32_t i) {
    if (i >= length) return false;
    uint32_t m = 1 << (i & 31);
    uint32_t n = i >> 5;
    raw[n] ^= m;
    bool v = (raw[n] & m) != 0;
    if (v) {
      if (n < min) min = n;
    } else {
      if (n == min) {
        uint32_t max = raw_length(length);
        while (n < max && !raw[n]) n++;
        min = n;
      }
    }
    return v;
  }

  bool operator|=(uint32_t i) {
    bool v = *this & i;
    if (!v) *this ^= i;
    return v;
  }
};

class Queue {
  private:
  IntSet *raw;
  uint32_t length;
  uint32_t max;

  public:
  Queue(IntSet *r, uint32_t l, uint32_t *buf, uint32_t range): raw(r), length(l), max(0) {
    uint32_t n = IntSet::raw_length(range);
    for (uint32_t i = 0; i < length; i++) {
      raw[i] = IntSet(&buf[i * n], range);
    }
  }

  void update(uint32_t k, bool v) {
    if (v) {
      if (k > max) max = k;
    } else if (k == max) {
      while (k > 0 && raw[k].empty()) k--;
      max = k;
    }
  }

  class Ref {
    private:
    Queue& that;
    IntSet& set;

    public:
    const uint32_t key;
    Ref(uint32_t k, Queue& t, IntSet& s): key(k), that(t), set(s) {}

    void operator^=(uint32_t v) {
      bool value = (set ^= v);
      that.update(key, value);
    }

    uint32_t const next() {
      return set.next();
    }
  };

  Ref operator[](uint32_t k) {
    return Ref(k, *this, raw[k]);
  }

  Ref const next() {
    return (*this)[max];
  }

  bool const empty() {
    return raw[max].empty();
  }
};
