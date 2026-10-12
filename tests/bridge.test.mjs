import test from 'node:test';
import assert from 'node:assert/strict';
import { frame, parseFrame, validateMessage, isPrivateAddress, createRelayServer } from '../tools/local-server.mjs';
import https from 'node:https';
import { readFileSync, existsSync } from 'node:fs';
import { randomBytes, X509Certificate } from 'node:crypto';
import { setTimeout as delay } from 'node:timers/promises';

test('WebSocket frames round trip masked client text and handle partial reads', () => {
  const payload = Buffer.from(JSON.stringify({ type: 'heartbeat' }));
  const header = Buffer.from([0x81, 0x80 | payload.length, 1, 2, 3, 4]);
  const encoded = Buffer.from(payload.map((b, i) => b ^ header[2 + i % 4]));
  const packet = Buffer.concat([header, encoded]);
  assert.equal(parseFrame(packet.subarray(0, 7)), null);
  assert.deepEqual(parseFrame(packet).payload, payload);
  assert.equal(parseFrame(packet).consumed, packet.length);
  assert.throws(() => parseFrame(frame({ type: 'heartbeat' })), /mask/);
});

test('bridge only accepts known finite controls and clamps their range', () => {
  const input = validateMessage('controller', { type: 'input', pitch: 5, roll: -2, yaw: 0, throttle: 0.8, throttleChanged:true, brake: true, seq: 4 });
  assert.equal(input.pitch, 1);
  assert.equal(input.roll, -1);
  assert.equal(input.throttleChanged,true);
  assert.equal(validateMessage('controller',{type:'input',pitch:0,roll:0,yaw:0,throttle:.5,seq:5}).throttleChanged,false);
  assert.equal(validateMessage('controller', { type: 'input', pitch: '5', roll: 0, yaw: 0, throttle: 0.5, seq: 1 }), null);
  assert.equal(validateMessage('controller', { type: 'action', action: 'delete' }), null);
  assert.equal(validateMessage('controller', { type: 'telemetry' }), null);
  assert.equal(validateMessage('host', { type: 'input', pitch: 1 }), null);
});

test('local relay accepts private LAN and loopback addresses', () => {
  for (const ip of ['127.0.0.1', '::1', '::ffff:192.168.1.10', '10.3.2.1', '172.16.4.1']) assert.equal(isPrivateAddress(ip), true);
  for (const ip of ['8.8.8.8', '172.32.0.1', '1.2.3.4']) assert.equal(isPrivateAddress(ip), false);
});

test('HTTPS bridge authenticates, relays controls and releases on heartbeat loss', { skip: !existsSync('.local/server.pfx') }, async t => {
  const config = JSON.parse(readFileSync('.local/tls.json', 'utf8').replace(/^\uFEFF/, ''));
  const port = 18443;
  const pin = '123456';
  const relay = createRelayServer({ pfx: readFileSync('.local/server.pfx'), password: config.password, port, pin });
  await new Promise(resolve => relay.server.listen(port, '127.0.0.1', resolve));
  t.after(() => relay.close());
  const certificate = await new Promise((resolve, reject) => {
    const request = https.get({ hostname: '127.0.0.1', port, path: '/health', ca: new X509Certificate(readFileSync('.local/SkyJourney-Local-CA.cer')).toString() }, response => {
      resolve(response.socket.getPeerCertificate());
      response.resume();
    });
    request.on('error', reject);
  });
  assert.equal(certificate.subject.CN, 'SkyJourney Local Flight');
  assert.equal(certificate.issuer.CN, 'SkyJourney Local CA');
  const masked = message => {
    const payload = Buffer.from(JSON.stringify(message));
    const mask = randomBytes(4);
    const header = payload.length < 126 ? Buffer.from([0x81, 0x80 | payload.length]) : Buffer.from([0x81, 0xfe, payload.length >>> 8, payload.length & 255]);
    return Buffer.concat([header, mask, Buffer.from(payload.map((b, i) => b ^ mask[i % 4]))]);
  };
  const connect = (role, code = pin, origin = `https://127.0.0.1:${port}`) => new Promise((resolve, reject) => {
    const request = https.request({ hostname: '127.0.0.1', port, rejectUnauthorized: false, path: `/bridge?role=${role}&pin=${encodeURIComponent(code)}`,
      headers: { Upgrade: 'websocket', Connection: 'Upgrade', 'Sec-WebSocket-Version': '13', 'Sec-WebSocket-Key': randomBytes(16).toString('base64'), Origin: origin } });
    request.on('error', reject);
    request.on('response', response => { response.resume(); resolve({ status: response.statusCode }); });
    request.on('upgrade', (response, socket, head) => {
      const peer = { status: response.statusCode, socket, messages: [], buffer: Buffer.alloc(0), send: message => socket.write(masked(message)) };
      const data = chunk => {
        peer.buffer = Buffer.concat([peer.buffer, chunk]);
        while (peer.buffer.length >= 2) {
          let length = peer.buffer[1] & 127, offset = 2;
          if (length === 126) { if (peer.buffer.length < 4) return; length = peer.buffer.readUInt16BE(2); offset = 4; }
          if (peer.buffer.length < length + offset) return;
          peer.messages.push(JSON.parse(peer.buffer.subarray(offset, offset + length).toString()));
          peer.buffer = peer.buffer.subarray(offset + length);
        }
      };
      socket.on('data', data);
      socket.on('error', () => {});
      if (head.length) data(head);
      resolve(peer);
    });
    request.end();
  });
  const until = async predicate => { for (let i = 0; i < 100; i++) { if (predicate()) return; await delay(20); } assert.fail('relay condition timed out'); };
  assert.equal((await connect('controller', '000000')).status, 403);
  assert.equal((await connect('controller', '你好世界你好')).status, 403);
  assert.equal((await connect('controller', pin, 'https://other.invalid')).status, 403);
  const host = await connect('host');
  const phone = await connect('controller');
  assert.equal(host.status, 101);
  assert.equal(phone.status, 101);
  assert.equal((await connect('controller')).status, 409);
  const hostHeartbeat = setInterval(() => host.send({ type: 'heartbeat' }), 100);
  const phoneHeartbeat = setInterval(() => phone.send({ type: 'heartbeat' }), 100);
  t.after(() => { clearInterval(hostHeartbeat); clearInterval(phoneHeartbeat); });
  phone.send({ type: 'input', pitch: .4, roll: -.2, yaw: 0, throttle: .75, brake: false, seq: 1 });
  await until(() => host.messages.some(m => m.type === 'input'));
  assert.equal(host.messages.find(m => m.type === 'input').throttle, .75);
  assert.equal(host.messages.find(m => m.type === 'paired').pin, pin);
  assert.ok(host.messages.find(m => m.type === 'paired').controllerURL.endsWith('/controller'));
  host.send({ type: 'telemetry', ias: 270, altitude: 32000, heading: 178, vs: 0, throttle: .65, ap: true, status: 'cruise' });
  await until(() => phone.messages.some(m => m.type === 'telemetry'));
  assert.equal(phone.messages.find(m => m.type === 'telemetry').ias, 270);
  clearInterval(phoneHeartbeat);
  await until(() => host.messages.some(m => m.type === 'disconnected'));
  assert.equal(host.messages.find(m => m.type === 'disconnected').reason, 'controller timeout');
  assert.equal(relay.peers.controller, null);
});
