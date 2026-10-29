# RetroPlay

Play retro classics in your browser — solo or online with a friend. RetroPlay is a web-based emulator frontend built with **React (JavaScript) + Vite**, powered by the EmulatorJS runtime, with a companion **Android WebView app**. No server-side uploads: your ROMs stay in your browser (IndexedDB).

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2FSoni-Raghav%2Fretroplay&project-name=retroplay)

## Features

- **11 console systems** via 22 emulator core builds (wasm + legacy fallback): NES, SNES, Game Boy / Color, Game Boy Advance, Sega Genesis, Game Gear, Master System, Sony PSX, Nintendo 64, Atari 2600, Atari 7800, Arcade (FBNeo)
- **Online multiplayer** (WebRTC via PeerJS): the host streams gameplay video while the guest's inputs travel over a DataChannel and are injected as Player 2 — 6-character room codes, no accounts
- **ROM library** stored locally in IndexedDB; drag & drop or file picker, multi-select, ZIP auto-extract
- **Automatic system detection** by ROM header sniffing (NES, PS-X, SEGA, N64 zaps, GB logo, GBA, Atari 7800) with ZIP content scanning
- **Remappable guest controls**: keyboard *and* mouse buttons (left/middle/right click) can be bound per action on the guest screen — presets for WASD+JK, one-hand-left play, and classic arrows; the on-screen gamepad is mouse/touch interactive
- **Host keyboard policy**: keyboard input can only ever drive Player 1 (enforced at every boot), so host keys can never leak into the remote Player 2
- **Mobile-first UI**: full touch controller (D-pad, B/A/Y/X, Select/Start, L/R), safe-area aware, landscape responsive; desktop keyboard support for guests
- **Android app** (version 2.2.0) wrapping the same UI in a WebView — APK ships in `public/` and is downloadable from the menu screen

## Deploy to Vercel

The repo is Vercel-ready (`vercel.json` included): it installs and builds the React app in `webapp/`, then serves the output together with the emulator runtime from `public/`.

1. Click the **Deploy** button above (or go to [vercel.com/new](https://vercel.com/new) and import `Soni-Raghav/retroplay`).
2. Keep the suggested project name (`retroplay`) and press **Deploy** — no environment variables needed.
3. Done: your playable site will be at `https://<project>.vercel.app`.

## Project structure

```
├── webapp/                  # React 18 (JavaScript) source — Vite, peerjs
│   ├── src/components/      # App / MenuScreen / GameScreen / GuestScreen / TouchController / Toast
│   ├── src/lib/             # db.js (IndexedDB) · detect.js (ROM sniffing) · mp.js (multiplayer)
│   └── vite.config.js       # builds into ../public (emptyOutDir: false)
├── public/                  # Deployment root (served as-is)
│   ├── data/                # EmulatorJS runtime + 22 cores (35 MB)
│   ├── vendor/              # PeerJS
│   ├── index.html / game.html
│   └── retroplay-v2.2.0.apk # Android app download
├── retroplay/android/       # Android WebView app (Gradle, minSdk 24 / targetSdk 34)
│   ├── app/retroplay-release.keystore
│   └── scripts/prepare-android-assets.sh
├── scripts/test_e2e.js      # Playwright end-to-end suite (8 assertions)
└── vercel.json              # Vercel build config
```

## Local development

```bash
cd webapp
npm install
npm run dev        # Vite dev server
npm run build      # rebuilds the React bundle into ../public
```

Then serve `public/` statically (e.g. `python3 -m http.server 8080` from the repo root).

## End-to-end tests

Requires two browser contexts to simulate host + guest multiplayer:

```bash
npm install                       # installs Playwright (repo root)
node scripts/test_e2e.js          # 8/8 assertions: ROM detect, boot, FAB,
                                  # room code, guest join, video, P2 input, host status
```

## Android build

The Android assets folder is generated from the web build and is **not** committed:

```bash
bash retroplay/scripts/prepare-android-assets.sh   # copies public/ into the Android assets dir
cd retroplay/android
gradle assembleRelease                             # JDK 17, Gradle 8.x
```

Signing uses `retroplay/android/app/retroplay-release.keystore` (alias `retroplay`, configured in `app/build.gradle`).

## Multiplayer architecture

- Host: `canvas.captureStream(30)` with `contentHint: "game"`, encoder capped at 3 Mbps / 30 fps with `maintain-framerate` degradation preference (anti-lag tuning)
- Guest: sends `{t:'i', p:<libretro button>, d:0|1}` over the PeerJS DataChannel; the host injects them via `simulateInput(1, btn, val)` as Player 2
- Signaling: PeerJS public cloud server; peer IDs are `retroplay-<6-char code>` (confusable characters excluded)

## Credits

Built on [EmulatorJS](https://emulatorjs.org) and its bundled libretro cores; peer-to-peer signaling by [PeerJS](https://peerjs.com).
