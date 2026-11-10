import test from 'node:test';
import assert from 'node:assert/strict';
import { createCockpitDisplays, getCockpitTelemetry, projectHeadingUp } from '../src/cockpit-displays.js';

const flight = {
  position: { x: 0, z: 0 }, heading: -Math.PI / 2, velocity: { x: -99, z: 0 },
  wind: { x: 10, z: 0 }, pitch: .03, roll: .12, ias: 221, altitude: 16120,
  verticalSpeed: -650, groundSpeed: 240, speed: 120, agl: 600,
  n1: 78, egt: 691, fuelFlow: .25, fuel: 6150, temperature: -21, mach: .4,
  throttle: .67, gear: .6, gearTarget: 1, flaps: 2, status: 'approach',
};
const ap = { enabled: true, route: true, verticalMode: 'vs', speed: 235, heading: 15, altitude: 18000, vs: -750 };
const world = { waypoints: [{ x: -18520, z: 0, name: 'QUIET' }], loadFactor: 1.14, brake: true };

test('heading-up navigation projects cardinal positions without mirroring the map', () => {
  const north = projectHeadingUp({ x: 100, z: 50 }, 0, { x: 120, z: -50 });
  assert.deepEqual(north, { right: 20, ahead: 100 });
  const east = projectHeadingUp({ x: 100, z: 50 }, Math.PI / 2, { x: 200, z: 70 });
  assert.ok(Math.abs(east.right - 20) < 1e-9);
  assert.ok(Math.abs(east.ahead - 100) < 1e-9);
});

test('nav and engine information use flight units and the actual active waypoint', () => {
  const data = getCockpitTelemetry(flight, ap, world);
  assert.equal(data.heading, 270);
  assert.equal(data.track, 270);
  assert.equal(data.windFrom, 270);
  assert.ok(Math.abs(data.windKnots - 19.43844) < 1e-4);
  assert.equal(data.next.name, 'QUIET');
  assert.equal(data.next.distanceNm, 10);
  assert.equal(data.next.eteSeconds, 150);
  assert.equal(data.fuelTonnes, 6.15);
  assert.equal(data.fuelFlowTonnesPerHour, .9);
  assert.deepEqual(data.modes, { lateral: 'ROUTE', vertical: 'V/S', speed: 'SPD HOLD', autopilot: 'AP ON' });
  const parked = getCockpitTelemetry({ ...flight, groundSpeed: 0, onGround: true }, ap, world);
  assert.equal(parked.next.eteSeconds, null);
  assert.equal(parked.modes.autopilot, 'AP ARMED');
  assert.equal(getCockpitTelemetry({}, {}, {}).fuelTonnes, null);
  assert.equal(getCockpitTelemetry({}, {}, {}).next, null);
});

function virtualScreen() {
  const text = [];
  const context = new Proxy({}, { get(target, name) {
    if (name === 'fillText') return value => text.push(String(value));
    if (name === 'createLinearGradient') return () => ({ addColorStop() {} });
    return target[name] ?? (() => {});
  } });
  return { canvas: { width: 800, height: 600 }, context, texture: {}, text };
}

test('each screen paints live values and approach mode does not invent unavailable guidance', () => {
  const painter = createCockpitDisplays();
  const screens = Object.fromEntries(['pfd', 'nd', 'engines', 'systems', 'ap'].map(key => [key, virtualScreen()]));
  painter.paint(screens, flight, ap, { ...world, rangeNm: 10, systemPage: 'approach' });
  assert.ok(screens.pfd.text.includes('221') && screens.pfd.text.includes('16120'));
  assert.ok(screens.nd.text.includes('QUIET') && screens.nd.text.includes('02:30'));
  assert.ok(screens.engines.text.includes('78.0') && screens.engines.text.includes('691'));
  assert.ok(screens.systems.text.includes('GUIDANCE UNAVAILABLE'));
  assert.ok(screens.ap.text.includes('235') && screens.ap.text.includes('18000'));
  assert.ok(Object.values(screens).every(screen => screen.texture.needsUpdate));

  screens.systems.text.length = 0;
  painter.paint(screens, flight, ap, { ...world, systemPage: 'approach', approach: {
    distanceNm: 2.1, lateralMeters: -18, glideFeet: 41, speedDelta: 7, headingError: -3, passedRunway: false,
  } });
  assert.ok(screens.systems.text.includes('18 m L') && screens.systems.text.includes('41 ft HIGH'));
  assert.ok(!screens.systems.text.includes('GUIDANCE UNAVAILABLE'));
});
