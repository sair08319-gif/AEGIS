# 🧠 Aegis Stealth Chat — Central Brain & Conversation Continuity

> **Quick Resume Prompt for Any New AI Session:**
> *"Resume Aegis Stealth Chat. Read `Z:\secure-stealth-chat\brain\BRAIN.md` and continue from the latest task."*

---

## 📌 Project Overview
**Aegis Stealth** is a zero-knowledge, mathematically irreversible, client-side end-to-end encrypted (E2EE) communication system designed to run locally, over Wi-Fi/Mobile Hotspots, or via Cloudflare Tunnels without any server-side database or logging.

* **Primary Project Directory:** `Z:\secure-stealth-chat`
* **Scratch / Backup Directory:** `C:\Users\muthy\.gemini\antigravity-ide\scratch\secure-stealth-chat`
* **Port:** `3000` (or `process.env.PORT`)
* **Transport:** HTTP / WebSocket (`ws://` or `wss://`)
* **Core Cryptography:** 512-bit PBKDF2 key derivation (30,000 rounds) strictly split into independent 256-bit AES-CBC encryption and 256-bit HMAC-SHA256 authentication keys, 2048-byte fixed-size padding, timing-safe equality, and background dummy (chaff) traffic generation.

---

## 🗂️ Codebase Architecture & File Map

```
Z:\secure-stealth-chat\
├── brain\                      # 🧠 Complete project memory, audits, and conversation archives
│   ├── BRAIN.md                # This master continuity guide
│   └── conversations\          # Raw transcripts from all past IDE sessions (JSONL)
├── public\
│   ├── app.js                  # Main chat logic, UI state machine, session restore, chaff scheduler, auto-burn timers
│   ├── crypto.js               # StealthCrypto class (PBKDF2 512-bit split, AES-256-CBC, HMAC, padding, noise)
│   ├── crypto-js.js            # Standalone CryptoJS library (no external CDN dependency)
│   ├── index.html              # Chatroom markup, lobby, symbol dock, modals, lightbox
│   ├── style.css               # Dark theme, glassmorphic design, responsive layouts
│   └── video\
│       └── index.html          # WebRTC P2P audio/video calling interface with Return to Chat & XSS defense
├── server.js                   # Zero-knowledge WebSocket relay server with separate presence & authenticated wipe
├── start.bat                   # Windows one-click launcher (`node server.js`)
├── package.json                # Dependencies: `ws`, `crypto-js`
├── README.md                   # User documentation and security specifications
└── SESSION_RESTORE.md          # Quick commands for server restart
```

---

## 🛡️ Completed Security Hardening & Flaw Fixes (October 2026)

All 8 identified flaws and architectural gaps have been resolved:

### 1. Cryptographic Key Separation (Fixed ✅)
* **File:** `public/crypto.js`
* **Fix Applied:** `initializeKey()` now derives 512 bits (16 32-bit words) using PBKDF2. Words 0–7 are assigned to `activeEncKey` (256-bit AES-CBC key) and words 8–15 are assigned to `activeMacKey` (256-bit HMAC-SHA256 key). Satisfies NIST SP 800-108 and RFC 5116 key separation.

### 2. Authenticated Replay Attack Defense (Fixed ✅)
* **File:** `public/app.js`
* **Fix Applied:** Replaced unauthenticated `payload.id` deduplication with `seenAuthTags` cache keyed on `payload.authTag`. Because `authTag` is the cryptographic HMAC of ciphertext and IV, replaying with a modified or stripped ID fails deduplication.

### 3. DOM XSS in Video Peer Modal (Fixed ✅)
* **File:** `public/video/index.html`
* **Fix Applied:** Replaced template string injection into `innerHTML` with safe DOM node creation using `nameSpan.textContent = name`.

### 4. Separate Peer Presence for Chat vs Video (Fixed ✅)
* **Files:** `server.js`, `public/app.js`, `public/video/index.html`
* **Fix Applied:**
  - Sockets join with `clientType: 'chat'` or `clientType: 'video'`.
  - Relay server tracks `chatPeers` and `videoPeers` independently.
  - Chat interface displays active chat members in the room and live video status indicator.
  - Video interface displays only peers currently connected to the video call.
  - WebRTC signaling (`webrtc_signal`) is exclusively routed to video clients.

### 5. Seamless Chat <-> Video Transition & Session Restoration (Fixed ✅)
* **Files:** `public/app.js`, `public/video/index.html`
* **Fix Applied:**
  - Added "💬 Return to Chat" button in `/video` (header and call controls bar).
  - Chat persists room, codename, and active non-burned messages in `sessionStorage` (`aegis_session` and `aegis_session_msgs`).
  - Returning from video automatically reconnects to the chatroom and restores decrypted conversation history without blank screens or manual re-entry.

