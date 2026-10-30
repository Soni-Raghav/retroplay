import React, { useCallback, useEffect, useRef, useState } from 'react'
import MenuScreen from './components/MenuScreen.jsx'
import GameScreen from './components/GameScreen.jsx'
import GuestScreen from './components/GuestScreen.jsx'
import Toast from './components/Toast.jsx'
import { listRoms, storageEstimate, fmtSize } from './lib/db.js'

export const APP_VERSION = '2.7.0'

export default function App() {
  const [screen, setScreen] = useState('menu') // 'menu' | 'game' | 'guest'
  const [roms, setRoms] = useState([])
  const [storage, setStorage] = useState(null)
  const [toast, setToast] = useState(null)
  const [guestCode, setGuestCode] = useState('')
  const currentRom = useRef(null)
  const hostStatusCb = useRef(null)

  const showToast = useCallback((msg, ms) => {
    setToast({ msg, ms });
  }, [])

  const refreshLibrary = useCallback(async () => {
    try {
      setRoms(await listRoms());
      const est = await storageEstimate();
      if (est && est.usage) setStorage(fmtSize(est.usage) + ' used');
      else setStorage(null);
    } catch (e) { /* ignore */ }
  }, [])

  useEffect(() => { refreshLibrary(); }, [refreshLibrary])

  // Imperative bridge used by the bundled multiplayer module (mp.js)
  useEffect(() => {
    window.RP = {
      toast: showToast,
      hostStatus: (kind, text) => {
        if (hostStatusCb.current) hostStatusCb.current(kind, text);
      }
    };
    return () => { delete window.RP; };
  }, [showToast])

  const playRom = useCallback((rom) => {
    currentRom.current = rom;
    setScreen('game');
  }, [])

  const startGuest = useCallback((code) => {
    setGuestCode(code);
    setScreen('guest');
  }, [])

  const exitGame = useCallback(() => {
    currentRom.current = null;
    setScreen('menu');
    refreshLibrary();
  }, [refreshLibrary])

  return (
    <>
      {screen === 'menu' && (
        <MenuScreen roms={roms} storage={storage} onPlay={playRom}
                    onJoin={startGuest} onRefresh={refreshLibrary}
                    toast={showToast} />
      )}
      {screen === 'game' && currentRom.current && (
        <GameScreen rom={currentRom.current} onExit={exitGame}
                    registerHostStatus={(cb) => { hostStatusCb.current = cb; }}
                    toast={showToast} />
      )}
      {screen === 'guest' && (
        <GuestScreen code={guestCode} onExit={exitGame} toast={showToast} />
      )}
      {toast && <Toast msg={toast.msg} ms={toast.ms} onDone={() => setToast(null)} />}
    </>
  )
}
