#!/usr/bin/env node
/**
 * Generate PNG icons from SVG for PWA
 * Requires: npm install --save-dev sharp
 */

import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const sizes = [
  { size: 72, name: 'icon-72.png' },
  { size: 96, name: 'icon-96.png' },
  { size: 120, name: 'icon-120.png' },      // iPhone
  { size: 128, name: 'icon-128.png' },
  { size: 144, name: 'icon-144.png' },
  { size: 152, name: 'icon-152.png' },      // iPad
  { size: 167, name: 'icon-167.png' },      // iPad Pro
  { size: 180, name: 'icon-180.png' },      // iPhone Touch Icon
  { size: 192, name: 'icon-192.png' },      // Android
  { size: 384, name: 'icon-384.png' },
  { size: 512, name: 'icon-512.png' },      // Android Splash
];

const inputFile = path.join(__dirname, '../public/icon.svg');
const outputDir = path.join(__dirname, '../public');

async function generateIcons() {
  console.log('🎨 Generating PNG icons from SVG...\n');

  if (!fs.existsSync(inputFile)) {
    console.error(`❌ SVG file not found: ${inputFile}`);
    process.exit(1);
  }

  for (const { size, name } of sizes) {
    const outputPath = path.join(outputDir, name);

    try {
      await sharp(inputFile)
        .resize(size, size)
        .png()
        .toFile(outputPath);

      console.log(`✓ Generated ${name} (${size}x${size})`);
    } catch (error) {
      console.error(`✗ Failed to generate ${name}:`, error.message);
    }
  }

  console.log('\n✨ Icon generation complete!');
}

generateIcons().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
