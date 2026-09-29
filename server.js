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
      // Skip internal (127.0.0.1) and non-IPv4
      if (net.family === 'IPv4' && !net.internal) {
        addresses.push({ interface: name, address: net.address });
      }
    }
  }
  return addresses;
}

// HTTP Server: Serves frontend & network diagnostics
const server = http.createServer((req, res) => {
  // CORS & Security headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Content-Security-Policy', "default-src 'self'; img-src 'self' data:; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; connect-src 'self' ws: wss:; object-src 'none'; base-uri 'none'; form-action 'self';");

  // Network info API for easy phone hotspot connection
  if (req.url === '/api/network-info') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({
      port: PORT,
      ips: getLocalIpAddresses(),
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
  if (!filePath.startsWith(PUBLIC_DIR)) {
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
const MAX_CONNS_PER_IP = 15;

const wss = new WebSocketServer({ 
  server,
  maxPayload: 5 * 1024 * 1024 // 5MB max packet limit (supports encrypted Base64 photos + text)
});

wss.on('connection', (ws, req) => {
  // Use raw remoteAddress to prevent header-spoofed rate limit bypass on local network
  const clientIp = req.socket.remoteAddress || 'unknown';
  
  // 1. IP Rate Limiting (Anti-DoS connection flooding)
  const currentConns = ipConnections.get(clientIp) || 0;
  if (currentConns >= MAX_CONNS_PER_IP) {
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

    // Decrement IP count safely once
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
        broadcastToRoom(currentRoom, {
          type: 'presence',
          event: 'leave',
          peerId,
          peerCount: set.size,
          peers: getRoomPeers(currentRoom)
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
      if (messageCountInWindow > 20) {
        // Drop flooded packet silently to prevent CPU spike
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

          if (!rooms.has(currentRoom)) {
            rooms.set(currentRoom, new Set());
          }
          rooms.get(currentRoom).add(ws);

          // Broadcast peer count & active peer codenames to room
          const count = rooms.get(currentRoom).size;
          broadcastToRoom(currentRoom, {
            type: 'presence',
            event: 'join',
            peerId,
            peerCount: count,
            peers: getRoomPeers(currentRoom)
          });
          break;
        }

        case 'encrypted_message': {
          if (!currentRoom || !rooms.has(currentRoom)) return;
          if (!data.payload || typeof data.payload !== 'object' || !data.payload.ciphertext) return;

          // Relay ONLY the encrypted payload. Server never has keys to decrypt.
          broadcastToRoom(currentRoom, {
            type: 'encrypted_message',
            payload: data.payload,
            timestamp: Date.now()
          }, ws); // Skip sender
          break;
        }

        case 'webrtc_signal': {
          const targetRoom = currentRoom || (typeof data.roomId === 'string' ? data.roomId.trim() : null);
          if (!targetRoom || !rooms.has(targetRoom)) return;
          // Relay WebRTC P2P signals (offer, answer, candidate) to other peers
          broadcastToRoom(targetRoom, {
            type: 'webrtc_signal',
            signal: data.signal,
            sender: peerId
          }, ws); // Skip sender
          break;
        }

        case 'wipe_room': {
          // SECURITY FIX: Only allow wiping if the sender is currently joined in this room!
          if (!currentRoom || !rooms.has(currentRoom)) return;
          const targetRoom = currentRoom;
          const peerSet = rooms.get(targetRoom);
          if (peerSet) {
            for (const client of peerSet) {
              try {
                if (client.readyState === 1) { // WebSocket.OPEN
                  client.send(JSON.stringify({ type: 'room_wiped', roomId: targetRoom }));
                  client.close(1000, 'Room destroyed');
                }
              } catch (e) {}
            }
            rooms.delete(targetRoom);
          }
          cleanup();
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

function getRoomPeers(roomId) {
  const set = rooms.get(roomId);
  if (!set) return [];
  const peers = [];
  for (const client of set) {
    if (client.peerId) peers.push(client.peerId);
  }
  return peers;
}

function broadcastToRoom(roomId, messageObj, excludeWs = null) {
  const room = rooms.get(roomId);
  if (!room) return;
  const serialized = JSON.stringify(messageObj);
  for (const client of room) {
    if (client !== excludeWs && client.readyState === client.OPEN) {
      client.send(serialized);
    }
  }
}

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
  console.log('🛡️  STEALTH ZERO-KNOWLEDGE E2EE CHAT SERVER ONLINE');
  console.log('====================================================');
  console.log(`Local Access:   http://localhost:${PORT}`);
  ips.forEach(ip => {
    console.log(`Wi-Fi / LAN IP: http://${ip.address}:${PORT}`);
  });
  console.log('----------------------------------------------------');
  console.log('• End-to-End Encrypted (AES-256-GCM)');
  console.log('• In-Memory Only: Zero logs, zero database on disk');
  console.log('• Connect from any phone/PC on the same Wi-Fi or Hotspot');
  console.log('====================================================');
});
