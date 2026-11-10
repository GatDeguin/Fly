import * as THREE from 'three';

const clamp = THREE.MathUtils.clamp;
const mix = THREE.MathUtils.lerp;
const finite = (value, fallback) => Number.isFinite(value) ? value : fallback;

function dataTexture(data, size, name, register) {
  const texture = register(new THREE.DataTexture(data, size, size));
  texture.name = `Cabin • ${name}`;
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.generateMipmaps = true;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.anisotropy = 4;
  texture.needsUpdate = true;
  return texture;
}

// Tileable linear data rather than photographs: shared maps stay small and work offline.
function detailMap(kind, register) {
  const size = 128;
  const rgba = new Uint8Array(size * size * 4);
  const noise = (x, y, seed) => {
    let n = Math.imul((x & 127) + seed * 31, 374761393) ^ Math.imul((y & 127) + 43, 668265263);
    n = Math.imul(n ^ (n >>> 13), 1274126177);
    return ((n ^ (n >>> 16)) >>> 0) / 4294967295;
  };
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const grain = noise(x, y, 7) - .5;
      let value;
      if (kind === 'brushed') {
        // Long horizontal tool marks, interrupted by much finer metal grain.
        value = 201 + (noise(0, y, 11) - .5) * 58
          + Math.sin(x * Math.PI / 32 + y * Math.PI / 8) * 3 + grain * 11;
      } else if (kind === 'weave') {
        const warp = Math.sin(x * Math.PI / 2);
        const weft = Math.sin(y * Math.PI / 2);
        const thread = ((x >> 2) + (y >> 2)) & 1 ? warp + weft * .3 : weft + warp * .3;
        value = 205 + thread * 26 + grain * 12;
      } else if (kind === 'leather') {
        const pores = Math.min(noise(x, y, 18), noise(x + 1, y, 18), noise(x, y + 1, 18));
        value = 194 + Math.pow(pores, .65) * 65 + grain * 13;
      } else {
        value = 205 + grain * 45 + (noise(x >> 1, y >> 1, 3) - .5) * 12;
      }
      const i = (y * size + x) * 4;
      rgba[i] = rgba[i + 1] = rgba[i + 2] = clamp(Math.round(value), 0, 255);
      rgba[i + 3] = 255;
    }
  }
  return dataTexture(rgba, size, kind, register);
}

function fineNormal(heightTexture, strength, register) {
  const { data: height, width: size } = heightTexture.image;
  const rgba = new Uint8Array(height.length);
  const sample = (x, y) => height[((y & (size - 1)) * size + (x & (size - 1))) * 4];
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx = (sample(x - 1, y) - sample(x + 1, y)) * strength / 255;
      const dy = (sample(x, y - 1) - sample(x, y + 1)) * strength / 255;
      const invLength = 1 / Math.hypot(dx, dy, 1);
      const i = (y * size + x) * 4;
      rgba[i] = Math.round((1 + dx * invLength) * 127.5);
      rgba[i + 1] = Math.round((1 + dy * invLength) * 127.5);
      rgba[i + 2] = Math.round((1 + invLength) * 127.5);
      rgba[i + 3] = 255;
    }
  }
  return dataTexture(rgba, size, `${heightTexture.name.split(' • ')[1]} micro-normal`, register);
}

