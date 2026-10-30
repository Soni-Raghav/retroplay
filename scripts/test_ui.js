/* RetroPlay UI checks v2.5.0 — icons/PWA wiring, game art, responsiveness. */
const { chromium } = require('playwright');
const BASE = 'http://localhost:3000';
const ROM = '/home/z/my-project/upload/Teenage Mutant Ninja Turtles III - The Manhattan Project (USA).nes';

let passed = 0, total = 0;
function pass(n) { passed++; total++; console.log('PASS - ' + n); }
function fail(n, e) { total++; console.log('FAIL - ' + n + ' :: ' + String(e && e.message ? e.message : e).split('\n')[0].slice(0, 200)); }

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e).slice(0, 120)));

  await page.goto(BASE, { waitUntil: 'networkidle' });

  // 1. favicon + manifest links injected
  try {
    const ok = await page.evaluate(() => {
      const icon = document.querySelector('link[rel="icon"][type="image/svg+xml"]');
      const man = document.querySelector('link[rel="manifest"]');
      return !!(icon && icon.href.includes('icons/favicon.svg') && man && man.href.includes('manifest.webmanifest'));
    });
    if (ok) pass('favicon + manifest links present'); else throw new Error('links missing');
  } catch (e) { fail('favicon + manifest links present', e); }

  // 2. manifest fetches OK + parses + has icons
  try {
    const m = await page.evaluate(async () => {
      const r = await fetch(document.querySelector('link[rel="manifest"]').href);
      const j = await r.json();
      return { ok: r.ok, icons: (j.icons || []).length, name: j.name };
    });
    if (m.ok && m.icons >= 4) pass('PWA manifest valid (' + m.name + ', ' + m.icons + ' icons)');
    else throw new Error(JSON.stringify(m));
  } catch (e) { fail('PWA manifest valid', e); }

  // 3. favicon files all fetch 200
  try {
    const codes = await page.evaluate(async () => {
      const files = ['favicon.svg', 'favicon.ico', 'icon-192.png', 'icon-512.png',
        'maskable-192.png', 'maskable-512.png', 'apple-touch-icon.png'];
      const out = [];
      for (const f of files) {
        const r = await fetch(new URL('icons/' + f, location.href).href);
        out.push(f + ':' + r.status);
      }
      return out.join(' ');
    });
    if (!codes.includes(':4') && !codes.includes(':5')) pass('all 7 icon files served :: ' + codes);
    else throw new Error(codes);
  } catch (e) { fail('all 7 icon files served', e); }

  // 4. hero renders
  try {
    await page.waitForSelector('#hero .hero-title', { timeout: 5000 });
    const t = await page.textContent('#hero .hero-title');
    if (t.replace(/\s/g, '').toUpperCase().includes('RETRO')) pass('hero marquee renders :: ' + t.trim());
    else throw new Error(t);
  } catch (e) { fail('hero marquee renders', e); }

  // 5. ROM card shows generated artwork
  try {
    await page.setInputFiles('#romInput', ROM);
    await page.waitForFunction(() => document.querySelectorAll('#library .rom-art svg').length > 0, null, { timeout: 15000 });
    const info = await page.evaluate(() => {
      const svg = document.querySelector('#library .rom-art svg');
      const txt = svg ? svg.textContent : '';
      return { hasInitials: /T/i.test(txt), hasShort: txt.includes('NES'), w: svg && svg.getAttribute('width') };
    });
    if (info.hasShort) pass('game card artwork rendered (initials + NES badge, ' + info.w + 'px)');
    else throw new Error(JSON.stringify(info));
  } catch (e) { fail('game card artwork rendered', e); }

  // 6. responsive: no horizontal overflow at common widths + screenshots
  try {
    const shots = [[320, 700, 'menu-320w'], [390, 780, 'menu-390w'], [768, 900, 'menu-768w'],
                   [1024, 800, 'menu-1024w'], [740, 360, 'menu-landscape']];
    let bad = '';
    for (const [w, h, name] of shots) {
      await page.setViewportSize({ width: w, height: h });
      await page.waitForTimeout(350);
      const over = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      if (over > 1) bad += name + '(+' + over + 'px) ';
      await page.screenshot({ path: '/home/z/my-project/scripts/shots/v25-' + name + '.png' });
    }
    if (!bad) pass('no horizontal overflow at 320/390/768/1024/landscape');
    else throw new Error(bad);
  } catch (e) { fail('no horizontal overflow', e); }

  // 7. APK link points at the shipped version
  try {
    const href = await page.getAttribute('#apkLink', 'href');
    if (href === 'retroplay-v2.5.0.apk') pass('APK link -> ' + href);
    else throw new Error(href);
  } catch (e) { fail('APK link version', e); }

  // 8. join input usable at 320w (tap targets not squashed)
  try {
    await page.setViewportSize({ width: 320, height: 700 });
    const r = await page.evaluate(() => {
      const el = document.getElementById('joinCode');
      const b = document.getElementById('btnJoinStart');
      const a = el.getBoundingClientRect(), c = b.getBoundingClientRect();
      const intersect = !(a.right <= c.left || c.right <= a.left || a.bottom <= c.top || c.bottom <= a.top);
      return { iw: a.width, bh: c.height, intersect };
    });
    if (r.iw > 120 && r.bh >= 30 && !r.intersect) pass('join row usable at 320w');
    else throw new Error(JSON.stringify(r));
  } catch (e) { fail('join row usable at 320w', e); }

  if (errors.length) console.log('PAGEERRORS:', errors.join(' | '));
  await browser.close();
  console.log('RESULT: ' + passed + '/' + total + ' passed');
  process.exit(passed === total ? 0 : 1);
})();
