import * as THREE from 'three';

const EPSILON = 1e-6;

// Slab intersection, with explicit treatment of parallel axes. Returns the
// closest positive parameter along the ray, including exit hits from inside.
export function rayBoxDistance(origin, direction, low, high) {
  let entry = -Infinity, exit = Infinity;
  for (let i = 0; i < 3; i++) {
    if (Math.abs(direction[i]) < EPSILON) {
      if (origin[i] < low[i] || origin[i] > high[i]) return Infinity;
      continue;
    }
    const a = (low[i] - origin[i]) / direction[i];
    const b = (high[i] - origin[i]) / direction[i];
    entry = Math.max(entry, Math.min(a, b));
    exit = Math.min(exit, Math.max(a, b));
    if (entry > exit) return Infinity;
  }
  if (exit <= EPSILON) return Infinity;
  return entry > EPSILON ? entry : exit;
}

// A local one-bounce effect: two real emissive instrument planes, modeled
// ceiling/side lamps and a few analytic occluders. It does not trace the
// exterior, iterate bounces, or allocate an extra scene render target.
const TRACE_FUNCTIONS = /* glsl */`
  uniform float deckRayActive;
  uniform float deckRayDay;
  uniform float deckRayBrightness;
  uniform mat4 deckWorldToLocal;
  uniform sampler2D deckPfdImage;
  uniform sampler2D deckNdImage;
  uniform mat4 deckPfdTransform;
  uniform mat4 deckNdTransform;
  uniform float deckPfdAvailable;
  uniform float deckNdAvailable;
  const float DECK_FAR = 64.0;

  bool deckSlab(float o, float d, float lo, float hi, inout float entry, inout float exitT) {
    if (abs(d) < 0.000001) return o >= lo && o <= hi;
    float a = (lo - o) / d;
    float b = (hi - o) / d;
    entry = max(entry, min(a, b));
    exitT = min(exitT, max(a, b));
    return entry <= exitT;
  }

  float deckBlock(vec3 o, vec3 d, vec3 lo, vec3 hi) {
    // A point inside a coarse proxy is on the material it represents, not
    // hidden by it. Only entry hits from outside can block a ray here.
    if (all(greaterThanEqual(o, lo)) && all(lessThanEqual(o, hi))) return DECK_FAR;
    float entry = -DECK_FAR;
    float exitT = DECK_FAR;
    if (!deckSlab(o.x, d.x, lo.x, hi.x, entry, exitT)) return DECK_FAR;
    if (!deckSlab(o.y, d.y, lo.y, hi.y, entry, exitT)) return DECK_FAR;
    if (!deckSlab(o.z, d.z, lo.z, hi.z, entry, exitT)) return DECK_FAR;
    return entry > 0.012 ? entry : DECK_FAR;
  }

  float deckFirstBlock(vec3 o, vec3 d) {
    float a = deckBlock(o, d, vec3(-1.12, 0.39, -13.01), vec3(1.46, 0.69, -12.90));
    float b = deckBlock(o, d, vec3(-0.47, -0.98, -13.76), vec3(0.63, -0.43, -11.93));
    float c = deckBlock(o, d, vec3(-2.60, -0.43, -13.50), vec3(-1.88, -0.33, -11.40));
    float e = deckBlock(o, d, vec3(1.88, -0.43, -13.50), vec3(2.60, -0.33, -11.40));
    return min(min(a, b), min(c, e));
  }

  float deckScreenHit(vec3 o, vec3 d, mat4 toScreen, out vec2 uv) {
    vec3 p = (toScreen * vec4(o, 1.0)).xyz;
    vec3 v = (toScreen * vec4(d, 0.0)).xyz;
    uv = vec2(0.0);
    if (v.z >= -0.000001) return DECK_FAR;
    float t = -p.z / v.z;
    if (t <= 0.025 || t >= DECK_FAR) return DECK_FAR;
    uv = p.xy + t * v.xy + 0.5;
    if (any(lessThan(uv, vec2(0.0))) || any(greaterThan(uv, vec2(1.0)))) return DECK_FAR;
    return t;
  }

  float deckCeilingHit(vec3 o, vec3 d, out vec3 radiance) {
    radiance = vec3(0.0);
    if (d.y <= 0.000001) return DECK_FAR;
    float t = (2.058 - o.y) / d.y;
    if (t <= 0.025 || t >= DECK_FAR) return DECK_FAR;
    vec3 p = o + t * d;
    if (p.x < -0.84 || p.x > 1.21 || p.z < -13.80 || p.z > -12.48) return DECK_FAR;
    float port = 1.0 - smoothstep(0.038, 0.24, length((p.xz - vec2(-0.62, -13.55)) * vec2(1.0, 1.2)));
    float starboard = 1.0 - smoothstep(0.038, 0.24, length((p.xz - vec2(1.0, -13.55)) * vec2(1.0, 1.2)));
    float keys = (1.0 - smoothstep(0.05, 0.14, abs(p.z + 13.12)))
      * smoothstep(0.07, 0.18, abs(fract((p.x + 0.77) * 6.4) - 0.5));
    radiance = vec3(1.0, 0.62, 0.31) * (port + starboard) * 1.35 + vec3(0.27, 0.46, 0.70) * keys * 0.33;
    return t;
  }

  float deckSideHit(vec3 o, vec3 d, out vec3 radiance) {
    radiance = vec3(0.0);
    if (abs(d.x) < 0.000001) return DECK_FAR;
    float t = ((d.x > 0.0 ? 2.475 : -2.475) - o.x) / d.x;
    if (t <= 0.025 || t >= DECK_FAR) return DECK_FAR;
    vec3 p = o + t * d;
    float strip = 0.18 - 0.10 * (p.z + 13.74);
    if (p.z < -13.74 || p.z > -11.48 || abs(p.y - strip) > 0.115) return DECK_FAR;
    radiance = vec3(1.0, 0.55, 0.25) * (1.0 - smoothstep(0.009, 0.115, abs(p.y - strip))) * 0.64;
    return t;
  }

  vec3 deckReflectedRadiance(vec3 o, vec3 d, float roughness) {
    vec2 pfdUV = vec2(0.0), ndUV = vec2(0.0);
    float pfd = DECK_FAR, nd = DECK_FAR;
    if (deckPfdAvailable > 0.5) pfd = deckScreenHit(o, d, deckPfdTransform, pfdUV);
    if (deckNdAvailable > 0.5) nd = deckScreenHit(o, d, deckNdTransform, ndUV);
    vec3 ceiling, side;
    float dome = deckCeilingHit(o, d, ceiling);
    float strip = deckSideHit(o, d, side);
    float hit = min(min(pfd, nd), min(dome, strip));
    if (hit >= DECK_FAR || deckFirstBlock(o, d) + 0.035 < hit) return vec3(0.0);
    vec3 radiance;
    if (hit == pfd) radiance = texture2D(deckPfdImage, pfdUV, 3.5 * roughness).rgb;
    else if (hit == nd) radiance = texture2D(deckNdImage, ndUV, 3.5 * roughness).rgb;
    else if (hit == dome) radiance = ceiling;
    else radiance = side;
    return radiance * (0.29 + deckRayBrightness * 0.71) * (1.18 - deckRayDay * 0.30)
      / (1.0 + 0.11 * hit * hit);
  }

  float deckContactShadow(vec3 p, vec3 n) {
    // Two short rays into the cabin, spread for a soft contact falloff.
    vec3 a = normalize(n + vec3(-0.39, 0.49, 0.75));
    vec3 b = normalize(n + vec3( 0.39, 0.55, 0.71));
    return 1.0 - 0.5 * (smoothstep(0.03, 0.68, deckFirstBlock(p, a))
      + smoothstep(0.03, 0.68, deckFirstBlock(p, b)));
  }
`;

