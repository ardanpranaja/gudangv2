#!/usr/bin/env node
/* Generate PWA icons (PNG) from code — zero dependencies.
 * Runs via `prebuild` so `npm run build` (incl. Vercel) always produces
 * public/icons/*.png without committing binaries to git.
 * Design: slate-900 rounded square + white warehouse glyph. Deterministic. */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { deflateSync } from 'node:zlib';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, 'public', 'icons');

const BG = [15, 23, 42, 255]; // #0f172a
const FG = [255, 255, 255, 255];

/* ---- minimal PNG encoder (RGBA, 8-bit) ---- */
const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();
function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
}
function encodePng(pixels, w, h) {
  // pixels: Buffer RGBA, rows top-to-bottom
  const rows = [];
  for (let y = 0; y < h; y++) {
    rows.push(0x00); // filter: none
    rows.push(...pixels.subarray(y * w * 4, (y + 1) * w * 4));
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type: RGBA
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  return Buffer.concat([
    sig,
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(Buffer.from(rows))),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

/* ---- tiny software renderer ---- */
function makeCanvas(size) {
  return { size, buf: Buffer.alloc(size * size * 4, 0) };
}
function setPx(cv, x, y, rgba) {
  const { size, buf } = cv;
  if (x < 0 || y < 0 || x >= size || y >= size) return;
  const i = (y * size + x) * 4;
  buf[i] = rgba[0]; buf[i + 1] = rgba[1]; buf[i + 2] = rgba[2]; buf[i + 3] = rgba[3];
}
function fillRoundedRect(cv, color, radius) {
  const s = cv.size;
  for (let y = 0; y < s; y++) {
    for (let x = 0; x < s; x++) {
      const dx = Math.min(x, s - 1 - x);
      const dy = Math.min(y, s - 1 - y);
      let inside;
      if (dx >= radius || dy >= radius) inside = true;
      else {
        const cx = radius - 1 - dx, cy = radius - 1 - dy;
        inside = cx * cx + cy * cy <= radius * radius;
      }
      if (inside) setPx(cv, x, y, color);
    }
  }
}
function pointInPoly(px, py, poly) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i], [xj, yj] = poly[j];
    if (yi > py !== yj > py && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}
function drawGlyph(cv, cx, cy, k, bg) {
  const s = cv.size;
  const roof = [
    [cx - 160 * k, cy - 10 * k],
    [cx, cy - 130 * k],
    [cx + 160 * k, cy - 10 * k],
  ];
  const bx0 = cx - 130 * k, by0 = cy - 10 * k, bx1 = cx + 130 * k, by1 = cy + 130 * k;
  const dx0 = cx - 30 * k, dy0 = cy + 40 * k, dx1 = cx + 30 * k, dy1 = cy + 130 * k;
  for (let y = Math.max(0, Math.floor(cy - 140 * k)); y < Math.min(s, Math.ceil(cy + 140 * k)); y++) {
    for (let x = Math.max(0, Math.floor(cx - 170 * k)); x < Math.min(s, Math.ceil(cx + 170 * k)); x++) {
      const inRoof = pointInPoly(x + 0.5, y + 0.5, roof);
      const inBody = x >= bx0 && x < bx1 && y >= by0 && y < by1;
      if (inRoof || inBody) {
        const inDoor = x >= dx0 && x < dx1 && y >= dy0 && y < dy1;
        setPx(cv, x, y, inDoor ? bg : FG);
      }
    }
  }
}

function buildIcon(size, maskable) {
  const cv = makeCanvas(size);
  if (maskable) {
    for (let i = 0; i < cv.buf.length; i += 4) {
      cv.buf[i] = BG[0]; cv.buf[i + 1] = BG[1]; cv.buf[i + 2] = BG[2]; cv.buf[i + 3] = 255;
    }
    drawGlyph(cv, size / 2, size / 2, (size / 512) * 0.68, BG);
  } else {
    fillRoundedRect(cv, BG, size / 4);
    drawGlyph(cv, size / 2, size / 2, size / 512, BG);
  }
  return encodePng(cv.buf, size, size);
}

mkdirSync(OUT, { recursive: true });
const targets = [
  ['icon-192.png', buildIcon(192, false)],
  ['icon-512.png', buildIcon(512, false)],
  ['icon-maskable-512.png', buildIcon(512, true)],
];
for (const [name, png] of targets) {
  writeFileSync(join(OUT, name), png);
  console.log(`generated public/icons/${name} (${png.length} bytes)`);
}
