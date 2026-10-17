# Aegis Stealth Chat (v5.0) — Developer Defect, Logic Flaw & Fix Sheet

This handoff document lists every broken logic block, contradictory or dead code path, security flaw, and configuration error found in the **Aegis Stealth Chat (v5.0)** codebase (`server.js`, `public/crypto.js`, `public/app.js`, `public/index.html`, `public/style.css`, `public/video/index.html`, `package.json`, `render.yaml`, and `.gitignore`), ordered by priority with exact line numbers and drop-in fixes.

## Summary Matrix of Code Defects & Illogical Patterns

| ID | Severity | File & Line Numbers | Defect / Illogical Behavior | Fix Summary |
| :--- | :--- | :--- | :--- | :--- |
| **BUG-01** | Critical | `public/app.js:2307, 2327` `server.js:334-357` | `triggerWipe()` sets `currentRoom = ''` on line 2307 **before** computing `HmacSHA256('WIPE_ROOM:' + currentRoom)` on line 2327. Every wipe broadcast hashes an empty room string and fails HMAC verification on all receiving peers. `server.js` also never deletes the room from `rooms`. | Save `const roomToWipe = currentRoom` before clearing `currentRoom = ''`; call `rooms.delete(targetRoom)` in `server.js`. |
| **BUG-02** | Critical | `public/app.js:1344, 1402, 1728, 2117, 2452` | `enterRoom()` hashes the room name via `StealthCrypto.blindRoomId()` so the server never sees it, but 5 other `ws.send()` calls attach `roomId: currentRoom` in **plaintext** on every chaff, chat, video, and leave packet. | Replace `roomId: currentRoom` with `roomId: blindedRoomId` in all 5 `ws.send()` calls. |
| **BUG-03** | Critical | `public/video/index.html:746, 972, 1013, 1072, 1109` | Standalone `/video` page never loads `crypto.js`, joins unblinded `currentRoom` (putting `/video` users in a separate server room from `/` chat users), sends WebRTC offers/ICE in cleartext, and reads `sessionStorage.getItem('aegis_session')` which is never written. | Either redirect `/video` to `/` (which already has the integrated WebRTC modal/bubble) or load `crypto-js.js` + `crypto.js` in `/video`. |
| **BUG-04** | High | `public/app.js:169, 175-199, 961` | Line 169 sets `let isIpCloaked = true; // Guaranteed IP Privacy: Always Force TURN Relay`, but `isIpCloaked` is **never referenced anywhere**. `getRtcConfig()` omits `iceTransportPolicy: 'relay'` and queries 4 STUN servers, leaking LAN/WAN IPs. | Add `iceTransportPolicy: isIpCloaked ? 'relay' : 'all'` to `getRtcConfig()` and omit STUN servers when `isIpCloaked` is `true`. |
| **BUG-05** | High | `public/app.js:1915-1920` `server.js:314` | Legacy `else if (msg.signal)` fallback accepts unencrypted WebRTC offers and auto-calls `startVideoCall(false)`. Worse, `server.js:314` lets unjoined sockets target any `data.roomId`, allowing unauthenticated remote camera/mic activation. | Delete `else if (msg.signal)` in `public/app.js:1915-1920` and require `currentRoom` membership in `server.js:314`. |
| **BUG-06** | High | `public/app.js:2426 vs 2737-2739` | `checkAndRestoreSession()` is `async` and called **without `await`** on line 2426. It scrubs `window.location.hash` and pauses at `await enterRoom()`, while synchronous code at lines 2737-2739 overwrites `roomInput.value` with a random room ID and calls duplicate `parseUrlFragment()`. | Remove duplicate `parseUrlFragment()`, set default random inputs *before* `checkAndRestoreSession()`, and properly sequence startup. |
| **BUG-07** | High | `public/app.js:265-290 vs 2680-2686` | Pressing `Escape` during a Kiosk fullscreen violation (or locked `PrintScreen` shield) hits line 2682 (`hideScreenShield(true)`), which removes the blackout veil and exposes all messages while the 3-second self-destruct timer keeps ticking in the background. | Guard the `Escape` handler at line 2682 with `if (isKioskModeActive || kioskCountdownTimer || isShieldLocked) return;`. |
| **BUG-08** | High | `server.js:39, 46-47, 50-59, 102, 161` | (1) Comment on line 46 says `Restrict connect-src to 'self'`, but line 47 sets `connect-src 'self' ws: wss: https:` (allowing any external server). (2) `Access-Control-Allow-Origin: *` and no WebSocket `Origin` check expose `/api/network-info` LAN IPs and `ws://localhost:3000` to cross-site hijacking. (3) `cf-connecting-ip` / `x-forwarded-for` can be spoofed by any client to bypass the 25-conn/IP limit. | Tighten `connect-src`, remove wildcard CORS, validate `req.headers.origin` on WebSocket connection, and gate proxy headers behind `process.env.TRUST_PROXY`. |
| **BUG-09** | Medium | `public/crypto.js:120-127, 144-151` `public/app.js:1763, 2592, 2629` | (1) `jsonStr.length` counts UTF-16 code units instead of UTF-8 bytes, so messages with emojis cross the 2,032B AES block boundary (`2,732` Base64 chars vs `2,712` for ASCII chaff). (2) Presence and Whiteboard packets pass raw `enc` (`v` and `sizeBytes` exposed, `id` and `timestamp` omitted), making them 100% distinguishable from chaff and vulnerable to replay after 500 strokes. | Measure UTF-8 byte length via `new TextEncoder().encode().byteLength`, include `timestamp` in all payloads, and send all encrypted packets through one uniform helper. |
| **BUG-10** | Medium | `public/crypto.js:35, 55, 84-100, 196-202` | (1) `activeMacKey` is PBKDF2 Block 2 (words 8-15); offline attackers testing `authTag` only need to compute Block 2 (30k rounds instead of 60k). (2) Deterministic room salt gives zero forward secrecy. (3) Modulo bias (`% 63`, `% 62`) and `Math.random()` fallback in noise generator. (4) `decrypt()` logs 16 chars of `expectedTag` to `console.error` on HMAC failure. | Derive one 256-bit master key via PBKDF2 and expand `EncKey`/`MacKey` via HMAC-SHA256 (HKDF); use rejection sampling; remove `expectedTag` console log. |
| **BUG-11** | Medium | `public/app.js:203-217, 1643, 2138-2151, 2228, 2415-2421` | `saveActiveSession()` and `saveMessagesToSession()` were turned into empty comments, but `renderMessage()` still pushes every non-burn message (including Base64 images) into `sessionMessages` forever (RAM leak) and `checkAndRestoreSession()` still reads empty `sessionStorage`. Also, burned images left open in `#lightboxImg` are never cleared when the message burns. | Remove dead `sessionMessages` / `sessionStorage` calls and clear `lightboxImg.src` when a burned image expires. |
| **BUG-12** | Low | `public/app.js:25-26, 84-93, 110, 128-129, 732, 1688, 2753` | 12 DOM IDs queried in `app.js` were deleted from `index.html`. As a result: (1) `calculateSafetyFingerprint()` (4-emoji SAS) is dead code and never called; (2) `loadNetworkInfo()` fetches `/api/network-info` then exits on `if (!localIpContainer) return;`; (3) `initAudioVisualizer()` is defined at line 2753 but never called in `peerConnection.ontrack`. | Call `initAudioVisualizer(remoteStream)` inside `ontrack`; either remove dead DOM references or restore SAS fingerprint & LAN IP display inside a popover. |
| **BUG-13** | Low | `server.js:104, 220-228` `public/app.js:2555` | (1) `README.md` claims 5MB photo support, but `server.js:104` sets `maxPayload: 2 * 1024 * 1024` (2MB). (2) `server.js:220` comment says `Max 20 msgs / sec`, code checks `> 25`, while whiteboard flushes every 50ms (`20 msgs/sec`), risking dropped stroke batches when combined with chaff/chat. | Increase `maxPayload` to `5 * 1024 * 1024` (5MB) and change whiteboard flush interval from `50ms` to `80ms`. |
| **BUG-14** | Low | `.gitignore`, `package.json`, `render.yaml`, `public/style.css` | (1) `brain/` (12.96 MB of AI chat logs, local Windows paths, and 12 screenshots = 96.3% of archive) is not in `.gitignore`. (2) `package.json` lists discontinued `crypto-js` in server dependencies even though `server.js` never uses it. (3) `render.yaml` pins EOL Node `18.20.0`. (4) ~450 lines of dead CSS in `style.css`. | Add `brain/` to `.gitignore`, remove `crypto-js` from `package.json`, upgrade `render.yaml` to Node 22 LTS, and prune unused CSS selectors. |

