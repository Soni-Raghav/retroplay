/* Guest keyboard & mouse bindings — libretro button codes (same as EJS):
 * 0=B 1=Y 2=SELECT 3=START 4=UP 5=DOWN 6=LEFT 7=RIGHT 8=A 9=X 10=L 11=R
 * Bindings are stored as DOM event codes ("KeyW", "ShiftLeft") or mouse
 * buttons ("Mouse:0"). Persisted in localStorage. */

export const BTNS = [
  [4, 'D-Pad Up'], [5, 'D-Pad Down'], [6, 'D-Pad Left'], [7, 'D-Pad Right'],
  [0, 'B'], [8, 'A'], [1, 'Y'], [9, 'X'],
  [10, 'L'], [11, 'R'], [2, 'Select'], [3, 'Start']
]

/* Presets — every layout keeps all 12 actions within easy reach.
 *  wasd   : move with left hand (WASD), actions under right hand (J/K/U/I)
 *  left   : one-hand left-hand-only play — everything around WASD
 *  arrows : classic EJS layout (arrow keys + Z/X) */
export const PRESETS = {
  wasd:   { 4: 'KeyW', 5: 'KeyS', 6: 'KeyA', 7: 'KeyD',
            0: 'KeyJ', 8: 'KeyK', 1: 'KeyU', 9: 'KeyI',
            10: 'KeyQ', 11: 'KeyE', 2: 'ShiftLeft', 3: 'Enter' },
  left:   { 4: 'KeyW', 5: 'KeyS', 6: 'KeyA', 7: 'KeyD',
            0: 'KeyF', 8: 'KeyR', 1: 'KeyE', 9: 'KeyQ',
            10: 'Space', 11: 'ShiftLeft', 2: 'KeyZ', 3: 'KeyX' },
  arrows: { 4: 'ArrowUp', 5: 'ArrowDown', 6: 'ArrowLeft', 7: 'ArrowRight',
            0: 'KeyZ', 8: 'KeyX', 1: 'KeyA', 9: 'KeyS',
            10: 'KeyQ', 11: 'KeyE', 2: 'ShiftLeft', 3: 'Enter' }
}

const LS_KEY = 'rp-guest-keymap-v1'

export function loadKeymap() {
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (raw) {
      const s = JSON.parse(raw)
      if (s && s.map && typeof s.map === 'object') return { preset: s.preset || 'custom', map: s.map }
    }
  } catch (e) { /* corrupted -> fall through to default */ }
  return { preset: 'wasd', map: Object.assign({}, PRESETS.wasd) }
}

export function saveKeymap(state) {
  try { localStorage.setItem(LS_KEY, JSON.stringify(state)) } catch (e) { /* private mode */ }
}

export function resetKeymap() {
  const d = { preset: 'wasd', map: Object.assign({}, PRESETS.wasd) }
  saveKeymap(d)
  return d
}

export function isMouseCode(code) { return typeof code === 'string' && code.indexOf('Mouse:') === 0 }
export function mouseCode(button) { return 'Mouse:' + button }

/* ---- host (Player 1) keymap — applied inside game.html via RP_applyKeys ----
 * EJS compares e.keyCode against numeric control values, so bindings are
 * converted from DOM event codes to legacy keyCodes before crossing the
 * iframe boundary. Mouse buttons stay as "Mouse:N" markers (game.html wires
 * them onto the emulator canvas). */
const HOST_LS_KEY = 'rp-host-keymap-v1'

export function loadHostKeymap() {
  try {
    const raw = localStorage.getItem(HOST_LS_KEY)
    if (raw) {
      const s = JSON.parse(raw)
      if (s && s.map && typeof s.map === 'object') return { preset: s.preset || 'custom', map: s.map }
    }
  } catch (e) { /* corrupted -> default */ }
  return { preset: 'wasd', map: Object.assign({}, PRESETS.wasd) }
}

export function saveHostKeymap(state) {
  try { localStorage.setItem(HOST_LS_KEY, JSON.stringify(state)) } catch (e) { /* private mode */ }
}

/* DOM event code -> legacy keyCode (what EJS stores & compares). */
const KC_MAP = {
  ArrowUp: 38, ArrowDown: 40, ArrowLeft: 37, ArrowRight: 39,
  Space: 32, Enter: 13, NumpadEnter: 13,
  ShiftLeft: 16, ShiftRight: 16, ControlLeft: 17, ControlRight: 17,
  AltLeft: 18, AltRight: 18, Tab: 9, Backspace: 8, Escape: 27, CapsLock: 20,
  Semicolon: 186, Equal: 187, Comma: 188, Minus: 189, Period: 190, Slash: 191,
  Backquote: 192, BracketLeft: 219, Backslash: 220, BracketRight: 221, Quote: 222,
  NumpadMultiply: 106, NumpadAdd: 107, NumpadSubtract: 109,
  NumpadDecimal: 110, NumpadDivide: 111,
  Insert: 45, Home: 36, PageUp: 33, Delete: 46, End: 35, PageDown: 34
}

export function codeToKeyCode(code) {
  if (!code || code.indexOf('Mouse:') === 0) return null
  if (/^Key[A-Z]$/.test(code)) return 65 + code.charCodeAt(3) - 65
  if (/^Digit[0-9]$/.test(code)) return 48 + Number(code.slice(5))
  if (/^Numpad[0-9]$/.test(code)) return 96 + Number(code.slice(6))
  if (/^F([1-9]|1[0-2])$/.test(code)) return 111 + Number(code.slice(1))
  const v = KC_MAP[code]
  return v === undefined ? null : v
}

export function codeLabel(code) {
  if (!code) return '—'
  switch (code) {
    case 'ArrowUp': return '↑'
    case 'ArrowDown': return '↓'
    case 'ArrowLeft': return '←'
    case 'ArrowRight': return '→'
    case 'ShiftLeft': return 'L-Shift'
    case 'ShiftRight': return 'R-Shift'
    case 'ControlLeft': return 'L-Ctrl'
    case 'ControlRight': return 'R-Ctrl'
    case 'Space': return 'Space'
    case 'Enter': return 'Enter'
    case 'Tab': return 'Tab'
    case 'Backspace': return 'Backsp'
    case 'Mouse:0': return 'Mouse L'
    case 'Mouse:1': return 'Mouse M'
    case 'Mouse:2': return 'Mouse R'
  }
  if (code.indexOf('Mouse:') === 0) return 'Mouse ' + code.slice(6)
  if (code.indexOf('Key') === 0) return code.slice(3)
  if (code.indexOf('Digit') === 0) return code.slice(5)
  if (code.indexOf('Numpad') === 0) return 'Num ' + code.slice(6)
  return code
}
