import Tesseract from 'tesseract.js';
import { createCanvas, loadImage } from 'canvas';
import fs from 'fs';

const IMAGE_PATH = process.argv[2] || './meter.jpg';

async function preprocessImage(imagePath, options = {}) {
  const img = await loadImage(imagePath);

  // Crop to digit area only (just the 4 digits)
  const cropX = options.cropX || 0.24;  // Start at 24% from left (skip flash)
  const cropW = options.cropW || 0.52; // Take 52% width (all 4 digits)
  const cropY = options.cropY || 0.08;
  const cropH = options.cropH || 0.50;

  const srcX = img.width * cropX;
  const srcY = img.height * cropY;
  const srcW = img.width * cropW;
  const srcH = img.height * cropH;

  const scale = options.scale || 3;
  const canvas = createCanvas(srcW * scale, srcH * scale);
  const ctx = canvas.getContext('2d');

  ctx.drawImage(img, srcX, srcY, srcW, srcH, 0, 0, canvas.width, canvas.height);

  const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imgData.data;

  // Konvertiere zu Graustufen und sammle Histogramm
  const grayValues = [];
  let minGray = 255, maxGray = 0;
  for (let i = 0; i < data.length; i += 4) {
    const gray = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
    grayValues.push(gray);
    if (gray < minGray) minGray = gray;
    if (gray > maxGray) maxGray = gray;
  }

  // Kontrastverstärkung (Histogram Stretching)
  const range = maxGray - minGray;
  for (let i = 0; i < grayValues.length; i++) {
    grayValues[i] = ((grayValues[i] - minGray) / range) * 255;
  }
  console.log('Contrast stretch: min=', minGray, 'max=', maxGray);

  // Otsu's Threshold Methode
  let threshold;
  if (options.threshold) {
    threshold = options.threshold;
  } else {
    // Berechne Otsu's threshold
    const histogram = new Array(256).fill(0);
    for (const g of grayValues) {
      histogram[Math.round(g)]++;
    }

    const total = grayValues.length;
    let sum = 0;
    for (let i = 0; i < 256; i++) sum += i * histogram[i];

    let sumB = 0, wB = 0, wF = 0;
    let maxVariance = 0;
    threshold = 0;

    for (let t = 0; t < 256; t++) {
      wB += histogram[t];
      if (wB === 0) continue;
      wF = total - wB;
      if (wF === 0) break;

      sumB += t * histogram[t];
      const mB = sumB / wB;
      const mF = (sum - sumB) / wF;
      const variance = wB * wF * (mB - mF) * (mB - mF);

      if (variance > maxVariance) {
        maxVariance = variance;
        threshold = t;
      }
    }
  }

  console.log('Using threshold:', threshold);

  // Binarize
  for (let i = 0; i < data.length; i += 4) {
    const gray = grayValues[i / 4];
    // Invertieren wenn gewünscht
    let binary;
    if (options.invert) {
      binary = gray < threshold ? 255 : 0;
    } else {
      binary = gray < threshold ? 0 : 255;
    }
    data[i] = binary;
    data[i + 1] = binary;
    data[i + 2] = binary;
  }

  ctx.putImageData(imgData, 0, 0);

  // Morphologische Operationen: Closing (Dilation dann Erosion) um Rauschen zu entfernen
  if (options.morphology === true) {
    const tempCanvas = createCanvas(canvas.width, canvas.height);
    const tempCtx = tempCanvas.getContext('2d');
    tempCtx.drawImage(canvas, 0, 0);

    // Simple 3x3 dilation then erosion
    const src = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const dst = ctx.createImageData(canvas.width, canvas.height);

    // Dilation (expand white)
    for (let y = 1; y < canvas.height - 1; y++) {
      for (let x = 1; x < canvas.width - 1; x++) {
        const idx = (y * canvas.width + x) * 4;
        let maxVal = 0;
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            const nIdx = ((y + dy) * canvas.width + (x + dx)) * 4;
            if (src.data[nIdx] > maxVal) maxVal = src.data[nIdx];
          }
        }
        dst.data[idx] = dst.data[idx + 1] = dst.data[idx + 2] = maxVal;
        dst.data[idx + 3] = 255;
      }
    }
    ctx.putImageData(dst, 0, 0);
  }

  // Save debug image
  const filename = options.filename || 'processed.png';
  const buffer = canvas.toBuffer('image/png');
  fs.writeFileSync(`./${filename}`, buffer);
  console.log(`Saved ${filename}`);

  return buffer;
}

async function testOCR(imageBuffer, config) {
  const worker = await Tesseract.createWorker('eng');
  await worker.setParameters(config);

  const result = await worker.recognize(imageBuffer);
  await worker.terminate();

  const numbers = result.data.text.replace(/[^0-9]/g, '');
  return { text: result.data.text.trim(), numbers, confidence: result.data.confidence };
}

async function main() {
  console.log('Loading image:', IMAGE_PATH);

  // Test verschiedene Threshold-Werte
  const thresholds = [null, 180, 200, 220]; // null = Otsu
  const configs = [
    { tessedit_char_whitelist: '0123456789', tessedit_pageseg_mode: '6' },
    { tessedit_char_whitelist: '0123456789', tessedit_pageseg_mode: '7' },
    { tessedit_char_whitelist: '0123456789', tessedit_pageseg_mode: '8' },
    { tessedit_char_whitelist: '0123456789', tessedit_pageseg_mode: '11' },
    { tessedit_char_whitelist: '0123456789', tessedit_pageseg_mode: '13' },
  ];

  for (const thresh of thresholds) {
    console.log('\n=== Testing threshold:', thresh || 'Otsu ===');

    const processedBuffer = await preprocessImage(IMAGE_PATH, {
      threshold: thresh,
      filename: `processed_${thresh || 'otsu'}.png`,
      scale: 3,
    });

    for (const config of configs) {
      try {
        const result = await testOCR(processedBuffer, config);
        console.log(`PSM ${config.tessedit_pageseg_mode}: "${result.numbers}" (conf: ${result.confidence})`);

        if (result.numbers.includes('9483')) {
          console.log('\n*** SUCCESS! Found 9483 ***');
          console.log('Threshold:', thresh || 'Otsu');
          console.log('Config:', JSON.stringify(config));
          return;
        }
      } catch (err) {
        console.log(`PSM ${config.tessedit_pageseg_mode}: Error -`, err.message);
      }
    }
  }

  // Versuche auch mit Invertierung
  console.log('\n=== Testing with INVERT ===');
  for (const thresh of [180, 200, 220]) {
    const processedBuffer = await preprocessImage(IMAGE_PATH, {
      threshold: thresh,
      filename: `processed_inv_${thresh}.png`,
      scale: 3,
      invert: true,
    });

    for (const config of configs) {
      try {
        const result = await testOCR(processedBuffer, config);
        console.log(`Inv ${thresh} PSM ${config.tessedit_pageseg_mode}: "${result.numbers}" (conf: ${result.confidence})`);

        if (result.numbers.includes('9483')) {
          console.log('\n*** SUCCESS! Found 9483 with INVERT ***');
          return;
        }
      } catch (err) {
        // skip
      }
    }
  }

  console.log('\nNo config found 9483 - check processed images');
}

main().catch(console.error);
