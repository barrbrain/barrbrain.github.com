#include <cstddef>
#include <cstdint>

class IntSet {
private:
  uint32_t *raw;
  uint32_t length;
  uint32_t min;

public:
  static uint32_t const raw_length(uint32_t l) { return (l >> 5) + 1; }
  IntSet(uint32_t *r, uint32_t l) : raw(r), length(l), min(raw_length(l)) {}
  IntSet() : IntSet(NULL, 0) {}

  const bool empty() { return min == raw_length(length); }

  uint32_t const next() {
    uint32_t i = min << 5;
    uint32_t v = raw[min];
    for (uint32_t m = 1; v & -m; m <<= 1, i++) {
      if (v & m)
        return i;
    }
    return length;
  }

  bool const operator&(uint32_t i) {
    if (i >= length)
      return false;
    return (raw[i >> 5] & (1 << (i & 31))) != 0;
  }

  bool operator^=(uint32_t i) {
    if (i >= length)
      return false;
    uint32_t m = 1 << (i & 31);
    uint32_t n = i >> 5;
    raw[n] ^= m;
    bool v = (raw[n] & m) != 0;
    if (v) {
      if (n < min)
        min = n;
    } else {
      if (n == min) {
        uint32_t max = raw_length(length);
        while (n < max && !raw[n])
          n++;
        min = n;
      }
    }
    return v;
  }

  bool operator|=(uint32_t i) {
    bool v = *this & i;
    if (!v)
      *this ^= i;
    return v;
  }
};

class Queue {
private:
  IntSet *raw;
  uint32_t length;
  uint32_t max;

public:
  Queue(IntSet *r, uint32_t l, uint32_t *buf, uint32_t range)
      : raw(r), length(l), max(0) {
    uint32_t n = IntSet::raw_length(range);
    for (uint32_t i = 0; i < length; i++) {
      raw[i] = IntSet(&buf[i * n], range);
    }
  }

  void update(uint32_t k, bool v) {
    if (v) {
      if (k > max)
        max = k;
    } else if (k == max) {
      while (k > 0 && raw[k].empty())
        k--;
      max = k;
    }
  }

  class Ref {
  private:
    Queue &that;
    IntSet &set;

  public:
    const uint32_t key;
    Ref(uint32_t k, Queue &t, IntSet &s) : key(k), that(t), set(s) {}

    void operator^=(uint32_t v) {
      bool value = (set ^= v);
      that.update(key, value);
    }

    uint32_t const next() { return set.next(); }
  };

  Ref operator[](uint32_t k) { return Ref(k, *this, raw[k]); }

  Ref const next() { return (*this)[max]; }

  bool const empty() { return raw[max].empty(); }
};

static const uint32_t WIDTH = 200;
static const uint32_t HEIGHT = 200;
static const uint32_t USERS = 10000;
static const uint32_t TOWERS = 200;
static const uint8_t LIMIT = 100;

#include <cstdlib>

class Towers {
private:
  uint32_t length;
  uint8_t x[TOWERS], y[TOWERS], c[TOWERS];
  uint8_t limit;

public:
  Towers(uint32_t len, uint8_t lim, uint32_t width, uint32_t height)
      : length(len), limit(lim) {
    for (uint32_t n = 0; n < length; n++) {
      x[n] = (rand() >> 8) * width / (RAND_MAX >> 8);
      y[n] = n;
      c[n] = 0;
    }
  }

  bool const is(uint8_t x, uint8_t y) {
    for (uint32_t n = 0; n < length; n++) {
      if (this->x[n] == x && this->y[n] == y)
        return true;
    }
    return false;
  }
};

class Users {
private:
  uint32_t length;
  uint8_t t[USERS], x[USERS], y[USERS];
  uint16_t n[WIDTH * HEIGHT];

public:
  Users(uint32_t len, uint32_t width, uint32_t height, Towers &t)
      : length(len) {
    for (uint32_t n = 0; n < length;) {
      uint8_t x = (rand() >> 8) * width / (RAND_MAX >> 8);
      uint8_t y = (rand() >> 8) * height / (RAND_MAX >> 8);
      uint32_t i = x + width * y;
      if (this->n[i] != 0 || t.is(x, y))
        continue;
      this->n[i] = ++n;
    }
  }

  bool const is(uint8_t x, uint8_t y, uint32_t width) {
    return n[x + width * y] != 0;
  }
};

#include <iostream>
using namespace std;

int main() {
  uint32_t width = WIDTH / 2;
  uint32_t height = HEIGHT / 2;
  Towers t(TOWERS / 2, LIMIT / 2, width, height);
  Users u(USERS / 2, width, height, t);
  ;
  for (uint8_t y = 0; y < height; y++) {
    for (uint8_t x = 0; x < width; x++) {
      cout << (t.is(x, y) ? "T" : u.is(x, y, width) ? "u" : " ");
    }
    cout << endl;
  }
  return 0;
}
