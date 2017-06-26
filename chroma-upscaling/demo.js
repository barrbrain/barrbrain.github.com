
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

  function predictChromaToPlane(lumaData, imageData, plane, width, height, multiplier) {
    // Because we're doing multiplication that may wrap, use the browser-optimized
    // Uint8ClampedArray instead of the default Uint8Array view.
    var clampedBytes = new Uint8ClampedArray(plane.bytes.buffer, plane.bytes.offset, plane.bytes.byteLength);
    var ySub = new Uint8ClampedArray(4);
    for (var y = 0; y < height; y += 4) {
      for (var x = 0; x < width; x += 4) {
        var off = y * width * 4 + x * 4;
	var yAvg = 0;
	var cAvg = 0;
	var LL = 0;
	var LC = 0;
	var alpha = 0;
        ySub[0] = (lumaData.data[off] + lumaData.data[off + 4] +
		   lumaData.data[off + width * 4] + lumaData.data[off + width * 4 + 4] + 2) >> 2;
	off += 8;
        ySub[1] = (lumaData.data[off] + lumaData.data[off + 4] +
		   lumaData.data[off + width * 4] + lumaData.data[off + width * 4 + 4] + 2) >> 2;
	off += width * 8 - 8;
        ySub[2] = (lumaData.data[off] + lumaData.data[off + 4] +
		   lumaData.data[off + width * 4] + lumaData.data[off + width * 4 + 4] + 2) >> 2;
	off += 8;
        ySub[3] = (lumaData.data[off] + lumaData.data[off + 4] +
		   lumaData.data[off + width * 4] + lumaData.data[off + width * 4 + 4] + 2) >> 2;
	yAvg = (ySub[0] + ySub[1] + ySub[2] + ySub[3] + 2) >> 2;
	LL = (ySub[0] - yAvg) * (ySub[0] - yAvg) + (ySub[1] - yAvg) * (ySub[1] - yAvg) +
             (ySub[2] - yAvg) * (ySub[2] - yAvg) + (ySub[3] - yAvg) * (ySub[3] - yAvg);
	off = y * width + x * 2;
        cAvg = (imageData.data[off] + imageData.data[off + 4] +
		imageData.data[off + width * 2] + imageData.data[off + width * 2 + 4] + 2) >> 2;
        LC = (ySub[0] - yAvg) * (imageData.data[off] - cAvg) +
             (ySub[1] - yAvg) * (imageData.data[off + 4] - cAvg) +
             (ySub[2] - yAvg) * (imageData.data[off + width * 2] - cAvg) +
             (ySub[3] - yAvg) * (imageData.data[off + width * 2 + 4] - cAvg);
	if (LL != 0) alpha = LC / LL;
	if (alpha < -1 || alpha > 1) alpha = 0;
	off = y * width * 4 + x * 4;
        clampedBytes[y * plane.stride + x] = imageData.data[y * width + x * 2] +
             (lumaData.data[off] - ySub[0]) * alpha * multiplier;
        clampedBytes[y * plane.stride + x + 1] = imageData.data[y * width + x * 2] +
             (lumaData.data[off + 4] - ySub[0]) * alpha * multiplier;
        clampedBytes[y * plane.stride + x + plane.stride] = imageData.data[y * width + x * 2] +
             (lumaData.data[off + width * 4] - ySub[0]) * alpha * multiplier;
        clampedBytes[y * plane.stride + x + plane.stride + 1] = imageData.data[y * width + x * 2] +
             (lumaData.data[off + width * 4 + 4] - ySub[0]) * alpha * multiplier;
        off += 8;
        clampedBytes[y * plane.stride + x + 2] = imageData.data[y * width + x * 2 + 4] +
             (lumaData.data[off] - ySub[1]) * alpha * multiplier;
        clampedBytes[y * plane.stride + x + 3] = imageData.data[y * width + x * 2 + 4] +
             (lumaData.data[off + 4] - ySub[1]) * alpha * multiplier;
        clampedBytes[y * plane.stride + x + plane.stride + 2] = imageData.data[y * width + x * 2 + 4] +
             (lumaData.data[off + width * 4] - ySub[1]) * alpha * multiplier;
        clampedBytes[y * plane.stride + x + plane.stride + 3] = imageData.data[y * width + x * 2 + 4] +
             (lumaData.data[off + width * 4 + 4] - ySub[1]) * alpha * multiplier;
        off += width * 8 - 8;
        clampedBytes[(y + 2) * plane.stride + x] = imageData.data[(y + 2) * width + x * 2] +
             (lumaData.data[off] - ySub[2]) * alpha * multiplier;
        clampedBytes[(y + 2) * plane.stride + x + 1] = imageData.data[(y + 2) * width + x * 2] +
             (lumaData.data[off + 4] - ySub[2]) * alpha * multiplier;
        clampedBytes[(y + 2) * plane.stride + x + plane.stride] = imageData.data[(y + 2) * width + x * 2] +
             (lumaData.data[off + width * 4] - ySub[2]) * alpha * multiplier;
        clampedBytes[(y + 2) * plane.stride + x + plane.stride + 1] = imageData.data[(y + 2) * width + x * 2] +
             (lumaData.data[off + width * 4 + 4] - ySub[2]) * alpha * multiplier;
        off += 8;
        clampedBytes[(y + 2) * plane.stride + x + 2] = imageData.data[(y + 2) * width + x * 2 + 4] +
             (lumaData.data[off] - ySub[3]) * alpha * multiplier;
        clampedBytes[(y + 2) * plane.stride + x + 3] = imageData.data[(y + 2) * width + x * 2 + 4] +
             (lumaData.data[off + 4] - ySub[3]) * alpha * multiplier;
        clampedBytes[(y + 2) * plane.stride + x + plane.stride + 2] = imageData.data[(y + 2) * width + x * 2 + 4] +
             (lumaData.data[off + width * 4] - ySub[3]) * alpha * multiplier;
        clampedBytes[(y + 2) * plane.stride + x + plane.stride + 3] = imageData.data[(y + 2) * width + x * 2 + 4] +
             (lumaData.data[off + width * 4 + 4] - ySub[3]) * alpha * multiplier;
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