export function createCockpitMaterials(register = resource => resource) {
  const grain = detailMap('graphite', register);
  const brushing = detailMap('brushed', register);
  const weave = detailMap('weave', register);
  const pores = detailMap('leather', register);
  const grainNormal = fineNormal(grain, .37, register);
  const brushingNormal = fineNormal(brushing, .29, register);
  const leatherNormal = fineNormal(pores, .49, register);
  const standard = (name, parameters) => register(new THREE.MeshStandardMaterial({ name, ...parameters }));
  const physical = (name, parameters) => register(new THREE.MeshPhysicalMaterial({ name, ...parameters }));

  return {
    panel: standard('Cabin • charcoal powder coat', {
      color: '#2a323e', roughness: .89, metalness: .09, normalMap: grainNormal, roughnessMap: grain,
    }),
    edge: standard('Cabin • satin gunmetal', {
      color: '#465361', roughness: .71, metalness: .40, normalMap: grainNormal, roughnessMap: grain,
    }),
    coaming: standard('Cabin • anti-glare dashboard', {
      color: '#20252d', roughness: .97, metalness: .01, normalMap: leatherNormal, roughnessMap: pores,
    }),
    rubber: standard('Cabin • soft-touch rubber', {
      color: '#191f28', roughness: .95, metalness: .01, bumpMap: grain, bumpScale: .012, roughnessMap: grain,
    }),
    metal: standard('Cabin • satin nickel', {
      color: '#939fa8', roughness: .45, metalness: .72, normalMap: brushingNormal, roughnessMap: brushing,
    }),
    brushed: physical('Cabin • brushed aluminum', {
      color: '#909ba2', roughness: .40, metalness: .76, clearcoat: .12, clearcoatRoughness: .56,
      normalMap: brushingNormal, roughnessMap: brushing, anisotropy: .48, anisotropyRotation: 0,
    }),
    knob: physical('Cabin • coated polymer knob', {
      color: '#394552', roughness: .63, metalness: .04, ior: 1.49, clearcoat: .28, clearcoatRoughness: .37,
      normalMap: grainNormal,
    }),
    recess: standard('Cabin • deep contact recess', { color: '#0c1017', roughness: 1, metalness: 0 }),
    accent: standard('Cabin • champagne anodizing', {
      color: '#a6875f', roughness: .52, metalness: .55, bumpMap: brushing, bumpScale: .005, roughnessMap: brushing,
    }),
    fabric: physical('Cabin • woven charcoal upholstery', {
      color: '#626775', map: weave, roughness: .96, metalness: 0, bumpMap: weave, bumpScale: .025,
      sheen: .35, sheenColor: '#a4a8b7', sheenRoughness: .82,
    }),
    leather: standard('Cabin • blue-black leather', {
      color: '#343a45', roughness: .90, metalness: 0, normalMap: leatherNormal, roughnessMap: pores,
    }),
    leatherSeam: standard('Cabin • sealed leather piping', {
      color: '#242a33', roughness: .79, metalness: 0, normalMap: leatherNormal,
    }),
    stitch: standard('Cabin • warm grey stitching', { color: '#887c6f', roughness: .98, metalness: 0 }),
    wall: standard('Cabin • warm grey molded liner', {
      color: '#565a64', roughness: .91, metalness: .03, bumpMap: grain, bumpScale: .007, roughnessMap: grain,
    }),
    ivory: standard('Cabin • ivory ceramic and keys', { color: '#ece4d2', roughness: .47, metalness: .04 }),
    trim: standard('Cabin • smoked bronze trim', {
      color: '#775b48', roughness: .72, metalness: .32, bumpMap: brushing, bumpScale: .005, roughnessMap: brushing,
    }),
    backlight: standard('Cabin • amber edge lights', {
      color: '#e5a879', emissive: '#ffb575', emissiveIntensity: 1.75, roughness: .56, metalness: 0,
    }),
    coolBacklight: standard('Cabin • blue-white instrument legends', {
      color: '#7f9aaf', emissive: '#9dc8e4', emissiveIntensity: .78, roughness: .54, metalness: 0,
    }),
    domeLens: standard('Cabin • warm reading lamp lens', {
      color: '#94785d', emissive: '#ffd2a6', emissiveIntensity: .025, roughness: .48, metalness: 0,
    }),
    glass: physical('Cabin • anti-glare instrument glass', {
      color: '#557082', roughness: .24, metalness: .08, transparent: true, opacity: .085, depthWrite: false,
      clearcoat: .48, clearcoatRoughness: .25, envMapIntensity: .58, forceSinglePass: true,
    }),
    windshield: physical('Cabin • lightly tinted laminated windshield', {
      color: '#86afc1', roughness: .21, metalness: .04, transparent: true, opacity: .075, depthWrite: false,
      clearcoat: .82, clearcoatRoughness: .22, envMapIntensity: .72, side: THREE.DoubleSide, forceSinglePass: true,
    }),
    coffee: physical('Cabin • liquid coffee surface', {
      color: '#21130d', roughness: .20, metalness: 0, ior: 1.333, clearcoat: .40, clearcoatRoughness: .18,
    }),
  };
}

