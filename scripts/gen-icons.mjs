/**
 * Generates app icons — credit card on deep-navy gradient.
 * Run: node scripts/gen-icons.mjs
 */
import sharp from "sharp";
import { writeFileSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const publicDir = path.join(__dirname, "../public");
const appDir    = path.join(__dirname, "../app");

// ─── Icon SVG ─────────────────────────────────────────────────────────────────
// Apple design principles applied:
//   • Single focal icon — the filled credit card glyph
//   • Deep navy-to-midnight gradient background — financial trust, premium feel
//   • White icon at ~56% canvas width for optical balance
//   • Subtle top-radial highlight — Apple-style soft light source
//   • No border-radius in SVG (iOS/Android apply their own squircle mask)

function makeIconSvg(size) {
  // Scale the 24×24 credit-card path to 56% of canvas
  const targetPx = size * 0.56;
  const scale    = targetPx / 24;
  const offset   = size / 2;

  return `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#0B1628"/>
      <stop offset="100%" stop-color="#0E3060"/>
    </linearGradient>
    <radialGradient id="glow" cx="50%" cy="0%" r="70%">
      <stop offset="0%"   stop-color="#ffffff" stop-opacity="0.08"/>
      <stop offset="100%" stop-color="#ffffff" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="${size}" height="${size}" fill="url(#bg)"/>
  <rect width="${size}" height="${size}" fill="url(#glow)"/>
  <g transform="translate(${offset},${offset}) scale(${scale}) translate(-12,-12)">
    <path fill-rule="evenodd" clip-rule="evenodd"
      d="M2.00174 10H21.9983C21.9862 7.82497 21.8897 6.64706 21.1213 5.87868C20.2426 5 18.8284 5 16 5H8C5.17157 5 3.75736 5 2.87868 5.87868C2.1103 6.64706 2.01384 7.82497 2.00174 10ZM22 12H2V14C2 16.8284 2 18.2426 2.87868 19.1213C3.75736 20 5.17157 20 8 20H16C18.8284 20 20.2426 20 21.1213 19.1213C22 18.2426 22 16.8284 22 14V12ZM7 15C6.44772 15 6 15.4477 6 16C6 16.5523 6.44772 17 7 17H7.01C7.56228 17 8.01 16.5523 8.01 16C8.01 15.4477 7.56228 15 7.01 15H7Z"
      fill="white" opacity="0.95"/>
  </g>
</svg>`;
}

// Favicon: rounded square (browser tabs render their own shape on most OSes)
function makeFaviconSvg(size) {
  const r      = Math.round(size * 0.2);
  const target = size * 0.58;
  const scale  = target / 24;
  const offset = size / 2;

  return `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#0B1628"/>
      <stop offset="100%" stop-color="#0E3060"/>
    </linearGradient>
  </defs>
  <rect width="${size}" height="${size}" rx="${r}" fill="url(#bg)"/>
  <g transform="translate(${offset},${offset}) scale(${scale}) translate(-12,-12)">
    <path fill-rule="evenodd" clip-rule="evenodd"
      d="M2.00174 10H21.9983C21.9862 7.82497 21.8897 6.64706 21.1213 5.87868C20.2426 5 18.8284 5 16 5H8C5.17157 5 3.75736 5 2.87868 5.87868C2.1103 6.64706 2.01384 7.82497 2.00174 10ZM22 12H2V14C2 16.8284 2 18.2426 2.87868 19.1213C3.75736 20 5.17157 20 8 20H16C18.8284 20 20.2426 20 21.1213 19.1213C22 18.2426 22 16.8284 22 14V12ZM7 15C6.44772 15 6 15.4477 6 16C6 16.5523 6.44772 17 7 17H7.01C7.56228 17 8.01 16.5523 8.01 16C8.01 15.4477 7.56228 15 7.01 15H7Z"
      fill="white"/>
  </g>
</svg>`;
}

async function render(svgString, outputPath, size) {
  await sharp(Buffer.from(svgString), { density: 300 })
    .resize(size, size)
    .png({ compressionLevel: 9 })
    .toFile(outputPath);
  console.log(`✓  ${path.basename(outputPath)}  (${size}×${size})`);
}

// ─── Generate all sizes ───────────────────────────────────────────────────────

await render(makeIconSvg(512),  path.join(publicDir, "icon-512.png"),         512);
await render(makeIconSvg(192),  path.join(publicDir, "icon-192.png"),         192);
await render(makeIconSvg(180),  path.join(publicDir, "apple-touch-icon.png"), 180);
await render(makeIconSvg(1024), path.join(publicDir, "icon-1024.png"),        1024);

// favicon.ico as 32×32 PNG (all modern browsers accept PNG-in-ICO)
const favBuf = await sharp(Buffer.from(makeFaviconSvg(64)), { density: 300 })
  .resize(32, 32)
  .png()
  .toBuffer();
writeFileSync(path.join(appDir, "favicon.ico"), favBuf);
console.log(`✓  favicon.ico  (32×32)`);

// Also write a 32×32 PNG for explicit <link> reference
await render(makeFaviconSvg(64), path.join(publicDir, "favicon-32.png"), 32);

console.log("\nAll icons generated successfully.");
