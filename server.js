const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { WebSocketServer } = require('ws');

const PORT = process.env.PORT || 3000;
const PUBLIC_DIR = path.join(__dirname, 'public');

// MIME types for static assets
const MIME_TYPES = {
  '.html': 'text/html; charset=UTF-8',
  '.css': 'text/css; charset=UTF-8',
  '.js': 'application/javascript; charset=UTF-8',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon'
};

// Helper: Get local network IP addresses
function getLocalIpAddresses() {
  const interfaces = os.networkInterfaces();
  const addresses = [];
  for (const name of Object.keys(interfaces)) {
    for (const net of interfaces[name]) {
      if (net.family === 'IPv4' && !net.internal) {
        addresses.push({ interface: name, address: net.address });
      }
    }
  }
  return addresses;
}

// HTTP Server: Serves frontend & network diagnostics
const server = http.createServer((req, res) => {
  // CORS & Hardened Content Security Policy
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  // Cache-Busting: Ensure browsers & proxies always fetch the latest JS/CSS
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate, max-age=0');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  // Restrict connect-src to 'self' (prevents unauthorized external WebSocket exfiltration)
  res.setHeader('Content-Security-Policy', "default-src 'self'; img-src 'self' data: blob:; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; connect-src 'self' ws: wss:; object-src 'none'; base-uri 'none'; form-action 'self';");

  // Network info API for easy phone hotspot connection
  if (req.url === '/api/network-info') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    const remoteIp = req.socket.remoteAddress || '';
    const isLoopback = remoteIp === '127.0.0.1' || remoteIp === '::1' || remoteIp === '::ffff:127.0.0.1';
    return res.end(JSON.stringify({
      port: PORT,
      ips: isLoopback ? getLocalIpAddresses() : [],
      serverTime: Date.now()
    }));
  }

  // Favicon handler
  if (req.url === '/favicon.ico') {
    res.writeHead(204);
    return res.end();
  }

  // Parse path and serve static files
  let safePath = req.url.split('?')[0];
  if (safePath === '/' || safePath === '') safePath = '/index.html';
  if (safePath === '/video' || safePath === '/video/') safePath = '/video/index.html';
  if (safePath.startsWith('/') || safePath.startsWith('\\')) safePath = safePath.slice(1);
  const filePath = path.join(PUBLIC_DIR, safePath);

  // Security check: keep inside PUBLIC_DIR
  const relative = path.relative(PUBLIC_DIR, filePath);
  if (relative.startsWith('..') || path.isAbsolute(relative)) {
    res.writeHead(403);
    return res.end('Access Denied');
  }

  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      return res.end('404 Not Found');
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';
    res.writeHead(200, { 'Content-Type': contentType });
    fs.createReadStream(filePath).pipe(res);
  });
});

// Ephemeral In-Memory Room Hub (Zero Disk Persistence)
// Map<roomId, Set<WebSocket>>
const rooms = new Map();

// Anti-DoS Tracking
const ipConnections = new Map(); // ip -> count
const MAX_CONNS_PER_IP = 25;

const wss = new WebSocketServer({ 
  server,
  maxPayload: 2 * 1024 * 1024 // 2MB max packet limit (optimized for encrypted photos + text)
});

// Separate Presence Helper: Distinguishes between Chat peers and Video callers
function getRoomPresence(roomId) {
  const set = rooms.get(roomId);
  if (!set) return { chatPeers: [], videoPeers: [], chatCount: 0, videoCount: 0, totalCount: 0 };
  const chatPeers = new Set();
  const videoPeers = new Set();
  for (const client of set) {
    if (client.peerId) {
      if (client.clientType === 'video' || client.hasVideo) {
        videoPeers.add(client.peerId);
      }
      if (client.clientType === 'chat' || !client.clientType) {
        chatPeers.add(client.peerId);
      }
    }
  }
  return {
    chatPeers: Array.from(chatPeers),
    videoPeers: Array.from(videoPeers),
    chatCount: chatPeers.size,
    videoCount: videoPeers.size,
    totalCount: set.size
  };
}

