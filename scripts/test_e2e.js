/* RetroPlay E2E — 8 assertions: ROM add/detect, emulator boot, in-game FAB,
 * room code, guest join, live video, Player-2 input injection, host status. */
const { chromium } = require('playwright');
const BASE = 'http://localhost:3000';
const ROM = '/home/z/my-project/upload/Teenage Mutant Ninja Turtles III - The Manhattan Project (USA).nes';

let passed = 0, total = 0;
function pass(name) { passed++; total++; console.log('PASS - ' + name); }
function fail(name, e) { total++; console.log('FAIL - ' + name + ' :: ' + (e && e.message ? e.message.split('\n')[0] : e)); }

async function main() {
  const browser = await chromium.launch();
  const ctxA = await browser.newContext();
  const A = await ctxA.newPage();
  A.on('console', (m) => { if (m.type() === 'error') console.log('[A console]', m.text().slice(0, 140)); });
  A.on('pageerror', (e) => console.log('[A pageerror]', String(e).slice(0, 140)));

  await A.goto(BASE, { waitUntil: 'domcontentloaded' });

  // 1. ROM added + system detected
  await A.setInputFiles('#romInput', ROM);
  try {
    await A.waitForFunction(() => document.querySelectorAll('#library .rom').length > 0, null, { timeout: 15000 });
    const meta = await A.textContent('#library .rom .rom-meta');
    pass('ROM added + system detected :: ' + (meta.indexOf('NES') >= 0 ? 'NES' : meta.trim()));
  } catch (e) { fail('ROM added + system detected', e); }

  // 2. EmulatorJS boots
  try {
    await A.click('#library .rom button.btn.small');
    await A.waitForFunction(() => {
      const f = document.getElementById('gameFrame');
      return !!(f && f.contentWindow && f.contentWindow.EJS_emulator && f.contentWindow.EJS_emulator.started);
    }, null, { timeout: 60000 });
    pass('EmulatorJS booted (NES)');
  } catch (e) { fail('EmulatorJS booted (NES)', e); }

  // 3. Floating MP button visible in-game
  try {
    await A.waitForSelector('#mpFab', { state: 'visible', timeout: 20000 });
    pass('Floating MP button visible in-game');
  } catch (e) { fail('Floating MP button visible in-game', e); }

  // 4. Host: open sheet, start hosting, room code generated
  let code = '';
  try {
    await A.click('#mpFab');
    await A.click('#btnHostStart');
    await A.waitForFunction(() => {
      const el = document.getElementById('hostCode');
      return el && el.textContent && el.textContent.trim().length === 6;
    }, null, { timeout: 30000 });
    code = (await A.textContent('#hostCode')).trim();
    pass('Room code generated :: ' + code);
  } catch (e) { fail('Room code generated', e); }

  // instrument host's simulateInput before guest presses anything
  try {
    await A.evaluate(() => {
      const emu = document.getElementById('gameFrame').contentWindow.EJS_emulator;
      const gm = emu.gameManager;
      window.__sim = [];
      const orig = gm.simulateInput.bind(gm);
      gm.simulateInput = function (p, b, v) { window.__sim.push([p, b, v]); return orig(p, b, v); };
    });
  } catch (e) { console.log('[warn] simulateInput wrap failed:', String(e).slice(0, 120)); }

  // 5. Guest joins from the menu
  const ctxB = await browser.newContext();
  const B = await ctxB.newPage();
  B.on('pageerror', (e) => console.log('[B pageerror]', String(e).slice(0, 140)));
  try {
    await B.goto(BASE, { waitUntil: 'domcontentloaded' });
    await B.fill('#joinCode', code);
    await B.click('#btnJoinStart');
    await B.waitForSelector('#guestScreen', { timeout: 30000 });
    pass('Guest screen opened');
  } catch (e) { fail('Guest screen opened', e); }

  // 6. Guest receives live video stream
  try {
    await B.waitForFunction(() => {
      const v = document.getElementById('remoteVideo');
      return !!(v && v.srcObject);
    }, null, { timeout: 60000 });
    pass('Guest receives live video stream');
  } catch (e) { fail('Guest receives live video stream', e); }

  // 7. Guest input injected as Player 2 on host
  try {
    await B.click('[data-btn="0"]');
    await B.click('[data-btn="0"]');
    await A.waitForFunction(() => {
      if (!window.__sim) return false;
      return window.__sim.some((c) => c[0] === 1 && c[2] === 1) &&
             window.__sim.some((c) => c[0] === 1 && c[2] === 0);
    }, null, { timeout: 20000 });
    const calls = await A.evaluate(() => window.__sim.slice(-6));
    pass('Guest input injected as Player 2 on host :: ' + JSON.stringify(calls));
  } catch (e) { fail('Guest input injected as Player 2 on host', e); }

  // 8. Host status shows P2 joined
  try {
    await A.waitForFunction(() => {
      const el = document.getElementById('hostStatus');
      return el && el.textContent.indexOf('Player 2 connected') >= 0;
    }, null, { timeout: 15000 });
    pass('Host status shows P2 joined');
  } catch (e) { fail('Host status shows P2 joined', e); }

  await browser.close();
  console.log('\nRESULT: ' + passed + '/' + total + ' passed');
  process.exit(passed === total ? 0 : 1);
}

main().catch((e) => { console.error('E2E crashed:', e); process.exit(1); });