// Short-range lights keep their influence inside the cockpit, with no extra shadow passes.
export function createCockpitLighting(cabin, materials) {
  const makeLight = (name, color, distance, position) => {
    const light = new THREE.PointLight(color, 0, distance, 2);
    light.name = name;
    light.position.set(...position);
    cabin.add(light);
    return light;
  };
  const windowLight = makeLight('Deck lighting • side window', '#edf2fb', 4.8, [-1.7, 1.24, -13.25]);
  const ceilingLight = makeLight('Deck lighting • overhead bounce', '#b6d4f5', 5.5, [.82, 1.03, -11.55]);
  const consoleLight = makeLight('Deck lighting • console spill', '#ffb47d', 4.3, [-.73, .13, -11.63]);
  const windowDay = new THREE.Color('#edf2fb');
  const windowGold = new THREE.Color('#ffbd8b');
  const coolDay = new THREE.Color('#b9d5fa');
  const coolNight = new THREE.Color('#9ab7dc');
  const consoleDay = new THREE.Color('#e1e3ec');
  const consoleNight = new THREE.Color('#ffb47d');
  const readingLight = new THREE.Color('#ffd0a4');
  let domeLevel = null;

  function update(world = {}) {
    if (!cabin.visible) return;
    const daylight = THREE.MathUtils.smoothstep(clamp(finite(world.day, .8), 0, 1), 0, 1);
    const night = 1 - daylight;
    const hour = ((finite(world.time, 18.7) % 24) + 24) % 24;
    const rain = clamp(finite(world.rain, 0), 0, 1);
    const cloud = clamp(finite(world.cloudDensity, 0), 0, 1);
    const brightness = clamp(finite(world.brightness, 1), .15, 1.3);
    const dome = clamp(finite(world.domeLight === true ? 1 : world.domeLight, 0), 0, 1);
    const dt = clamp(finite(world.dt, 0), 0, .1);
    domeLevel = domeLevel === null || dt === 0 ? dome : mix(domeLevel, dome, 1 - Math.exp(-dt * 13));
    const golden = Math.max(0, 1 - Math.min(Math.abs(hour - 6.3), Math.abs(hour - 18.5)) / 2.5)
      * (.23 + daylight * .77) * (1 - rain * .72) * (1 - cloud * .55);
    const direction = world.sunDirection;
    const x = clamp(finite(direction?.x, -.72), -1, 1);
    const y = clamp(finite(direction?.y, .3), -1, 1);
    const z = clamp(finite(direction?.z, 0), -1, 1);
    // Bring the key forward and toward the sun-facing pane so it grazes the coaming,
    // instead of casting an orange wash across the instrument faces.
    windowLight.position.set(Math.tanh(x * 4.2) * 2.12, 1.20 + Math.max(0, y) * .31, -13.14 + z * .22);
    windowLight.color.copy(windowDay).lerp(windowGold, golden);
    windowLight.intensity = (1.7 + daylight * 10.6 + golden * 8) * (1 - rain * .59) * (1 - cloud * .40);
    ceilingLight.color.copy(coolDay).lerp(coolNight, night);
    ceilingLight.intensity = (6.2 + night * 7.6 + rain * 2.0) * (.54 + brightness * .46);
    // The existing console emitter models indirect spill with the dome off and a pool
    // of warm reading light from overhead with it on, without a fourth shader light.
    consoleLight.position.set(mix(-.73, -.35, domeLevel), mix(.13, 1.83, domeLevel), mix(-11.63, -12.89, domeLevel));
    consoleLight.distance = mix(4.3, 3.75, domeLevel);
    consoleLight.color.copy(consoleDay).lerp(consoleNight, night).lerp(readingLight, domeLevel);
    consoleLight.intensity = (2.2 + night * 8.8) * (.32 + brightness * .68) + domeLevel * (8.0 + night * 12);
    materials.backlight.emissiveIntensity = (.82 + night * 1.16 + golden * .28) * brightness;
    materials.coolBacklight.emissiveIntensity = (.58 + night * .63) * brightness;
    materials.domeLens.emissiveIntensity = .025 + domeLevel * 2.0;
    materials.glass.opacity = .071 + daylight * .016;
    materials.windshield.opacity = .044 + golden * .043 + rain * .024;
  }

  update();
  return { update };
}
