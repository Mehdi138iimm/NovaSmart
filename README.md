# NOVASMART

A Smart-Island desktop companion for Windows 10/11 — **Tauri 2 + Rust + React + TypeScript**.
A black notch with two golden "NOVA" eyes sits at the top-centre of the screen; hover or click and it morphs into a panel
(Home, AI, Music, Notes, Focus, Modes, Files, Clipboard, Agenda, Mail, Notifications, Settings, Customize).
A second mini-island — the **capsule** — shows what is happening (song, AI agent, focus timer, notification) next to the NOVA eyes.

> Design is *inspired by* the quality bar of TwoCode; name, logo, character and assets are original.

---

## Two ways to run it

| Command | What you get |
|---|---|
| `npm run dev` / `npm run build` | **Frontend only** (browser preview). The island is drawn at the top of the browser viewport. Native features (system metrics, SMTC music, real tray, autostart, OS notifications, bridge, window placement) are *not* available and show honest empty/“n/a” states. |
| `npm run tauri dev` / `npm run tauri build` | **The real desktop app** (needs Rust + WebView2). Windows are created by Rust, placed at the top-centre of the monitor, always-on-top, transparent, undecorated. |

`npm run build` outputs a single `dist/index.html` (this is what Tauri embeds).

## Setup in VS Code (Windows 10/11)

1. Install: Node 20+, Rust (`rustup`, MSVC toolchain), *Microsoft C++ Build Tools*, WebView2 (preinstalled on Win 11).
2. VS Code extensions: *rust-analyzer*, *Tauri*, *ESLint* (optional).
3. In the project folder:
   ```bash
   npm install
   npm run tauri dev       # develop with hot reload
   npm run tauri build     # installers in src-tauri/target/release/bundle (nsis + msi)
   ```
4. `npm run typecheck` runs `tsc --noEmit`.

## How the island stays fixed

* Windows have `decorations:false`, no title bar, **no `data-tauri-drag-region`**, no window-position permission in
  `capabilities/default.json`; the CSS marks everything `-webkit-app-region: no-drag` and cancels `dragstart`.
* Only Rust moves windows: `place_all()` centres the island on the top edge of the selected monitor (physical px, per-monitor DPI aware)
  and is re-run on layout change, DPI change, and by a 3 s monitor-signature watcher (hot-plug, resolution change, resume from sleep).
* The window is resized to hug the notch/panel (8 px margin when closed), so it doesn’t swallow clicks meant for other apps — no click-through hacks needed.
  The window grows *before* the open animation and shrinks *after* the close animation.
* Settings can only change the vertical offset and the target display.

## Interaction modes
Hover / Click / Both (default), configurable open/close delay (150 / 450 ms), auto-close, pin-open, close-on-Escape, ignore-hover-in-fullscreen
(uses `SHQueryUserNotificationState` on Windows). Pointer moves island → panel never close it; tab changes never re-open it.
In *Both*: hover-opened panels close after leaving; a click “pins” them.

## Project layout
```
src/
  components/{island,eyes,navigation,tray,ui}
  features/{home,ai,music,focus,notes,modes,files,clipboard,agenda,mail,notifications,settings,apps}
  hooks/  services/  stores/  i18n/  types/
src-tauri/
  src/{lib.rs, bridge.rs, media.rs, system.rs, main.rs}  capabilities/  icons/  tauri.conf.json
scripts/novasmart-claude-hook.mjs
```
State: Zustand (`settings` persisted, `data` persisted, `runtime` volatile). Views are `React.lazy`. Animations: Framer Motion springs + CSS transform/opacity for eyes.

## AI: what is real

