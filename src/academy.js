const RAD = Math.PI / 180;
const FEET = 3.280839895;
const GEAR_HEIGHT = 3.4;
const AIM_METERS = 300;
const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
const wrapDegrees = value => ((value + 180) % 360 + 360) % 360 - 180;

function challenge(id, title, description, weather, time, targetSpeed, approach) {
  const glideAngle = 3;
  return Object.freeze({ id, title, description, weather, time, targetSpeed, glideAngle,
    approach: Object.freeze({ ...approach, targetSpeed, glideAngle, aimAfterThreshold: AIM_METERS, flaps: 3 }) });
}

// Solana's hills cross the long glide path. These starts are already inside
// the cleared final corridor, with the wheels down and the landing flaps set.
export const LANDING_CHALLENGES = Object.freeze([
  challenge('first-landing', 'First Landing', 'Practice your flare on a clear short final to Solana.', 'Clear Skies', 15, 145,
    { distanceBeforeThreshold: 1050 }),
  challenge('night-landing', 'Night Landing', 'Follow the runway lights and make a smooth touchdown after dark.', 'Starry Night', 22, 145,
    { distanceBeforeThreshold: 950, lateralMeters: 6, glideOffsetFeet: 9 }),
  challenge('storm-landing', 'Storm Landing', 'Correct for the crosswind and keep the aircraft aligned in rain.', 'Thunderstorm', 16, 152,
    { distanceBeforeThreshold: 900, lateralMeters: -12, headingOffset: 3, glideOffsetFeet: 14 }),
]);

function coordinates(position, airport) {
  const heading = airport.heading * RAD;
  const dx = position.x - airport.x;
  const dz = position.z - airport.z;
  return { along: dx * Math.sin(heading) - dz * Math.cos(heading), lateralMeters: dx * Math.cos(heading) + dz * Math.sin(heading) };
}

export function getApproachGuidance(state, airport, challenge = LANDING_CHALLENGES[0]) {
  const { along, lateralMeters } = coordinates(state.position, airport);
  const aimAlong = -airport.length / 2 + (challenge.approach?.aimAfterThreshold ?? AIM_METERS);
  const metersToAim = Math.max(0, aimAlong - along);
  const desiredHeight = airport.y + GEAR_HEIGHT + metersToAim * Math.tan(challenge.glideAngle * RAD);
  return {
    distanceNm: metersToAim / 1852,
    lateralMeters,
    glideFeet: (state.position.y - desiredHeight) * FEET,
    speedDelta: state.ias - challenge.targetSpeed,
    headingError: wrapDegrees(state.heading / RAD - airport.heading),
    passedRunway: along > airport.length / 2,
  };
}

export function scoreLanding(touchdown, airport, challenge = LANDING_CHALLENGES[0]) {
  const valid = touchdown && ['x', 'z', 'heading', 'roll', 'ias', 'rate', 'gear'].every(key => Number.isFinite(touchdown[key]));
  if (!valid) return { score: 0, passed: false, medal: null, reason: 'runway', rate: 0, lateralMeters: 0, headingError: 0, touchdownMeters: 0 };

  const { along, lateralMeters } = coordinates(touchdown, airport);
  const touchdownMeters = along + airport.length / 2;
  const headingError = wrapDegrees(touchdown.heading / RAD - airport.heading);
  const rate = Math.max(0, touchdown.rate);
  const bank = Math.abs(touchdown.roll / RAD);
  let reason = null;
  const edgeTolerance = 1e-7; // Roundoff at the rotated, rendered runway edge.
  if (Math.abs(along) > airport.length / 2 + edgeTolerance || Math.abs(lateralMeters) > airport.width / 2 + edgeTolerance) reason = 'runway';
  else if (touchdown.gear < 0.85) reason = 'gear';
  else if (Math.abs(headingError) > 15 || bank > 12) reason = 'alignment';
  else if (rate > 850 || touchdown.safe === false) reason = 'hard';

  if (reason) return { score: 0, passed: false, medal: null, reason, rate, lateralMeters, headingError, touchdownMeters };
  const aim = challenge.approach?.aimAfterThreshold ?? AIM_METERS;
  const penalty = Math.max(0, Math.abs(rate - 120) - 30) / 700 * 38
    + Math.min(30, Math.abs(touchdownMeters - aim) / 900 * 30)
    + Math.abs(lateralMeters) / (airport.width / 2) * 20
    + Math.abs(headingError) / 15 * 13 + bank / 12 * 6
    + Math.min(9, Math.abs(touchdown.ias - challenge.targetSpeed) / 30 * 9);
  const score = clamp(Math.round(100 - penalty), 0, 100);
  const medal = score >= 85 ? 'gold' : score >= 65 ? 'silver' : 'bronze';
  return { score, passed: true, medal, reason: null, rate, lateralMeters, headingError, touchdownMeters };
}
