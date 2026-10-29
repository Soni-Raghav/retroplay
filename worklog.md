# RetroPlay Worklog

---
Task ID: 4
Agent: Z.ai main agent
Date: 2025-10-29
Task: Rebuild everything after 3rd sandbox reset AND migrate web app UI to React (JavaScript) per user request ("now work on web app web view use react js through javascript").

## Sandbox reset recovery (3rd reset)
- All files lost (public/, retroplay/, scripts/, download/, keystores). upload/ ROMs survived.
- Re-downloaded in parallel: Temurin JDK 17 (/home/z/tools/jdk-17), Gradle 8.7 (/home/z/gradle), Android cmdline-tools -> sdk 34 + build-tools 34.0.0 + platform-tools (/home/z/android-sdk), EmulatorJS v4.2.3 (CDN min files + repo tarball compression/localization + loader.js), PeerJS 1.5.4, 22 cores (11 systems x wasm + legacy, 35MB).
- Playwright 1.49.1 + Chromium headless shell reinstalled for E2E.

## React migration (v2.2.0)
- New Vite + React 18 project at webapp/ (JavaScript .jsx, no TS). react/react-dom/peerjs deps.
- Build output -> /public (emptyOutDir=false keeps data/, vendor/, game.html, APK file). base='./' so relative asset URLs work both at server root and under APK /assets/ prefix (Vite emits assets/assets/index-*.js).
- Components: App (screens menu/game/guest + window.RP bridge), MenuScreen (drop zone, file picker, join card, library grid, APK card, storage info), GameScreen (EJS iframe + FAB poll 500ms + host sheet + copy/share), GuestScreen (video, status overlay, desktop keyboard), TouchController (dpad 4/5/6/7, face 0/8/1/9, select 2/start 3, shoulders 10/11, pointer capture, .pressed states), Toast.
- lib/db.js IndexedDB 'retroplay' v1 roms store; lib/detect.js zip local-header scan + header sniffing (NES/PS-X/SEGA 0x100+0x7ff0/N64 zaps/GB logo/GBA 0xb2/atari); lib/mp.js ESM port of the multiplayer module with v2.1.2 streaming tuning (contentHint='game', maxBitrate 3Mbps, maxFramerate 30, maintain-framerate).
- game.html unchanged EJS bootstrap (rewindEnabled disabled, exit -> postMessage rp-exit).
- E2E re-created (scripts/test_e2e.js): RESULT 8/8 PASSED against the React build (NES detect, boot, FAB, room code F72M2F, guest join, live video, P2 simulateInput [[1,0,1],[1,0,0]...], host status).

## APK v2.2.0 (versionCode 6)
- NEW keystore (3rd): retroplay/android/app/retroplay-release.keystore, alias retroplay, pass retroplay2026. USER MUST UNINSTALL any previous RetroPlay before installing v2.2.0 (signature mismatch with v2.1.x).
- MainActivity carries BOTH prior fixes: shouldInterceptRequest -> WebViewAssetLoader (ERR_NAME_NOT_RESOLVED fix) + setRendererPriorityPolicy(RENDERER_PRIORITY_IMPORTANT) (lag fix). hardwareAccelerated=true, configChanges incl. density, INTERNET + ACCESS_NETWORK_STATE.
- Build: BUILD SUCCESSFUL in 1m 9s (43 tasks). Verified: versionCode 6/2.2.0, both fixes in dex, React bundle nested correctly, fceumm core + loader.js + peerjs + game.html present, apksigner verify OK.
- Delivered IMMEDIATELY: download/RetroPlay-v2.2.0.apk (36.9MB), public/retroplay-v2.2.0.apk (HTTP 200), download/retroplay-source-v2.2.0.zip.

---
Task ID: 5
Agent: Z.ai main agent
Date: 2026-10-29
Task: Push entire project to GitHub (user-supplied repo + token) and prepare Vercel hosting.

