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
* **Core Cryptography:** Client-side PBKDF2 key derivation, AES-256-CBC encryption, HMAC-SHA256 authenticated encryption-then-MAC, 2048-byte fixed-size padding, and background dummy (chaff) traffic generation.

---

## 🗂️ Codebase Architecture & File Map

```
Z:\secure-stealth-chat\
├── brain\                      # 🧠 Complete project memory, audits, and conversation archives
│   ├── BRAIN.md                # This master continuity guide
│   └── conversations\          # Raw transcripts from all past IDE sessions (JSONL)
│       ├── 8d596249-...        # Current session (Z: migration, vulnerability audit, brain creation)
│       ├── 7a76e048-...        # Video connection & GPU buffer cleanup
│       ├── a0a5cb05-...        # WebRTC call signaling & peer list modal
│       ├── b0cde34d-...        # UI refinement & reply quoting
│       └── 4806ced1-...        # Core initial implementation
├── public\
│   ├── app.js                  # Main chat logic, UI state machine, chaff scheduler, auto-burn timers
│   ├── crypto.js               # StealthCrypto class (PBKDF2, AES-256-CBC, HMAC, padding, noise)
│   ├── crypto-js.js            # Standalone CryptoJS library (no external CDN dependency)
│   ├── index.html              # Chatroom markup, lobby, symbol dock, modals, lightbox
│   ├── style.css               # Dark theme, glassmorphic design, responsive layouts
│   └── video\
│       └── index.html          # WebRTC P2P audio/video calling interface
├── server.js                   # Zero-knowledge WebSocket relay server (ephemeral memory, no disk I/O)
├── start.bat                   # Windows one-click launcher (`node server.js`)
├── package.json                # Dependencies: `ws`, `crypto-js`
├── README.md                   # User documentation and security specifications
└── SESSION_RESTORE.md          # Quick commands for server restart
```

---

## 🛡️ Complete Security Audit & Flaw Analysis (October 2026)

During a deep vulnerability assessment of the codebase, 8 specific architectural and code flaws were cataloged:

### 1. Cryptographic Key Reuse (AES & HMAC Share Same Key)
* **File:** `public/crypto.js` (lines 68–109)
* **Finding:** PBKDF2 derives a single 256-bit key used for **both** AES-256 encryption and HMAC-SHA256 authentication.
* **Risk:** Violates the cryptographic principle of Key Separation (NIST SP 800-108, RFC 5116).
* **Remediation:** Derive 512 bits (64 bytes) via PBKDF2 and split into two distinct 256-bit keys: `encryptionKey` and `macKey` (or use HKDF).

### 2. Replay Attack Defense is Unauthenticated & Bypassable
* **File:** `public/app.js` (lines 882–890, 970–980)
* **Finding:** Replay deduplication checks `payload.id`. However, `payload.id` is in the clear outside the ciphertext and is **never signed by the HMAC authentication tag**.
* **Risk:** An adversary can replay any captured packet within the 2-minute freshness window by simply changing or deleting `payload.id`.
* **Remediation:** Key the replay cache on the message `authTag` (`seenAuthTags.has(payload.authTag)`) or authenticate a sequence number / UUID *inside* the encrypted JSON payload.

### 3. Predictable Room Salt
* **File:** `public/crypto.js` (lines 63–64)
* **Finding:** PBKDF2 salt is `SHA-256('aegis-salt-v2:' + roomId)`. For common room names ("test", "chat", "room1"), salt is 100% deterministic and vulnerable to precomputed dictionary attacks.
* **Remediation:** Mandate high-entropy room passphrases or pass a random salt via URL hash fragment.

### 4. DOM XSS in Video Peer List Modal
* **File:** `public/video/index.html` (lines 1085–1100)
* **Finding:** `item.innerHTML = ... <span>${name}</span> ...` injects unescaped peer codenames into the DOM when viewing active participants in a video call.
* **Risk:** Script execution if a peer joins with an HTML/JS payload in their username.
* **Remediation:** Replace with `escapeHtml(name)` or assign using `span.textContent = name;`.

