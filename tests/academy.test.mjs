import test from 'node:test';
import assert from 'node:assert/strict';
import { LANDING_CHALLENGES, getApproachGuidance, scoreLanding } from '../src/academy.js';
import { createSimulation } from '../src/simulation.js';
import { WEATHER } from '../src/world.js';
import { createWorldData } from '../src/world-data.js';

const airport = { x: 0, y: 120, z: 0, heading: 178, length: 2800, width: 60 };
const first = LANDING_CHALLENGES[0];
const h = airport.heading * Math.PI / 180;
const near = (value, expected, tolerance = 0.01) => assert.ok(Math.abs(value - expected) <= tolerance, `${value} should be near ${expected}`);
const position = (along, across, y) => ({ x: Math.sin(h) * along + Math.cos(h) * across, y, z: -Math.cos(h) * along + Math.sin(h) * across });
const touchdown = (overThreshold = 300, lateral = 0, overrides = {}) => ({ ...position(overThreshold - airport.length / 2, lateral, airport.y + 3.4), heading: h, roll: 0, ias: first.targetSpeed, rate: 180, gear: 1, flaps: 3, safe: true, ...overrides });

test('three distinct landing challenges have a manual approach setup', () => {
  assert.deepEqual(LANDING_CHALLENGES.map(p => p.id), ['first-landing', 'night-landing', 'storm-landing']);
  const world = createWorldData();
  const sim = createSimulation({ airport: world.airport, terrainHeight: world.terrainHeight });
  for (const challenge of LANDING_CHALLENGES) {
    sim.reset('approach', challenge.approach);
    const guide = getApproachGuidance(sim.state, world.airport, challenge);
    assert.equal(sim.autopilot.enabled, false);
    assert.equal(sim.state.gear, 1);
    assert.ok(guide.distanceNm > 0.5);
    near(guide.glideFeet, challenge.approach.glideOffsetFeet ?? 0, 1);
    near(guide.speedDelta, 0, 1);
    near(guide.lateralMeters, challenge.approach.lateralMeters ?? 0);
    assert.ok(sim.state.agl > 30, `${challenge.id} should clear Solana terrain`);
  }
});

test('guidance signs are positive for right of centerline, high and fast', () => {
  const guide = getApproachGuidance({ position: position(-2000, 24, 250), heading: h + 0.1, ias: first.targetSpeed + 9 }, airport, first);
  near(guide.lateralMeters, 24);
  near(guide.speedDelta, 9);
  assert.ok(guide.glideFeet > 0 && guide.headingError > 0);
  assert.equal(guide.passedRunway, false);
  assert.equal(getApproachGuidance({ position: position(1450, 0, 125), heading: h, ias: 0 }, airport, first).passedRunway, true);
});

test('landing score rewards aim and centerline and rejects the rendered runway edge', () => {
  const best = scoreLanding(touchdown(), airport, first);
  assert.equal(best.passed, true);
  assert.equal(best.medal, 'gold');
  near(best.touchdownMeters, 300);
  const offTarget = scoreLanding(touchdown(950, 18, { rate: 450 }), airport, first);
  assert.ok(offTarget.score < best.score);
  for (const [snapshot, reason] of [
    [touchdown(300, 30.01), 'runway'], [touchdown(-0.1), 'runway'], [touchdown(300, 0, { gear: 0.6 }), 'gear'],
    [touchdown(300, 0, { rate: 1100 }), 'hard'], [touchdown(300, 0, { heading: h + 0.5 }), 'alignment'],
  ]) {
    const result = scoreLanding(snapshot, airport, first);
    assert.equal(result.passed, false);
    assert.equal(result.reason, reason);
    assert.equal(result.medal, null);
  }
});

test('simulation records actual pre-correction touchdown once and clears it on reset and restore', () => {
  const sim = createSimulation({ airport, terrainHeight: () => airport.y });
  sim.reset('approach', first.approach);
  const save = sim.serialize();
  sim.state.position = position(-950, 1.5, airport.y + 5.4);
  sim.state.velocity = { x: Math.sin(h) * 70, y: -2, z: -Math.cos(h) * 70 };
  sim.state.speed = 70;
  sim.state.pitch = 0.08;
  for (let i = 0; i < 240 && !sim.touchdown; i++) sim.update(1 / 60);
  assert.ok(sim.touchdown);
  assert.ok(sim.touchdown.rate > 100);
  assert.equal(sim.state.verticalSpeed, 0);
  assert.equal(scoreLanding(sim.touchdown, airport, first).passed, true);
  const snapshot = sim.touchdown;
  sim.update(1 / 60);
  assert.equal(sim.touchdown, snapshot);
  assert.equal(sim.restore(save), true);
  assert.equal(sim.touchdown, null);
  sim.reset('cruise');
  assert.equal(sim.touchdown, null);
});