## Detailed Code-Level Walkthrough & Exact Fixes

### 1. Emergency Room Wipe Always Fails HMAC Verification on Remote Peers (`BUG-01`)

* **Where:** `public/app.js` (lines 2298–2335 and 1924–1935) and `server.js` (lines 334–357).
* **Why it makes no sense:**
  In `triggerWipe(isIncoming = false)`, line 2307 overwrites `currentRoom = '';`. Twenty lines later (line 2327), the code computes the HMAC signature using `currentRoom`:
  ```javascript
  // BROKEN CODE in public/app.js (Lines 2307 & 2326-2333)
  currentRoom = ''; // <-- Cleared to empty string here!
  // ...
  const wipeTag = window.stealthCrypto.activeMacKey
    ? CryptoJS.HmacSHA256('WIPE_ROOM:' + currentRoom, window.stealthCrypto.activeMacKey).toString() // <-- Always hashes 'WIPE_ROOM:'!
    : 'unauthenticated';
  ws.send(JSON.stringify({ 
    type: 'wipe_room', 
    roomId: blindedRoomId || currentRoom,
    authTag: wipeTag
  }));
  ```
  When the other peers in the room receive `room_wiped` (`public/app.js` line 1926), their `currentRoom` is still `'shadow-779'`, so they compute `HmacSHA256('WIPE_ROOM:shadow-779', activeMacKey)`. The hashes **never match**, every peer logs `[SECURITY] Unauthenticated room wipe rejected: Invalid HMAC signature`, and **no peer ever wipes their screen**. Furthermore, `server.js` (lines 334–357) relays `room_wiped` but never deletes the room from the `rooms` Map.
