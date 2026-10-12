import https from 'node:https';
import { readFileSync } from 'node:fs';
import { networkInterfaces } from 'node:os';
import { createHash, randomInt, timingSafeEqual } from 'node:crypto';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const clamp = (value, low, high) => Math.min(high, Math.max(low, value));
const ACTIONS = new Set(['autopilot', 'camera', 'gear', 'flaps', 'pause']);

export function isPrivateAddress(address = '') {
  const ip = address.replace(/^::ffff:/, '');
  if (ip === '::1' || ip.startsWith('fe80:') || /^(fc|fd)[0-9a-f]{2}:/i.test(ip)) return true;
  const parts = ip.split('.').map(Number);
  return parts.length === 4 && parts.every(n => Number.isInteger(n) && n >= 0 && n < 256)
    && (parts[0] === 127 || parts[0] === 10 || parts[0] === 192 && parts[1] === 168 || parts[0] === 172 && parts[1] >= 16 && parts[1] < 32);
}

export function frame(message, opcode = 1) {
  const payload = Buffer.isBuffer(message) ? message : Buffer.from(JSON.stringify(message));
  const header = Buffer.alloc(payload.length < 126 ? 2 : 4);
  header[0] = 0x80 | opcode;
  if (payload.length < 126) header[1] = payload.length;
  else { header[1] = 126; header.writeUInt16BE(payload.length, 2); }
  return Buffer.concat([header, payload]);
}

export function parseFrame(buffer) {
  if (buffer.length < 2) return null;
  if (!(buffer[0] & 0x80) || buffer[0] & 0x70) throw new Error('Unsupported fragmented or reserved frame');
  if (!(buffer[1] & 0x80)) throw new Error('Client frame requires a mask');
  let length = buffer[1] & 0x7f;
  let offset = 2;
  if (length === 127) throw new Error('Frame too large');
  if (length === 126) {
    if (buffer.length < 4) return null;
    length = buffer.readUInt16BE(2);
    offset = 4;
  }
  const opcode = buffer[0] & 0x0f;
  if (![1, 8, 9, 10].includes(opcode) || length > 8192 || opcode >= 8 && length > 125) throw new Error('Invalid frame');
  if (buffer.length < offset + 4 + length) return null;
  const mask = buffer.subarray(offset, offset + 4);
  const payload = Buffer.from(buffer.subarray(offset + 4, offset + 4 + length));
  for (let i = 0; i < payload.length; i++) payload[i] ^= mask[i % 4];
  return { opcode, payload, consumed: offset + 4 + length };
}

export function validateMessage(role, message) {
  if (!message || typeof message !== 'object') return null;
  if (message.type === 'heartbeat') return { type: 'heartbeat' };
  if (role === 'controller') {
    if (message.type === 'input') {
      if (!['pitch', 'roll', 'yaw', 'throttle', 'seq'].every(k => Number.isFinite(message[k]))) return null;
      return { type: 'input', pitch: clamp(message.pitch, -1, 1), roll: clamp(message.roll, -1, 1), yaw: clamp(message.yaw, -1, 1),
        throttle: clamp(message.throttle, 0, 1), throttleChanged: !!message.throttleChanged, brake: !!message.brake, seq: Math.max(0, Math.trunc(message.seq)) };
    }
    if (message.type === 'action' && ACTIONS.has(message.action)) return { type: 'action', action: message.action };
    if (message.type === 'motion') return { type: 'motion', calibrated: !!message.calibrated, available: !!message.available, active: !!message.active };
  } else if (role === 'host') {
    if (message.type === 'telemetry' && ['ias', 'altitude', 'heading', 'vs', 'throttle'].every(k => Number.isFinite(message[k]))) {
      return { type: 'telemetry', ias: message.ias, altitude: message.altitude, heading: message.heading, vs: message.vs,
        ap: !!message.ap, throttle: clamp(message.throttle, 0, 1), status: String(message.status || '').slice(0, 80),
        pitch: Number.isFinite(message.pitch) ? message.pitch : 0, roll: Number.isFinite(message.roll) ? message.roll : 0,
        gear: Number.isFinite(message.gear) ? message.gear : 0, flaps: Number.isFinite(message.flaps) ? message.flaps : 0,
        stall: !!message.stall, paused: !!message.paused, connected: !!message.connected };
    }
    if (message.type === 'feedback' && ['stall', 'touchdown', 'connected'].includes(message.event)) {
      return { type: 'feedback', event: message.event, pattern: Array.isArray(message.pattern) ? message.pattern.slice(0, 8).map(n => clamp(Number(n) || 0, 0, 500)) : [40] };
    }
  }
  return null;
}

