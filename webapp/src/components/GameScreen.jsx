import React, { useCallback, useEffect, useRef, useState } from 'react'
import * as MP from '../lib/mp.js'
import ControlsPanel from './ControlsPanel.jsx'
import { loadHostKeymap, saveHostKeymap, codeToKeyCode } from '../lib/keymap.js'

/* Game screen: EJS iframe + floating multiplayer FAB (draggable, long-press
 * to shrink, hideable from the sheet) + host/invite sheet + Player 1
 * keyboard & mouse remap panel (same UX the guest gets). */

const FAB_POS_KEY = 'rp-fab-pos-v1'
const FAB_SIZE = 56

function loadFabPos() {
  try {
    const s = JSON.parse(localStorage.getItem(FAB_POS_KEY))
    if (s && (s.side === 'left' || s.side === 'right') &&
        typeof s.x === 'number' && typeof s.bottom === 'number') return s
  } catch (e) { /* corrupted -> default corner */ }
  return null
}

function tipShown() {
  try { return !!sessionStorage.getItem('rp-fab-tip') } catch (e) { return true }
}
function markTipShown() {
  try { sessionStorage.setItem('rp-fab-tip', '1') } catch (e) { /* ok */ }
}

export default function GameScreen({ rom, onExit, registerHostStatus, toast }) {
  const frameRef = useRef(null)
  const fabRef = useRef(null)
  const captureRef = useRef(false)
  const [showFab, setShowFab] = useState(false)
  const [fabMin, setFabMin] = useState(false)
  const [fabHidden, setFabHidden] = useState(false)
  const [dragging, setDragging] = useState(false)
  const [sheet, setSheet] = useState(false)
  const [sheetView, setSheetView] = useState('idle') // 'idle' | 'hosting'
  const [code, setCode] = useState('')
  const [status, setStatus] = useState('')
  const [showKeys, setShowKeys] = useState(false)
  const [km, setKm] = useState(() => loadHostKeymap())

  const kmRef = useRef(km); kmRef.current = km
  const fabPos = useRef(loadFabPos())
  const fabMinRef = useRef(false); fabMinRef.current = fabMin
  const lastFabUp = useRef(0)
  const drag = useRef({ active: false, moved: false, long: false, sx: 0, sy: 0, timer: null })

  const src = 'game.html?id=' + encodeURIComponent(rom.id) +
    '&sys=' + encodeURIComponent(rom.system) +
    '&name=' + encodeURIComponent(rom.name)

  function getEmulator() {
    try {
      const w = frameRef.current && frameRef.current.contentWindow;
      return (w && w.EJS_emulator && w.EJS_emulator.started) ? w.EJS_emulator : null;
    } catch (e) { return null; }
  }

  // Push a {libretroBtn: e.code|'Mouse:N'|''} map into game.html (Player 1
  // only; the iframe converts codes to keyCodes). Safe any time — returns
  // false until the emulator has booted, the boot poll retries with the
  // latest kmRef.
  const applyKeysToFrame = useCallback((map) => {
    try {
      const w = frameRef.current && frameRef.current.contentWindow;
      if (!w || typeof w.RP_applyKeys !== 'function') return false;
      const out = {};
      for (const b in map) {
        const c = map[b];
        if (typeof c === 'string' && c.indexOf('Mouse:') === 0) out[b] = c;
        else { const kc = codeToKeyCode(c); out[b] = kc === null ? '' : kc; }
      }
      return w.RP_applyKeys(out);
    } catch (e) { return false; }
  }, [])

  // Poll for emulator boot -> show FAB, apply host keymap, one-time tip
  useEffect(() => {
    let stopped = false;
    const t0 = Date.now();
    const iv = setInterval(() => {
      if (stopped) return;
      if (getEmulator()) {
        setShowFab(true);
        applyKeysToFrame(kmRef.current.map);
        clearInterval(iv);
        if (!tipShown()) {
          markTipShown();
          toast('Tip: drag the button to move · hold it to shrink · hide it in the menu', 4200);
        }
      } else if (Date.now() - t0 > 60000) clearInterval(iv);
    }, 500);
    return () => { stopped = true; clearInterval(iv); };
  }, [applyKeysToFrame, toast])

  // Re-apply the keymap whenever the host edits their bindings
  useEffect(() => {
    applyKeysToFrame(km.map);
  }, [km, applyKeysToFrame])

  // Host status bridge from the MP module
  useEffect(() => {
    registerHostStatus((kind, text) => {
      if (kind === 'waiting') setStatus('Waiting for player 2 to join…');
      else if (kind === 'connected') setStatus('Player 2 connected — streaming…');
      else if (kind === 'left') setStatus('Player 2 left.');
      else if (kind === 'error') setStatus(text || 'Network error');
    });
    return () => registerHostStatus(null);
  }, [registerHostStatus])

  /* ---- FAB position (imperative: inline styles beat React re-renders) ---- */
  const applyFabPos = useCallback(() => {
    const el = fabRef.current;
    if (!el) return;
    const p = fabPos.current;
    el.style.top = '';
    if (p) {
      const s = el.offsetWidth || FAB_SIZE;
      const x = Math.min(Math.max(p.x, 8), window.innerWidth - s - 8);
      const bottom = Math.min(Math.max(p.bottom, 8), window.innerHeight - s - 8);
      el.style[p.side] = x + 'px';
      el.style[p.side === 'left' ? 'right' : 'left'] = 'auto';
      el.style.bottom = bottom + 'px';
    } else {
      el.style.left = ''; el.style.right = ''; el.style.bottom = '';
    }
  }, [])

  useEffect(() => {
    applyFabPos();
    window.addEventListener('resize', applyFabPos);
    return () => window.removeEventListener('resize', applyFabPos);
  }, [applyFabPos, showFab])

  /* ---- FAB interactions: tap opens, drag moves, long-press shrinks ---- */
  const onFabDown = useCallback((e) => {
    if (fabMinRef.current || !e.isPrimary) return; // minimized dot: plain tap restores
    const el = fabRef.current, d = drag.current;
    d.active = true; d.moved = false; d.long = false;
    d.sx = e.clientX; d.sy = e.clientY;
    try { el.setPointerCapture(e.pointerId); } catch (err) {}
    clearTimeout(d.timer);
    d.timer = setTimeout(() => {
      if (d.active && !d.moved) {
        d.long = true;
        setFabMin(true);
        try { if (navigator.vibrate) navigator.vibrate(15); } catch (err) {}
      }
    }, 500);
  }, [])

  const onFabMove = useCallback((e) => {
    const d = drag.current, el = fabRef.current;
    if (!d.active || !el) return;
    if (!d.moved && Math.hypot(e.clientX - d.sx, e.clientY - d.sy) < 8) return;
    if (!d.moved) { d.moved = true; clearTimeout(d.timer); setDragging(true); }
    const s = el.offsetWidth || FAB_SIZE;
    el.style.left = Math.min(Math.max(e.clientX - s / 2, 4), window.innerWidth - s - 4) + 'px';
    el.style.top = Math.min(Math.max(e.clientY - s / 2, 4), window.innerHeight - s - 4) + 'px';
    el.style.right = 'auto'; el.style.bottom = 'auto';
  }, [])

  const onFabUp = useCallback((e) => {
    const d = drag.current, el = fabRef.current;
    if (!d.active) return;
    d.active = false;
    lastFabUp.current = Date.now();        // suppress the click that follows
    clearTimeout(d.timer);
    if (!el) return;
    try { el.releasePointerCapture(e.pointerId); } catch (err) {}
    if (d.moved) {                          // snap to nearest edge + persist
      setDragging(false);
      const r = el.getBoundingClientRect();
      const side = (r.left + r.width / 2) < window.innerWidth / 2 ? 'left' : 'right';
      const pos = {
        side,
        x: side === 'left' ? Math.round(r.left) : Math.round(window.innerWidth - r.right),
        bottom: Math.round(window.innerHeight - r.bottom)
      };
      fabPos.current = pos;
      try { localStorage.setItem(FAB_POS_KEY, JSON.stringify(pos)); } catch (err) {}
      applyFabPos();
    } else if (!d.long) {                   // plain tap -> open sheet
      setSheet(true); setSheetView('idle');
    }
    // long-press without drag: already minimized via onFabDown timer
  }, [applyFabPos])

  // Minimized dot: pointer handlers stand down, so restore via click.
  // Guard: ignore the click that browsers fire right after drag/long-press.
  const onFabClick = useCallback(() => {
    if (!fabMinRef.current) return;
    if (Date.now() - lastFabUp.current < 400) return;
    setFabMin(false);
  }, [])

  function startHosting() {
    const c = MP.host(getEmulator,
      () => toast('Player 2 connected!'),
      () => {});
    setCode(c);
    setSheetView('hosting');
  }

  async function copyCode() {
    try {
      await navigator.clipboard.writeText(code);
      toast('Room code copied');
    } catch (e) {
      try {
        const ta = document.createElement('textarea');
        ta.value = code; document.body.appendChild(ta); ta.select();
        document.execCommand('copy'); document.body.removeChild(ta);
        toast('Room code copied');
      } catch (e2) { toast('Copy failed — code: ' + code, 5000); }
    }
  }

  async function shareCode() {
    const text = 'Join my RetroPlay game! Room code: ' + code;
    if (navigator.share) {
      try { await navigator.share({ title: 'RetroPlay', text }); } catch (e) {}
    } else { copyCode(); }
  }

  function hideFab() {
    setSheet(false);
    setFabHidden(true);
    toast('Multiplayer button hidden — leave & reopen the game to bring it back', 4000);
  }

  return (
    <div id="gameScreen">
      <div className="game-top">
        <button className="btn small" id="btnExitGame" onClick={onExit}>✕ EXIT</button>
        <div className="game-title">{rom.name}</div>
        <button className="btn small" id="keysToggle" title="Remap Player 1 keyboard & mouse"
                onClick={() => setShowKeys(true)}>⌨ KEYS</button>
      </div>
      <iframe id="gameFrame" ref={frameRef} src={src} allow="autoplay; fullscreen; gamepad" title={rom.name} />

      {showFab && !fabHidden && (
        <button id="mpFab" ref={fabRef}
                className={'mp-fab' + (fabMin ? ' min' : '') + (dragging ? ' dragging' : '')}
                title="Multiplayer — tap to open · drag to move · hold to shrink"
                onPointerDown={onFabDown} onPointerMove={onFabMove}
                onPointerUp={onFabUp} onPointerCancel={onFabUp}
                onClick={onFabClick}
                onContextMenu={(e) => e.preventDefault()}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M7 8h10a4 4 0 0 1 4 4v1a3.5 3.5 0 0 1-6.2 2.2l-.5-.7H9.7l-.5.7A3.5 3.5 0 0 1 3 13v-1a4 4 0 0 1 4-4z" stroke="#fff" strokeWidth="1.8"/>
            <circle cx="8.5" cy="12" r="1" fill="#fff"/><rect x="7.9" y="11.4" width="1.2" height="1.2" fill="#fff"/>
            <circle cx="15.5" cy="12.2" r="1" fill="#fff"/>
          </svg>
          <span className="fab-dash" aria-hidden="true">–</span>
        </button>
      )}

      {sheet && (
        <div id="mpSheetWrap">
          <div id="mpBackdrop" onClick={() => setSheet(false)} />
          <div className="sheet">
            <div className="sheet-handle" />
            <div className="sheet-head">
              <span className="sheet-title">Multiplayer</span>
              <button id="mpClose" className="btn small" onClick={() => setSheet(false)}>CLOSE</button>
            </div>
            {sheetView === 'idle' && (
              <div id="mpIdle">
                <p className="sheet-sub">You are playing <b>{rom.name}</b>. Host this game and share the code, or your friend hosts and you join from the menu.</p>
                <button className="btn primary big" id="btnHostStart" onClick={startHosting}>HOST &amp; INVITE</button>
                <button className="btn big subtle" id="btnFabHide" onClick={hideFab}>
                  HIDE MULTIPLAYER BUTTON
                </button>
                <p className="sheet-sub dim">Hidden until you leave and reopen this game.</p>
              </div>
            )}
            {sheetView === 'hosting' && (
              <div id="hostCodeArea">
                <div className="room-code" id="hostCode">{code}</div>
                <div className="host-status" id="hostStatus"><span className="dot pulse" />{status || 'Connecting…'}</div>
                <div className="row2">
                  <button className="btn" id="btnCopyCode" onClick={copyCode}>COPY</button>
                  <button className="btn" id="btnShareCode" onClick={shareCode}>SHARE</button>
                </div>
                <p className="sheet-sub dim">Player 2 joins from the RetroPlay menu with this code — they don&apos;t need the game file.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {showKeys && (
        <ControlsPanel km={km} captureRef={captureRef} title="Player 1 · Keyboard & Mouse"
                       onChange={(s) => { setKm(s); saveHostKeymap(s); }}
                       onClose={() => setShowKeys(false)} />
      )}
    </div>
  )
}