* **Exact Fix:**
  ```javascript
  // FIXED CODE in public/app.js (triggerWipe)
  function triggerWipe(isIncoming = false) {
    const roomToWipe = currentRoom;
    const blindedToWipe = blindedRoomId;
    if (kioskCountdownTimer) {
      clearInterval(kioskCountdownTimer);
      kioskCountdownTimer = null;
    }
    isKioskModeActive = false;
    if (kioskCountdownWrap) kioskCountdownWrap.style.display = 'none';
    if (shieldVeilStandardActions) shieldVeilStandardActions.style.display = 'flex';
    if (kioskStatusBadge) kioskStatusBadge.style.display = 'none';
    currentRoom = '';
    blindedRoomId = '';
    stopChaffGenerator();
    closePopover();

    // ... clipboard and storage clear ...

    if (!isIncoming && ws && ws.readyState === WebSocket.OPEN && roomToWipe) {
      try {
        const wipeTag = (window.stealthCrypto && window.stealthCrypto.activeMacKey)
          ? CryptoJS.HmacSHA256('WIPE_ROOM:' + roomToWipe, window.stealthCrypto.activeMacKey).toString()
          : null;
        if (wipeTag) {
          ws.send(JSON.stringify({
            type: 'wipe_room',
            roomId: blindedToWipe,
            authTag: wipeTag
          }));
        }
      } catch (e) {}
    }
  ```
  And in `server.js` (line 355), delete the room after broadcasting `room_wiped`:
  ```javascript
  // FIXED CODE in server.js (inside case 'wipe_room':)
  for (const client of peerSet) {
    if (client !== ws && client.readyState === 1) {
      client.send(wipeNotice);
    }
  }
  rooms.delete(targetRoom);
  ```

### 2. Room ID Blinding Is Defeated by 5 Plaintext `currentRoom` Sends (`BUG-02`)

* **Where:** `public/crypto.js` (lines 62–67) vs. `public/app.js` (lines 1344, 1402, 1613, 1728, 2117, 2452).
* **Why it makes no sense:**
  `StealthCrypto.blindRoomId(roomId)` hashes the room name (`SHA256('aegis-blind-room-v1:' + normalized)`) specifically so the relay server never learns the plaintext room name. `enterRoom()` (line 1624) connects using `blindedRoomId`. Yet 5 other places in `public/app.js` send `roomId: currentRoom` (the unhashed plaintext string!) in every WebSocket message:
  - Line 1344 (`startVideoCall`): `roomId: currentRoom`
  - Line 1402 (`endVideoCall`): `roomId: currentRoom`
  - Line 1728 (`startChaffGenerator` — runs every 4–8 seconds!): `roomId: currentRoom`
  - Line 2117 (`chatForm` submit — every chat message!): `roomId: currentRoom`
  - Line 2452 (`btnLeaveRoom`): `roomId: currentRoom`