const WET_FUNCTIONS = /* glsl */`
  uniform float deckRainWetness;
  uniform float deckRainClock;
  uniform float deckWipersOn;
  uniform float deckWiperPhase;

  float deckWetHash(vec2 p) {
    vec3 q = fract(vec3(p.xyx) * vec3(0.1031, 0.1099, 0.1379));
    q += dot(q, q.yzx + 33.33);
    return fract((q.x + q.y) * q.z);
  }

  float deckWiperClearance(vec3 point, vec3 start, vec3 end, vec3 top, bool mirror, float armLength, float swing) {
    // Use the glass's own axes and the same dimensions as the articulated arms.
    vec3 across = normalize(end - start);
    vec3 up = normalize((top - start) - across * dot(top - start, across));
    vec3 pivot = mix(start, end, mirror ? 0.87 : 0.105) - up * 0.024;
    vec3 delta = point - pivot;
    if (abs(dot(delta, cross(across, up))) > 0.14) return 0.0;
    vec2 arm = vec2(dot(delta, across) * (mirror ? -1.0 : 1.0), dot(delta, up));
    float radius = length(arm) / armLength;
    if (radius < 0.42 || radius > 1.18) return 0.0;
    float angle = atan(arm.y, arm.x);
    float radial = smoothstep(0.42, 0.56, radius) * (1.0 - smoothstep(1.08, 1.18, radius));
    float sector = smoothstep(-0.05, 0.16, angle) * (1.0 - smoothstep(1.02, 1.18, angle));
    float recentlyWiped = 1.0 - smoothstep(swing - 0.16, swing + 0.16, angle);
    return radial * sector * (0.59 + 0.31 * recentlyWiped);
  }

  vec2 deckWindshieldFilm(vec3 point) {
    float rain = smoothstep(0.10, 0.48, deckRainWetness);
    vec2 flow = point.xy * vec2(15.0, 11.0) + vec2(0.0, deckRainClock * 0.81);
    vec2 tile = floor(flow);
    float seed = deckWetHash(tile);
    vec2 center = 0.19 + 0.60 * vec2(deckWetHash(tile + 19.7), deckWetHash(tile + 7.3));
    vec2 drop = fract(flow) - center;
    float occupied = step(0.76 - rain * 0.30, seed);
    float radius = 0.046 + seed * 0.050;
    float distanceToDrop = length(drop * vec2(1.14, 0.74));
    float antialias = clamp(fwidth(distanceToDrop) * 0.62, 0.014, 0.065);
    float bead = 1.0 - smoothstep(radius - antialias, radius + antialias, distanceToDrop);
    float tailWidth = mix(0.015, 0.035, rain);
    float tail = (1.0 - smoothstep(tailWidth * 0.35, tailWidth + antialias * 0.34, abs(drop.x)))
      * smoothstep(0.01, 0.065, drop.y) * (1.0 - smoothstep(0.13, 0.35, drop.y)) * step(0.72, seed);
    float specular = bead * (1.0 - smoothstep(-0.05, 0.045, drop.y)) + tail * 0.20;
    float clearance = 0.0;
    if (deckWipersOn > 0.5) {
      float swing = 0.055 + 1.03 * (0.5 - 0.5 * cos(6.2831853 * deckWiperPhase));
      const vec3 LL = vec3(-2.20, 0.655, -13.80), LM = vec3(0.77, 0.698, -14.24), LR = vec3(2.57, 0.606, -13.48);
      const vec3 UL = vec3(-2.61, 2.20, -13.18), UM = vec3(1.15, 2.20, -13.31);
      clearance = max(deckWiperClearance(point, LL, LM, UL, false, 0.97, swing),
        deckWiperClearance(point, LM, LR, UM, true, 0.73, swing));
    }
    return vec2(bead + tail * 0.42, specular) * occupied * rain * (1.0 - clearance);
  }
`;