test('all three short finals are flyable at their in-game difficulty on Solana terrain', () => {
  const world = createWorldData();
  const field = world.airport;
  const heading = field.heading * Math.PI / 180;
  for (const challenge of LANDING_CHALLENGES) {
    const sim = createSimulation({ airport: field, terrainHeight: world.terrainHeight });
    const weather = WEATHER[challenge.weather];
    sim.settings.mode = challenge.id === 'first-landing' ? 'zen' : 'standard';
    sim.settings.surfaceTemperature = weather.temp;
    sim.settings.wind = weather.wind / 3;
    sim.settings.turbulence = weather.wind / 40;
    sim.reset('approach', challenge.approach);
    const initialThrottle = sim.state.throttle;
    let lastPitch = sim.state.pitch, lastRoll = sim.state.roll;

    // Use the same manual controls available to a player. Follow the glide
    // path, take out crosswind drift and ease off the descent near the runway.
    for (let frame = 0; frame < 1800 && !sim.touchdown; frame++) {
      const state = sim.state;
      const guidance = getApproachGuidance(state, field, challenge);
      const height = state.position.y - field.y - 3.4;
      const airPath = Math.atan2(state.velocity.y, Math.hypot(state.velocity.x - state.wind.x, state.velocity.z - state.wind.z));
      const descent = state.groundSpeed / 1.94384 * Math.tan(challenge.glideAngle * Math.PI / 180) + guidance.glideFeet * 0.025;
      const desiredVy = height < 17 ? -Math.max(0.72, Math.min(4, height * 0.17)) : -Math.min(4.6, Math.max(2.9, descent));
      const desiredPath = Math.atan2(desiredVy, state.speed) + (desiredVy - state.velocity.y) * 0.004;
      const crosswind = state.wind.x * Math.cos(heading) + state.wind.z * Math.sin(heading);
      const crabAngle = Math.atan2(-guidance.lateralMeters * 0.14 - crosswind, state.speed);
      const rollSignal = (crabAngle - guidance.headingError * Math.PI / 180) * 2.6;
      if (sim.settings.mode === 'zen') {
        sim.controls.pitch = (desiredPath - airPath * 0.25) / 0.26;
        sim.controls.roll = Math.max(-0.3, Math.min(0.3, rollSignal));
      } else {
        // Standard mode steers attitude through surface deflection instead of requesting an attitude directly.
        const liftCoefficient = (57000 + state.fuel) * 9.80665 /
          (0.5 * sim.diagnostics.rho * state.speed ** 2 * 122.6 * Math.max(0.5, Math.cos(state.roll)));
        const trim = Math.max(-0.045, Math.min(0.19, (liftCoefficient - 0.2 - state.flaps * 0.3) / 5.2));
        const pitchTarget = trim + desiredPath;
        const pitchRate = (state.pitch - lastPitch) * 60, rollRate = (state.roll - lastRoll) * 60;
        sim.controls.pitch = (pitchTarget - state.pitch) * 4 - pitchRate * 2.3 +
          Math.max(-0.3, Math.min(0.3, (pitchTarget - airPath - trim) * 1.2));
        sim.controls.roll = Math.max(-0.45, Math.min(0.45, (rollSignal * 0.55 - state.roll) * 3.5 - rollRate * 2));
      }
      lastPitch = state.pitch;
      lastRoll = state.roll;
      state.throttle = Math.max(0, Math.min(0.65, initialThrottle - guidance.speedDelta * 0.013 - (height < 5 ? 0.07 : 0)));
      sim.update(1 / 60);
    }

    assert.equal(sim.autopilot.enabled, false, challenge.id);
    assert.equal(sim.state.onGround, true, challenge.id);
    const result = scoreLanding(sim.touchdown, field, challenge);
    assert.equal(result.passed, true, `${challenge.id}: ${JSON.stringify(result)}`);
    assert.ok(result.rate < 400 && result.touchdownMeters < 700, challenge.id);
  }
});
