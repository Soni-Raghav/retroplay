/* Capture UI screenshots: menu, game (host) screen, KEYS panel, guest screen. */
const { chromium } = require('playwright');
const BASE = 'http://localhost:3000';
const ROM = '/home/z/my-project/upload/Teenage Mutant Ninja Turtles III - The Manhattan Project (USA).nes';
const OUT = '/home/z/my-project/scripts/shots';

(async () => {
  const fs = require('fs');
  if (!fs.existsSync(OUT)) fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch();

  // Host flow (mobile-ish viewport, landscape like a phone game session)
  const ctxA = await browser.newContext({ viewport: { width: 844, height: 390 }, deviceScaleFactor: 2 });
  const A = await ctxA.newPage();
  await A.goto(BASE, { waitUntil: 'domcontentloaded' });
  await A.waitForTimeout(700);
  await A.screenshot({ path: OUT + '/1-menu.png' });
  await A.setInputFiles('#romInput', ROM);
  await A.waitForFunction(() => document.querySelectorAll('#library .rom').length > 0, null, { timeout: 15000 });
  await A.click('#library .rom button.btn.small');
  await A.waitForFunction(() => {
    const f = document.getElementById('gameFrame');
    return !!(f && f.contentWindow && f.contentWindow.EJS_emulator && f.contentWindow.EJS_emulator.started);
  }, null, { timeout: 60000 });
  await A.waitForSelector('#mpFab', { state: 'visible', timeout: 20000 });
  await A.waitForTimeout(4600); // let the tip toast show in shot
  await A.screenshot({ path: OUT + '/2-game-fab-toast.png' });
  // KEYS panel
  await A.click('#keysToggle');
  await A.waitForSelector('#keysPanel', { timeout: 5000 });
  await A.waitForTimeout(400);
  await A.screenshot({ path: OUT + '/3-host-keys-panel.png' });
  await A.click('#keysDone');
  // MP sheet
  await A.click('#mpFab');
  await A.waitForTimeout(400);
  await A.screenshot({ path: OUT + '/4-mp-sheet.png' });
  await A.click('#mpClose');

  // Guest flow
  const code = 'TESTAB';
  const ctxB = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
  const B = await ctxB.newPage();
  await B.goto(BASE, { waitUntil: 'domcontentloaded' });
  await B.fill('#joinCode', code);
  await B.click('#btnJoinStart');
  await B.waitForSelector('#guestScreen', { timeout: 15000 });
  await B.waitForTimeout(600);
  await B.screenshot({ path: OUT + '/5-guest-connecting.png' });
  await B.click('#padToggle'); // hide pad
  await B.click('#keysToggle');
  await B.waitForSelector('#keysPanel', { timeout: 5000 });
  await B.waitForTimeout(400);
  await B.screenshot({ path: OUT + '/6-guest-keys-panel.png' });

  await browser.close();
  console.log('screenshots saved to ' + OUT);
})().catch((e) => { console.error('shots crashed:', e.message); process.exit(1); });