### 5. Content Security Policy (CSP) Permissiveness
* **File:** `server.js` (line 43)
* **Finding:** CSP specifies `script-src 'self' 'unsafe-inline'` and `connect-src 'self' ws: wss:`.
* **Risk:** `'unsafe-inline'` negates CSP defenses against XSS; `connect-src ws: wss:` allows WebSocket connections to any external attacker server.
* **Remediation:** Remove `'unsafe-inline'` using nonces or external files, and restrict WebSocket connect-src to `'self'`.

### 6. Unauthenticated Room Wipe (`wipe_room`) DoS
* **File:** `server.js` (lines 226–244)
* **Finding:** Any WebSocket client can send `{"type": "wipe_room"}` without cryptographic proof of room ownership or passphrase knowledge. The server immediately destroys the room and instructs all clients to wipe their chats and close tabs.
* **Risk:** Trivial denial-of-service by anyone who knows the room ID.
* **Remediation:** Make the wipe command an encrypted, HMAC-authenticated payload that peers only execute if signed with the correct room key.

### 7. Chaff Dummy Traffic is Trivially Distinguishable
* **File:** `public/app.js` (lines 780–786 vs 974–980)
* **Finding:** Chaff packets use `id: 'chaff-...'` and include `burnSeconds: 0` in the outer JSON, whereas real messages use `id: 'msg-...'` and omit `burnSeconds` in outer JSON.
* **Risk:** Any network observer watching WebSocket JSON frames can immediately identify real vs dummy messages.
* **Remediation:** Unify the schema, ID format, and outer properties between chaff and real packets.

### 8. Cloudflare Tunnel / Reverse Proxy IP Collision Lockout
* **File:** `server.js` (lines 92–110)
* **Finding:** Rate limiter tracks raw `req.socket.remoteAddress` and blocks when `currentConns >= 15`. Over a Cloudflare Tunnel or reverse proxy, all clients arrive from `127.0.0.1`.
* **Risk:** After 15 connections globally, the server blocks all incoming users.
* **Remediation:** Support `cf-connecting-ip` / `x-forwarded-for` (with validation) or exempt localhost loopback when tunneling.

---

## 🎯 Hardening & Improvement Roadmap (Next Steps)

If continuing work on this project, prioritize in this order:

- [ ] **Task 1: Patch DOM XSS in `/video/index.html`**
  - Sanitize `name` with `textContent` or `escapeHtml()` in the active peers modal.
- [ ] **Task 2: Cryptographic Key Separation in `public/crypto.js`**
  - Update `initializeKey()` to derive 512 bits. Split into `activeEncKey` (first 256 bits) and `activeMacKey` (remaining 256 bits).
- [ ] **Task 3: Replay Attack Defense Hardening**
  - Change `seenPacketIds` in `public/app.js` to `seenAuthTags` keyed on `payload.authTag`.
- [ ] **Task 4: Authenticated Wipe Command**
  - Require wipe instructions to be sent as an `encrypted_message` with `{ action: 'WIPE_ROOM' }` verified by HMAC.
- [ ] **Task 5: Chaff Uniformity**
  - Remove distinguishable prefixes and equalize outer JSON keys between dummy and real messages.
- [ ] **Task 6: Cloudflare Tunnel Compatibility in `server.js`**
  - Detect reverse proxy headers or adjust `127.0.0.1` connection limits.

---

## 🚀 How to Run and Test
```powershell
# In PowerShell:
cd Z:\secure-stealth-chat
node server.js
```
* **Local Web App:** `http://localhost:3000`
* **Video Calling:** `http://localhost:3000/video`
* **Local LAN / Mobile:** Use the Wi-Fi IP printed in terminal on startup.
* **Cloudflare Tunnel:** `npx cloudflared tunnel --url http://localhost:3000`
