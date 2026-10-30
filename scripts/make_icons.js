/* RetroPlay icon generator — renders the branded gamepad mark to every
 * PNG/SVG/ICO the web app and the Android launcher need. Playwright + PIL. */
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const WEB_DIR = '/home/z/my-project/public/icons';
const RES_DIR = '/home/z/my-project/retroplay/android/app/src/main/res';

/* ---- the gamepad mark, drawn on a 100x100 stage ---- */
function padGroup(scale) {
  return `<g transform="translate(50 52) scale(${scale}) translate(-50 -52)">
    <path d="M30 38h40a16 16 0 0 1 16 16v2a14 14 0 0 1-25 8l-2-2H41l-2 2a14 14 0 0 1-25-8v-2a16 16 0 0 1 16-16z" fill="#ffffff"/>
    <rect x="31.4" y="44.6" width="4.4" height="13.2" rx="1.6" fill="#7c3aed"/>
    <rect x="27.1" y="48.9" width="13" height="4.4" rx="1.6" fill="#7c3aed"/>
    <circle cx="66.5" cy="49.5" r="3.2" fill="#e879f9"/>
    <circle cx="74.5" cy="57.5" r="3.2" fill="#22d3ee"/>
    <rect x="45.4" y="51.2" width="4" height="2.2" rx="1.1" fill="#7c3aed" opacity=".85"/>
    <rect x="50.6" y="51.2" width="4" height="2.2" rx="1.1" fill="#7c3aed" opacity=".85"/>
    <ellipse cx="40" cy="41.5" rx="20" ry="6" fill="#ffffff" opacity=".35"/>
  </g>`;
}

function sparkles(scale) {
  return `<g transform="translate(50 52) scale(${scale}) translate(-50 -52)" font-family="monospace">
    <rect x="17" y="21" width="3" height="3" fill="#ffffff" opacity=".9"/>
    <rect x="82" y="18" width="2.4" height="2.4" fill="#22d3ee" opacity=".95"/>
    <rect x="86" y="26" width="1.8" height="1.8" fill="#ffffff" opacity=".7"/>
    <rect x="12" y="72" width="2.2" height="2.2" fill="#fde047" opacity=".9"/>
  </g>`;
}

function gradDef(id) {
  return `<linearGradient id="${id}" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0" stop-color="#8b5cf6"/><stop offset=".55" stop-color="#d946ef"/>
    <stop offset="1" stop-color="#22d3ee"/></linearGradient>`;
}

/* bg: rounded | full | circle | none ; s = icon size px ; k = content scale */
function iconSVG({ bg, s, k = 1 }) {
  const defs = `<defs>${gradDef('g')}</defs>`;
  let back = '';
  if (bg === 'rounded') back = `<rect width="100" height="100" rx="22.5" fill="url(#g)"/>`;
  if (bg === 'full') back = `<rect width="100" height="100" fill="url(#g)"/>`;
  if (bg === 'circle') back = `<circle cx="50" cy="50" r="50" fill="url(#g)"/>`;
  const ring = (bg && bg !== 'full')
    ? `<rect x="3" y="3" width="94" height="94" rx="${bg === 'circle' ? 47 : 20}" fill="none" stroke="#ffffff" stroke-opacity=".28" stroke-width="2"/>` : '';
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${s}" height="${s}" viewBox="0 0 100 100">${defs}${back}${ring}${sparkles(k)}${padGroup(k)}</svg>`;
}

const jobs = [
  // ---- web (public/icons) ----
  { out: path.join(WEB_DIR, 'icon-512.png'), s: 512, bg: 'rounded', k: 1 },
  { out: path.join(WEB_DIR, 'icon-192.png'), s: 192, bg: 'rounded', k: 1 },
  { out: path.join(WEB_DIR, 'maskable-512.png'), s: 512, bg: 'full', k: 0.68 },
  { out: path.join(WEB_DIR, 'maskable-192.png'), s: 192, bg: 'full', k: 0.68 },
  { out: path.join(WEB_DIR, 'apple-touch-icon.png'), s: 180, bg: 'full', k: 0.86 },
  { out: path.join(WEB_DIR, 'icon-256.png'), s: 256, bg: 'rounded', k: 1 },   // for favicon.ico
  // ---- android legacy launcher mipmaps ----
  ...[48, 72, 96, 144, 192].flatMap((s) => {
    const d = { 48: 'mdpi', 72: 'hdpi', 96: 'xhdpi', 144: 'xxhdpi', 192: 'xxxhdpi' }[s];
    return [
      { out: path.join(RES_DIR, 'mipmap-' + d, 'ic_launcher.png'), s, bg: 'rounded', k: 1 },
      { out: path.join(RES_DIR, 'mipmap-' + d, 'ic_launcher_round.png'), s, bg: 'circle', k: 0.94 }
    ];
  }),
  // ---- android adaptive layers (432px @xxxhdpi 108dp) ----
  { out: path.join(RES_DIR, 'mipmap-xxxhdpi', 'ic_launcher_bg.png'), s: 432, bg: 'full', k: 0.0001 },
  { out: path.join(RES_DIR, 'mipmap-xxxhdpi', 'ic_launcher_fg.png'), s: 432, bg: 'none', k: 0.60 }
];

(async () => {
  fs.mkdirSync(WEB_DIR, { recursive: true });
  // vector favicon
  fs.writeFileSync(path.join(WEB_DIR, 'favicon.svg'), iconSVG({ bg: 'rounded', s: 64, k: 1 }));

  const browser = await chromium.launch();
  const page = await browser.newPage();
  for (const j of jobs) {
    fs.mkdirSync(path.dirname(j.out), { recursive: true });
    await page.setViewportSize({ width: Math.max(j.s, 64) + 20, height: Math.max(j.s, 64) + 20 });
    await page.setContent(
      `<body style="margin:0;background:transparent"><div id="t" style="width:${j.s}px;height:${j.s}px">${iconSVG(j)}</div></body>`,
      { waitUntil: 'networkidle' });
    await page.locator('#t').screenshot({ path: j.out, omitBackground: true });
    console.log('ok', j.out.replace('/home/z/my-project/', ''));
  }
  await browser.close();

  // favicon.ico from the 256 render
  try {
    const PIL = require('child_process');
    PIL.execSync(`python3 - <<'EOF'
from PIL import Image
im = Image.open('${path.join(WEB_DIR, 'icon-256.png')}')
im.save('${path.join(WEB_DIR, 'favicon.ico')}', sizes=[(16,16),(32,32),(48,48)])
print('ico ok')
EOF`, { stdio: 'inherit' });
  } catch (e) { console.log('ico skipped (no PIL):', e.message.slice(0, 80)); }

  console.log('DONE', jobs.length + 1, 'files');
})();
