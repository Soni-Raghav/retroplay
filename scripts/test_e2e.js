/* RetroPlay E2E — 17 assertions: ROM add/detect, emulator boot, in-game FAB,
 * room code, guest join, live video, Player-2 input injection, host status,
 * guest WASD keyboard injection, host keyboard locked to Player 1,
 * host live remap panel, FAB long-press minimize/restore, FAB hide,
 * top-bar auto-hide, grab-tab reveal, MP-chip restore. */
const { chromium } = require('playwright');
const BASE = 'http://localhost:3000';
const ROM = '/home/z/my-project/upload/Teenage Mutant Ninja Turtles III - The Manhattan Project (USA).nes';

let passed = 0, total = 0;
function pass(name) { passed++; total++; console.log('PASS - ' + name); }
function fail(name, e) { total++; console.log('FAIL - ' + name + ' :: ' + String(e && e.message ? e.message : e).split('\n').slice(0, 3).join(' | ').slice(0, 300)); }

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

  // 9. Guest keyboard: WASD default keymap (W = up) injected as Player 2
  try {
    const n0 = await A.evaluate(() => window.__sim.length);
    await B.evaluate(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyW' }));
      window.dispatchEvent(new KeyboardEvent('keyup', { code: 'KeyW' }));
    });
    await A.waitForFunction((n) => window.__sim.some((c, i) => i >= n && c[0] === 1 && c[1] === 4 && c[2] === 1),
                            n0, { timeout: 15000 });
    pass('Guest keyboard WASD (W=up) injected as Player 2');
  } catch (e) { fail('Guest keyboard WASD (W=up) injected as Player 2', e); }

  // 10. Host keyboard policy: P1 on WASD scheme, P2-4 have zero keyboard bindings
  try {
    const chk = await A.evaluate(() => {
      const emu = document.getElementById('gameFrame').contentWindow.EJS_emulator;
      if (!emu || !emu.controls) return { err: 'no controls' };
      const c0 = emu.controls[0] || {};
      const p1W = c0[4] && c0[4].value === 87 && c0[6] && c0[6].value === 65;
      let p2bound = [];
      [1, 2, 3].forEach((p) => {
        const c = emu.controls[p] || {};
        Object.keys(c).forEach((n) => {
          const v = c[n] && c[n].value;
          if (v !== '' && v !== undefined && v !== null) p2bound.push(p + ':' + n + '=' + v);
        });
      });
      return { p1W, p2bound };
    });
    if (chk.p1W && chk.p2bound.length === 0) pass('Host keyboard = P1 only (WASD applied, P2-4 unbound)');
    else throw new Error(JSON.stringify(chk));
  } catch (e) { fail('Host keyboard = P1 only (WASD applied, P2-4 unbound)', e); }

  // 11. Host remap panel: presets apply LIVE inside the iframe (Player 1 only)
  try {
    await A.click('#mpClose');                       // close hosting sheet if still open
    await A.waitForSelector('#mpFab', { state: 'visible', timeout: 5000 });
    // the top bar auto-hides after ~3.5s idle — reveal it via the grab tab
    if (await A.$('#barTab')) { await A.click('#barTab'); }
    await A.waitForFunction(() => {
      const el = document.querySelector('#gameScreen .game-top');
      return el && !el.classList.contains('hide');
    }, null, { timeout: 5000 });
    await A.click('#keysToggle');
    await A.waitForSelector('#keysPanel', { timeout: 5000 });
    await A.click('#preset-arrows');                            // preset: ARROWS
    await A.waitForFunction(() => {
      const emu = document.getElementById('gameFrame').contentWindow.EJS_emulator;
      if (!emu || !emu.controls || !emu.controls[0]) return false;
      const c0 = emu.controls[0];
      return c0[4] && c0[4].value === 38 && c0[0] && c0[0].value === 90; // Up=ArrowUp, B=Z
    }, null, { timeout: 8000 });
    // custom binding: click D-Pad Up row, press P
    await A.click('#keyRows .key-row[data-action="D-PadUp"] .key-btn');
    await A.keyboard.press('KeyP');
    await A.waitForFunction(() => {
      const emu = document.getElementById('gameFrame').contentWindow.EJS_emulator;
      const c0 = emu && emu.controls && emu.controls[0];
      return !!(c0 && c0[4] && c0[4].value === 80); // KeyP -> keyCode 80
    }, null, { timeout: 8000 });
    const chk = await A.evaluate(() => {
      const emu = document.getElementById('gameFrame').contentWindow.EJS_emulator;
      let p2 = [];
      [1, 2, 3].forEach((p) => {
        const c = emu.controls[p] || {};
        Object.keys(c).forEach((n) => {
          const v = c[n] && c[n].value;
          if (v !== '' && v !== undefined && v !== null) p2.push(p + ':' + n);
        });
      });
      return { marker: localStorage.getItem('rp-host-keys'), p2 };
    });
    await A.click('#keysDone');
    if (chk.marker === '1' && chk.p2.length === 0) pass('Host remap panel: preset + custom key applied live, P2-4 still clean');
    else throw new Error(JSON.stringify(chk));
  } catch (e) { fail('Host remap panel: preset + custom key applied live, P2-4 still clean', e); }

  // 12. FAB long-press minimizes, tap restores
  try {
    // safety: dismiss the keys panel if the previous test left it open
    if (await A.$('#keysPanel')) {
      await A.click('#keysDone', { timeout: 3000 }).catch(() => {});
    }
    const fab = await A.waitForSelector('#mpFab', { state: 'visible', timeout: 5000 });
    const box = await fab.boundingBox();
    await A.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await A.mouse.down();
    await A.waitForTimeout(750);
    await A.mouse.up();
    await A.waitForFunction(() => {
      const f = document.getElementById('mpFab');
      return !!(f && f.classList.contains('min'));
    }, null, { timeout: 5000 });
    await A.waitForTimeout(500);                      // clear the post-gesture click guard
    await A.click('#mpFab');                          // tap the dot -> restore
    await A.waitForFunction(() => {
      const f = document.getElementById('mpFab');
      return !!(f && !f.classList.contains('min'));
    }, null, { timeout: 5000 });
    pass('FAB long-press minimizes to dot, tap restores');
  } catch (e) { fail('FAB long-press minimizes to dot, tap restores', e); }

  // 13. FAB hide from the sheet (restorable via the MP chip in the top bar)
  try {
    await A.click('#mpFab');                          // open sheet (idle view)
    await A.click('#btnFabHide');
    await A.waitForFunction(() => !document.getElementById('mpFab'), null, { timeout: 5000 });
    pass('FAB hidden via sheet button');
  } catch (e) { fail('FAB hidden via sheet button', e); }

  // 14. Top bar auto-hides during gameplay (web + app immersive mode)
  try {
    await A.waitForFunction(() => {
      const el = document.querySelector('#gameScreen .game-top');
      return el && el.classList.contains('hide');
    }, null, { timeout: 8000 });
    pass('Top bar auto-hides during gameplay');
  } catch (e) { fail('Top bar auto-hides during gameplay', e); }

  // 17. Dead-strip regression: with the bar hidden the game canvas must reach
  // the very top of the viewport (the bar is a fixed overlay, not a flex row
  // that keeps reserving space — that gap was the red-boxed strip in the app).
  try {
    await A.waitForFunction(() => {
      const f = document.getElementById('gameFrame');
      const b = document.querySelector('#gameScreen .game-top');
      if (!f || !b) return false;
      return f.getBoundingClientRect().top <= 1 &&
             b.getBoundingClientRect().bottom <= 1;   // slide-out transition done
    }, null, { timeout: 4000 });
    pass('Game canvas reaches top edge when bar hides (no dead strip)');
  } catch (e) {
    fail('Game canvas reaches top edge when bar hides (no dead strip)',
      new Error('bar/frame still below the top edge'));
  }

  // 15. Grab tab brings the bar back
  try {
    await A.click('#barTab');
    await A.waitForFunction(() => {
      const el = document.querySelector('#gameScreen .game-top');
      return el && !el.classList.contains('hide');
    }, null, { timeout: 5000 });
    pass('Grab tab reveals the top bar');
  } catch (e) { fail('Grab tab reveals the top bar', e); }

  // 16. MP chip restores the hidden multiplayer button
  try {
    await A.waitForSelector('#mpChip', { timeout: 5000 });
    await A.click('#mpChip');
    await A.waitForFunction(() => !!document.getElementById('mpFab'), null, { timeout: 5000 });
    pass('MP chip restores the multiplayer button');
  } catch (e) { fail('MP chip restores the multiplayer button', e); }

  await browser.close();
  console.log('\nRESULT: ' + passed + '/' + total + ' passed');
  process.exit(passed === total ? 0 : 1);
}

main().catch((e) => { console.error('E2E crashed:', e); process.exit(1); });