### 6. Authenticated Emergency Room Wipe (Fixed ✅)
* **Files:** `server.js`, `public/app.js`
* **Fix Applied:** `wipe_room` requests now require an HMAC authentication tag (`authTag`) generated with the room's secret key. The server and peer clients reject unauthenticated wipe attempts.

### 7. Chaff (Dummy Traffic) Structural Uniformity (Fixed ✅)
* **File:** `public/app.js`
* **Fix Applied:** Chaff packets now use identical ID formatting (`pkt-...`) and identical outer JSON keys as real messages without leaking `burnSeconds` or identifiable prefixes.

### 9. Draggable Floating Video Bubble & In-App WebRTC (Added ✅)
* **Files:** `public/app.js`, `public/index.html`, `public/style.css`, `server.js`
* **Feature Implemented:**
  - Integrated the WebRTC audio/video call engine directly into the main chatroom.
  - When returning to chat or clicking **"Chat Bubble"**, the video collapses into a **Floating Touch/Mouse Draggable Bubble** in the corner of the chat.
  - Users can drag the bubble anywhere on screen with touch on mobile/tablets or mouse on desktop (constrained within screen bounds).
  - One-click **'✕'** button on the bubble immediately disconnects the call.
  - One-click expand button (or tapping the bubble) restores the fullscreen video view.
  - Quick mic/cam toggles available right from the floating bubble.
  - Simultaneous encrypted text chatting and live video/voice calling without dropping connection.

### 8. Cloudflare Tunnel / Reverse Proxy Compatibility (Fixed ✅)
* **File:** `server.js`
* **Fix Applied:** Inspects `cf-connecting-ip` and `x-forwarded-for` headers, and expands localhost connection limits to prevent tunnel lockouts.

### 10. `modalLocalPipWrap` Temporal Dead Zone Bug (Fixed ✅ - v4.2)
* **Files:** `public/app.js`, `public/index.html`
* **Fix Applied:** Moved `modalLocalPipWrap` declaration to the top of the closure alongside modal element references, routed the click listener to `toggleViewSwap()`, eliminated duplicate `const modalLocalPipWrap` at the bottom, and bumped script cache-buster to `v=4.2`.

### 11. Anti-Screenshot & Screen Privacy Shield (Implemented ✅ - v4.3)
* **Files:** `public/app.js`, `public/index.html`, `public/style.css`
* **Defenses Implemented:**
  - **Snipping Tool & Window Focus Camouflage:** When the browser window loses focus (`blur`, `visibilitychange` to hidden, or `Win+Shift+S`), an impenetrable frosted privacy veil (`#screenShieldOverlay`, 35px backdrop-blur) instantly covers sensitive chats, preventing screen snips from capturing clear text.
  - **Hardware `PrintScreen` (PrtScn) Interception:** Intercepts `PrintScreen` keystroke, triggers the privacy veil, triggers the quarantined security alert sound/banner, and immediately purges the OS clipboard via `navigator.clipboard.writeText`.
  - **CSS `@media print` Total Blackout:** Hardened CSS print styles blank all DOM elements and print a security violation warning if a user attempts to print or PDF-export via `Ctrl+P`.
  - **Shortcut Restrictions:** Intercepts `Ctrl+P`, `Ctrl+S`, and DevTools inspector shortcuts (`F12`, `Ctrl+Shift+I/J/C`).
  - **Context Menu & Anti-Drag:** Blocks right-click menus on sensitive message, video, and image surfaces; disables image dragging and message text selection.
  - **Header Dock Status Indicator:** Added `SCREEN SHIELD` active badge in header action dock.
  - **Resume Control:** Clean resume button on shield and `Escape` hotkey handler to restore view.

### 12. Deep Minimized & Inactive Background Capture Defense (Implemented ✅ - v4.4)
* **Files:** `public/app.js`, `public/index.html`, `public/style.css`
* **Defenses Implemented:**
  - **Deep DOM Blind (`body.shield-concealed`):** The instant Aegis is minimized or loses focus to another application, `body.shield-concealed` activates, forcing `.messages-viewport`, `.screen-chat`, and all media elements to `visibility: hidden !important; opacity: 0 !important; filter: blur(50px) !important;`. Any tool taking a full desktop screenshot or capturing background window handles via OS APIs (`PrintWindow`, DWM thumbnail peek, Alt+Tab previews) captures only zero-opacity empty/blacked-out canvas.
  - **Browser Tab & Taskbar Title Disguising:** The moment the window is inactive or minimized, `document.title` immediately switches from `Aegis Stealth` to generic `"Search"`. When the user refocuses, the title is restored.
  - **Anti-Click-Snip Protection (350ms Hold Delay):** Prevents snipping tools from clicking the inactive window to snap an instant frame; holds the shield for 350ms after focus so human confirmation or intentional interaction is verified before unveiling.
  - **Decoy Search Engine Switcher:** Users can click **"🔍 Disguise as Search"** directly from the shield to immediately camouflage the entire window into a clean Google-like search engine interface.
  - **Dynamic Forensic Anti-Leak Watermark:** Renders a subtle repeating diagonal cryptographic watermark across the chat stage displaying the viewer's `Codename • Room • Date • AEGIS E2EE`, neutralizing analog smartphone screen photography leaks.

