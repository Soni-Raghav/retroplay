/* RetroPlay Remote Multiplayer — WebRTC via PeerJS
 * Host: runs the game, streams its canvas to the guest, applies guest input as Player 2.
 * Guest: receives the video stream, sends button presses over a DataChannel.
 */
import Peer from 'peerjs';

const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const PREFIX = 'retroplay-';
const state = {
  peer: null, conn: null, call: null, code: null, role: null,
  emulatorGetter: null, hbTimer: null
};

function genCode() {
  let s = '';
  for (let i = 0; i < 6; i++) s += CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)];
  return s;
}

function toast(msg, ms) {
  if (window.RP && window.RP.toast) window.RP.toast(msg, ms);
  else console.log('[mp]', msg);
}

/* Cap the video encoder so it never competes with emulation for CPU:
 * fixed 30fps + bounded bitrate + always keep framerate (drop resolution
 * instead of stuttering when the device gets busy). */
function tuneVideoEncoder() {
  const pc = state.call && state.call.peerConnection;
  if (!pc || !pc.getSenders) return;
  const apply = () => {
    try {
      let sender = null;
      pc.getSenders().forEach((s) => { if (s.track && s.track.kind === 'video') sender = s; });
      if (!sender) return;
      const p = sender.getParameters();
      if (!p.encodings || !p.encodings.length) p.encodings = [{}];
      p.degradationPreference = 'maintain-framerate';
      p.encodings[0].maxBitrate = 3000000;
      p.encodings[0].maxFramerate = 30;
      sender.setParameters(p).catch(() => {});
    } catch (e) { /* best effort */ }
  };
  if (pc.connectionState === 'connected') apply();
  else pc.addEventListener('connectionstatechange', () => {
    if (pc.connectionState === 'connected') apply();
  });
}

/* ================= HOST ================= */

export function host(emulatorGetter, onConnected, onClosed) {
  cleanup();
  state.role = 'host';
  state.emulatorGetter = emulatorGetter;
  state.code = genCode();
  state.peer = new Peer(PREFIX + state.code, { debug: 0 });

  state.peer.on('open', () => {
    if (window.RP && window.RP.hostStatus) window.RP.hostStatus('waiting');
  });

  state.peer.on('error', (err) => {
    const msg = (err && err.type === 'unavailable-id') ? 'Room code taken — tap HOST again'
      : (err && err.type === 'peer-unavailable') ? 'Guest not found'
      : 'Network error: ' + (err && err.type ? err.type : 'unknown');
    if (window.RP && window.RP.hostStatus) window.RP.hostStatus('error', msg);
    toast(msg);
  });

  state.peer.on('connection', (conn) => {
    if (state.conn) { try { conn.close(); } catch (e) {} return; }
    state.conn = conn;

    conn.on('open', () => {
      if (window.RP && window.RP.hostStatus) window.RP.hostStatus('connected');
      // Send the video stream
      const emu = state.emulatorGetter && state.emulatorGetter();
      const canvas = emu && emu.canvas;
      if (canvas && canvas.captureStream) {
        try {
          const stream = canvas.captureStream(30);
          try {
            const vt = stream.getVideoTracks()[0];
            if (vt && 'contentHint' in vt) vt.contentHint = 'game';
          } catch (e) {}
          state.call = state.peer.call(conn.peer, stream);
          tuneVideoEncoder();
        } catch (e) { console.warn('captureStream failed', e); }
      }
      if (onConnected) onConnected();
      startHeartbeat();
    });

    conn.on('data', (d) => { if (!d || d.t !== 'i') return; applyRemoteInput(d.p, d.d); });

    conn.on('close', () => {
      releaseAllButtons();
      if (window.RP && window.RP.hostStatus) window.RP.hostStatus('left');
      stopHeartbeat();
      state.conn = null;
      if (state.call) { try { state.call.close(); } catch (e) {} state.call = null; }
      if (onClosed) onClosed();
    });
  });

  return state.code;
}

function applyRemoteInput(btn, down) {
  try {
    const emu = state.emulatorGetter && state.emulatorGetter();
    if (!emu || !emu.gameManager || !emu.started) return;
    const val = down ? (btn >= 16 ? 0x7fff : 1) : 0;
    emu.gameManager.simulateInput(1, btn, val); // player index 1 = Player 2
  } catch (e) { console.warn('input apply failed', e); }
}

function releaseAllButtons() {
  for (let b = 0; b < 16; b++) applyRemoteInput(b, 0);
}

function startHeartbeat() {
  stopHeartbeat();
  state.hbTimer = setInterval(() => {
    if (state.conn && state.conn.open) {
      try { state.conn.send({ t: 'hb' }); } catch (e) {}
    }
  }, 3000);
}
function stopHeartbeat() {
  if (state.hbTimer) { clearInterval(state.hbTimer); state.hbTimer = null; }
}

/* ================= GUEST ================= */

export function join(code, handlers) {
  cleanup();
  state.role = 'guest';
  state.code = code;
  state.peer = new Peer({ debug: 0 });

  state.peer.on('open', () => {
    const conn = state.peer.connect(PREFIX + code, { reliable: true });
    state.conn = conn;
    let opened = false;

    conn.on('open', () => {
      opened = true;
      try { conn.send({ t: 'hello' }); } catch (e) {}
      if (handlers && handlers.onConnecting) handlers.onConnecting('Connected — waiting for video…');
    });

    conn.on('close', () => {
      if (handlers && handlers.onClosed) handlers.onClosed(opened ? 'Host left the game.' : 'Room not found.');
    });

    conn.on('error', () => {
      if (handlers && handlers.onClosed) handlers.onClosed('Connection failed.');
    });
  });

  state.peer.on('call', (call) => {
    state.call = call;
    call.answer(); // receive-only
    call.on('stream', (stream) => {
      if (handlers && handlers.onStream) handlers.onStream(stream);
    });
    call.on('close', () => {
      if (handlers && handlers.onClosed) handlers.onClosed('Stream ended.');
    });
  });

  state.peer.on('error', (err) => {
    const msg = (err && err.type === 'peer-unavailable') ? 'Room code not found — check the code.'
      : (err && err.type === 'network') ? 'No internet connection.'
      : 'Network error: ' + (err && err.type ? err.type : 'unknown');
    if (handlers && handlers.onClosed) handlers.onClosed(msg);
  });
}

export function sendInput(btn, down) {
  if (state.conn && state.conn.open) {
    try { state.conn.send({ t: 'i', p: btn, d: down ? 1 : 0 }); } catch (e) {}
  }
}

export function leave() { cleanup(); }

function cleanup() {
  stopHeartbeat();
  if (state.call) { try { state.call.close(); } catch (e) {} }
  if (state.conn) { try { state.conn.close(); } catch (e) {} }
  if (state.peer) { try { state.peer.destroy(); } catch (e) {} }
  state.call = null; state.conn = null; state.peer = null;
  state.code = null; state.role = null; state.emulatorGetter = null;
}

export function getCode() { return state.code; }
export function getRole() { return state.role; }
