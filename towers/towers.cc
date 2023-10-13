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
  uint16_t *bfs, *bfs_end;
  uint16_t bfs_depth;
  IntSet visited;

public:
  static uint32_t const raw_length(uint32_t area) {
    return ((area + 1) >> 1) + IntSet::raw_length(area);
  }
  Towers(uint32_t *r, uint32_t len, uint8_t lim, uint32_t width,
         uint32_t height)
      : length(len), limit(lim), bfs((uint16_t *)r),
        bfs_end(&bfs[width * height]), bfs_depth(0),
        visited(&r[(width * height + 1) >> 1], width * height) {
    for (uint32_t n = 0; n < length; n++) {
      x[n] = (rand() >> 8) * width / (RAND_MAX >> 8);
      y[n] = n;
      c[n] = 0;
      uint16_t xy = x[n] + width * y[n];
      bfs[n] = xy;
      visited ^= xy;
    }
    uint32_t head = length;
    uint32_t prev = head;
    uint32_t area = width * height;
    for (uint32_t n = 0; n < area; n++) {
      uint16_t xy = bfs[n];
      uint8_t y = xy / width;
      uint8_t x = xy % width;
      if (n == prev) {
        prev = head;
        bfs_depth++;
      }
      if (y > 0 && !(visited |= (xy - width)))
        bfs[head++] = xy - width;
      if (x > 0 && !(visited |= (xy - 1)))
        bfs[head++] = xy - 1;
      if (x + 1 < width && !(visited |= (xy + 1)))
        bfs[head++] = xy + 1;
      if (y + 1 < height && !(visited |= (xy + width)))
        bfs[head++] = xy + width;
    }
  }

  const uint16_t *const begin() { return (const uint16_t *)(bfs + length); }
  const uint16_t *const end() { return (const uint16_t *)(bfs_end); }
  uint16_t const depth() { return bfs_depth; }
  bool const is(uint8_t x, uint8_t y) {
    for (uint32_t n = 0; n < length; n++) {
      if (this->x[n] == x && this->y[n] == y)
        return true;
    }
    return false;
  }
};

#include <iostream>
using namespace std;

class Users {
private:
  uint32_t length;
  uint8_t t[USERS], x[USERS], y[USERS];
  uint16_t *n;
  IntSet exists;

public:
  static uint32_t const raw_length(uint32_t area) {
    return ((area + 1) >> 1) + IntSet::raw_length(area);
  }
  Users(uint32_t *r, uint32_t len, uint32_t width, uint32_t height, Towers &t)
      : length(len), n((uint16_t *)r),
        exists(&r[(width * height + 1) >> 1], width * height) {
    for (uint32_t n = 0; n < length;) {
      uint8_t x = (rand() >> 8) * width / (RAND_MAX >> 8);
      uint8_t y = (rand() >> 8) * height / (RAND_MAX >> 8);
      uint32_t i = x + width * y;
      if (t.is(x, y) || (exists |= i))
        continue;
      n++;
    }
    uint32_t n = 0;
    for (const uint16_t *i = t.begin(); i < t.end(); i++) {
      if (exists & *i) {
        x[n] = *i % width;
        y[n] = *i / width;
        this->t[n] = 0;
        this->n[*i] = n++;
      }
    }
  }

  bool const is(uint16_t i) { return exists & i; }

  void const display() {
    for (uint32_t n = 0; n < length; n++) {
      cout << (uint32_t)x[n] << "," << (uint32_t)y[n] << ":" << (uint32_t)t[n]
           << endl;
    }
  }
};

int main() {
  uint32_t width = WIDTH / 2;
  uint32_t height = HEIGHT / 2;
  uint32_t area = width * height;
  uint32_t users = USERS / 2;
  uint32_t *buf =
      (uint32_t *)calloc(Towers::raw_length(area) + Users::raw_length(area), 4);
  Towers t(buf, TOWERS / 2, LIMIT / 2, width, height);
  Users u(&buf[Towers::raw_length(area)], users, width, height, t);
  for (uint8_t y = 0; y < height; y++) {
    for (uint8_t x = 0; x < width; x++) {
      cout << (t.is(x, y) ? "T" : u.is(x + width * y) ? "u" : " ");
    }
    cout << endl;
  }
  cout << t.depth() << endl;
  u.display();
  cout << endl;
  return 0;
}