* **Exact Fix:**
  Replace `roomId: currentRoom` with `roomId: blindedRoomId` at lines 1344, 1402, 1728, 2117, and 2452 of `public/app.js` (or omit `roomId` on post-join messages since `server.js` already stores `currentRoom` per socket closure on `join`).

### 3. Standalone `/video` Page Is Unencrypted & Partitioned From Main Chat Rooms (`BUG-03`)

* **Where:** `public/video/index.html` (lines 746, 972, 1013, 1072, 1109).
* **Why it makes no sense:**
  1. `public/app.js` already has the full WebRTC video call modal and draggable floating bubble built directly into the main chat page (`/`), where it uses `blindedRoomId` and encrypts all WebRTC signaling via `sendEncryptedWebRtcSignal()`.
  2. Meanwhile, `public/video/index.html` (`/video`) does **not** load `crypto-js.js` or `crypto.js`. When a user joins `"shadow-779"` on `/video` (line 1013), it sends `roomId: "shadow-779"` (plaintext), whereas a user on `/` joins `roomId: "6e3b0a..."` (`blindedRoomId`). The server puts them in **two completely different rooms**, so they can never call or see each other.
  3. `/video` sends all WebRTC SDP offers, answers, and ICE candidates in unencrypted cleartext (`signal: { ... }`).
  4. Line 746 of `/video` tries to read `sessionStorage.getItem('aegis_session')` to get the room and passphrase when clicking "Return to Chat", but `saveActiveSession()` in `public/app.js` (line 203) was gutted into an empty function, so `aegis_session` is never saved!
* **Exact Fix:**
  Remove the redundant `public/video/index.html` implementation and have `/video` in `server.js` redirect to `/` (or load `crypto-js.js` and `crypto.js` in `public/video/index.html` and use `StealthCrypto.blindRoomId(currentRoom)` + `stealthCrypto.encrypt()`).

### 4. "Mandatory TURN Relay IP Cloaking" Is Unused Dead Code (`BUG-04`)

* **Where:** `public/app.js` (lines 169, 175–199, and 961).
* **Why it makes no sense:**
  Line 169 declares:
  ```javascript
  let isIpCloaked = true; // Guaranteed IP Privacy: Always Force TURN Relay
  ```
  And line 961 comments:
  ```javascript
  // Note: Direct P2P option has been permanently replaced by mandatory Encrypted TURN Relay for total IP anonymity.
  ```
  Yet `isIpCloaked` is **never used anywhere in the file**, and `getRtcConfig()` (lines 175–199) returns:
  ```javascript
  // BROKEN CODE in public/app.js (Lines 195-198)
  return {
    iceServers: [...turnRelays, ...stunServers],
    iceCandidatePoolSize: 10
  };
  ```
  Because `iceTransportPolicy: 'relay'` is missing and 4 public STUN servers (`stun.l.google.com`, `stun.cloudflare.com`) are included, WebRTC defaults to `iceTransportPolicy: 'all'`, queries STUN, and sends the user's real local LAN IP (`host`) and public WAN IP (`srflx`) directly to the peer.
* **Exact Fix:**
  ```javascript
  // FIXED CODE in public/app.js (Lines 195-199)
  return {
    iceServers: isIpCloaked ? turnRelays : [...turnRelays, ...stunServers],
    iceTransportPolicy: isIpCloaked ? 'relay' : 'all',
    iceCandidatePoolSize: 4
  };
  ```

### 5. Unauthenticated Cleartext WebRTC Fallback Allows Remote Call Hijacking (`BUG-05`)

* **Where:** `public/app.js` (lines 1900–1922) and `server.js` (lines 313–332).
* **Why it makes no sense:**
  In `public/app.js`, lines 1901–1914 properly decrypt and verify `msg.payload` for incoming `webrtc_signal` events. Right below it, lines 1915–1920 keep a legacy unencrypted fallback:
  ```javascript
  // BROKEN CODE in public/app.js (Lines 1915-1920)
  } else if (msg.signal) {
    if (msg.signal.offer && !isVideoCallActive) {
      await startVideoCall(false);
    }
    await handleWebRtcSignal(msg.signal, msg.sender);
  }
  ```
  And in `server.js` (line 314):
  ```javascript
  const targetRoom = currentRoom || (typeof data.roomId === 'string' ? data.roomId.trim() : null);
  ```
  Any unauthenticated socket (without knowing the room passphrase, and without even joining the room!) can send `{ type: 'webrtc_signal', roomId: '<target>', signal: { offer: ... } }` and forcibly open the video modal and activate the webcam/microphone on every client in that room.
