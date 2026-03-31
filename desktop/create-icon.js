// Generate a simple PNG icon for the app
const fs = require('fs');
const path = require('path');

// 256x256 PNG with a simple colored square (minimal valid PNG)
// This creates a basic icon - replace with a proper one for production
const { createCanvas } = (() => {
  try { return require('canvas'); } catch (e) { return { createCanvas: null }; }
})();

if (createCanvas) {
  const canvas = createCanvas(256, 256);
  const ctx = canvas.getContext('2d');

  // Background circle
  ctx.beginPath();
  ctx.arc(128, 128, 120, 0, Math.PI * 2);
  ctx.fillStyle = '#1e293b';
  ctx.fill();

  // Border
  ctx.lineWidth = 4;
  ctx.strokeStyle = '#3b82f6';
  ctx.stroke();

  // Text
  ctx.fillStyle = '#3b82f6';
  ctx.font = 'bold 80px Arial';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('AP', 128, 128);

  const buffer = canvas.toBuffer('image/png');
  fs.writeFileSync(path.join(__dirname, 'icon.png'), buffer);
  console.log('Icon created!');
} else {
  // Create a minimal 1x1 PNG as fallback
  const minimalPNG = Buffer.from([
    0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0x00, 0x00, 0x00, 0x0D,
    0x49, 0x48, 0x44, 0x52, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
    0x08, 0x02, 0x00, 0x00, 0x00, 0x90, 0x77, 0x53, 0xDE, 0x00, 0x00, 0x00,
    0x0C, 0x49, 0x44, 0x41, 0x54, 0x08, 0xD7, 0x63, 0xF8, 0xCF, 0xC0, 0x00,
    0x00, 0x00, 0x02, 0x00, 0x01, 0xE2, 0x21, 0xBC, 0x33, 0x00, 0x00, 0x00,
    0x00, 0x49, 0x45, 0x4E, 0x44, 0xAE, 0x42, 0x60, 0x82
  ]);
  fs.writeFileSync(path.join(__dirname, 'icon.png'), minimalPNG);
  console.log('Minimal icon placeholder created');
}
