import React, { useEffect, useRef, useState } from 'react'
import * as MP from '../lib/mp.js'

/* Game screen: EJS iframe + floating multiplayer FAB + host/invite sheet. */
export default function GameScreen({ rom, onExit, registerHostStatus, toast }) {
  const frameRef = useRef(null)
  const [showFab, setShowFab] = useState(false)
  const [sheet, setSheet] = useState(false)
  const [sheetView, setSheetView] = useState('idle') // 'idle' | 'hosting'
  const [code, setCode] = useState('')
  const [status, setStatus] = useState('')

  const src = 'game.html?id=' + encodeURIComponent(rom.id) +
    '&sys=' + encodeURIComponent(rom.system) +
    '&name=' + encodeURIComponent(rom.name)

  function getEmulator() {
    try {
      const w = frameRef.current && frameRef.current.contentWindow;
      return (w && w.EJS_emulator && w.EJS_emulator.started) ? w.EJS_emulator : null;
    } catch (e) { return null; }
  }

  // Show the floating MP button once the emulator has booted (poll, 60s cap)
  useEffect(() => {
    let stopped = false;
    const t0 = Date.now();
    const iv = setInterval(() => {
      if (stopped) return;
      if (getEmulator()) { setShowFab(true); clearInterval(iv); }
      else if (Date.now() - t0 > 60000) clearInterval(iv);
    }, 500);
    return () => { stopped = true; clearInterval(iv); };
  }, [])

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

  return (
    <div id="gameScreen">
      <div className="game-top">
        <button className="btn small" id="btnExitGame" onClick={onExit}>✕ EXIT</button>
        <div className="game-title">{rom.name}</div>
      </div>
      <iframe id="gameFrame" ref={frameRef} src={src} allow="autoplay; fullscreen; gamepad" title={rom.name} />
      <button id="mpFab" className="mp-fab" hidden={!showFab}
              onClick={() => { setSheet(true); setSheetView('idle'); }}
              title="Multiplayer">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
          <path d="M7 8h10a4 4 0 0 1 4 4v1a3.5 3.5 0 0 1-6.2 2.2l-.5-.7H9.7l-.5.7A3.5 3.5 0 0 1 3 13v-1a4 4 0 0 1 4-4z" stroke="#fff" strokeWidth="1.8"/>
          <circle cx="8.5" cy="12" r="1" fill="#fff"/><rect x="7.9" y="11.4" width="1.2" height="1.2" fill="#fff"/>
          <circle cx="15.5" cy="12.2" r="1" fill="#fff"/>
        </svg>
      </button>

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
    </div>
  )
}
