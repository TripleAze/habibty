const { createCanvas } = require('canvas');
const fs = require('fs');
const path = require('path');

function generateIcon(size, outputPath) {
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext('2d');

  // Create rose-to-lavender gradient background (#E8A0A0 → #C9B8D8)
  const gradient = ctx.createLinearGradient(0, 0, size, size);
  gradient.addColorStop(0, '#E8A0A0');
  gradient.addColorStop(1, '#C9B8D8');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);

  // Draw white heart envelope illustration
  const centerX = size / 2;
  const centerY = size / 2;
  const heartSize = size * 0.4;

  ctx.fillStyle = 'white';
  ctx.beginPath();

  // Heart shape
  ctx.moveTo(centerX, centerY + heartSize * 0.3);
  ctx.bezierCurveTo(
    centerX, centerY - heartSize * 0.2,
    centerX - heartSize * 0.5, centerY - heartSize * 0.5,
    centerX - heartSize * 0.5, centerY
  );
  ctx.bezierCurveTo(
    centerX - heartSize * 0.5, centerY + heartSize * 0.3,
    centerX, centerY + heartSize * 0.5,
    centerX, centerY + heartSize * 0.7
  );
  ctx.bezierCurveTo(
    centerX, centerY + heartSize * 0.5,
    centerX + heartSize * 0.5, centerY + heartSize * 0.3,
    centerX + heartSize * 0.5, centerY
  );
  ctx.bezierCurveTo(
    centerX + heartSize * 0.5, centerY - heartSize * 0.5,
    centerX, centerY - heartSize * 0.2,
    centerX, centerY + heartSize * 0.3
  );
  ctx.fill();

  // Add envelope flap lines for the "letter" effect
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
  ctx.lineWidth = size * 0.02;
  ctx.beginPath();
  ctx.moveTo(centerX - heartSize * 0.4, centerY);
  ctx.lineTo(centerX, centerY + heartSize * 0.3);
  ctx.lineTo(centerX + heartSize * 0.4, centerY);
  ctx.stroke();

  // Save the canvas
  const buffer = canvas.toBuffer('image/png');
  fs.writeFileSync(outputPath, buffer);
  console.log(`Generated ${outputPath}`);
}

// Create icons directory if it doesn't exist
const iconsDir = path.join(__dirname, '..', 'public', 'icons');
if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

// Generate icons
generateIcon(192, path.join(iconsDir, 'icon-192.png'));
generateIcon(512, path.join(iconsDir, 'icon-512.png'));

console.log('All icons generated successfully!');
