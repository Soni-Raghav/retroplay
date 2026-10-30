/* v2.8.0 visual check: guest (P2) floating gamepad over the streamed video. */
const { chromium } = require('playwright');
const fs = require('fs');
const ROM = '/home/z/my-project/upload/Teenage Mutant Ninja Turtles III - The Manhattan Project (USA).nes';

(async () => {
  const browser = await chromium.launch();
  const H = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await H.goto('http://localhost:3000', { waitUntil: 'domcontentloaded' });
  await H.setInputFiles('#romInput', ROM);
  await H.waitForFunction(() => document.querySelectorAll('#library .rom').length > 0, null, { timeout: 15000 });
  await H.click('#library .rom .btn.small');
  await H.waitForFunction(() => {
    const w = document.getElementById('gameFrame');
    try { return w && w.contentWindow && w.contentWindow.EJS_emulator && w.contentWindow.EJS_emulator.started; }
    catch (e) { return false; }
  }, null, { timeout: 60000 });
  await H.click('#mpFab');
  await H.click('#btnHostStart');
  await H.waitForFunction(() => {
    const el = document.getElementById('hostCode');
    return el && el.textContent.trim().length >= 4;
  }, null, { timeout: 15000 });
  const code = (await H.textContent('#hostCode')).trim();

  const G = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await G.goto('http://localhost:3000', { waitUntil: 'domcontentloaded' });
  await G.fill('#joinCode', code);
  await G.click('#btnJoinStart');
  await G.waitForFunction(() => {
    const v = document.getElementById('remoteVideo');
    return v && v.srcObject && v.readyState >= 2;
  }, null, { timeout: 30000 });
  fs.mkdirSync('scripts/shots', { recursive: true });
  await G.screenshot({ path: 'scripts/shots/v28-guest-pad-portrait.png' });

  // press and hold B to show the pressed glow
  const b = await G.evaluate(() => {
    const p = document.querySelector('.pad.f-b');
    const r = p.getBoundingClientRect();
    return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
  });
  await G.mouse.move(b.x, b.y); await G.mouse.down();
  await G.waitForTimeout(400);
  await G.screenshot({ path: 'scripts/shots/v28-guest-pad-pressed.png' });
  await G.mouse.up();

  await G.setViewportSize({ width: 740, height: 360 });
  await G.waitForTimeout(500);
  await G.screenshot({ path: 'scripts/shots/v28-guest-pad-landscape.png' });
  console.log('guest shots done, room=' + code);
  await browser.close();
})().catch((e) => { console.error('CRASH', e); process.exit(1); });