* **Exact Fix:**
  Delete lines 1915–1920 (`else if (msg.signal) { ... }`) in `public/app.js`, remove `signal: data.signal || null` in `server.js` (line 322), and require `if (!currentRoom || !rooms.has(currentRoom)) return;` in `server.js` (line 314).

### 6. Async Startup Race Condition Overwrites Invite Link Inputs (`BUG-06`)

* **Where:** `public/app.js` (lines 720–730, 2387–2426, and 2736–2740).
* **Why it makes no sense:**
  Look at the execution order when the script loads:
  1. Line 2426 calls `checkAndRestoreSession();` (an `async` function, called **without `await`**).
  2. Inside `checkAndRestoreSession()`, lines 2393–2401 read `#room=...&key=...` from `window.location.hash`, set `roomInput.value = room`, **scrub the URL hash to `''` via `window.history.replaceState`**, and call `await enterRoom(...)`, which yields at `await window.stealthCrypto.initializeKey(...)`.
  3. While `enterRoom()` is paused at `await`, synchronous execution jumps to lines 2737–2739:
     ```javascript
     // BROKEN ORDERING in public/app.js (Lines 2737-2739)
     usernameInput.value = generateCodename();
     roomInput.value = generateRoomId(); // <-- Overwrites the invite room in the input box with a random room!
     parseUrlFragment();                 // <-- Reads window.location.hash, which was ALREADY wiped on line 2400!
     ```
* **Exact Fix:**
  Delete the duplicate `parseUrlFragment()` function (lines 720–730) and initialize the default random inputs *before* calling `checkAndRestoreSession()`:
  ```javascript
  // FIXED INITIALIZATION in public/app.js
  usernameInput.value = generateCodename();
  roomInput.value = generateRoomId();
  loadNetworkInfo();
  checkAndRestoreSession();
  ```

### 7. Pressing `Escape` Defeats Kiosk Fullscreen Lockout & `PrintScreen` Lock (`BUG-07`)

* **Where:** `public/app.js` (lines 265–290, 474–479, and 2680–2686).
* **Why it makes no sense:**
  When Kiosk Mode detects that the user exited fullscreen (`triggerKioskViolation()`, line 265), it hides the chat (`body.shield-concealed`), shows `screenShieldOverlay` (`display = 'flex'`), sets `isShieldLocked = true`, and starts the 3-second self-destruct countdown (`kioskCountdownTimer`).
  However, if the user presses `Escape` while that overlay is visible, the `keydown` listener at line 2680 runs:
  ```javascript
  // BROKEN CODE in public/app.js (Lines 2680-2686)
  if (e.key === 'Escape') {
    // 0. If Screen Privacy Shield is visible, ESC dismisses it cleanly
    if (screenShieldOverlay && screenShieldOverlay.style.display === 'flex') {
      hideScreenShield(true); // <-- Passes force=true! Unlocks shield & reveals chat outside fullscreen!
      panicPressTimes = [];
      return;
    }
  ```
  Calling `hideScreenShield(true)` immediately removes the blackout blur and exposes all chat messages in a non-fullscreen window while `kioskCountdownTimer` continues running in the background and destroys the room 3 seconds later! It also lets a single `Escape` press bypass `isShieldLocked = true` set by `PrintScreen` (line 476).
* **Exact Fix:**
  ```javascript
  // FIXED CODE in public/app.js (Lines 2680-2686)
  if (e.key === 'Escape') {
    if (screenShieldOverlay && screenShieldOverlay.style.display === 'flex') {
      if (isKioskModeActive || kioskCountdownTimer || isShieldLocked) {
        return; // Do not allow ESC to unveil a locked or Kiosk-violated shield
      }
      hideScreenShield(false);
      panicPressTimes = [];
      return;
    }
  ```

### 8. Contradictory CSP Header, Wildcard CORS LAN IP Leak, and Spoofable Rate Limit (`BUG-08`)