## GitHub push
- User provided: https://github.com/Soni-Raghav/retroplay + classic PAT (repo scope). Token verified via /user API -> login Soni-Raghav (id 91428957), profile name empty -> commit identity set to "Soni-Raghav" <91428957+Soni-Raghav@users.noreply.github.com> (noreply email links commits to the account).
- Old local .git had 2 stale commits from a previous session (unknown author) -> history rebuilt: rm -rf .git, git init -b main, fresh single commit authored as Soni-Raghav.
- Remote repo was public with only GitHub auto-init README (# retroplay) -> force-pushed over it.
- Added: .gitignore (node_modules, android build/ + generated assets dir, download/, logs), README.md (features, deploy button, structure, dev/test/Android build instructions, multiplayer architecture), vercel.json (framework null, buildCommand "cd webapp && npm install && npm run build", outputDirectory public).
- Excluded from git on purpose: retroplay/android/app/src/main/assets/ (37MB, regenerable via retroplay/scripts/prepare-android-assets.sh) and retroplay/android/app/build/ (113MB). Kept: public/ (36MB cores + 36MB APK + web build), keystore, webapp/, scripts/, worklog.md. Pushed tree ~78MB, no file > 50MB.
- Commit attribution verified via commits API (author login Soni-Raghav, verified=False is normal for non-signed commits).

## Vercel
- vercel.json committed: zero-config import (build in webapp/, serve public/). App navigation is React-state based (no history routing) -> no SPA rewrites needed; game.html/data/vendor/APK served from filesystem.
- One-click: https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2FSoni-Raghav%2Fretroplay&project-name=retroplay (button in README). Deploy is user-side (needs their Vercel account); CLI deploy possible later with a Vercel token.

## Environment notes (learned)
- Sandbox kills detached/setsid background procs between tool calls; gradle "single-use daemon" holds stdout pipes after BUILD SUCCESSFUL -> tool timeout is cosmetic; read the log file for the result.
- E2E + server must run in the SAME bash call (server started inline).
- GitHub push: DONE after user provided repo + token (see Task 5).

---
Task ID: 6
Agent: Z.ai main agent
Date: 2026-10-29
Task: Configurable guest controls (WASD defaults), fix host-keyboard-drives-P2 bug, mouse support. Ships as v2.3.0 (web + APK versionCode 7).

## Root cause (host keyboard controlling guest character)
- EJS keyChange handler loops i=0..3 (ALL players) and fires simulateInput for EVERY player whose controls[i][n].value === e.keyCode. Default controllers bind keyboard ONLY for player 0 (players 1-3 = {}), but the EJS control-settings menu lets the user pick Player 2 and bind keys -> host keyboard then drives BOTH P1 and P2 (user's exact bug). Bindings persist in localStorage under "ejs-<gameId>-<core>[-<gameName>]-settings" (JSON controlSettings, numeric keyCodes).
- This EJS build has NO EJS_defaultControls option (probed minified source; scripts/ejs_probe*.js).

## Fixes
- public/game.html: sanitizeStoredControls() runs BEFORE loader.js -> for every ejs-*-settings key: strip keyboard .value from players 1-3 (keep gamepad value2), upgrade legacy EJS arrow defaults (up=38 && B=88) to RetroPlay WASD scheme. enforceKeyboardPolicy() after started: same strip in memory + WASD injection for fresh installs + saveSettings(). Invariant: keyboard can only ever drive P1; guest P2 comes via DataChannel simulateInput(1,...).
- webapp/src/lib/keymap.js (NEW): libretro btn -> binding map ("KeyW" e.code or "Mouse:0"), presets wasd (W/A/S/D + J=B K=A U=Y I=X Q=L E=R Shift=Select Enter=Start), left (one-hand left-hand-only: F/R/E/Q/Space/Shift/Z/X), arrows (legacy), localStorage rp-guest-keymap-v1, codeLabel().
- webapp/src/components/ControlsPanel.jsx (NEW): press-to-bind modal (keydown capture OR mousedown for mouse buttons L/M/R), Esc cancels, x clears, duplicate auto-unbind, presets row, saved automatically.
- GuestScreen.jsx: uses keymap (window keydown/keyup + mousedown/mouseup, skips .controller/.game-top/.modal targets), right-click contextmenu suppressed when Mouse:2 bound, KEYS button opens panel, PAD toggle shows/hides TouchController (persisted rp-guest-showpad; on-screen pad is mouse-interactive via pointer events).
- game.html WASD keyCode map: up87/down83/left65/right68, B74 K75 U85 I73, L81 R69, Select16 Start13.

## Validation
- E2E extended to 10 assertions (added: guest W-key -> simulateInput(1,4,1) on host; host controls[0][4]===87 && controls[1..3] all unbound). RESULT 10/10 PASSED (room 72GQEV). NOTE: server must run as `python3 -m http.server 3000 --directory /home/z/my-project/public` (rooting at project root gives directory listing -> all assertions timeout) + node output to file with poll loop (foreground node keeps tool call hanging after completion).
- Web build: index-b3EUsh18.js / index-ggDjQcCt.css. APK: BUILD SUCCESSFUL 19s, versionCode 7 / 2.3.0, SAME cert as v2.2.0 (SHA-256 6d5a9e60...) -> in-place upgrade OK, no uninstall needed. Deployed public/retroplay-v2.3.0.apk (HTTP 200) + download/RetroPlay-v2.3.0.apk; old v2.2.0 apk removed from public/.

---
Task ID: 7
Agent: Z.ai main agent
Date: 2026-10-29
Task: v2.4.0 — funky modern UI (both screens), host controls panel (parity with guest), FAB drag/minimize/hide.

## Host remap (Player 1 parity with guest P2)
- webapp/src/lib/keymap.js: loadHostKeymap/saveHostKeymap ('rp-host-keymap-v1', default wasd) + codeToKeyCode (e.code -> legacy keyCode; KeyA-Z 65+, Digit0-9 48+, arrows 37-40, modifiers, Numpad, F1-12, punctuation map). EJS compares e.keyCode, conversion happens parent-side before crossing the iframe.
- public/game.html: window.RP_applyKeys(map) — {libretroBtn: keyCode|'Mouse:N'|''} -> emu.controls[0] ONLY (P2-4 untouchable), preserves value2 (gamepad), saveSettings(), sets 'rp-host-keys' localStorage marker. setupHostMouse(): binds Mouse:0/1/2 onto emu.canvas mousedown + window mouseup + contextmenu suppression -> simulateInput(0,btn,val). EJS_Buttons.gamepad=false (EJS control menu removed — its P2-4 tabs were the original crosstalk footgun; RetroPlay KEYS panel is the single control surface). enforceKeyboardPolicy() now skips WASD injection when rp-host-keys marker set (user layout always wins); P2-4 strip stays unconditional.
- GameScreen.jsx: KEYS button in game-top -> shared ControlsPanel (title "Player 1 · Keyboard & Mouse"); applyKeysToFrame() converts codes and calls iframe bridge; effect on km change + boot-poll applies latest kmRef after emulator start. EJS verified to read this.controls LIVE in keyChange (minified source probe) -> instant effect, no reload.
- ControlsPanel.jsx: generalized (title prop, preset ids preset-wasd/left/arrows for E2E).

## FAB: drag / minimize / hide
- Tap opens sheet; drag moves (pointer capture, 8px threshold, snaps to nearest edge, clamped, persisted 'rp-fab-pos-v1' {side,x,bottom}, applied imperatively via ref to avoid React style-sync issues); long-press 500ms -> minimize to 40px translucent dot (vibrate 15ms); dot tap restores via onClick (pointer handlers stand down in min mode; onClick guarded by lastFabUp 400ms so the browser click after drag/long-press can't immediately undo the gesture). HIDE MULTIPLAYER BUTTON in sheet idle view -> hidden until game relaunch + explanatory toast. One-time per-session tip toast (sessionStorage rp-fab-tip). [hidden]{display:none!important} added (author display:flex previously could beat UA hidden rule); FAB now conditionally rendered.

## Funky UI (styles.css rewrite, all selectors kept)
- Animated neon backdrop (drifting radial gradients, body::before), glass topbars/sheet/modal (backdrop-filter), gradient primary buttons with glow + hover shift, gradient text titles (logo ver pill, drop-title, game-title, modal-head b, room-code digits), neon badges/dots, glass library cards with rise-in stagger, keycap-style .key-btn (3D bottom border, listen = gradient pulse), gamepad pads: glass gradient with pressed glow+scale, FAB: gradient + fabpulse glow + .fab-dash chip + .min/.dragging states, toast: fixed glass pill (was unstyled in-flow — now visible above everything, pointer-events none), room-pill mono chip in guest title, prefers-reduced-motion kill-switch. Guest title shortened to "P2 · <code>" (code was truncated on 390px).

## Validation
- E2E extended 10 -> 13 assertions (host panel: ARROWS preset -> controls[0][4]===38/B===90 live in iframe, custom KeyP -> 80, marker set, P2-4 clean; FAB long-press -> .min, tap restore; HIDE via #btnFabHide). RESULT 13/13 PASSED (room 5MRSET, final run on shipped bundle index-BbdFCgc2.js).
- Debug artifacts: scripts/debug_fab.js (elementsFromPoint + native event probe — proved FAB works; E2E failures were test-side: data-action "D-PadUp" hyphen + 400ms click-guard swallowing instant restore click), scripts/debug_shots.js + scripts/shots/1-6.png (visual check: menu/game/keys panel/sheet/guest).
- Web build: index-BbdFCgc2.js / index-gFLdXULg.css; STALE hashed bundles removed from public/assets (vite emptyOutDir=false had accumulated 3 old js + 2 old css; android snapshot also carried them).
- APK: versionCode 8 / 2.4.0, BUILD SUCCESSFUL, SAME cert (SHA-256 6d5a9e60...) -> in-place upgrade OK. android/app/src/main/assets re-synced from public/ (it was a stale manual snapshot — source of the duplicate bundles). Deployed public/retroplay-v2.4.0.apk + download/RetroPlay-v2.4.0.apk; v2.3.0/v2.2.0 apks removed.
