/* Debug: what's on top at the FAB center, and do pointer events reach it? */
const { chromium } = require('playwright');
const BASE = 'http://localhost:3000';
const ROM = '/home/z/my-project/upload/Teenage Mutant Ninja Turtles III - The Manhattan Project (USA).nes';

(async () => {
  const browser = await chromium.launch();
  const A = await (await browser.newContext()).newPage();
  A.on('pageerror', (e) => console.log('[pageerror]', String(e).slice(0, 120)));
  await A.goto(BASE, { waitUntil: 'domcontentloaded' });
  await A.setInputFiles('#romInput', ROM);
  await A.waitForFunction(() => document.querySelectorAll('#library .rom').length > 0, null, { timeout: 15000 });
  await A.click('#library .rom button.btn.small');
  await A.waitForFunction(() => {
    const f = document.getElementById('gameFrame');
    return !!(f && f.contentWindow && f.contentWindow.EJS_emulator && f.contentWindow.EJS_emulator.started);
  }, null, { timeout: 60000 });
  await A.waitForSelector('#mpFab', { state: 'visible', timeout: 20000 });
  await A.waitForTimeout(1500); // let tip toast come & go

  // 1. what is on top at FAB center?
  const probe = await A.evaluate(() => {
    const f = document.getElementById('mpFab');
    const r = f.getBoundingClientRect();
    const cx = r.x + r.width / 2, cy = r.y + r.height / 2;
    const stack = document.elementsFromPoint(cx, cy).map((el) =>
      el.id ? '#' + el.id : el.className ? el.tagName + '.' + String(el.className).split(' ').join('.') : el.tagName);
    return { rect: { x: r.x, y: r.y, w: r.width, h: r.height }, cx, cy, stack: stack.slice(0, 6) };
  });
  console.log('FAB probe:', JSON.stringify(probe, null, 1));

  // 2. attach native listeners, then do the long-press sequence
  await A.evaluate(() => {
    window.__ev = [];
    const f = document.getElementById('mpFab');
    ['pointerdown', 'pointerup', 'pointercancel', 'click'].forEach((t) =>
      f.addEventListener(t, (e) => window.__ev.push(t + ':primary=' + e.isPrimary + ':btn=' + e.button)));
    window.addEventListener('pointerdown', (e) => {
      if (e.target !== document.getElementById('mpFab')) window.__ev.push('OUTDOWN:' + (e.target.id || e.target.className));
    }, true);
  });
  const box2 = await A.evaluate(() => {
    const r = document.getElementById('mpFab').getBoundingClientRect();
    return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
  });
  await A.mouse.move(box2.x, box2.y);
  await A.mouse.down();
  await A.waitForTimeout(750);
  const midState = await A.evaluate(() => ({
    ev: window.__ev.slice(),
    fabClass: document.getElementById('mpFab').className,
    hasMin: document.getElementById('mpFab').classList.contains('min')
  }));
  console.log('mid long-press:', JSON.stringify(midState, null, 1));
  await A.mouse.up();
  await A.waitForTimeout(300);
  const endState = await A.evaluate(() => ({
    ev: window.__ev.slice(),
    fabClass: document.getElementById('mpFab') ? document.getElementById('mpFab').className : 'GONE',
    sheetOpen: !!document.getElementById('mpSheetWrap')
  }));
  console.log('after mouse.up:', JSON.stringify(endState, null, 1));

  // 3. plain tap -> sheet?
  await A.waitForTimeout(600);
  await A.mouse.click(box2.x, box2.y);
  await A.waitForTimeout(400);
  const tapState = await A.evaluate(() => ({
    sheetOpen: !!document.getElementById('mpSheetWrap'),
    fabClass: document.getElementById('mpFab') ? document.getElementById('mpFab').className : 'GONE'
  }));
  console.log('after tap:', JSON.stringify(tapState, null, 1));
  await browser.close();
})().catch((e) => { console.error('debug crashed:', e.message); process.exit(1); });
