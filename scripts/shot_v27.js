/* v2.7.0 visual check: game screen with bar open vs hidden at a phone-portrait
 * viewport — the canvas must reach the very top edge (no dead strip). */
const { chromium } = require('playwright');
const fs = require('fs');

(async () => {
  const browser = await chromium.launch();
  const A = await browser.newPage({ viewport: { width: 390, height: 844 } }); // phone portrait
  await A.goto('http://localhost:3000', { waitUntil: 'domcontentloaded' });
  await A.setInputFiles('#romInput',
    '/home/z/my-project/upload/Teenage Mutant Ninja Turtles III - The Manhattan Project (USA).nes');
  await A.waitForFunction(() => document.querySelectorAll('#library .rom').length > 0, null, { timeout: 15000 });
  await A.click('#library .rom .btn.small');
  await A.waitForSelector('#gameScreen', { timeout: 10000 });
  // wait for emulator boot so the bar arms, then hide
  await A.waitForFunction(() => {
    const w = document.getElementById('gameFrame');
    try { return w && w.contentWindow && w.contentWindow.EJS_emulator && w.contentWindow.EJS_emulator.started; }
    catch (e) { return false; }
  }, null, { timeout: 45000 });
  await A.waitForFunction(() => {
    const b = document.querySelector('#gameScreen .game-top');
    return b && b.classList.contains('hide') && b.getBoundingClientRect().bottom <= 1;
  }, null, { timeout: 10000 });
  fs.mkdirSync('scripts/shots', { recursive: true });
  await A.screenshot({ path: 'scripts/shots/v27-game-hidden-390.png' });

  // revealed state
  await A.click('#barTab');
  await A.waitForFunction(() => {
    const b = document.querySelector('#gameScreen .game-top');
    return b && !b.classList.contains('hide');
  }, null, { timeout: 4000 });
  await A.screenshot({ path: 'scripts/shots/v27-game-open-390.png' });

  const r = await A.evaluate(() => {
    const f = document.getElementById('gameFrame');
    return { frameTop: f.getBoundingClientRect().top, innerH: window.innerHeight };
  });
  console.log('frameTop=' + r.frameTop + ' (must be 0), viewport h=' + r.innerH);
  await browser.close();
})().catch((e) => { console.error('CRASH', e); process.exit(1); });