* **API providers** (OpenAI, Claude/Anthropic, Gemini): paste a key in *Settings → AI Settings*, press *Test connection*. Requests go directly from the app to the provider. Keys are stored locally (WebView localStorage — not yet in Windows Credential Manager).
* **Agents** (Claude Code, Codex, ChatGPT desktop, anything scriptable): Rust runs a loopback-only bridge on `127.0.0.1:47821`
  (`POST /agent-event`, rejects browser `Origin` requests). Agents show as *Disconnected* until they actually report. Approvals are held open until you press **Allow/Deny** (120 s timeout ⇒ deny).
  Claude Code example (`~/.claude/settings.json`):
  ```json
  { "hooks": {
    "UserPromptSubmit": [{ "hooks": [{ "type": "command", "command": "node C:/path/scripts/novasmart-claude-hook.mjs" }] }],
    "PreToolUse":       [{ "matcher": "Bash|Edit|Write", "hooks": [{ "type": "command", "command": "node C:/path/scripts/novasmart-claude-hook.mjs --approve" }] }],
    "Stop":             [{ "hooks": [{ "type": "command", "command": "node C:/path/scripts/novasmart-claude-hook.mjs" }] }]
  } }
  ```
  Payload: `{"agent","state":"idle|starting|reading|thinking|editing|executing|waiting|completed|failed","message","approval":{"id","kind","description","target"}}`.
* Nothing is simulated: no key ⇒ “Not connected”.

## Feature status

**Implemented**
- Native island/capsule windows, single instance, real tray menu, autostart, OS notifications, multi-monitor placement, DPI handling (Rust)
- Eye Mode with 9 moods (idle, thinking, working, attention, success/happy, error, sleep, curious), blink, hover reaction; mood derived from real state
- Spring open/close sequence, fixed-size inner content (no reflow), animated tab pill, lazy views, Hover/Click/Both
- Home (AI / Music / Focus / System / Clock / Agenda / Notes cards, reorderable & resizable), AI Assistant (chat, mic via SpeechRecognition when available) + Agents/approvals/history
- Music: Windows SMTC (title, artist, art, seek, play/pause/next/prev, system volume) + local-file player fallback
- Focus: Pomodoro/custom, short/long break, history, daily stats, end chime + notification, app-level Do-Not-Disturb
- Notes (autosave, RTL/LTR auto, search), Files shelf (drag-drop, open, copy path), Clipboard history (search, pin, sensitive-text filter), Agenda (day/month, timeline, reminders), Notifications centre, Modes (Work/Study/Sleep/Game with real effects), Quick-control menu, All-Apps
- Customize: island/eye/panel sizes, glow, blink, radius, opacity, shadow, blur, themes (6 + custom), nav order/visibility/size/labels, module cards add/remove/reorder/resize, presets, reset — all live and persisted
- English + Persian (Vazirmatn), automatic RTL

**Not done / limitations (honest list)**
- **Mail**: UI + empty state + Client-ID field only. No OAuth/Gmail/Graph backend yet, so counts show “—”.
- **GPU usage** is reported as `n/a` (no stable cross-vendor API); CPU/RAM/battery are real on Windows.
- **Windows Focus-Assist / system DND** has no public API: “Do Not Disturb” silences NOVASMART’s own notifications only.
- **Backdrop blur** only blurs content inside the window, not the desktop (WebView2 limitation).
- **API keys** are in localStorage, not the OS keychain. **SQLite** is not used; data is persisted in local storage (fine for this volume, migrate if needed).
- **Updates** menu shows version only; the Tauri updater needs a signing key + endpoint.
- Browser preview cannot give real file paths, system metrics, SMTC, or quit the process.
- Voice input depends on SpeechRecognition support in the WebView2 build; the mic button disables itself when unsupported.

## Test report (what was actually run)

### 1.4.1 — fixes + full native section test (this machine)

Changes:
- **Removed the coloured halo** around the island (the golden `box-shadow`/`drop-shadow` glow on the eyes). Eyes are now flat gold; the `Eye glow` setting was removed since it no longer does anything.
- **Removed the grey panel border and shadow halo** — the island `boxShadow` is now `none` (both open and closed); the panel is a clean black rounded rectangle with no outline ring and no surrounding shadow. The now-useless `Shadow` slider was removed from Customize.
- **Removed the bottom capsule window entirely** (second webview, its Rust commands, settings and UI). The Windows system-tray icon remains.
- **Fixed Fold In** — clicking the header eyes or the Quick-menu *Fold In* closed the panel, but the click bubbled to the island container's `onClick`, which immediately re-opened it. Added `stopPropagation()` on both fold controls plus a `suppressHover` flag so a fold is not undone by hover until the pointer actually leaves the window.

