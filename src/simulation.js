// SkyJourney flight dynamics. SI units inside the integrator; aviation units
// are derived for the instruments. Heading zero looks north (world -Z).
const G = 9.80665;
const FT = 3.280839895;
const KT = 1.943844492;
const DEG = Math.PI / 180;
const TAU = Math.PI * 2;
const WING_AREA = 122.6;
const BASE_MASS = 57000;
const clamp = (n, lo, hi) => Math.min(hi, Math.max(lo, n));
const wrap = n => ((n % TAU) + TAU) % TAU;
const angleError = (target, current) => Math.atan2(Math.sin(target - current), Math.cos(target - current));
const smooth = (from, to, rate, dt) => from + (to - from) * (1 - Math.exp(-rate * dt));
const copy = value => JSON.parse(JSON.stringify(value));

export function atmosphere(altitude, surfaceTemperature = 15) {
  const h = clamp(altitude, 0, 20000);
  const baseKelvin=273.15+clamp(surfaceTemperature,-30,45);
  const kelvin = h <= 11000 ? baseKelvin - 0.0065 * h : baseKelvin-71.5;
  const pressure = h <= 11000
    ? 101325 * (kelvin / baseKelvin) ** 5.25588
    : 101325*((baseKelvin-71.5)/baseKelvin)**5.25588 * Math.exp(-(h - 11000) * G / (287.05 * kelvin));
  return { density: pressure / (287.05 * kelvin), temperature: kelvin - 273.15 };
}

