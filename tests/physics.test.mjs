import test from 'node:test';
import assert from 'node:assert/strict';
import { createSimulation } from '../src/simulation.js';

const airport = { x: 0, z: 0, y: 120, heading: 178, length: 2800, width: 60 };
const create = () => createSimulation({ terrainHeight: () => 120, airport, seed: 42 });
const advance = (sim, seconds, control) => {
  for (let i = 0; i < seconds * 60; i++) {
    control?.(sim);
    sim.update(1 / 60);
  }
};
const degrees = rad => ((rad * 180 / Math.PI) % 360 + 360) % 360;
const finite = sim => {
  for (const key of ['heading', 'pitch', 'roll', 'speed', 'ias', 'altitude', 'verticalSpeed', 'fuel'])
    assert.ok(Number.isFinite(sim.state[key]), `${key} must remain finite`);
  for (const vector of [sim.state.position, sim.state.velocity])
    for (const value of Object.values(vector)) assert.ok(Number.isFinite(value));
};

test('autopilot holds a stable ISA cruise for two minutes', () => {
  const sim = create();
  const start = { ...sim.state.position };
  advance(sim, 120);
  assert.ok(Math.abs(sim.state.altitude - 32000) < 150, `altitude ${sim.state.altitude}`);
  assert.ok(Math.abs(sim.state.ias - 280) < 12, `IAS ${sim.state.ias}`);
  assert.ok(Math.abs(sim.state.verticalSpeed) < 250, `VS ${sim.state.verticalSpeed}`);
  assert.ok(Math.hypot(sim.state.position.x - start.x, sim.state.position.z - start.z) > 25000);
  assert.ok(sim.state.fuel < 8000);
  assert.ok(sim.state.temperature < -40);
  finite(sim);
});

test('autopilot reaches a new heading and altitude through bank and climb', () => {
  const sim = create();
  sim.autopilot.heading = 208;
  sim.autopilot.altitude = 34000;
  advance(sim, 10);
  assert.ok(sim.state.roll > 0.01, 'right turn requires a right bank');
  assert.ok(degrees(sim.state.heading) < 208, 'heading must not teleport to the command');
  advance(sim, 230);
  assert.ok(Math.abs(degrees(sim.state.heading) - 208) < 5, `heading ${degrees(sim.state.heading)}`);
  assert.ok(Math.abs(sim.state.altitude - 34000) < 200, `altitude ${sim.state.altitude}`);
  finite(sim);
});

test('manual aileron produces bank and a coordinated heading change', () => {
  const sim = create();
  sim.autopilot.enabled = false;
  sim.controls.roll = 0.5;
  const heading = sim.state.heading;
  advance(sim, 12);
  assert.ok(sim.state.roll > 0.15);
  assert.ok(sim.state.heading > heading + 0.03);
  finite(sim);
});

test('runway acceleration and rotation produce a real takeoff', () => {
  const sim = create();
  sim.reset('runway');
  sim.state.throttle = 1;
  sim.state.flaps = 1;
  advance(sim, 100, s => { s.controls.pitch = s.state.speed > 68 && s.state.position.y < 350 ? 0.65 : 0; });
  assert.equal(sim.state.onGround, false);
  assert.ok(sim.state.position.y > 180, `height ${sim.state.position.y}`);
  assert.ok(sim.state.speed > 65);
  assert.ok(sim.state.status !== 'crashed');
  finite(sim);
});

test('flaps and landing gear increase aerodynamic drag', () => {
  const clean = create();
  const configured = create();
  clean.autopilot.enabled = configured.autopilot.enabled = false;
  configured.state.gear = 1;
  configured.state.flaps = 2;
  advance(clean, 8);
  advance(configured, 8);
  assert.ok(configured.diagnostics.drag > clean.diagnostics.drag * 1.2);
  assert.ok(configured.state.speed < clean.state.speed - 3);
});

