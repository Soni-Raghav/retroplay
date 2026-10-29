import React, { useEffect, useRef, useState } from 'react'
import * as MP from '../lib/mp.js'
import TouchController from './TouchController.jsx'

/* Guest screen: receives the host's live video, sends button presses. */
export default function GuestScreen({ code, onExit, toast }) {
  const videoRef = useRef(null)
  const [status, setStatus] = useState('Connecting to host…')
  const [connState, setConnState] = useState('connecting') // connecting | live | closed
  const [pressed, setPressed] = useState({})

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

  // Desktop keyboard for the guest (same layout as EJS defaults)
  useEffect(() => {
    const KEYMAP = { ArrowUp: 4, ArrowDown: 5, ArrowLeft: 6, ArrowRight: 7,
                     z: 0, Z: 0, x: 8, X: 8, a: 1, A: 1, s: 9, S: 9,
                     q: 10, Q: 10, e: 11, E: 11, Shift: 2, Enter: 3 };
    const down = (e) => { const b = KEYMAP[e.key]; if (b !== undefined) { e.preventDefault(); MP.sendInput(b, true); } };
    const up = (e) => { const b = KEYMAP[e.key]; if (b !== undefined) { e.preventDefault(); MP.sendInput(b, false); } };
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    return () => { window.removeEventListener('keydown', down); window.removeEventListener('keyup', up); };
  }, [])

  function press(btn, on) {
    MP.sendInput(btn, on);
    setPressed((p) => { const n = Object.assign({}, p); if (on) n[btn] = true; else delete n[btn]; return n; });
  }

  return (
    <div id="guestScreen">
      <div className="game-top">
        <button className="btn small" id="guestLeave" onClick={onExit}>✕ LEAVE</button>
        <div className="game-title">Player 2 · room {code}</div>
        <span className={'badge ' + (connState === 'live' ? 'ok' : connState === 'connecting' ? 'pulse' : 'err')} id="guestStatusDot" />
      </div>
      <div className="guest-video-wrap">
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
      <TouchController pressed={pressed} onPress={press} />
    </div>
  )
}
