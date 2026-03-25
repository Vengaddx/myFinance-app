/**
 * Generates app icons from an inline SVG using sharp.
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
// Designed on a 100×100 viewBox, scaled to any size via width/height attrs.
// Flat, minimal: 4 bars (short→tall) + zig-up trend line + arrowhead, all #AEDD00.

function makeSvg(size) {
  const r = Math.round(size * 0.18);
  const green = "#AEDD00";
  const bg    = "#FFFFFF";

  // All coordinates on a 100×100 grid — sharp scales them via width/height.
  // Bars: baseline y=88, left-pad x=9, barW=13, gap=4
  //   bar1: h=22 (short)   bar2: h=34   bar3: h=46   bar4: h=59 (tallest)
  // Trend line: kink shape starting mid-left, dips, then shoots top-right
  // Arrow tip: (89, 11) — well above bar4 top (29) and clear of bars

  return `<svg xmlns="http://www.w3.org/2000/svg"
  width="${size}" height="${size}" viewBox="0 0 100 100">

  <rect width="100" height="100" rx="${(r * 100 / size).toFixed(1)}" fill="${bg}"/>

  <!-- Bar 1 -->
  <rect x="9"  y="66" width="13" height="22" rx="2.2" fill="${green}"/>
  <!-- Bar 2 -->
  <rect x="26" y="54" width="13" height="34" rx="2.2" fill="${green}"/>
  <!-- Bar 3 -->
  <rect x="43" y="42" width="13" height="46" rx="2.2" fill="${green}"/>
  <!-- Bar 4 -->
  <rect x="60" y="29" width="13" height="59" rx="2.2" fill="${green}"/>

  <!-- Trend line: start(7,61) → kink-low(26,71) → rise(50,49) → pre-tip(74,17) -->
  <polyline
    points="7,61 26,71 50,49 74,17"
    fill="none" stroke="${green}" stroke-width="5.8"
    stroke-linecap="round" stroke-linejoin="round"/>

  <!-- Arrow head at (90,9) pointing ~NE — larger triangle -->
  <!-- tip=90,9   left-base=72,23  right-base=82,31 -->
  <polygon points="90,9 72,23 82,31" fill="${green}"/>
</svg>`;
}

async function svgToPng(svgString, outputPath, size) {
  const buf = Buffer.from(svgString);
  await sharp(buf, { density: 300 })
    .resize(size, size)
    .png()
    .toFile(outputPath);
  console.log(`✓  ${outputPath}`);
}

// ─── Generate all sizes ───────────────────────────────────────────────────────

await svgToPng(makeSvg(512), path.join(publicDir, "icon-512.png"),        512);
await svgToPng(makeSvg(192), path.join(publicDir, "icon-192.png"),        192);
await svgToPng(makeSvg(180), path.join(publicDir, "apple-touch-icon.png"),180);

// favicon: 32×32 PNG saved as .ico (browsers accept PNG-in-ICO)
const faviconPng = await sharp(Buffer.from(makeSvg(64)), { density: 300 })
  .resize(32, 32)
  .png()
  .toBuffer();
writeFileSync(path.join(appDir, "favicon.ico"), faviconPng);
console.log(`✓  app/favicon.ico  (32×32 PNG)`);

console.log("\nAll icons generated.");