const TRACE_PROFILES = {
  coaming: { reflection: .55, contact: .25 },
  brushed: { reflection: .95, contact: .14 },
  glass: { reflection: 3.1, contact: 0 },
  windshield: { reflection: 5.3, contact: 0, wet: true },
};

function traceFragment(profile) {
  const { reflection, contact, wet } = profile;
  return /* glsl */`
    if (deckRayActive > 0.5${wet ? ' || deckRainWetness > 0.10' : ''}) {
      // Three supplies the camera-relative view-space position for these
      // materials. Rotate it back before translating to the aircraft origin,
      // avoiding precision loss at cruise altitude or after origin shifts.
      vec3 deckEye = (deckWorldToLocal * vec4(cameraPosition, 1.0)).xyz;
      vec3 deckFromEye = (deckWorldToLocal * vec4((-vViewPosition) * mat3(viewMatrix), 0.0)).xyz;
      ${wet ? 'if (deckRayActive > 0.5) {' : ''}
        vec3 deckN = normalize((deckWorldToLocal * vec4(normal * mat3(viewMatrix), 0.0)).xyz);
        vec3 deckV = -normalize(deckFromEye);
        vec3 deckP = deckEye + deckFromEye + deckN * 0.018;
        vec3 deckR = reflect(-deckV, deckN);
        float deckF = 0.075 + 0.925 * pow(1.0 - clamp(dot(deckN, deckV), 0.0, 1.0), 5.0);
        float deckRough = clamp(roughnessFactor, 0.04, 1.0);
        ${contact ? `outgoingLight *= 1.0 - ${contact.toFixed(2)} * deckContactShadow(deckP, deckN);` : ''}
        outgoingLight += deckReflectedRadiance(deckP, deckR, deckRough) * deckF
          * (1.0 - 0.64 * deckRough) * ${reflection.toFixed(2)};
      ${wet ? `}
      if (deckRainWetness > 0.10) {
        vec2 film = deckWindshieldFilm(deckEye + deckFromEye);
        outgoingLight += vec3(0.19, 0.31, 0.39) * film.y * (0.44 + 0.56 * deckRayDay);
        diffuseColor.a = min(diffuseColor.a + 0.047 * film.x, 0.18);
      }` : ''}
    }
    #include <opaque_fragment>
  `;
}

