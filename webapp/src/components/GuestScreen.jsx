import React, { useEffect, useRef, useState } from 'react'
import * as MP from '../lib/mp.js'
import TouchController from './TouchController.jsx'
import ControlsPanel from './ControlsPanel.jsx'
import { loadKeymap, saveKeymap, mouseCode } from '../lib/keymap.js'

/* Guest screen: receives the host's live video, sends button presses.
 * Keyboard + mouse buttons are fully remappable (ControlsPanel), and the
 * on-screen gamepad is mouse/touch interactive (PAD toggle).
 * v2.6.0: top bar auto-hides ~3.5s after the stream goes live (tap the
 * video or the grab tab to bring it back); decorative backdrop animations
 * are disabled while playing so the stream and controls stay smooth. */
const BAR_IDLE_MS = 3500

export default function GuestScreen({ code, onExit, toast }) {
  const videoRef = useRef(null)
  const captureRef = useRef(false)
  const [status, setStatus] = useState('Connecting to host…')
  const [connState, setConnState] = useState('connecting') // connecting | live | closed
  const [pressed, setPressed] = useState({})
  const [km, setKm] = useState(() => loadKeymap())
  const [showKeys, setShowKeys] = useState(false)
  const [showPad, setShowPad] = useState(() => {
    try { return localStorage.getItem('rp-guest-showpad') !== '0' } catch (e) { return true }
  })
  const [barOpen, setBarOpen] = useState(true)
  const [barNonce, setBarNonce] = useState(0)

  /* Perf mode: kill decorative animations while streaming/playing. */
  useEffect(() => {
    document.body.classList.add('playing')
    return () => document.body.classList.remove('playing')
  }, [])

  // Auto-hide the bar once live; any tap on the video re-reveals it.
  const barArmed = connState === 'live' && !showKeys
  useEffect(() => {
    if (!barArmed || !barOpen) return undefined
    const t = setTimeout(() => setBarOpen(false), BAR_IDLE_MS)
    return () => clearTimeout(t)
  }, [barArmed, barOpen, barNonce])

  function toggleBar() {
    setBarOpen((o) => !o)
    setBarNonce((n) => n + 1)
  }

  useEffect(() => {
    let closed = false;
    MP.join(code, {
      onConnecting: (msg) => { if (!closed) setStatus(msg); },
      onStream: (stream) => {
        if (closed) return;
        setConnState('live');
        setStatus('Live — Player 2 controls ready');
        const v = videoRef.current;
        if (v) { try { v.srcObject = stream; } catch (e) {} }
      },
      onClosed: (msg) => {
        if (closed) return;
        setConnState('closed');
        setStatus(msg || 'Disconnected.');
        toast(msg || 'Disconnected.');
      }
    });
    return () => { closed = true; MP.leave(); };
  }, [code, toast])

  // Remappable keyboard + mouse buttons for Player 2
  useEffect(() => {
    const find = (c) => {
      for (const b in km.map) if (km.map[b] === c) return Number(b);
      return undefined;
    };
    const handle = (e, down) => {
      if (captureRef.current) return;               // a binding is being captured
      let b;
      if (e.type === 'keydown' || e.type === 'keyup') {
        if (e.repeat && down) { e.preventDefault(); return; }
        b = find(e.code);
      } else {                                       // mousedown / mouseup
        if (e.target && e.target.closest &&
            e.target.closest('.controller, .game-top, .modal-wrap')) return;
        b = find(mouseCode(e.button));
      }
      if (b !== undefined) { e.preventDefault(); MP.sendInput(b, down); }
    };
    const kd = (e) => handle(e, true);
    const ku = (e) => handle(e, false);
    const md = (e) => handle(e, true);
    const mu = (e) => handle(e, false);
    // right-click must not open the menu while it is a bound button
    const cm = (e) => {
      if (e.target && e.target.closest &&
          e.target.closest('.controller, .game-top, .modal-wrap')) return;
      for (const b in km.map) if (km.map[b] === 'Mouse:2') { e.preventDefault(); return; }
    };
    window.addEventListener('keydown', kd);
    window.addEventListener('keyup', ku);
    window.addEventListener('mousedown', md);
    window.addEventListener('mouseup', mu);
    window.addEventListener('contextmenu', cm);
    return () => {
      window.removeEventListener('keydown', kd);
      window.removeEventListener('keyup', ku);
      window.removeEventListener('mousedown', md);
      window.removeEventListener('mouseup', mu);
      window.removeEventListener('contextmenu', cm);
    };
  }, [km])

  function press(btn, on) {
    MP.sendInput(btn, on);
    setPressed((p) => { const n = Object.assign({}, p); if (on) n[btn] = true; else delete n[btn]; return n; });
  }

  function togglePad() {
    setShowPad((s) => {
      try { localStorage.setItem('rp-guest-showpad', s ? '0' : '1'); } catch (e) {}
      return !s;
    });
  }

  return (
    <div id="guestScreen">
      <div className={'game-top' + (barOpen ? '' : ' hide')}>
        <button className="btn small" id="guestLeave" onClick={onExit}>✕ LEAVE</button>
        <div className="game-title">P2 · <span className="room-pill">{code}</span></div>
        <button className={'btn small' + (showPad ? ' primary' : '')} id="padToggle"
                title="Show / hide on-screen gamepad (mouse friendly)"
                onClick={() => { togglePad(); setBarNonce((n) => n + 1); }}>PAD</button>
        <button className="btn small" id="keysToggle"
                title="Remap keyboard & mouse"
                onClick={() => { setShowKeys(true); setBarOpen(true); }}>KEYS</button>
        <span className={'badge ' + (connState === 'live' ? 'ok' : connState === 'connecting' ? 'pulse' : 'err')} id="guestStatusDot" />
      </div>
      <div className="guest-video-wrap" id="guestVideoWrap" onClick={toggleBar}>
        <video id="remoteVideo" ref={videoRef} autoPlay playsInline muted />
        {connState !== 'live' && (
          <div className="guest-overlay">
            <div className={'dot big ' + (connState === 'connecting' ? 'pulse' : connState === 'closed' ? 'err' : 'ok')} />
            <div id="guestStatus">{status}</div>
            {connState === 'closed' && (
              <button className="btn" onClick={onExit}>BACK TO MENU</button>
            )}
          </div>
        )}
      </div>
      {!barOpen && connState === 'live' && (
        <button className="bar-tab" id="barTab" title="Show menu"
                onClick={toggleBar} aria-label="Show menu">▾</button>
      )}
      {showPad && <TouchController pressed={pressed} onPress={press} />}
      {showKeys && (
        <ControlsPanel km={km} captureRef={captureRef}
                       onChange={(s) => { setKm(s); saveKeymap(s); }}
                       onClose={() => setShowKeys(false)} />
      )}
    </div>
  )
}
