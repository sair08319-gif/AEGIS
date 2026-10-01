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