const unit = (value, fallback) => Number.isFinite(value) ? THREE.MathUtils.clamp(value, 0, 1) : fallback;

export function createCockpitRayEffects(cabin, materials, screens = {}) {
  const candidateTransform = new THREE.Matrix4();
  const state = {
    deckRayActive: { value: 0 }, deckRayDay: { value: .8 }, deckRayBrightness: { value: .85 },
    deckRainWetness: { value: 0 }, deckRainClock: { value: 0 }, deckWipersOn: { value: 0 }, deckWiperPhase: { value: 0 },
    deckWorldToLocal: { value: new THREE.Matrix4() },
    deckPfdImage: { value: null }, deckPfdTransform: { value: new THREE.Matrix4() }, deckPfdAvailable: { value: 0 },
    deckNdImage: { value: null }, deckNdTransform: { value: new THREE.Matrix4() }, deckNdAvailable: { value: 0 },
  };
  const installed = new Set();
  let hasWindshield = false;
  for (const [key, profile] of Object.entries(TRACE_PROFILES)) {
    const material = materials[key];
    if (!material?.isMeshStandardMaterial || installed.has(material)) continue;
    installed.add(material);
    hasWindshield ||= profile.wet === true;
    const previousHook = material.onBeforeCompile;
    const previousCacheKey = material.customProgramCacheKey;
    material.customProgramCacheKey = function () {
      const before = previousCacheKey === THREE.Material.prototype.customProgramCacheKey
        ? previousHook.toString() : previousCacheKey.call(this);
      return `${before}|deck-rays-v2:${key}`;
    };
    material.onBeforeCompile = function (shader, renderer) {
      previousHook.call(this, shader, renderer);
      if (!shader.fragmentShader.includes('#include <common>') || !shader.fragmentShader.includes('#include <opaque_fragment>')) return;
      Object.assign(shader.uniforms, state);
      shader.fragmentShader = shader.fragmentShader
        .replace('#include <common>', `#include <common>\n${TRACE_FUNCTIONS}${profile.wet ? WET_FUNCTIONS : ''}`)
        .replace('#include <opaque_fragment>', traceFragment(profile));
    };
    material.needsUpdate = true;
  }

  function updateScreen(screen, image, matrix, available) {
    const { object, texture } = screen || {};
    available.value = 0;
    image.value = null;
    if (!object?.isObject3D || !texture?.isTexture) return;
    object.updateWorldMatrix(true, false);
    candidateTransform.multiplyMatrices(state.deckWorldToLocal.value, object.matrixWorld);
    const determinant = candidateTransform.determinant();
    if (!Number.isFinite(determinant) || Math.abs(determinant) < 1e-8) return;
    matrix.value.copy(candidateTransform).invert();
    image.value = texture;
    available.value = 1;
  }

  function update(world = {}) {
    state.deckRayActive.value = Number(Boolean(installed.size && cabin.visible && world.rayTracing === true));
    const rain = unit(world.rain, 0);
    state.deckRainWetness.value = cabin.visible && hasWindshield && rain > .10 ? rain : 0;
    state.deckRainClock.value = !world.reducedMotion && Number.isFinite(world.elapsed) ? THREE.MathUtils.clamp(world.elapsed, 0, 100000) : 0;
    state.deckWipersOn.value = Number(Boolean(world.wipers));
    state.deckWiperPhase.value = world.reducedMotion ? 0 : unit(world.wiperPhase, 0);
    if (!state.deckRayActive.value && !state.deckRainWetness.value) return;
    state.deckRayDay.value = unit(world.day, .8);
    state.deckRayBrightness.value = unit(world.brightness, .85);
    cabin.updateWorldMatrix(true, false);
    const determinant = cabin.matrixWorld.determinant();
    if (!Number.isFinite(determinant) || Math.abs(determinant) < 1e-8) { state.deckRayActive.value = state.deckRainWetness.value = 0; return; }
    state.deckWorldToLocal.value.copy(cabin.matrixWorld).invert();
    if (state.deckRayActive.value) {
      updateScreen(screens.pfd, state.deckPfdImage, state.deckPfdTransform, state.deckPfdAvailable);
      updateScreen(screens.nd, state.deckNdImage, state.deckNdTransform, state.deckNdAvailable);
    }
  }

  return { update, get active() { return Boolean(cabin.visible && state.deckRayActive.value); } };
}