* **Where:** `server.js` (lines 39, 46–47, 50–59, 102, 161–173).
* **Why it makes no sense:**
  1. **Comment vs. Code Contradiction in CSP (lines 46–47):**
     ```javascript
     // Restrict connect-src to 'self' (prevents unauthorized external WebSocket exfiltration)
     res.setHeader('Content-Security-Policy', "... connect-src 'self' ws: wss: https: ...");
     ```
     Adding bare `ws: wss: https:` schemes to `connect-src` allows scripts to connect to **any** HTTPS or WSS server on the internet, doing the exact opposite of the comment!
  2. **Wildcard CORS + `/api/network-info` Leak (lines 39 & 50–59):**
     `server.js` sets `Access-Control-Allow-Origin: *` on every response. When a user runs Aegis locally on `http://localhost:3000`, any malicious website open in another browser tab can `fetch('http://localhost:3000/api/network-info')`. Because the request comes from loopback (`127.0.0.1`), `server.js` returns all of the user's local LAN IP addresses, and wildcard CORS lets the malicious site read them!
  3. **Missing WebSocket `Origin` Validation (line 102):**
     `WebSocketServer` never checks `req.headers.origin`, allowing any external website to open WebSocket connections to `ws://localhost:3000`.
  4. **Unconditional Trust in Proxy Headers (line 161):**
     `const forwardedIp = req.headers['cf-connecting-ip'] || ...` trusts client-supplied headers even when running directly without Cloudflare, letting an attacker spoof a random IP on every connection to bypass `MAX_CONNS_PER_IP = 25`.
* **Exact Fix:**
  - Remove `res.setHeader('Access-Control-Allow-Origin', '*');` on line 39 and add `res.setHeader('Referrer-Policy', 'no-referrer');`.
  - Change `connect-src` on line 47 to `connect-src 'self' turn: turns:;`.
  - Gate `forwardedIp` on line 161 behind `process.env.TRUST_PROXY === 'true' || !!process.env.RENDER`.
  - Validate `req.headers.origin` in `wss.on('connection')` so cross-origin sockets are rejected with `ws.close(1008)`.

### 9. Broken Fixed-Size Padding for Unicode/Emojis & Inconsistent Packet Schemas (`BUG-09`)

