// Regenerates the pig-face toolbar icons used by the Komiko extensions.
// Pure Node, no dependencies. Run from an extension folder that has icons/:
//   node scripts/make-pig-icons.js peach   (Komiko Grab-n-Go)
//   node scripts/make-pig-icons.js teal    (Komiko Chat Grab-n-Go)
// Output PNGs contain only IHDR/IDAT/IEND — no metadata of any kind.
// Preserved here because the original was a throwaway scratch file.
const fs = require('fs');
const zlib = require('zlib');

const BG = { peach: [255, 139, 106], teal: [43, 179, 160] }[process.argv[2] || 'peach'];
if (!BG) { console.error('usage: node make-pig-icons.js peach|teal'); process.exit(1); }

const crcTable = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1); t[n] = c >>> 0; } return t; })();
function crc32(buf) { let c = 0xFFFFFFFF; for (let i = 0; i < buf.length; i++) c = crcTable[(c ^ buf[i]) & 0xFF] ^ (c >>> 8); return (c ^ 0xFFFFFFFF) >>> 0; }
function chunk(type, data) { const len = Buffer.alloc(4); len.writeUInt32BE(data.length, 0); const td = Buffer.concat([Buffer.from(type, 'ascii'), data]); const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(td), 0); return Buffer.concat([len, td, crc]); }
function png(size, rgbaAt) {
  const raw = Buffer.alloc((size * 4 + 1) * size);
  for (let y = 0; y < size; y++) { raw[y * (size * 4 + 1)] = 0; for (let x = 0; x < size; x++) { const [r, g, b, a] = rgbaAt(x, y); const o = y * (size * 4 + 1) + 1 + x * 4; raw[o] = r; raw[o + 1] = g; raw[o + 2] = b; raw[o + 3] = a; } }
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(size, 0); ihdr.writeUInt32BE(size, 4); ihdr[8] = 8; ihdr[9] = 6;
  return Buffer.concat([Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]), chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]);
}
const inCircle = (px, py, cx, cy, r) => Math.hypot(px - cx, py - cy) <= r;
const inEllipse = (px, py, cx, cy, rx, ry) => ((px - cx) / rx) ** 2 + ((py - cy) / ry) ** 2 <= 1;
function inTri(px, py, a, b, c) { const s = (p, q, r) => (p[0] - r[0]) * (q[1] - r[1]) - (q[0] - r[0]) * (p[1] - r[1]); const d1 = s([px, py], a, b), d2 = s([px, py], b, c), d3 = s([px, py], c, a); return !((d1 < 0 || d2 < 0 || d3 < 0) && (d1 > 0 || d2 > 0 || d3 > 0)); }
function inRoundedSquare(px, py, r) { const dx = Math.max(Math.abs(px - 0.5) - (0.5 - r), 0); const dy = Math.max(Math.abs(py - 0.5) - (0.5 - r), 0); return Math.hypot(dx, dy) <= r; }

const PINK = [249, 170, 200], PINK_IN = [236, 128, 170], SNOUT = [238, 134, 172], NOSTRIL = [140, 52, 92], EYE = [52, 38, 40], WHITE = [255, 255, 255];
function pigAt(px, py) {
  if (!inRoundedSquare(px, py, 0.22)) return [0, 0, 0, 0];
  let col = BG;
  if (inTri(px, py, [0.15, 0.44], [0.21, 0.13], [0.44, 0.28]) || inTri(px, py, [0.85, 0.44], [0.79, 0.13], [0.56, 0.28])) col = PINK;
  if (inTri(px, py, [0.22, 0.40], [0.24, 0.20], [0.38, 0.30]) || inTri(px, py, [0.78, 0.40], [0.76, 0.20], [0.62, 0.30])) col = PINK_IN;
  if (inCircle(px, py, 0.5, 0.55, 0.345)) col = PINK;
  if (inEllipse(px, py, 0.5, 0.635, 0.165, 0.115)) col = SNOUT;
  if (inCircle(px, py, 0.443, 0.635, 0.033) || inCircle(px, py, 0.557, 0.635, 0.033)) col = NOSTRIL;
  if (inCircle(px, py, 0.375, 0.455, 0.042) || inCircle(px, py, 0.625, 0.455, 0.042)) col = EYE;
  if (inCircle(px, py, 0.362, 0.442, 0.014) || inCircle(px, py, 0.612, 0.442, 0.014)) col = WHITE;
  return [col[0], col[1], col[2], 255];
}
function render(size) { const SS = 4; return (x, y) => { let r = 0, g = 0, b = 0, a = 0; for (let j = 0; j < SS; j++) for (let i = 0; i < SS; i++) { const [pr, pg, pb, pa] = pigAt((x + (i + 0.5) / SS) / size, (y + (j + 0.5) / SS) / size); r += pr * pa; g += pg * pa; b += pb * pa; a += pa; } if (a === 0) return [0, 0, 0, 0]; return [Math.round(r / a), Math.round(g / a), Math.round(b / a), Math.round(a / (SS * SS))]; }; }
for (const s of [16, 48, 128]) { fs.writeFileSync('icons/icon' + s + '.png', png(s, render(s))); console.log('wrote icons/icon' + s + '.png'); }
