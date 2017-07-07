
(function() {
  "use strict";

  var YUVBuffer = require('yuv-buffer'),
    YUVCanvas = require('yuv-canvas');

  var canvas = document.querySelector('canvas'),
    yuvCanvas = YUVCanvas.attach(canvas),
    format,
    frame,
    sourceData = {},
    sourceFader = {
      y: 1,
      u: 1,
      v: 1
    };

  function setupFrame() {
    format = YUVBuffer.format({
      width: 640,
      height: 480,
    });
    frame = YUVBuffer.frame(format);
  }

  // Rasterize a loaded image and get at its RGBA bytes.
  // We'll use this in sample to get brightnesses from grayscale images.
  function extractImageData(image) {
    var canvas = document.createElement('canvas');
    canvas.width = image.naturalWidth,
    canvas.height = image.naturalHeight;

    var context = canvas.getContext('2d');
    context.drawImage(image, 0, 0);
    return context.getImageData(0, 0, canvas.width, canvas.height)
  }

  // In this example we have separate images with Y, U, and V plane data.
  // For each plane, we copy the grayscale values into the target YUVPlane
  // object's data, applying a per-plane multiplier which is manipulable
  // by the user.
  function copyBrightnessToPlane(imageData, plane, width, height, multiplier) {
    // Because we're doing multiplication that may wrap, use the browser-optimized
    // Uint8ClampedArray instead of the default Uint8Array view.
    var clampedBytes = new Uint8ClampedArray(plane.bytes.buffer, plane.bytes.offset, plane.bytes.byteLength);
    for (var y = 0; y < height; y++) {
      for (var x = 0; x < width; x++) {
        clampedBytes[y * plane.stride + x] = (imageData.data[y * width * 4 + x * 4] - 127) * multiplier + 127;
      }
    }
  }

  function predictChromaToPlane(yData, imageData, plane, width, height, multiplier) {
    // Because we're doing multiplication that may wrap, use the browser-optimized
    // Uint8ClampedArray instead of the default Uint8Array view.
    var clampedBytes = new Uint8ClampedArray(plane.bytes.buffer, plane.bytes.offset, plane.bytes.byteLength);
    var D = 13 * multiplier | 0;
    var HV = 6 * D;
    for (var y = 0; y < height; y += 4) {
      for (var x = 0; x < width; x += 4) {
        var off = y * width + x * 2;
        var a, b, c, d, e, f, g, h, i, j, k, l, m, n;
        a = imageData.data[off];
        b = imageData.data[off + 4];
        c = imageData.data[off + width * 2]
        d = imageData.data[off + width * 2 + 4];
        e = D * (a + b - c - d);
        f = D * (a - b + c - d);
        g = D * (a - b - c + d);
        h = 4 * e; i = 4 * f; j = 3 * g;
        k = h + j; l = h - j; m = i + j; n = i - j;
        a = a * 1024 + 512; b = b * 1024 + 512;
        c = c * 1024 + 512; d = d * 1024 + 512;
        off = y * width * 4 + x * 4;
        clampedBytes[y * plane.stride + x] = (a+k+m+g) >> 10;
        clampedBytes[y * plane.stride + x + 1] = (a+k-m-g) >> 10;
        clampedBytes[y * plane.stride + x + plane.stride] = (a-k+m-g) >> 10;
        clampedBytes[y * plane.stride + x + plane.stride + 1] = (a-k-m+g) >> 10;
        off += 8;
        clampedBytes[y * plane.stride + x + 2] = (b+l+m+g) >> 10;
        clampedBytes[y * plane.stride + x + 3] = (b+l-m-g) >> 10;
        clampedBytes[y * plane.stride + x + plane.stride + 2] = (b-l+m-g) >> 10;
        clampedBytes[y * plane.stride + x + plane.stride + 3] = (b-l-m+g) >> 10;
        off += width * 8 - 8;
        clampedBytes[(y + 2) * plane.stride + x] = (c+k+n+g) >> 10;
        clampedBytes[(y + 2) * plane.stride + x + 1] = (c+k-n-g) >> 10;
        clampedBytes[(y + 2) * plane.stride + x + plane.stride] = (c-k+n-g) >> 10;
        clampedBytes[(y + 2) * plane.stride + x + plane.stride + 1] = (c-k-n+g) >> 10;
        off += 8;
        clampedBytes[(y + 2) * plane.stride + x + 2] = (d+l+n+g) >> 10;
        clampedBytes[(y + 2) * plane.stride + x + 3] = (d+l-n-g) >> 10;
        clampedBytes[(y + 2) * plane.stride + x + plane.stride + 2] = (d-l+n-g) >> 10;
        clampedBytes[(y + 2) * plane.stride + x + plane.stride + 3] = (d-l-n+g) >> 10;
      }
    }
    for (var y = 2; y + 2 < height; y += 2) {
      for (var x = 2; x + 2 < width; x += 2) {
        var off = (y - 2) * width + x * 2 - 4;
        var a, b, c, d, e, f, g, h, i, j, k, l;
        a = imageData.data[off];
        b = imageData.data[off + 4];
        c = imageData.data[off + 8];
        d = imageData.data[off + width * 2]
        e = imageData.data[off + width * 2 + 4];
        f = imageData.data[off + width * 2 + 8];
        g = imageData.data[off + width * 4]
        h = imageData.data[off + width * 4 + 4];
        i = imageData.data[off + width * 4 + 8];
        j = HV * (b - h);
        k = HV * (d - f);
        l = D * ((a + i) - (c + g));
        e = e * 512 + 256;
        off = y * width * 4 + x * 4;
        a = yData.data[off];
        b = yData.data[off + 4];
        c = yData.data[off + width * 4]
        d = yData.data[off + width * 4 + 4];
        g = a + b - c - d;
        h = a - b + c - d;
        i = a - b - c + d;
        var g2 = g * g + h * h + i * i;
        if (g2 > 0) {
          var dot = j * g + k * h + l * i;
          var s = dot / g2 + .5 | 0;
          j = g * s;
          k = h * s;
          l = i * s;
        }
        clampedBytes[y * plane.stride + x] = (e+j+k+l) >> 9;
        clampedBytes[y * plane.stride + x + 1] = (e+j-k-l) >> 9;
        clampedBytes[y * plane.stride + x + plane.stride] = (e-j+k-l) >> 9;
        clampedBytes[y * plane.stride + x + plane.stride + 1] = (e-j-k+l) >> 9;
      }
    }
  }

  function setupSources() {
    function setup(index) {
      var image = document.getElementById(index + 'plane'),
        fader = document.getElementById(index + 'fader');

      function doit() {
        sourceData[index] = extractImageData(image);
        updateFrame();
      }
      if (image.naturalWidth) {
        doit();
      } else {
        image.addEventListener('load', doit);
      }

      fader.addEventListener('input', function() {
        sourceFader[index] = fader.value;
        updateFrame();
      })
    }
    setup('y');
    setup('u');
    setup('v');
  }

  function updateFrame() {
    // Copy data in!
    if (sourceData.y) {
      copyBrightnessToPlane(sourceData.y, frame.y, format.width, format.height, sourceFader.y);
    }
    if (sourceData.u) {
      predictChromaToPlane(sourceData.y, sourceData.u, frame.u, format.width, format.height, sourceFader.u);
    }
    if (sourceData.v) {
      predictChromaToPlane(sourceData.y, sourceData.v, frame.v, format.width, format.height, sourceFader.v);
    }

    yuvCanvas.drawFrame(frame);
  }

  setupFrame();
  setupSources();

})();