* **Where:** `public/crypto.js` (lines 120–151) and `public/app.js` (lines 1726–1736, 1763–1778, 2592–2648).
* **Why it makes no sense:**
  1. **UTF-16 vs. UTF-8 Length Bug (`public/crypto.js` line 123):**
     ```javascript
     const jsonStr = JSON.stringify(dataObj);
     const neededPadding = Math.max(0, this.TARGET_PADDING_SIZE - jsonStr.length - 30);
     ```
     `jsonStr.length` counts UTF-16 code units, not UTF-8 bytes, and `- 30` miscalculates the 13-byte `{"p":,"n":""}` wrapper (`2048 - 30 + 13 = 2031` bytes for ASCII, which PKCS#7 pads to `2032` bytes = `2,712` Base64 chars). If a user types even **one emoji** (4 UTF-8 bytes, 2 UTF-16 units) or non-ASCII character, the UTF-8 byte length exceeds `2,032` bytes and jumps to the next 16-byte AES block (`2,048` bytes = `2,732` Base64 chars). Since chaff packets are pure ASCII (`2,712` Base64 chars), any network observer can immediately spot messages containing emojis or non-Latin text!
  2. **Outer JSON Schema Leak (`public/app.js`):**
     `encrypt()` returns `{ v, ciphertext, iv, salt, authTag, sizeBytes }`. Chat and Chaff manually strip `v` and `sizeBytes` and add `id: 'pkt-...'`. But `sendEncryptedPresenceAnnouncement()` (line 1774), `flushWhiteboardStrokes()` (line 2607), and `clearLocalWhiteboard()` (line 2641) send `payload: enc` directly—exposing `v: 'v4.0'` and `sizeBytes` in cleartext and omitting `id`!
  3. **Missing Replay Protection on Whiteboard/Presence (`public/app.js` lines 1994–2035):**
     Whiteboard and Presence packets do not include a `timestamp` field and return early (lines 1997, 2002, 2016) *before* the 2-minute freshness check on line 2032. Because 25 seconds of whiteboard drawing generates 500 stroke packets and flushes the 500-entry `seenAuthTags` Set, an attacker can replay an old `whiteboardClear` packet hours later and wipe the board!
* **Exact Fix:**
  - In `public/crypto.js`, calculate byte length with `TextEncoder`:
    ```javascript
    const encoder = new TextEncoder();
    const baseBytes = encoder.encode(JSON.stringify({ p: dataObj, n: '' })).byteLength;
    const neededPadding = Math.max(0, this.TARGET_PADDING_SIZE - baseBytes);
    ```
  - In `public/app.js`, add `timestamp: Date.now()` inside every encrypted payload, move the 120-second timestamp check in `handleIncomingEncryptedMessage()` to line 1992 (immediately after `decrypt(payload)` before checking `whiteboardData` / `presenceAnnouncement`), and strip `v` and `sizeBytes` from all outbound packets.

### 10. PBKDF2 Block-2 Work Factor Halving & Console Error Leak (`BUG-10`)

* **Where:** `public/crypto.js` (lines 75–105 and 194–204).
* **Why it makes no sense:**
  1. `initializeKey` is marked `async`, but `CryptoJS.PBKDF2` is 100% synchronous and blocks the browser UI thread.
  2. Requesting `keySize: 512 / 32` (512 bits) with SHA-256 (256-bit output) forces PBKDF2 to run **two independent 30,000-iteration blocks** (60,000 rounds total on the user's CPU). Words 0–7 (Block 1) become `activeEncKey`, and words 8–15 (Block 2) become `activeMacKey`. Because every packet exposes `authTag = HMAC-SHA256(ciphertext + ':' + iv, activeMacKey)`, an offline password cracker testing guesses against `authTag` only needs to compute **PBKDF2 Block 2** (30,000 rounds)—doing **half** the work the legitimate user's browser did!
  3. In `BRAIN.md` Item #16, the log claims *"Stripped all key derivation diagnostic logs from `crypto.js` to eliminate console leaks"*, yet lines 196–202 of `public/crypto.js` still log `Expected tag prefix: expectedTag.substring(0, 16)` to `console.error` whenever an HMAC check fails!
* **Exact Fix:**
  Derive a single 256-bit master key from PBKDF2 (so only 1 block is computed), then derive the two subkeys via single-round HMAC-SHA256 (HKDF-Expand):
  ```javascript
  const masterKey = CryptoJS.PBKDF2(cleanPass, salt, {
    keySize: 256 / 32,
    iterations: 60000, // Same CPU time as 30,000 rounds of 512-bit, but 2x harder for attackers!
    hasher: CryptoJS.algo.SHA256
  });
  this.activeEncKey = CryptoJS.HmacSHA256('AEGIS-ENC-v4', masterKey);
  this.activeMacKey = CryptoJS.HmacSHA256('AEGIS-MAC-v4', masterKey);
  ```
  And delete the `console.error` expected-tag leak on lines 196–202.

### 11. Hollowed-Out Session Functions, Unbounded `sessionMessages` Array, and Unburned Lightbox Image (`BUG-11`)

* **Where:** `public/app.js` (lines 160, 203–217, 1643, 2138–2151, 2226–2231, 2251–2266, 2415–2421).
* **Why it makes no sense:**
  1. Lines 203–210 define `saveActiveSession` and `saveMessagesToSession` as empty functions (`{ // comments only }`).
  2. Yet `renderMessage()` (lines 2138–2151) still pushes every message with `burnSeconds === 0` (including full Base64 strings of photos!) into `sessionMessages.push({...})` and calls the empty `saveMessagesToSession()`. Because `sessionMessages` is never read anywhere in the app, it is a pure memory leak!
  3. Meanwhile, `checkAndRestoreSession()` (lines 2415–2421) tries to read `sessionStorage.getItem('aegis_session_msgs')`, which is always `null` because `saveMessagesToSession()` is empty!
  4. When an auto-burn image message expires (`lines 2251–2266`), it wipes `row.querySelectorAll('img')`, but if the user clicked the image to view it in `#imageLightboxModal` (`lightboxImg.src = image` on line 2228), the enlarged photo stays open on screen in `#lightboxImg` even after the message has burned!
* **Exact Fix:**
  Delete `saveActiveSession`, `saveMessagesToSession`, `sessionMessages`, and lines 2415–2421; and inside the auto-burn timeout (line 2254), check if `lightboxImg && lightboxImg.src === image` and close/clear the lightbox modal.

### 12. 12 Orphaned DOM Selectors & 3 Disconnected Features (SAS Emoji Fingerprint, LAN IPs, Audio Visualizer) (`BUG-12`)

* **Where:** `public/app.js` (lines 25–26, 84–93, 110, 128–129, 732–758, 1688–1702, 2753–2796).
* **Why it makes no sense:**
  1. Twelve `document.getElementById(...)` calls at the top of `public/app.js` query IDs that were deleted from `public/index.html`: `cryptoStatusLabel`, `statusDot`, `headerSymbolDock`, `roomDockBtn`, `peerDockBtn`, `chaffStatusBadge`, `safetyFingerprintBadge`, `safetyFingerprintCode`, `cryptoIndicator`, `localIpContainer`, `shieldIndicator`, `shieldLabel`.
  2. `calculateSafetyFingerprint(passphrase, roomId)` (lines 1688–1702, which generates the 4-emoji anti-phishing SAS advertised in `README.md` Item #11) is **never called anywhere in `public/app.js`**!
  3. `loadNetworkInfo()` (lines 732–758) is called at startup (line 2740), immediately hits `if (!localIpContainer) return;` on line 733 (`localIpContainer` is `null`), and exits!
  4. `initAudioVisualizer(stream)` (lines 2753–2796) is fully written to animate `#remoteSpeakingIndicator` (which **does** exist in `public/index.html` at line 315!), and `stopAudioVisualizer()` is called in `clearRemotePeer()` (line 1276), **but `initAudioVisualizer()` is never called anywhere**!
* **Exact Fix:**
  - Call `initAudioVisualizer(remoteStream);` inside `peerConnection.ontrack` (`public/app.js` line 1235).
  - Either wire `calculateSafetyFingerprint(cleanPass, cleanRoom)` into the Active Peers modal (`#peersModal`) so users can actually see their 4-emoji verification code, or remove the dead functions and unused DOM variables.

### 13. Server Payload Limit Mismatch (2MB vs. 5MB) & Whiteboard Rate-Limit Collision (`BUG-13`)

* **Where:** `server.js` (lines 104, 220–228) and `public/app.js` (line 2555).
* **Why it makes no sense:**
  1. `README.md` (line 45) states: *"encrypted with AES-256, and sent directly through the relay (5MB payload limit)."* Yet `server.js` line 104 sets `maxPayload: 2 * 1024 * 1024` (2MB). Any encrypted payload over 2MB immediately disconnects the user's WebSocket.
  2. `server.js` line 220 comments `// Max 20 msgs / sec`, while line 227 checks `if (messageCountInWindow > 25) return;`. Meanwhile, the whiteboard in `public/app.js` (line 2555) flushes strokes every `50ms` (`20 packets/sec`). When a user draws quickly while chaff or chat packets are sent, the socket exceeds 25 packets/sec and `server.js` silently drops whiteboard stroke packets, leaving gaps in the drawing on the other person's screen.
* **Exact Fix:**
  Change `maxPayload` in `server.js` (line 104) to `5 * 1024 * 1024`, and change the whiteboard flush timer in `public/app.js` (line 2555) from `50` ms to `80` ms (12.5 packets/sec).

### 14. Repository Hygiene, Unused Server Dependency, and End-of-Life Node Version (`BUG-14`)

* **Where:** `.gitignore`, `package.json`, `render.yaml`, and `public/style.css`.
* **Why it makes no sense:**
  1. **96.3% of the project archive is AI chat logs (`brain/`):** Out of 13.46 MB uncompressed (150 files), 12.96 MB (137 files) is the `brain/` folder containing raw IDE `.jsonl` transcripts, 12 screenshots, and hardcoded local paths (`C:\Users\muthy\...`, `Z:\secure-stealth-chat - Copy`, sibling project names). `.gitignore` does not list `brain/`.
  2. **Unused & Deprecated `crypto-js` in `package.json`:** `package.json` lists `"crypto-js": "^4.2.0"` in `dependencies`, so `npm install` downloads it into `node_modules` on the server—even though `server.js` never requires `crypto-js` (the browser uses the static file `public/crypto-js.js`).
  3. **End-of-Life Node 18 in `render.yaml`:** `render.yaml` pins `NODE_VERSION: 18.20.0` (Node 18 reached End-of-Life in April 2025).
* **Exact Fix:**
  - Add `brain/` to `.gitignore` and remove `brain/` from the git repository (`git rm -r --cached brain/`).
  - Remove `"crypto-js": "^4.2.0"` from `package.json`.
  - Update `NODE_VERSION` in `render.yaml` to `22.11.0` (or `>=20.0.0` in `package.json`).
