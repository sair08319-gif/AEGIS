# 🛡️ Aegis Stealth | Zero-Knowledge E2EE Chat

A military-grade, mathematically irreversible, client-side encrypted communication website that runs **locally on your device** and across your **Wi-Fi, Mobile Hotspot, or Internet Tunnel**.

---

## 🔒 Why This Cannot Be Intercepted or Reversed

1. **Client-Side Authenticated Encryption (AES-256-CBC + HMAC-SHA256):**
   * Encryption and decryption take place **strictly inside your device's browser RAM**.
   * Keys are derived using **PBKDF2 (30,000 rounds of SHA-256)** with deterministic room salt.
   * Every message uses an **Encrypt-then-MAC** architecture: AES-256-CBC with a unique 16-byte IV per message, followed by an HMAC-SHA256 authentication tag.
   * Runs natively via client-side cryptographic engine so it functions seamlessly over local Wi-Fi and mobile hotspots (`http://192.168.x.x:3000`) without being blocked by browser SSL sandbox restrictions.

2. **Zero-Knowledge Relay Server:**
   * The server only relays random ciphertext blobs (`7a9f8c...`).
   * The server **never has the decryption key** and cannot read any message.
   * **In-Memory Only:** There is no database and no file logging. When participants leave or wipe the room, everything in memory evaporates.

3. **URL Hash Fragment Key Exchange:**
   * When using the "Copy Secret Link" button, the encryption key is included in the URL fragment (`#room=...&key=...`).
   * Under standard internet and HTTP specifications, **browsers never send anything after the `#` hash to the server or network**. The key stays strictly on client devices.

4. **Metadata Defense 1 — Fixed-Size 2,048-Byte Padding:**
   * Eliminates packet-size fingerprinting. Every text message payload is padded with cryptographic noise to exactly 2,048 bytes. An observer watching network packets sees only identical 2KB chunks.

5. **Metadata Defense 2 — Continuous Chaff (Dummy Noise Traffic):**
   * Eliminates traffic-timing analysis. The client continuously generates, encrypts, and transmits fake dummy packets every 4 to 8 seconds. The receiving client verifies and absorbs them silently. An outside observer cannot tell when someone is actually typing, reading, or idle.

6. **Metadata Defense 3 — Silent Keystrokes (No Typing Leaks):**
   * Typing indicators are completely silenced from the network. Keystroke timing is never transmitted, preserving the uniform dummy traffic distribution.

7. **Replay Attack Defense & Freshness Window:**
   * Packets include unique message IDs tracked in a client-side replay cache to drop re-sent duplicate packets.
   * Any incoming message with a timestamp outside a 2-minute freshness window is rejected.

8. **Self-Destruct (Auto-Burn) with Complete RAM Purge:**
   * Messages can automatically evaporate after 15s, 30s, 60s, or 5m with an ember progress bar.
   * When expired, image pixels, canvas handles, text strings, and raw ciphertexts are completely wiped from browser memory and DOM inspector.

9. **In-Memory Zero-Cloud Image Sharing:**
   * Photos are converted into Base64 in RAM, encrypted with AES-256, and sent directly through the relay (5MB payload limit). No photos are ever saved to disk or uploaded to cloud storage.

10. **Emergency Channel WIPE & Kill-Switch:**
    * Pressing **`ESC` twice** (or clicking **WIPE**) sends an authenticated kill command to the room, wipes the encryption keys and buffers from RAM, and immediately closes the tab or redirects to `about:blank`.
    * If a lightbox or popover is open, `ESC` safely dismisses the modal without triggering a wipe.

11. **Anti-Phishing Safety Fingerprint (Visual SAS):**
    * A 4-emoji cryptographic fingerprint (e.g. `🛡️ ⚡ 🦊 💎`) is derived directly from `HMAC(Passphrase, RoomID)`. Comparing emojis verifies no man-in-the-middle exists.

---

## 🚀 How to Run and Connect

### 1. Run on Your Computer
Double-click `start.bat` or run:
```bash
node server.js
```
Open in your browser:
* **Local Computer:** `http://localhost:3000`

### 2. Connect from Any Mobile Phone (Local Wi-Fi or Hotspot)
1. Make sure your phone is on the **same Wi-Fi or Hotspot** as your computer.
2. Look at the IP address shown on the screen (e.g. `http://192.168.29.225:3000`).
3. Open Safari, Chrome, or Edge on your phone and type that address.
4. Enter the same **Room ID** and **Secret Passphrase**. You are now in a private, encrypted bubble!

### 3. Connect Across the Internet (With a Friend in Another City)
To let a friend connect over the internet without exposing your home router or configuring port forwarding, run a free **Cloudflare Tunnel**:
```bash
npx cloudflared tunnel --url http://localhost:3000
```
Cloudflare gives you a temporary secure `https://....trycloudflare.com` address that your friend can open from anywhere in the world! Even Cloudflare cannot read your messages because AES-256 encryption happens in your browser before packets leave your machine.