### 13. Opt-In Kiosk Fullscreen Lockdown Mode (Implemented ✅ - v4.5)
* **Files:** `public/app.js`, `public/index.html`, `public/style.css`
* **Defenses Implemented:**
  - **Opt-In Kiosk Fullscreen Toggle:** Added `🛡️ Enforce Kiosk Fullscreen Mode` checkbox in Lobby join form. When checked, joining a room requests native fullscreen via `document.documentElement.requestFullscreen()`.
  - **Header Dock Indicator:** Active sessions display an amber `KIOSK LOCKED` badge in the header action group.
  - **Instant Screen Concealment on Exit:** If fullscreen is exited via `Esc`, window resizing, multi-monitor dragging, or OS window switching, `fullscreenchange` immediately engages `body.shield-concealed` (complete display blackout) and sounds a security alert chirp.
  - **3-Second Emergency Self-Destruct Countdown:** Displays a circular 3-second countdown timer. If the user clicks **"Re-enter Fullscreen"** within 3 seconds, session resumes seamlessly. If 3 seconds elapse, `triggerPanicWipe()` erases all RAM keys, clears session storage, broadcasts channel destruction, and exits the tab.
  - **Graceful Leave & Wipe Integration:** Leaving the room intentionally via `btnLeaveRoom` cleans up timers, resets kiosk state, and gracefully exits fullscreen without triggering false alarms.

### 14. `whiteboardModal` Temporal Dead Zone Bug (Fixed ✅ - v4.6)
* **Files:** `public/app.js`, `public/index.html`
* **Fix Applied:** Moved `whiteboardModal` and associated canvas element declarations to the top of the closure alongside other modal elements, hoisted `showToast`, `triggerWipe`, and `triggerPanicWipe` function declarations, and bumped cache-buster to `v=4.6`.

### 15. `renderActivePeersList` Inbound Presence ReferenceError (Fixed ✅ - v4.7)
* **Files:** `public/app.js`, `public/index.html`
* **Fix Applied:** Extracted `renderActivePeersList` into a hoisted top-level function declaration, guarded presence announcement calls with modal visibility checks, and resolved false-positive inbound decryption failure warnings. Bumped cache-buster to `v=4.7`.

### 16. Silent DevTools Defense, Badge Removal & Inspector Cloaking (Implemented ✅ - v4.9)
* **Files:** `public/app.js`, `public/index.html`, `public/style.css`, `public/crypto.js`
* **Defenses Implemented:**
  - **Badge Removal:** Removed `RELAY MASKED` and `SCREEN SHIELD` badges from the header dock to eliminate visual clutter and avoid drawing attention to stealth mechanisms.
  - **Zero-Warning Silent Defense:** Completely removed `#securityAlertBanner` and silenced alert audio chirps. All inspection attempts, DevTools shortcuts (`F12`, `Ctrl+Shift+I/J/C`, `Ctrl+U`), and right-clicks fail completely silently without noisy banners or alarms.
  - **Browser Settings / Menu DevTools Trap:** Even if a user opens DevTools from browser settings/menu (bypassing shortcut blockers):
    - Continuous viewport shrinkage monitoring (`outerWidth - innerWidth > 160 || outerHeight - innerHeight > 160`) detects docked DevTools.
    - Continuous `debugger` timing loop halts execution in the debugger when DevTools is opened, preventing live element or script inspection.
    - When veiled, message rows are detached from the DOM tree into an in-memory `DocumentFragment` (`detachedMessagesFragment`), ensuring that even when inspecting the DOM in the Elements panel, `<div id="messagesViewport">` contains zero plaintext nodes.
    - Refuses to unveil if DevTools is still detected.
  - **Crypto Diagnostic Purge:** Stripped all key derivation diagnostic logs from `crypto.js` to eliminate console leaks. Bumped asset versions to `v=4.9`.

---

## 🚀 How to Run and Test
```powershell
cd Z:\secure-stealth-chat
node server.js
```
* **Local Web App:** `http://localhost:3000`
* **Video Calling:** `http://localhost:3000/video`
* **Local LAN / Mobile:** Use the Wi-Fi IP printed in terminal on startup.
* **Cloudflare Tunnel:** `npx cloudflared tunnel --url http://localhost:3000`
