import React, { useRef, useState } from 'react'
import { putRom, deleteRom, fmtSize } from '../lib/db.js'
import { detectSystem, CORE_LABEL } from '../lib/detect.js'
import { APP_VERSION } from '../App.jsx'

export default function MenuScreen({ roms, storage, onPlay, onJoin, onRefresh, toast }) {
  const [dragOver, setDragOver] = useState(false)
  const [joinCode, setJoinCode] = useState('')
  const [busy, setBusy] = useState(false)
  const fileInput = useRef(null)

  async function addFiles(fileList) {
    const files = Array.from(fileList || []);
    if (!files.length) return;
    setBusy(true);
    let added = 0, unknown = 0;
    for (const f of files) {
      try {
        const buf = await f.arrayBuffer();
        const sys = detectSystem(buf, f.name);
        if (!sys) { unknown++; continue; }
        const id = (crypto.randomUUID)
          ? crypto.randomUUID()
          : 'r' + Date.now() + Math.random().toString(36).slice(2, 8);
        await putRom({
          id, name: f.name.replace(/\.[^.]+$/, ''), system: sys,
          size: f.size, blob: f, addedAt: Date.now(), playedAt: 0
        });
        added++;
      } catch (e) { unknown++; }
    }
    setBusy(false);
    await onRefresh();
    if (added) toast(added + ' game' + (added > 1 ? 's' : '') + ' added to library');
    if (unknown) toast(unknown + ' file' + (unknown > 1 ? 's' : '') + ' skipped — not a supported ROM');
  }

  function submitJoin(e) {
    e.preventDefault();
    const code = (joinCode || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (code.length !== 6) { toast('Enter the 6-character room code'); return; }
    onJoin(code);
  }

  return (
    <div id="menuScreen">
      <header className="topbar">
        <div className="logo">
          <svg width="26" height="26" viewBox="0 0 100 100"><rect width="100" height="100" rx="22" fill="#7c3aed"/><path d="M30 38h40a16 16 0 0 1 16 16v2a14 14 0 0 1-25 8l-2-2H41l-2 2a14 14 0 0 1-25-8v-2a16 16 0 0 1 16-16z" fill="#fff"/><circle cx="66" cy="50" r="4" fill="#7c3aed"/><circle cx="74" cy="58" r="4" fill="#7c3aed"/><rect x="32" y="50" width="12" height="4" rx="2" fill="#7c3aed"/><rect x="36" y="46" width="4" height="12" rx="2" fill="#7c3aed"/></svg>
          RetroPlay <span className="ver">v{APP_VERSION}</span>
        </div>
        <div className="storage" id="storageInfo">{storage || ''}</div>
      </header>

      <main className="wrap">
        <section className={'card drop' + (dragOver ? ' over' : '')} id="dropZone"
                 onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                 onDragLeave={() => setDragOver(false)}
                 onDrop={(e) => { e.preventDefault(); setDragOver(false); addFiles(e.dataTransfer.files); }}>
          <div className="drop-icon">⬆</div>
          <div className="drop-title">Add games</div>
          <div className="drop-sub">Drag &amp; drop ROM files here, or</div>
          <button className="btn primary" id="romPick" onClick={() => fileInput.current && fileInput.current.click()} disabled={busy}>
            {busy ? 'READING…' : 'CHOOSE FILES'}
          </button>
          <input ref={fileInput} id="romInput" type="file" multiple hidden
                 accept=".zip,.nes,.fds,.smc,.sfc,.swc,.gb,.gbc,.sgb,.gba,.md,.gen,.smd,.sms,.gg,.cue,.pbp,.chd,.ecm,.iso,.z64,.n64,.v64,.bin,.a78,.a26,.7z"
                 onChange={(e) => { addFiles(e.target.files); e.target.value = ''; }} />
          <div className="drop-sub dim">NES · SNES · GB/GBC · GBA · Mega Drive · SMS · Game Gear · PS1 · N64 · Atari · Arcade (zipped OK)</div>
        </section>

        <section className="card">
          <div className="card-head"><span className="card-title">Join a friend</span></div>
          <form className="join-row" onSubmit={submitJoin}>
            <input id="joinCode" className="join-input" inputMode="text" maxLength={6}
                   placeholder="CODE" value={joinCode}
                   onChange={(e) => setJoinCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))} />
            <button className="btn primary" id="btnJoinStart" type="submit">JOIN</button>
          </form>
          <div className="drop-sub dim">Ask your friend to open a game, tap the controller button and share the code.</div>
        </section>

        <section className="card">
          <div className="card-head"><span className="card-title">My games</span><span className="count">{roms.length}</span></div>
          {roms.length === 0 ? (
            <div id="libEmpty" className="empty">No games yet — add ROMs above and they stay on this device.</div>
          ) : (
            <div className="lib" id="library">
              {roms.map((r) => (
                <div className="rom" key={r.id}>
                  <div className="rom-main">
                    <div className="rom-name">{r.name}</div>
                    <div className="rom-meta">{CORE_LABEL[r.system] || r.system} · {fmtSize(r.size)}</div>
                  </div>
                  <button className="btn small" onClick={() => onPlay(r)}>PLAY</button>
                  <button className="btn small danger" title="Delete"
                          onClick={async () => { await deleteRom(r.id); onRefresh(); }}>✕</button>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="card apk-card">
          <div className="card-head"><span className="card-title">Android App</span><span className="apk-badge">v{APP_VERSION}</span></div>
          <div className="apk-row">
            <div className="apk-info">Full offline emulator with all 11 cores built in.<br />React UI · in-game multiplayer · smooth 60fps cores.</div>
            <a id="apkLink" className="btn primary" href={'retroplay-v' + APP_VERSION + '.apk'} download>DOWNLOAD APK</a>
          </div>
        </section>
      </main>
      <footer className="foot">RetroPlay · offline emulation · online co-op</footer>
    </div>
  )
}