test('braking dissipates ground speed and does not reverse the aircraft', () => {
  const sim = create();
  sim.reset('runway');
  const h = sim.state.heading;
  sim.state.velocity = { x: Math.sin(h) * 35, y: 0, z: -Math.cos(h) * 35 };
  sim.state.speed = 35;
  sim.controls.brake = true;
  advance(sim, 20);
  assert.ok(sim.state.groundSpeed < 1, `ground speed ${sim.state.groundSpeed}`);
  assert.equal(sim.state.onGround, true);
  finite(sim);
});

test('vertical speed mode and navigation route issue actual control commands', () => {
  const sim = create();
  sim.autopilot.verticalMode = 'vs';
  sim.autopilot.vs = 1200;
  sim.setRoute([{ x: sim.state.position.x + 25000, z: sim.state.position.z + 25000, name: 'Golden Coast' }]);
  advance(sim, 40);
  assert.ok(sim.state.verticalSpeed > 500, `VS ${sim.state.verticalSpeed}`);
  assert.ok(Math.abs(sim.state.roll) > 0.01);
  assert.equal(sim.route.waypoints[0].name, 'Golden Coast');
  finite(sim);
});

test('saved flights restore and invalid numeric state is rejected', () => {
  const original = create();
  original.autopilot.heading = 235;
  advance(original, 15);
  const saved = original.serialize();
  const restored = create();
  assert.equal(restored.restore(saved), true);
  assert.deepEqual(restored.state.position, original.state.position);
  advance(restored, 2);
  finite(restored);
  const bad = JSON.parse(JSON.stringify(saved));
  bad.state.position.y = 'invalid';
  assert.equal(restored.restore(bad), false);
  finite(restored);
});

test('all three flight modes remain finite under demanding manual input', () => {
  for (const mode of ['zen', 'standard', 'simulation']) {
    const sim = create();
    sim.settings.mode = mode;
    sim.autopilot.enabled = false;
    sim.controls.pitch = 0.8;
    sim.controls.roll = -0.7;
    sim.controls.yaw = 0.3;
    advance(sim, 20);
    finite(sim);
  }
});

test('Zen protection recovers airspeed after an aerodynamic stall', () => {
  const sim = create();
  sim.autopilot.enabled = false;
  sim.state.velocity.x *= 0.35;
  sim.state.velocity.z *= 0.35;
  sim.state.speed *= 0.35;
  sim.state.throttle = 0.3;
  advance(sim, 2);
  assert.equal(sim.state.stall, true);
  advance(sim, 100);
  assert.equal(sim.state.stall, false);
  assert.ok(sim.state.ias > sim.diagnostics.stallSpeed);
  assert.ok(sim.state.position.y > 1000);
  finite(sim);
});

test('a gentle configured descent touches down on the runway and brakes', () => {
  const sim = create();
  sim.reset('approach');
  const h = sim.state.heading;
  sim.state.position = { x: -Math.sin(h) * 850, y: airport.y + 23.4, z: Math.cos(h) * 850 };
  sim.state.velocity = { x: Math.sin(h) * 68, y: -2, z: -Math.cos(h) * 68 };
  sim.state.speed = 68;
  sim.state.flaps = 3;
  sim.autopilot.enabled = true;
  sim.autopilot.speed = 130;
  sim.autopilot.verticalMode = 'vs';
  sim.autopilot.vs = -400;
  let touchedDown = false;
  advance(sim, 45, s => {
    if (s.state.onGround) {
      touchedDown = true;
      s.state.throttle = 0;
      s.controls.brake = true;
    }
  });
  assert.equal(touchedDown, true);
  assert.equal(sim.state.onGround, true);
  assert.ok(sim.state.touchdownRate < 1000, `touchdown rate ${sim.state.touchdownRate}`);
  assert.ok(sim.state.groundSpeed < 5);
  finite(sim);
});

test('restore rejects an invalid autopilot heading before changing the flight', () => {
  const sim = create();
  const position = { ...sim.state.position };
  const saved = sim.serialize();
  saved.autopilot.heading = 'Infinity';
  assert.equal(sim.restore(saved), false);
  assert.deepEqual(sim.state.position, position);
});
