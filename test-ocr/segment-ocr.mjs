import { createCanvas, loadImage } from 'canvas';
import fs from 'fs';

const IMAGE_PATH = process.argv[2] || './meter2.jpg';

// 7-Segment patterns: [a,b,c,d,e,f,g] where a=top, b=top-right, c=bottom-right, d=bottom, e=bottom-left, f=top-left, g=middle
const DIGIT_PATTERNS = {
  '0': [1,1,1,1,1,1,0],
  '1': [0,1,1,0,0,0,0],
  '2': [1,1,0,1,1,0,1],
  '3': [1,1,1,1,0,0,1],
  '4': [0,1,1,0,0,1,1],
  '5': [1,0,1,1,0,1,1],
  '6': [1,0,1,1,1,1,1],
  '7': [1,1,1,0,0,0,0],
  '8': [1,1,1,1,1,1,1],
  '9': [1,1,1,1,0,1,1],
};

async function recognizeDigits(imagePath) {
  const img = await loadImage(imagePath);

  // Crop to just digits (adjust based on image)
  const cropX = 0.26, cropW = 0.48, cropY = 0.08, cropH = 0.52;
  const srcX = img.width * cropX;
  const srcY = img.height * cropY;
  const srcW = img.width * cropW;
  const srcH = img.height * cropH;

  const canvasW = Math.floor(srcW);
  const canvasH = Math.floor(srcH);
  const canvas = createCanvas(canvasW, canvasH);
  const ctx = canvas.getContext('2d');
  ctx.drawImage(img, srcX, srcY, srcW, srcH, 0, 0, canvasW, canvasH);

  const imgData = ctx.getImageData(0, 0, canvasW, canvasH);
  const data = imgData.data;

  // Convert to grayscale
  const gray = [];
  let minG = 255, maxG = 0;
  for (let i = 0; i < data.length; i += 4) {
    const g = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
    gray.push(g);
    if (g < minG) minG = g;
    if (g > maxG) maxG = g;
  }
  console.log(`Gray range: ${minG.toFixed(0)} - ${maxG.toFixed(0)}`);

  // Find digit boundaries - 4 digits with spacing
  const digitWidth = canvasW / 4.3; // Account for spacing between digits
  const startX = canvasW * 0.02; // Start from near left edge
  const digits = [];

  for (let d = 0; d < 4; d++) {
    const x0 = Math.floor(startX + d * digitWidth + digitWidth * 0.08);
    const x1 = Math.floor(startX + (d + 1) * digitWidth - digitWidth * 0.08);
    const y0 = 0;
    const y1 = canvasH;

    // Define segment regions relative to digit bounds
    const w = x1 - x0;
    const h = y1 - y0;
    if (d === 0) console.log(`Digit 0 bounds: x=${x0}-${x1} (w=${w}), y=${y0}-${y1} (h=${h}), canvasW=${canvasW}, canvasH=${canvasH}`);

    // Segment positions (relative to digit bounds) - adjusted for LCD 7-segment display
    const segments = {
      a: { x: x0 + w * 0.15, y: y0 + h * 0.02, w: w * 0.7, h: h * 0.10 },        // top
      b: { x: x0 + w * 0.72, y: y0 + h * 0.05, w: w * 0.22, h: h * 0.42 },       // top-right
      c: { x: x0 + w * 0.72, y: y0 + h * 0.53, w: w * 0.22, h: h * 0.42 },       // bottom-right
      d: { x: x0 + w * 0.15, y: y0 + h * 0.88, w: w * 0.7, h: h * 0.10 },        // bottom
      e: { x: x0 + w * 0.06, y: y0 + h * 0.53, w: w * 0.22, h: h * 0.42 },       // bottom-left
      f: { x: x0 + w * 0.06, y: y0 + h * 0.05, w: w * 0.22, h: h * 0.42 },       // top-left
      g: { x: x0 + w * 0.15, y: y0 + h * 0.46, w: w * 0.7, h: h * 0.08 },        // middle
    };

    // Check each segment - use adaptive threshold
    const segmentStates = [];
    for (const [name, seg] of Object.entries(segments)) {
      let minVal = 255, maxVal = 0, sum = 0;
      let totalPixels = 0;

      for (let y = Math.floor(seg.y); y < Math.floor(seg.y + seg.h); y++) {
        for (let x = Math.floor(seg.x); x < Math.floor(seg.x + seg.w); x++) {
          const idx = y * canvasW + x;
          if (idx >= 0 && idx < gray.length) {
            const val = gray[idx];
            sum += val;
            totalPixels++;
            if (val < minVal) minVal = val;
            if (val > maxVal) maxVal = val;
          }
        }
      }

      // Segment is "on" if average is below 175 (darker than LCD background)
      const avg = totalPixels > 0 ? sum / totalPixels : 255;
      const isOn = avg < 175;

      if (d === 0) console.log(`  Seg ${name}: avg=${avg.toFixed(0)} -> ${isOn ? 'ON' : 'off'}`);
      segmentStates.push(isOn ? 1 : 0);
    }

    // Match pattern
    let bestMatch = '?';
    let bestScore = 0;
    for (const [digit, pattern] of Object.entries(DIGIT_PATTERNS)) {
      let score = 0;
      for (let i = 0; i < 7; i++) {
        if (segmentStates[i] === pattern[i]) score++;
      }
      if (score > bestScore) {
        bestScore = score;
        bestMatch = digit;
      }
    }

    console.log(`Digit ${d}: segments=[${segmentStates.join(',')}] -> ${bestMatch} (score ${bestScore})`);
    digits.push({ digit: bestMatch, score: bestScore, segments: segmentStates });
  }

  // Save debug image
  fs.writeFileSync('segment_debug.png', canvas.toBuffer('image/png'));
  console.log('Saved segment_debug.png');

  return digits.map(d => d.digit).join('');
}

async function main() {
  console.log('Loading:', IMAGE_PATH);
  const result = await recognizeDigits(IMAGE_PATH);
  console.log('Result:', result);

  if (result.includes('9483')) {
    console.log('*** SUCCESS! Found 9483 ***');
  }
}

main().catch(console.error);