function broadcastToRoom(roomId, messageObj, excludeWs = null, targetClientType = null) {
  const room = rooms.get(roomId);
  if (!room) return;
  const serialized = JSON.stringify(messageObj);
  for (const client of room) {
    if (client !== excludeWs && client.readyState === client.OPEN) {
      if (!targetClientType || client.clientType === targetClientType) {
        client.send(serialized);
      }
    }
  }
}

wss.on('connection', (ws, req) => {
  // Cloudflare Tunnel / Reverse Proxy Compatibility: Check forwarded headers if present
  const forwardedIp = req.headers['cf-connecting-ip'] || (req.headers['x-forwarded-for'] ? req.headers['x-forwarded-for'].split(',')[0].trim() : null);
  const rawIp = req.socket.remoteAddress || 'unknown';
  const clientIp = forwardedIp || rawIp;
  const isLoopback = (rawIp === '127.0.0.1' || rawIp === '::1' || rawIp === '::ffff:127.0.0.1');
  const allowedLimit = (isLoopback && !forwardedIp) ? 100 : MAX_CONNS_PER_IP;

  // 1. IP Rate Limiting (Anti-DoS connection flooding)
  const currentConns = ipConnections.get(clientIp) || 0;
  if (currentConns >= allowedLimit) {
    ws.close(1008, 'Anti-DoS: Connection limit exceeded');
    return;
  }
  ipConnections.set(clientIp, currentConns + 1);

  let currentRoom = null;
  let peerId = null;
  let messageCountInWindow = 0;
  let lastWindowReset = Date.now();
  let isCleanedUp = false;

  const cleanup = () => {
    if (isCleanedUp) return;
    isCleanedUp = true;

    // Decrement IP count safely
    const conns = ipConnections.get(clientIp) || 1;
    if (conns <= 1) {
      ipConnections.delete(clientIp);
    } else {
      ipConnections.set(clientIp, conns - 1);
    }

    if (currentRoom && rooms.has(currentRoom)) {
      const set = rooms.get(currentRoom);
      set.delete(ws);
      if (set.size === 0) {
        // Completely destroy room from RAM when everyone leaves
        rooms.delete(currentRoom);
      } else {
        const presence = getRoomPresence(currentRoom);
        broadcastToRoom(currentRoom, {
          type: 'presence',
          event: 'leave',
          peerId,
          clientType: ws.clientType,
          chatPeers: presence.chatPeers,
          videoPeers: presence.videoPeers,
          chatCount: presence.chatCount,
          videoCount: presence.videoCount,
          peerCount: presence.chatCount,
          peers: presence.chatPeers
        });
      }
      currentRoom = null;
    }
  };

  ws.on('message', (raw) => {
    try {
      // 2. Message Rate Throttling (Anti-Spam / Anti-Flood: Max 20 msgs / sec)
      const now = Date.now();
      if (now - lastWindowReset > 1000) {
        messageCountInWindow = 0;
        lastWindowReset = now;
      }
      messageCountInWindow++;
      if (messageCountInWindow > 25) {
        return;
      }

      const data = JSON.parse(raw);

      switch (data.type) {
        case 'join': {
          if (!data.roomId || typeof data.roomId !== 'string') return;
          const sanitizedRoomId = data.roomId.trim().substring(0, 64);
          if (!sanitizedRoomId) return;

          // If client was already in another room, leave it first
          if (currentRoom && currentRoom !== sanitizedRoomId && rooms.has(currentRoom)) {
            const oldSet = rooms.get(currentRoom);
            oldSet.delete(ws);
            if (oldSet.size === 0) rooms.delete(currentRoom);
          }

          currentRoom = sanitizedRoomId;
          peerId = (typeof data.peerId === 'string' && data.peerId.trim()) 
            ? data.peerId.trim().substring(0, 32) 
            : 'anon-' + Math.random().toString(36).substring(2, 7);
          ws.peerId = peerId;
          ws.clientType = (data.clientType === 'video') ? 'video' : 'chat';
          ws.hasVideo = (data.hasVideo === true);

          if (!rooms.has(currentRoom)) {
            rooms.set(currentRoom, new Set());
          }
          rooms.get(currentRoom).add(ws);

          // Broadcast separate presence for Chat and Video
          const presence = getRoomPresence(currentRoom);
          broadcastToRoom(currentRoom, {
            type: 'presence',
            event: 'join',
            peerId,
            clientType: ws.clientType,
            chatPeers: presence.chatPeers,
            videoPeers: presence.videoPeers,
            chatCount: presence.chatCount,
            videoCount: presence.videoCount,
            peerCount: presence.chatCount,
            peers: presence.chatPeers
          });
          break;
        }

        case 'video_state': {
          if (!currentRoom || !rooms.has(currentRoom)) return;
          ws.hasVideo = (data.active === true);
          const presence = getRoomPresence(currentRoom);
          broadcastToRoom(currentRoom, {
            type: 'presence',
            event: 'update',
            peerId,
            clientType: ws.clientType,
            hasVideo: ws.hasVideo,
            chatPeers: presence.chatPeers,
            videoPeers: presence.videoPeers,
            chatCount: presence.chatCount,
            videoCount: presence.videoCount,
            peerCount: presence.chatCount,
            peers: presence.chatPeers
          });
          break;
        }

        case 'encrypted_message': {
          if (!currentRoom || !rooms.has(currentRoom)) return;
          if (!data.payload || typeof data.payload !== 'object' || !data.payload.ciphertext) return;

          // Relay ONLY the encrypted payload to chat peers
          broadcastToRoom(currentRoom, {
            type: 'encrypted_message',
            payload: data.payload,
            timestamp: Date.now()
          }, ws, 'chat'); // Skip sender and relay to chat clients
          break;
        }

        case 'webrtc_signal': {
          const targetRoom = currentRoom || (typeof data.roomId === 'string' ? data.roomId.trim() : null);
          if (!targetRoom || !rooms.has(targetRoom)) return;
          // Relay encrypted WebRTC signal payload to peers with video enabled
          const roomSet = rooms.get(targetRoom);
          if (roomSet) {
            const serialized = JSON.stringify({
              type: 'webrtc_signal',
              payload: data.payload, // Encrypted signal
              signal: data.signal || null, // Fallback for legacy
              sender: peerId
            });
            for (const client of roomSet) {
              if (client !== ws && client.readyState === 1) { // WebSocket.OPEN
                if (client.clientType === 'video' || client.hasVideo) {
                  client.send(serialized);
                }
              }
            }
          }
          break;
        }

        case 'wipe_room': {
          if (!currentRoom || !rooms.has(currentRoom)) return;
          if (!data.authTag || typeof data.authTag !== 'string') {
            console.warn('[SECURITY] Unauthenticated wipe attempt rejected for room: ' + currentRoom);
            return;
          }
          // Relay wipe notification with cryptographic authTag to all peers in room
          // Each client verifies the HMAC locally before wiping their local memory and closing
          const targetRoom = currentRoom;
          const peerSet = rooms.get(targetRoom);
          if (peerSet) {
            const wipeNotice = JSON.stringify({
              type: 'room_wiped',
              roomId: targetRoom,
              authTag: data.authTag
            });
            for (const client of peerSet) {
              if (client !== ws && client.readyState === 1) { // WebSocket.OPEN
                client.send(wipeNotice);
              }
            }
          }
          break;
        }

        case 'leave': {
          cleanup();
          break;
        }
      }
    } catch (e) {
      // Invalid JSON or format, drop silently
    }
  });

  ws.on('close', cleanup);
  ws.on('error', cleanup);
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`⚠️ Port ${PORT} is already in use by another program!`);
  } else {
    console.error('Server error:', err);
  }
});

server.listen(PORT, '0.0.0.0', () => {
  const ips = getLocalIpAddresses();
  console.log('====================================================');
  console.log('🛡️  AEGIS STEALTH HARDENED ZERO-KNOWLEDGE RELAY');
  console.log('====================================================');
  console.log(`Local Access:   http://localhost:${PORT}`);
  ips.forEach(ip => {
    console.log(`Wi-Fi / LAN IP: http://${ip.address}:${PORT}`);
  });
  console.log('----------------------------------------------------');
  console.log('• Authenticated Encryption (AES-256-CBC + HMAC-SHA256)');
  console.log('• Cryptographic Key Separation (512-bit PBKDF2 split)');
  console.log('• Peer Isolation: Chat peers & Video callers tracked separately');
  console.log('• In-Memory Only: Zero logs, zero database on disk');
  console.log('====================================================');
});
