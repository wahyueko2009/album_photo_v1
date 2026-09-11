import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

const svgPath = path.resolve('public/icon.svg');
const publicDir = path.resolve('public');

async function generateIcons() {
  try {
    console.log('Generating PWA icons from SVG using Sharp...');

    // 192x192 icon
    await sharp(svgPath)
      .resize(192, 192)
      .png()
      .toFile(path.join(publicDir, 'pwa-192x192.png'));
    console.log('Created pwa-192x192.png');

    // 512x512 icon
    await sharp(svgPath)
      .resize(512, 512)
      .png()
      .toFile(path.join(publicDir, 'pwa-512x512.png'));
    console.log('Created pwa-512x512.png');

    // Apple Touch Icon (180x180 PNG)
    await sharp(svgPath)
      .resize(180, 180)
      .png()
      .toFile(path.join(publicDir, 'apple-touch-icon.png'));
    console.log('Created apple-touch-icon.png');

    // Maskable 512x512 (with 15% padding around it so it doesn't clip on Android)
    // We add padding by drawing the svg onto a background with safe boundaries
    await sharp(svgPath)
      .resize(380, 380) // resized to ~75% of 512
      .extend({
        top: 66,
        bottom: 66,
        left: 66,
        right: 66,
        background: { r: 15, g: 23, b: 42, alpha: 1 } // slate-900 matching grad stop
      })
      .png()
      .toFile(path.join(publicDir, 'pwa-maskable-512x512.png'));
    console.log('Created pwa-maskable-512x512.png');

    console.log('All PWA icons generated successfully!');
  } catch (err) {
    console.error('Error generating icons:', err);
  }
}

generateIcons();