export function createRelayServer({ root = ROOT, pfx, password, pin = String(randomInt(100000, 1000000)), port = 8443 } = {}) {
  const addresses = Object.values(networkInterfaces()).flat().filter(a => a && a.family === 'IPv4' && !a.internal && isPrivateAddress(a.address)).map(a => a.address);
  const allowedHosts = new Set(['localhost', '127.0.0.1', '[::1]', ...addresses]);
  const peers = { host: null, controller: null };
  const attempts = new Map();
  const sockets = new Set();
  const files = new Map([
    ['/', ['index.html', 'text/html; charset=utf-8']],
    ['/index.html', ['index.html', 'text/html; charset=utf-8']],
    ['/controller', ['src/mobile-controller.html', 'text/html; charset=utf-8']],
    ['/controller/', ['src/mobile-controller.html', 'text/html; charset=utf-8']],
    ['/certificate', ['.local/SkyJourney-Local-CA.cer', 'application/x-x509-ca-cert']],
  ]);
  function validRequest(req) {
    try {
      const host = new URL(`https://${req.headers.host}`);
      return isPrivateAddress(req.socket.remoteAddress) && allowedHosts.has(host.hostname) && host.port === String(port);
    } catch { return false; }
  }
  function send(peer, message) {
    if (peer && !peer.socket.destroyed && peer.socket.writable) {
      if (peer.socket.writableLength > 65536) peer.socket.destroy();
      else peer.socket.write(frame(message));
    }
  }
  function status() {
    const message = { type: 'status', hostConnected: !!peers.host, controllerConnected: !!peers.controller };
    send(peers.host, message);
    send(peers.controller, message);
  }
  function disconnect(peer, reason) {
    if (peers[peer.role] !== peer) return;
    peers[peer.role] = null;
    if (peer.role === 'controller') send(peers.host, { type: 'disconnected', reason });
    else send(peers.controller, { type: 'disconnected', reason: 'host disconnected' });
    status();
    peer.socket.destroy();
  }
  const server = https.createServer({ pfx, passphrase: password, minVersion: 'TLSv1.2' }, (req, res) => {
    const security = { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'no-referrer',
      'Content-Security-Policy': "default-src 'self' data: blob:; script-src 'self' 'unsafe-inline' blob:; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; connect-src 'self'; worker-src 'self' blob:; frame-ancestors 'none'",
      'Permissions-Policy': 'accelerometer=(self), gyroscope=(self), magnetometer=(self), screen-wake-lock=(self)' };
    if (!validRequest(req) || req.method !== 'GET') { res.writeHead(403, security).end('Local network requests only.'); return; }
    let url;
    try { url = new URL(req.url, `https://${req.headers.host}`); } catch { res.writeHead(400, security).end(); return; }
    if (url.pathname === '/health') { res.writeHead(200, { ...security, 'Content-Type': 'application/json' }).end(JSON.stringify({ ok: true, hostConnected: !!peers.host, controllerConnected: !!peers.controller })); return; }
    const file = files.get(url.pathname);
    if (!file) { res.writeHead(404, security).end('Not found.'); return; }
    try {
      const body = readFileSync(resolve(root, file[0]));
      const headers = { ...security, 'Content-Type': file[1] };
      if (url.pathname === '/certificate') headers['Content-Disposition'] = 'attachment; filename="SkyJourney-Local-CA.cer"';
      res.writeHead(200, headers).end(body);
    } catch { res.writeHead(503, security).end('Build SkyJourney before starting the local bridge.'); }
  });
  server.maxHeadersCount = 32;
  server.headersTimeout = 5000;
  server.requestTimeout = 10000;
  server.on('connection', socket => { sockets.add(socket); socket.on('close', () => sockets.delete(socket)); });
  server.on('upgrade', (req, socket, head) => {
    const reject = (code, message) => socket.end(`HTTP/1.1 ${code} ${message}\r\nConnection: close\r\nContent-Length: 0\r\n\r\n`);
    if (!validRequest(req)) { reject(403, 'Forbidden'); return; }
    let url;
    try { url = new URL(req.url, `https://${req.headers.host}`); } catch { reject(400, 'Bad Request'); return; }
    if (url.pathname !== '/bridge' || req.headers.upgrade?.toLowerCase() !== 'websocket' || req.headers['sec-websocket-version'] !== '13') { reject(400, 'Bad Request'); return; }
    const origin = req.headers.origin;
    if (origin !== `https://${req.headers.host}`) { reject(403, 'Forbidden'); return; }
    const role = url.searchParams.get('role');
    const supplied = url.searchParams.get('pin') || '';
    const ip = req.socket.remoteAddress;
    const record = attempts.get(ip) || { count: 0, since: Date.now() };
    if (Date.now() - record.since > 60000) { record.count = 0; record.since = Date.now(); }
    record.count++;
    attempts.set(ip, record);
    if (record.count > 30) { reject(429, 'Too Many Requests'); return; }
    if (!['host', 'controller'].includes(role) || !/^\d{6}$/.test(supplied) || supplied.length !== pin.length || !timingSafeEqual(Buffer.from(supplied), Buffer.from(pin))) { reject(403, 'Forbidden'); return; }
    if (peers[role]) { reject(409, 'Already Paired'); return; }
    // A controller can pair from the LAN. The simulator is owned by the PC.
    if (role === 'host' && !['127.0.0.1', '::1', '::ffff:127.0.0.1', ...addresses, ...addresses.map(a => `::ffff:${a}`)].includes(ip)) { reject(403, 'Forbidden'); return; }
    const key = req.headers['sec-websocket-key'];
    if (typeof key !== 'string' || !/^[A-Za-z0-9+/]{22}==$/.test(key)) { reject(400, 'Bad Request'); return; }
    const accept = createHash('sha1').update(key + '258EAFA5-E914-47DA-95CA-C5AB0DC85B11').digest('base64');
    socket.write(`HTTP/1.1 101 Switching Protocols\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Accept: ${accept}\r\n\r\n`);
    const peer = { role, socket, buffer: Buffer.alloc(0), lastSeen: Date.now(), seq: -1, messages: 0, period: Date.now() };
    peers[role] = peer;
    socket.setNoDelay(true);
    send(peer, { type: 'paired', role, hostConnected: !!peers.host, controllerConnected: !!peers.controller,
      controllerURL: addresses[0] ? `https://${addresses[0]}:${port}/controller` : `https://localhost:${port}/controller`,
      ...(role === 'host' ? { pin } : {}) });
    status();
    if (peers.host && peers.controller) send(peers.host, { type: 'feedback', event: 'connected', pattern: [35] });
    const onData = data => {
      if (peer.buffer.length + data.length > 32768) { disconnect(peer, 'invalid packet'); return; }
      peer.buffer = Buffer.concat([peer.buffer, data]);
      try {
        let parsed;
        while ((parsed = parseFrame(peer.buffer))) {
          peer.buffer = peer.buffer.subarray(parsed.consumed);
          if (parsed.opcode === 8) { disconnect(peer, 'controller disconnected'); return; }
          if (parsed.opcode === 9) { socket.write(frame(parsed.payload, 10)); continue; }
          if (parsed.opcode === 10) continue;
          const now = Date.now();
          if (now - peer.period >= 1000) { peer.period = now; peer.messages = 0; }
          if (++peer.messages > 100) { disconnect(peer, 'message rate exceeded'); return; }
          const raw = new TextDecoder('utf-8', { fatal: true }).decode(parsed.payload);
          const message = validateMessage(role, JSON.parse(raw));
          if (!message) continue;
          peer.lastSeen = now;
          if (message.type === 'heartbeat') continue;
          if (message.type === 'input') {
            if (message.seq <= peer.seq) continue;
            peer.seq = message.seq;
          }
          send(role === 'host' ? peers.controller : peers.host, message);
        }
      } catch { disconnect(peer, 'invalid packet'); }
    };
    socket.on('data', onData);
    socket.on('error', () => disconnect(peer, 'controller disconnected'));
    socket.on('close', () => disconnect(peer, 'controller disconnected'));
    if (head.length) onData(head);
  });
  const heartbeat = setInterval(() => {
    for (const peer of Object.values(peers)) if (peer && Date.now() - peer.lastSeen > (peer.role === 'controller' ? 1000 : 30000)) disconnect(peer, peer.role === 'controller' ? 'controller timeout' : 'host timeout');
    for (const [ip, record] of attempts) if (Date.now() - record.since > 120000) attempts.delete(ip);
  }, 200);
  heartbeat.unref();
  server.on('close', () => clearInterval(heartbeat));
  function close() {
    clearInterval(heartbeat);
    for (const socket of sockets) socket.destroy();
    return new Promise(resolveClose => server.close(resolveClose));
  }
  return { server, pin, addresses, port, peers, close };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const config = JSON.parse(readFileSync(resolve(ROOT, '.local/tls.json'), 'utf8').replace(/^\uFEFF/, ''));
    const relay = createRelayServer({ pfx: readFileSync(resolve(ROOT, '.local/server.pfx')), password: config.password, port: 8443 });
    relay.server.listen(8443, '0.0.0.0', () => {
      console.log('\nSkyJourney · Local smartphone bridge\n');
      console.log(`PC:    https://localhost:8443/?hostPin=${relay.pin}`);
      for (const address of relay.addresses) console.log(`Phone: https://${address}:8443/controller`);
      console.log(`Pairing code: ${relay.pin}\nAccept the local certificate, then enable motion on the phone.\nCtrl+C stops the local service.\n`);
      if (process.argv.includes('--open')) {
        import('node:child_process').then(({ spawn }) => {
          const browser = spawn('powershell.exe', ['-NoProfile', '-Command', `Start-Process 'https://localhost:8443/?hostPin=${relay.pin}'`], { windowsHide: true, stdio: 'ignore' });
          browser.unref();
        });
      }
    });
    relay.server.on('error', error => { console.error(`Local bridge could not start: ${error.message}`); process.exitCode = 1; });
    process.on('SIGINT', async () => { await relay.close(); process.exit(0); });
  } catch (error) {
    console.error(`Local HTTPS setup is missing: ${error.message}\nUse Start-SkyJourney.cmd to create the local certificate.`);
    process.exitCode = 1;
  }
}