Verified live on Windows (mouse-driven, screenshot per step):
| Area | Result |
|---|---|
| Home / AI / Music / Notes / Focus / Modes / Files / Clipboard / Agenda / Mail tabs | ✅ all render and switch |
| Music — real SMTC (title/artist/art/seek/position/remaining) from a running player | ✅ live |
| Notes — create + autosave + list sync | ✅ |
| Focus — start/pause, countdown, end-time estimate, header activity chip | ✅ |
| Clipboard — real capture + sensitive filter | ✅ |
| Agenda — create event, timeline render, reminder notification fired | ✅ |
| All Apps grid, Customize (sliders + live themes), Settings | ✅ |
| Fold In (header eyes + Quick menu) stays closed; hover-away-and-back reopens | ✅ fixed |
| Quit exits the process | ✅ |
| `tsc --noEmit`, `cargo build --release`, NSIS + MSI | ✅ pass |

### 1.4.0 — Windows 10/11 verification (this machine)

| Check | Result |
|---|---|
| `npm install`, `npx tsc --noEmit` (strict) | ✅ pass |
| `npm run build` | ✅ pass (single-file `dist/index.html`, ~1.3 MB) |
| `cargo check` (Windows, MSVC) | ✅ pass — **after adding the missing `src-tauri/icons/` set**; the original archive had no icons and `tauri-build` fails without `icons/icon.ico` (Windows resource file) |
| `cargo build --release` + NSIS/MSI installers | ✅ pass — `NOVASMART_1.4.0_x64-setup.exe` + `NOVASMART_1.4.0_x64_en-US.msi` |
| SMTC thread COM init | ✅ fixed — `media.rs` now calls `CoInitializeEx(MTA)` before `SessionManager::RequestAsync()`; without it WinRT media calls fail with `CO_E_NOTINITIALIZED` |
| Live island/capsule rendering, tray process | ✅ verified on Windows (screenshot smoke test) |

### 1.0.0 — original sandbox report (Linux)

Environment: Linux sandbox — **no Windows, no Rust toolchain, no Tauri build**.

| Check | Result |
|---|---|
| `npm install`, `npx tsc --noEmit` (strict, noUnused*) | ✅ pass |
| `npm run build` | ✅ pass (single-file `dist/index.html`) |
| Smoke test in jsdom: island mounts, click opens panel, all 10 tabs + Notifications/Settings/Customize sub-panels render, Agents view, note autosave to storage, quick-control menu | ✅ no runtime errors |
| Real browser screenshots / animation feel | ⚠️ not possible here (headless Chromium lacked system libs) — please verify visually |
| `cargo check` / `tauri dev` / `tauri build` | ❌ **not run** — Rust sources (incl. SMTC/volume code using `windows` 0.58 and `sysinfo` 0.33) were written against the docs but never compiled. Expect to fix small API mismatches on first `cargo build` |
| Windows 10/11 behaviour (DPI, multi-monitor, focus, fullscreen detection, tray) | ❌ untested |

Idle resource design (not measured): no timers while closed except blink/idle-sleep (cheap), stats polled only while the panel is open,
clipboard/media/reminder polling honour *Low resource mode* and *Background activity*, eye animations are opacity/transform only.

---

## خلاصه (فارسی)
NOVASMART یک Smart Island برای ویندوز است (Tauri 2 + Rust + React). با `npm run dev` فقط پیش‌نمایش وب اجرا می‌شود؛ برای برنامه‌ی واقعی دسکتاپ از
`npm run tauri dev` و برای ساخت نصب‌کننده از `npm run tauri build` استفاده کنید. موقعیت Island فقط توسط Rust تنظیم می‌شود و هیچ راهی برای کشیدن آن با ماوس وجود ندارد.
کدهای Rust در این محیط (Linux) کامپایل و روی ویندوز تست نشده‌اند؛ بخش Mail هنوز اتصال OAuth ندارد؛ GPU در دسترس نیست. جزئیات در بخش بالا آمده است.