export function createSimulation({ terrainHeight = () => 0, airport = {}, seed = 17 } = {}) {
  const field = { x: 0, z: 0, y: 120, heading: 178, length: 2800, width: 60, ...airport };
  const state = {};
  const controls = { pitch: 0, roll: 0, yaw: 0, brake: false };
  const autopilot = { enabled: true, heading: 178, altitude: 32000, speed: 280, vs: 0, verticalMode: 'altitude', route: false };
  const settings = { mode: 'zen', wind: 1, turbulence: 0.15 };
  const actuators = { elevator: 0, aileron: 0, rudder: 0 };
  const diagnostics = { rho: 1.225, lift: 0, drag: 0, thrust: 0, alpha: 0, stallSpeed: 0, loadFactor: 1, onRunway: false };
  const route = { waypoints: [], index: 0, completed: 0, distance: 0 };
  let pitchRate = 0;
  let rollRate = 0;
  let yawRate = 0;
  let speedIntegral = 0;
  let engine = 0.6;
  let lastAutopilot = true;
  let touchdownTimer = 0;
  let landingStatus = null;
  let phase = ((seed >>> 0) % 1000) * 0.013;

  function runwayAt(x, z) {
    const h = field.heading * DEG;
    const dx = x - field.x;
    const dz = z - field.z;
    const along = dx * Math.sin(h) - dz * Math.cos(h);
    const across = dx * Math.cos(h) + dz * Math.sin(h);
    return Math.abs(along) <= field.length / 2 + 40 && Math.abs(across) <= field.width / 2 + 6;
  }

  function surfaceAt(x, z) {
    const ground = Number(terrainHeight(x, z));
    return runwayAt(x, z) ? field.y : Number.isFinite(ground) ? Math.max(0, ground) : 0;
  }

  function refreshInstruments() {
    const airX = state.velocity.x - state.wind.x;
    const airZ = state.velocity.z - state.wind.z;
    const airSpeed = Math.hypot(airX, state.velocity.y, airZ);
    const air = atmosphere(state.position.y, settings.surfaceTemperature);
    state.speed = airSpeed;
    state.ias = airSpeed * KT * Math.sqrt(air.density / 1.225);
    state.groundSpeed = Math.hypot(state.velocity.x, state.velocity.z) * KT;
    state.altitude = state.position.y * FT;
    state.verticalSpeed = state.velocity.y * FT * 60;
    state.temperature = air.temperature;
    state.n1 = 20 + engine * 78;
    state.fuelFlow=(.06+engine*.73)/2;
    state.egt=350+engine*420;
    state.mach = airSpeed / Math.sqrt(1.4 * 287.05 * (air.temperature + 273.15));
    state.agl = Math.max(0, state.position.y - surfaceAt(state.position.x, state.position.z));
    diagnostics.rho = air.density;
  }

  function trimAlpha(speed, density, flaps = state.flaps, bank = state.roll) {
    const cl = ((BASE_MASS + state.fuel) * G) / Math.max(1, 0.5 * density * speed * speed * WING_AREA * Math.max(0.5, Math.cos(bank)));
    return clamp((cl - 0.2 - flaps * 0.3) / 5.2, -0.045, 0.19);
  }

  function reset(kind = 'cruise') {
    const h = field.heading * DEG;
    const heading = kind === 'cruise' ? 178 * DEG : h;
    const air = atmosphere(9753.6);
    const cruiseSpeed = 280 / (KT * Math.sqrt(air.density / 1.225));
    const wind = { x: 4, z: -2 };
    const base = {
      position: { x: -22000, y: 9753.6, z: -33000 },
      velocity: { x: Math.sin(heading) * cruiseSpeed + wind.x, y: 0, z: -Math.cos(heading) * cruiseSpeed + wind.z },
      heading, pitch: 0, roll: 0, speed: cruiseSpeed, ias: 280, groundSpeed: 475,
      altitude: 32000, verticalSpeed: 0, throttle: 0.62, gear: 0, flaps: 0,
      fuel: 8000, n1: 68, temperature: -48, wind, status: 'cruise', onGround: false,
      flightTime: 0, distance: 0, stall: false, touchdownRate: 0, gearTarget: 0,
    };
    if (kind === 'runway') {
      const fromCenter = -field.length / 2 + 130;
      base.position = { x: field.x + Math.sin(h) * fromCenter, y: field.y + 3.4, z: field.z - Math.cos(h) * fromCenter };
      base.velocity = { x: 0, y: 0, z: 0 };
      base.throttle = 0;
      base.gear = base.gearTarget = 1;
      base.flaps = 1;
      base.onGround = true;
      base.wind = { x: 0, z: 0 };
      base.status = 'ready';
    } else if (kind === 'approach') {
      base.position = { x: field.x - Math.sin(h) * 7000, y: field.y + 370, z: field.z + Math.cos(h) * 7000 };
      base.velocity = { x: Math.sin(h) * 75, y: -3.6, z: -Math.cos(h) * 75 };
      base.throttle = 0.4;
      base.flaps = 2;
      base.gear = base.gearTarget = 1;
      base.status = 'approach';
      base.wind = { x: 0, z: 0 };
    }
    Object.assign(state, base);
    refreshInstruments();
    state.pitch = kind === 'runway' ? 0 : trimAlpha(state.speed, diagnostics.rho) + Math.atan2(state.velocity.y, state.speed);
    Object.assign(controls, { pitch: 0, roll: 0, yaw: 0, brake: false });
    Object.assign(autopilot, { enabled: kind === 'cruise', heading: heading / DEG, altitude: state.altitude, speed: state.ias, vs: 0, verticalMode: 'altitude', route: false });
    Object.assign(actuators, { elevator: 0, aileron: 0, rudder: 0 });
    Object.assign(route, { waypoints: [], index: 0, completed: 0, distance: 0 });
    pitchRate = rollRate = yawRate = speedIntegral = touchdownTimer = 0;
    landingStatus = null;
    engine = state.throttle;
    lastAutopilot = autopilot.enabled;
    return state;
  }

  function setRoute(waypoints) {
    route.waypoints = Array.isArray(waypoints) ? waypoints
      .filter(p => Number.isFinite(p.x) && Number.isFinite(p.z))
      .map(p => ({ x: p.x, z: p.z, name: String(p.name || 'Waypoint').slice(0, 80) })) : [];
    route.index = 0;
    route.completed = 0;
    autopilot.route = route.waypoints.length > 0;
    return route;
  }

  function navigate() {
    if (!autopilot.route || !route.waypoints.length) return;
    const point = route.waypoints[route.index];
    const dx = point.x - state.position.x;
    const dz = point.z - state.position.z;
    route.distance = Math.hypot(dx, dz);
    if (route.distance < Math.max(800, state.speed * 4)) {
      route.completed++;
      if (route.index < route.waypoints.length - 1) route.index++;
      else { autopilot.route = false; return; }
    }
    autopilot.heading = wrap(Math.atan2(dx, -dz)) / DEG;
  }

  function step(dt) {
    const mode = ['zen', 'standard', 'simulation'].includes(settings.mode) ? settings.mode : 'zen';
    const mass = BASE_MASS + state.fuel;
    const air = atmosphere(state.position.y, settings.surfaceTemperature);
    const speed = Math.max(1, state.speed);
    const gamma = Math.atan2(state.velocity.y, Math.max(1, Math.hypot(state.velocity.x - state.wind.x, state.velocity.z - state.wind.z)));
    const trim = trimAlpha(speed, air.density);
    state.throttle = clamp(Number(state.throttle) || 0, 0, 1);
    state.flaps = clamp(Math.round(Number(state.flaps) || 0), 0, 3);
    state.gear = clamp(Number(state.gear) || 0, 0, 1);
    const gearTarget=Number.isFinite(state.gearTarget)?clamp(state.gearTarget,0,1):state.gear;
    state.gear+=clamp(gearTarget-state.gear,-dt*.25,dt*.25);
    state.fuel = clamp(Number(state.fuel) || 0, 0, 20000);
    if (autopilot.enabled !== lastAutopilot) {
      speedIntegral = 0;
      lastAutopilot = autopilot.enabled;
    }
    let pitchInput = clamp(Number(controls.pitch) || 0, -1, 1);
    let rollInput = clamp(Number(controls.roll) || 0, -1, 1);
    let yawInput = clamp(Number(controls.yaw) || 0, -1, 1);
    if (autopilot.enabled && !state.onGround) {
      navigate();
      const headingError = angleError((Number(autopilot.heading) || 0) * DEG, state.heading);
      const bank = clamp(headingError * 1.1, -25 * DEG, 25 * DEG);
      const desiredVsFeet = autopilot.verticalMode === 'vs' ? clamp(Number(autopilot.vs) || 0, -3000, 3000)
        : clamp(((Number(autopilot.altitude) || 0) - state.altitude) * 0.95, -2400, 2400);
      const desiredVs = desiredVsFeet / (FT * 60);
      const pitch = trim + Math.atan2(desiredVs, speed) + clamp((desiredVs - state.velocity.y) * 0.0025, -0.035, 0.035);
      pitchInput = clamp((pitch - state.pitch) * 5 - pitchRate * 2.5, -1, 1);
      rollInput = clamp((bank - state.roll) * 4 - rollRate * 2.3, -1, 1);
      yawInput = 0;
      const speedError = clamp((Number(autopilot.speed) || 280) - state.ias, -100, 100);
      speedIntegral = clamp(speedIntegral + speedError * dt, -200, 200);
      const requiredDrag = 0.5 * air.density * speed * speed * WING_AREA * (0.021 + 0.044 * (0.2 + 5.2 * trim + state.flaps * 0.3) ** 2 + state.flaps * 0.013 + state.gear * 0.019);
      const thrustMax = 240000 * (air.density / 1.225) ** 0.72;
      const feedForward = (requiredDrag + mass * G * Math.sin(gamma)) / thrustMax;
      state.throttle = smooth(state.throttle, clamp(feedForward + speedError * 0.012 + speedIntegral * 0.0005, 0.05, 1), 0.55, dt);
    } else if (mode === 'zen') {
      const groundPitch = state.onGround ? pitchInput * 0.32 * clamp((speed - 35) / 35, 0, 1) : trim + pitchInput * 0.26 + gamma * 0.25;
      pitchInput = clamp((groundPitch - state.pitch) * 4 - pitchRate * 2, -1, 1);
      const bank = rollInput * 45 * DEG;
      rollInput = clamp((bank - state.roll) * 3.5 - rollRate * 2, -1, 1);
      if (state.stall && !state.onGround) {
        pitchInput = Math.min(pitchInput, -0.2);
        state.throttle = Math.max(state.throttle, 0.85);
      }
    } else {
      // Static longitudinal stability tends toward the current flight path;
      // controls request angular acceleration and retain the aircraft's inertia.
      pitchInput -= clamp((state.pitch - gamma - trim) * 1.2, -0.3, 0.3);
      if (mode === 'standard' && !Math.abs(controls.roll)) rollInput -= state.roll * 0.35;
    }
    actuators.elevator = smooth(actuators.elevator, pitchInput, 5, dt);
    actuators.aileron = smooth(actuators.aileron, rollInput, 5, dt);
    actuators.rudder = smooth(actuators.rudder, yawInput, 4, dt);
    const authority = state.onGround ? clamp(speed / 70, 0.05, 1) : clamp(speed / 90, 0.2, 1.35);
    pitchRate += (actuators.elevator * 0.36 * authority - pitchRate * 1.4) * dt;
    rollRate += (actuators.aileron * 0.8 * authority - rollRate * 1.8) * dt;
    state.pitch = clamp(state.pitch + pitchRate * dt, (mode === 'zen' ? -22 : -45) * DEG, (mode === 'zen' ? 27 : 55) * DEG);
    state.roll = clamp(state.roll + rollRate * dt, (mode === 'zen' ? -55 : -80) * DEG, (mode === 'zen' ? 55 : 80) * DEG);
    if (state.onGround) state.roll = smooth(state.roll, 0, 5, dt);
    const coordinatedTurn = state.onGround ? 0 : G * Math.tan(state.roll) / Math.max(55, speed);
    const rudderTurn = actuators.rudder * (state.onGround ? 0.17 * clamp(speed / 12, 0, 1) : 0.032);
    yawRate = smooth(yawRate, coordinatedTurn + rudderTurn, 3, dt);
    state.heading = wrap(state.heading + yawRate * dt);

    const sh = Math.sin(state.heading), ch = Math.cos(state.heading);
    const sp = Math.sin(state.pitch), cp = Math.cos(state.pitch);
    const sr = Math.sin(state.roll), cr = Math.cos(state.roll);
    const forward = { x: sh * cp, y: sp, z: -ch * cp };
    const right = { x: ch, y: 0, z: sh };
    const up = { x: -sh * sp * cr + ch * sr, y: cp * cr, z: ch * sp * cr + sh * sr };
    const av = { x: state.velocity.x - state.wind.x, y: state.velocity.y, z: state.velocity.z - state.wind.z };
    const v = Math.max(1, Math.hypot(av.x, av.y, av.z));
    const direction = { x: av.x / v, y: av.y / v, z: av.z / v };
    const alpha = clamp(state.pitch - gamma, -0.7, 0.7);
    let cl = clamp(0.2 + 5.2 * alpha + state.flaps * 0.3, -1.25, 1.65 + state.flaps * 0.2);
    const stallAngle = 0.28 + state.flaps * 0.015;
    if (Math.abs(alpha) > stallAngle) cl *= clamp(1 - (Math.abs(alpha) - stallAngle) * 3.3, 0.3, 1);
    const q = 0.5 * air.density * v * v;
    const cd = 0.021 + 0.044 * cl * cl + state.flaps * 0.013 + state.gear * 0.019 + (Math.abs(alpha) > stallAngle ? 0.08 : 0);
    const lift = q * WING_AREA * cl;
    const drag = q * WING_AREA * cd;
    engine = smooth(engine, state.fuel > 0 ? state.throttle : 0, 0.75, dt);
    const thrust = engine * 240000 * (air.density / 1.225) ** 0.72;
    const upDot = up.x * direction.x + up.y * direction.y + up.z * direction.z;
    const normal = { x: up.x - direction.x * upDot, y: up.y - direction.y * upDot, z: up.z - direction.z * upDot };
    const normalLength = Math.max(0.01, Math.hypot(normal.x, normal.y, normal.z));
    const slip = av.x * right.x + av.z * right.z;
    const sideForce = -slip * mass * (state.onGround ? 2 : 0.12);
    const gustStrength = clamp(Number(settings.turbulence) || 0, 0, 1) * (mode === 'zen' ? 0.1 : 0.3);
    const gust = Math.sin(state.flightTime * 0.83 + phase) * gustStrength;
    const acceleration = {
      x: (forward.x * thrust + normal.x / normalLength * lift - direction.x * drag + right.x * sideForce) / mass,
      y: (forward.y * thrust + normal.y / normalLength * lift - direction.y * drag) / mass - G + gust,
      z: (forward.z * thrust + normal.z / normalLength * lift - direction.z * drag + right.z * sideForce) / mass,
    };
    const previousY = state.position.y;
    const previousOnGround = state.onGround;
    const ground = surfaceAt(state.position.x, state.position.z) + 3.4;
    const onRunway = runwayAt(state.position.x, state.position.z);
    if (state.onGround) {
      if (acceleration.y > 0.25 && speed > 55 && state.pitch > 0.055) {
        state.onGround = false;
        state.status = 'takeoff';
      } else {
        acceleration.y = 0;
        state.velocity.y = 0;
        state.position.y = ground;
        const groundSpeed = Math.hypot(state.velocity.x, state.velocity.z);
        const deceleration = (controls.brake ? 3.9 : 0.055) + (!onRunway ? 0.45 : 0);
        if (groundSpeed > 0.001) {
          const stop = Math.min(groundSpeed / dt, deceleration);
          acceleration.x -= state.velocity.x / groundSpeed * stop;
          acceleration.z -= state.velocity.z / groundSpeed * stop;
        }
        if (groundSpeed < 0.25 && thrust < mass * deceleration) {
          acceleration.x = acceleration.z = 0;
          state.velocity.x = state.velocity.z = 0;
        }
        state.status = groundSpeed > 4 ? (engine > 0.5 ? 'takeoff roll' : 'taxi') : 'ready';
      }
    }
    state.velocity.x += acceleration.x * dt;
    state.velocity.y += acceleration.y * dt;
    state.velocity.z += acceleration.z * dt;
    state.position.x += state.velocity.x * dt;
    state.position.y += state.velocity.y * dt;
    state.position.z += state.velocity.z * dt;
    const nextGround = surfaceAt(state.position.x, state.position.z) + 3.4;
    if (!state.onGround && state.position.y <= nextGround) {
      const sink = Math.max(0, -state.velocity.y);
      const safe = state.gear > 0.8 && Math.abs(state.roll) < 14 * DEG && sink < (mode === 'zen' ? 9 : 5);
      state.touchdownRate = sink * FT * 60;
      state.onGround = true;
      state.position.y = nextGround;
      state.velocity.y = 0;
      state.pitch = clamp(state.pitch, 0, 5 * DEG);
      state.roll = 0;
      pitchRate = rollRate = 0;
      autopilot.enabled = false;
      landingStatus = safe ? 'landed' : mode === 'zen' ? 'recovered' : 'hard landing';
      state.status = landingStatus;
      if (!safe) {
        state.velocity.x *= 0.65;
        state.velocity.z *= 0.65;
        state.throttle = 0;
      }
      touchdownTimer = 4;
    }
    if (touchdownTimer > 0) {
      touchdownTimer -= dt;
      if (state.onGround) state.status = landingStatus || state.status;
    } else if (!state.onGround && !previousOnGround && state.status !== 'takeoff') {
      state.status = state.gear > 0.5 && state.position.y < 1500 ? 'approach' : 'cruise';
    }
    if (!state.onGround && state.position.y > ground + 80 && state.status === 'takeoff') state.status = 'climb';
    state.fuel = Math.max(0, state.fuel - (0.06 + engine * 0.73) * dt);
    state.flightTime += dt;
    state.distance += Math.hypot(state.velocity.x, state.velocity.z) * dt;
    const windScale = state.onGround ? 0 : clamp(Number(settings.wind) || 0, 0, 3);
    const windTargetX = 4 * windScale + Math.sin(state.flightTime * 0.021 + phase) * windScale;
    const windTargetZ = -2 * windScale + Math.sin(state.flightTime * 0.014) * windScale;
    state.wind.x = smooth(state.wind.x, windTargetX, 0.05, dt);
    state.wind.z = smooth(state.wind.z, windTargetZ, 0.05, dt);
    const maxCl = 1.65 + state.flaps * 0.2;
    diagnostics.stallSpeed = Math.sqrt(2 * mass * G / (air.density * WING_AREA * maxCl)) * KT * Math.sqrt(air.density / 1.225);
    state.stall = !state.onGround && (Math.abs(alpha) > stallAngle || state.ias < diagnostics.stallSpeed * 0.93);
    if (state.stall) state.status = 'stall';
    Object.assign(diagnostics, { alpha, lift, drag, thrust, loadFactor: lift / (mass * G), onRunway, verticalAcceleration: acceleration.y });
    refreshInstruments();
  }

  function update(dt) {
    if (!Number.isFinite(dt) || dt <= 0) return;
    // Catch-up is bounded so tab focus changes cannot create a destructive impulse.
    let remaining = Math.min(dt, 0.25);
    while (remaining > 1e-8) {
      const interval = Math.min(remaining, 1 / 60);
      step(interval);
      remaining -= interval;
    }
  }

  function serialize() {
    return copy({ version: 1, state, controls, autopilot, settings, route,
      dynamics: { pitchRate, rollRate, yawRate, speedIntegral, engine, phase } });
  }

  function restore(input) {
    try {
      const saved = typeof input === 'string' ? JSON.parse(input) : input;
      if (!saved || saved.version !== 1 || !saved.state) return false;
      const s = saved.state;
      const numeric = ['heading', 'pitch', 'roll', 'throttle', 'gear', 'flaps', 'fuel', 'flightTime'];
      if (!numeric.every(key => Number.isFinite(s[key]))) return false;
      if (![s.position, s.velocity].every(vector => vector && ['x', 'y', 'z'].every(key => Number.isFinite(vector[key])))) return false;
      if (!s.wind || ![s.wind.x, s.wind.z].every(Number.isFinite)) return false;
      if (saved.autopilot && !['heading', 'altitude', 'speed', 'vs'].every(key => Number.isFinite(saved.autopilot[key]))) return false;
      if (Math.abs(s.position.x) > 1e8 || Math.abs(s.position.z) > 1e8 || s.position.y < 0 || s.position.y > 40000) return false;
      if (Math.hypot(s.velocity.x, s.velocity.y, s.velocity.z) > 1500) return false;
      Object.assign(state, copy(s));
      Object.assign(controls, copy(saved.controls || {}));
      Object.assign(autopilot, copy(saved.autopilot || {}));
      Object.assign(settings, copy(saved.settings || {}));
      if (saved.route) {
        setRoute(saved.route.waypoints);
        route.index = clamp(Math.trunc(saved.route.index) || 0, 0, Math.max(0, route.waypoints.length - 1));
        route.completed = Math.max(0, Math.trunc(saved.route.completed) || 0);
        autopilot.route = !!saved.autopilot?.route && !!route.waypoints.length;
      }
      const dynamics = saved.dynamics || {};
      pitchRate = Number.isFinite(dynamics.pitchRate) ? dynamics.pitchRate : 0;
      rollRate = Number.isFinite(dynamics.rollRate) ? dynamics.rollRate : 0;
      yawRate = Number.isFinite(dynamics.yawRate) ? dynamics.yawRate : 0;
      speedIntegral = Number.isFinite(dynamics.speedIntegral) ? dynamics.speedIntegral : 0;
      engine = Number.isFinite(dynamics.engine) ? clamp(dynamics.engine, 0, 1) : state.throttle;
      phase = Number.isFinite(dynamics.phase) ? dynamics.phase : phase;
      lastAutopilot = !!autopilot.enabled;
      touchdownTimer = 0;
      refreshInstruments();
      return true;
    } catch { return false; }
  }

  reset();
  return { state, controls, autopilot, settings, actuators, diagnostics, route, airport: field, reset, update, setRoute, serialize, restore, runwayAt, surfaceAt };
}
