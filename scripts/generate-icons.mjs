// Generates PWA PNG icons + favicon.svg without external image deps.
// Design: purple brand tile with a white timer ring + progress arc and a play triangle.
import { deflateSync } from 'node:zlib';
import { writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const publicDir = join(__dirname, '..', 'public');
mkdirSync(publicDir, { recursive: true });

const PURPLE = [124, 58, 237];
const WHITE = [250, 250, 250];

function over(base, color, alpha) {
  const a = alpha + base[3] * (1 - alpha);
  if (a === 0) return [0, 0, 0, 0];
  const blend = (i) =>
    (color[i] * alpha + base[i] * base[3] * (1 - alpha)) / a;
  return [blend(0), blend(1), blend(2), a];
}

// rounded-rect signed distance (negative inside)
function sdRoundRect(px, py, halfW, halfH, r) {
  const qx = Math.abs(px) - halfW + r;
  const qy = Math.abs(py) - halfH + r;
  const ax = Math.max(qx, 0);
  const ay = Math.max(qy, 0);
  return Math.min(Math.max(qx, qy), 0) + Math.hypot(ax, ay) - r;
}

function pointInTriangle(px, py, a, b, c) {
  const sign = (p1, p2, p3) =>
    (p1[0] - p3[0]) * (p2[1] - p3[1]) - (p2[0] - p3[0]) * (p1[1] - p3[1]);
  const d1 = sign([px, py], a, b);
  const d2 = sign([px, py], b, c);
  const d3 = sign([px, py], c, a);
  const hasNeg = d1 < 0 || d2 < 0 || d3 < 0;
  const hasPos = d1 > 0 || d2 > 0 || d3 > 0;
  return !(hasNeg && hasPos);
}

// returns RGBA (0..255, a 0..1) for a single sample point
function shade(x, y, N, maskable) {
  const c = N / 2;
  const dx = x - c;
  const dy = y - c;
  let px = [0, 0, 0, 0];

  // background tile
  let bgCov = 0;
  if (maskable) {
    bgCov = 1;
  } else {
    const sd = sdRoundRect(dx, dy, N * 0.5 - 1, N * 0.5 - 1, N * 0.22);
    bgCov = sd < 0 ? 1 : 0;
  }
  if (bgCov > 0) px = over(px, PURPLE, bgCov);

  const r = Math.hypot(dx, dy);
  const R = N * 0.32; // ring center radius
  const t = N * 0.07; // ring thickness
  const inRing = Math.abs(r - R) <= t / 2;

  // base ring (subtle)
  if (inRing) px = over(px, WHITE, 0.32);

  // progress arc (clockwise from top, with gap at the end)
  if (inRing) {
    let a = (Math.atan2(dx, -dy) * 180) / Math.PI; // 0 at top, clockwise
    if (a < 0) a += 360;
    if (a <= 292) px = over(px, WHITE, 1);
  }

  // play triangle in center
  const s = N * 0.135;
  const A = [c - s * 0.5, c - s * 0.85];
  const B = [c - s * 0.5, c + s * 0.85];
  const C = [c + s * 0.95, c];
  if (pointInTriangle(x, y, A, B, C)) px = over(px, WHITE, 1);

  return px;
}

function renderPng(N, maskable) {
  const SS = 3; // supersampling for anti-aliasing
  const data = Buffer.alloc(N * N * 4);
  for (let y = 0; y < N; y++) {
    for (let x = 0; x < N; x++) {
      let rr = 0, gg = 0, bb = 0, aa = 0;
      for (let sy = 0; sy < SS; sy++) {
        for (let sx = 0; sx < SS; sx++) {
          const px = shade(x + (sx + 0.5) / SS, y + (sy + 0.5) / SS, N, maskable);
          rr += px[0] * px[3];
          gg += px[1] * px[3];
          bb += px[2] * px[3];
          aa += px[3];
        }
      }
      const n = SS * SS;
      const alpha = aa / n;
      const i = (y * N + x) * 4;
      if (alpha > 0) {
        data[i] = Math.round(rr / aa);
        data[i + 1] = Math.round(gg / aa);
        data[i + 2] = Math.round(bb / aa);
      }
      data[i + 3] = Math.round(alpha * 255);
    }
  }
  return encodePng(N, N, data);
}

function encodePng(w, h, rgba) {
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type RGBA
  // filter: prepend 0 (none) to each row
  const raw = Buffer.alloc((w * 4 + 1) * h);
  for (let y = 0; y < h; y++) {
    raw[y * (w * 4 + 1)] = 0;
    rgba.copy(raw, y * (w * 4 + 1) + 1, y * w * 4, (y + 1) * w * 4);
  }
  const idat = deflateSync(raw, { level: 9 });
  const chunk = (type, body) => {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(body.length, 0);
    const typeBuf = Buffer.from(type, 'ascii');
    const crc = Buffer.alloc(4);
    crc.writeUInt32BE(crc32(Buffer.concat([typeBuf, body])) >>> 0, 0);
    return Buffer.concat([len, typeBuf, body, crc]);
  };
  return Buffer.concat([
    sig,
    chunk('IHDR', ihdr),
    chunk('IDAT', idat),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

const crcTable = (() => {
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
  for (let i = 0; i < buf.length; i++) c = crcTable[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return c ^ 0xffffffff;
}

const targets = [
  ['pwa-192x192.png', 192, false],
  ['pwa-512x512.png', 512, false],
  ['pwa-maskable-512x512.png', 512, true],
  ['apple-touch-icon.png', 180, false],
  ['favicon-32x32.png', 32, false],
];
for (const [name, size, maskable] of targets) {
  writeFileSync(join(publicDir, name), renderPng(size, maskable));
  console.log('wrote', name);
}

// vector favicon
const faviconSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  <rect width="100" height="100" rx="22" fill="#7c3aed"/>
  <g fill="none" stroke="#fafafa" stroke-linecap="round">
    <circle cx="50" cy="50" r="32" stroke-width="7" opacity="0.32"/>
    <path d="M50 18 A32 32 0 1 1 21.5 67.5" stroke-width="7"/>
  </g>
  <path d="M45 38 L45 62 L66 50 Z" fill="#fafafa"/>
</svg>`;
writeFileSync(join(publicDir, 'favicon.svg'), faviconSvg);
console.log('wrote favicon.svg');
