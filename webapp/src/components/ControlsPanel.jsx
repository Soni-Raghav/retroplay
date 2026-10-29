import React, { useEffect, useRef, useState } from 'react'
import { BTNS, PRESETS, codeLabel, mouseCode } from '../lib/keymap.js'

/* Remappable controls (host P1 and guest P2 share this panel): click an
 * action, press any key (or mouse button). Esc cancels, ✕ clears a binding.
 * Duplicates are auto-unbound. */
export default function ControlsPanel({ km, onChange, onClose, captureRef, title = 'Keyboard & Mouse' }) {
  const [listening, setListening] = useState(null)
  const kmRef = useRef(km)
  kmRef.current = km

  useEffect(() => {
    captureRef.current = listening !== null
    return () => { captureRef.current = false }
  }, [listening, captureRef])

  function assign(btn, code) {
    const map = Object.assign({}, kmRef.current.map)
    for (const b in map) {
      if (map[b] === code && Number(b) !== btn) map[b] = '' // one action per key
    }
    map[btn] = code
    onChange({ preset: 'custom', map })
    setListening(null)
  }

  useEffect(() => {
    if (listening === null) return
    const kd = (e) => {
      e.preventDefault(); e.stopPropagation()
      if (e.code === 'Escape') { setListening(null); return }
      assign(listening, e.code)
    }
    const md = (e) => {
      e.preventDefault(); e.stopPropagation()
      assign(listening, mouseCode(e.button))
    }
    window.addEventListener('keydown', kd, true)
    window.addEventListener('mousedown', md, true)
    return () => {
      window.removeEventListener('keydown', kd, true)
      window.removeEventListener('mousedown', md, true)
    }
  }, [listening])

  function clearBtn(btn) {
    const map = Object.assign({}, kmRef.current.map)
    map[btn] = ''
    onChange({ preset: 'custom', map })
  }

  const presetBtn = (key, label) => (
    <button className={'btn small' + (km.preset === key ? ' on' : '')}
            id={'preset-' + key}
            onClick={() => onChange({ preset: key, map: Object.assign({}, PRESETS[key]) })}>
      {label}
    </button>
  )

  return (
    <div className="modal-wrap" id="keysPanel"
         onClick={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div className="modal">
        <div className="modal-head">
          <b>{title}</b>
          <button className="btn small primary" id="keysDone" onClick={onClose}>DONE</button>
        </div>
        <div className="preset-row">
          {presetBtn('wasd', 'WASD + JK')}
          {presetBtn('left', '1-HAND')}
          {presetBtn('arrows', 'ARROWS')}
        </div>
        <div className="key-rows" id="keyRows">
          {BTNS.map(([b, label]) => (
            <div className="key-row" key={b} data-action={label.replace(/[^a-z-]/gi, '')}>
              <span className="key-label">{label}</span>
              <button className={'key-btn' + (listening === b ? ' listen' : '')}
                      onClick={() => setListening(b)}>
                {listening === b ? 'press a key…' : codeLabel(km.map[b])}
              </button>
              <button className="key-clear" title="Clear binding"
                      onClick={() => clearBtn(b)}>✕</button>
            </div>
          ))}
        </div>
        <div className="keys-hint">
          Click an action, then press any key or mouse button (left / middle / right click all work).
          Esc cancels. Bindings save automatically on this device.
        </div>
      </div>
    </div>
  )
}
