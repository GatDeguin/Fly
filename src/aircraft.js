import * as THREE from 'three';

// All geometry, paint and instruments are generated locally. Aircraft forward is -Z.
export function createAircraft() {
  const group = new THREE.Group();
  group.name = 'SkyJourney SJ-39';
  const exterior = new THREE.Group();
  const cabin = new THREE.Group();
  exterior.name = 'Aircraft exterior';
  cabin.name = 'Flight deck';
  cabin.visible = false;
  group.add(exterior, cabin);
  const interactables = [];
  const resources = new Set();
  const moving = { ailerons: [], flaps: [], elevators: [], rudder: null, gears: [], fans: [], yokes: [], throttles: [] };
  const shared = {};
  const register = resource => (resources.add(resource), resource);
  const material = (color, roughness = .5, metalness = .05, extra = {}) => register(new THREE.MeshStandardMaterial({ color, roughness, metalness, ...extra }));
  const pearl = register(new THREE.MeshPhysicalMaterial({ color:'#eeeae3', roughness:.27, metalness:.16, clearcoat:.48, clearcoatRoughness:.26 }));
  const navy = material('#14253f', .3, .25);
  const darkGlass = material('#23313c', .17, .65);
  const aluminum = material('#a5a3a0', .29, .78);
  const graphite = material('#353b43', .61, .13);
  const graphiteEdge = material('#53595e', .41, .28);
  const rubber = material('#1a2028', .69, .03);
  const warmTrim = material('#9f7953', .35, .52);
  const paper = material('#e4d5b8', .9, 0);
  const ivory = material('#f3eee2', .26, .02);
  const led = material('#ffbc72', .2, .05, { emissive: '#ffac58', emissiveIntensity: 2.2 });
  shared.box = register(new THREE.BoxGeometry(1, 1, 1));
  shared.sphere = register(new THREE.SphereGeometry(1, 16, 10));
  shared.cylinder = register(new THREE.CylinderGeometry(1, 1, 1, 16));
  shared.plane = register(new THREE.PlaneGeometry(1, 1));
  shared.capsule = register(new THREE.CapsuleGeometry(1, 2, 5, 14));
  const roundedShape = new THREE.Shape();
  roundedShape.moveTo(-.38,-.5);roundedShape.lineTo(.38,-.5);roundedShape.quadraticCurveTo(.5,-.5,.5,-.38);
  roundedShape.lineTo(.5,.38);roundedShape.quadraticCurveTo(.5,.5,.38,.5);roundedShape.lineTo(-.38,.5);
  roundedShape.quadraticCurveTo(-.5,.5,-.5,.38);roundedShape.lineTo(-.5,-.38);roundedShape.quadraticCurveTo(-.5,-.5,-.38,-.5);
  shared.roundedBox=register(new THREE.ExtrudeGeometry(roundedShape,{depth:1,bevelEnabled:true,bevelSegments:3,steps:1,bevelSize:.028,bevelThickness:.028,curveSegments:5}));
  shared.roundedBox.translate(0,0,-.5);
  const mesh = (geometry, mat, parent, x = 0, y = 0, z = 0) => {
    const object = new THREE.Mesh(geometry, mat);
    object.position.set(x, y, z);
    object.castShadow = true;
    object.receiveShadow = true;
    parent.add(object);
    return object;
  };
  const box = (parent, mat, x, y, z, w, h, d) => {
    const object = mesh(shared.box, mat, parent, x, y, z);
    object.scale.set(w, h, d);
    return object;
  };
  const roundedBox = (parent, mat, x, y, z, w, h, d) => {
    const object = mesh(shared.roundedBox, mat, parent, x, y, z);
    object.scale.set(w, h, d);
    return object;
  };
  const sphere = (parent, mat, x, y, z, sx, sy, sz) => {
    const object = mesh(shared.sphere, mat, parent, x, y, z);
    object.scale.set(sx, sy, sz);
    return object;
  };
  const cylinder = (parent, mat, x, y, z, radius, height) => {
    const object = mesh(shared.cylinder, mat, parent, x, y, z);
    object.scale.set(radius, height, radius);
    return object;
  };
  const beam = (parent, mat, start, end, width, depth = width) => {
    const a = new THREE.Vector3(...start), b = new THREE.Vector3(...end);
    const object = mesh(shared.box, mat, parent);
    object.position.copy(a).add(b).multiplyScalar(.5);
    object.scale.set(width, a.distanceTo(b), depth);
    object.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), b.sub(a).normalize());
    return object;
  };
  const action = (object, id, label, increment = 1) => {
    object.userData.action = id;
    object.userData.label = label;
    object.userData.increment = increment;
    interactables.push(object);
    return object;
  };
  const canvasTexture = (width, height, draw) => {
    const canvas = document.createElement('canvas');
    canvas.width = width; canvas.height = height;
    const context = canvas.getContext('2d');
    draw?.(context, width, height);
    const texture = register(new THREE.CanvasTexture(canvas));
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = 4;
    return { canvas, context, texture };
  };
  const inkMaterial = texture => register(new THREE.MeshBasicMaterial({ map: texture, transparent: true, depthWrite: false, toneMapped: false }));
  const texturePlane = (parent, texture, x, y, z, w, h, rotationY = 0) => {
    const object = mesh(shared.plane, inkMaterial(texture), parent, x, y, z);
    object.scale.set(w, h, 1); object.rotation.y = rotationY;
    object.castShadow = false; object.receiveShadow = false;
    return object;
  };
  const textTexture = (text, color = '#ede8df', size = 40, width = 512, height = 128) => canvasTexture(width, height, ctx => {
    ctx.fillStyle = color; ctx.font = `500 ${size}px Arial, sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    const lines = text.split('\n');
    lines.forEach((line, i) => ctx.fillText(line, width / 2, height / 2 + (i - (lines.length - 1) / 2) * size * 1.25));
  }).texture;
  const birdTexture = canvasTexture(256, 256, ctx => {
    ctx.fillStyle = '#efeee8'; ctx.beginPath();
    ctx.moveTo(120, 40); ctx.lineTo(139, 98); ctx.lineTo(216, 139); ctx.lineTo(214, 151);
    ctx.lineTo(143, 132); ctx.lineTo(132, 197); ctx.lineTo(161, 216); ctx.lineTo(154, 229);
    ctx.lineTo(118, 215); ctx.lineTo(86, 231); ctx.lineTo(78, 218); ctx.lineTo(104, 198);
    ctx.lineTo(109, 134); ctx.lineTo(35, 163); ctx.lineTo(31, 149); ctx.lineTo(107, 101);
    ctx.closePath(); ctx.fill();
  }).texture;

  // Smooth longitudinal profile, with a separate partial skin for the navy belly.
  const profile = [[-19.5,.035],[-19.15,.38],[-18.6,.81],[-17.8,1.23],[-16.6,1.6],[-14.7,1.86],[-12.3,1.98],[-8,2],[-2,2],[5,1.98],[10,1.9],[13.2,1.64],[16.3,1.02],[18.3,.45],[19.5,.065]];
  const lathe = (points, segments = 64, phiStart = 0, phiLength = Math.PI * 2) => {
    const geometry = register(new THREE.LatheGeometry(points.map(([z, r]) => new THREE.Vector2(r, z)), segments, phiStart, phiLength));
    geometry.rotateX(Math.PI / 2); return geometry;
  };
  mesh(lathe(profile), pearl, exterior);
  mesh(lathe(profile.map(([z, r]) => [z, r + .009]), 38, -1.14, 2.28), navy, exterior);
  const fuselageRadius = z => {
    for (let i = 1; i < profile.length; i++) if (z <= profile[i][0]) {
      const a = profile[i - 1], b = profile[i];
      return THREE.MathUtils.lerp(a[1], b[1], (z - a[0]) / (b[0] - a[0]));
    }
    return .1;
  };
  // Each row of passenger windows is one draw call.
  const windows = new THREE.InstancedMesh(shared.sphere, darkGlass, 104);
  const dummy = new THREE.Object3D();
  let windowIndex = 0;
  for (const side of [-1, 1]) for (let i = 0; i < 52; i++) {
    const z = -13.3 + i * .505, r = fuselageRadius(z);
    dummy.position.set(side * Math.sqrt(Math.max(.01, r * r - .65 * .65)), .65, z);
    dummy.scale.set(.027, .195, .125); dummy.rotation.set(0, 0, 0); dummy.updateMatrix();
    windows.setMatrixAt(windowIndex++, dummy.matrix);
  }
  exterior.add(windows);
  const wordmark = textTexture('SkyJourney', '#24354a', 76, 1024, 160);
  for (const side of [-1, 1]) {
    texturePlane(exterior, wordmark, side * 1.87, 1.06, -9.1, 5.9, .83, side * Math.PI / 2);
    const registration = textTexture('SJ–039     THE ART OF FLYING', '#667177', 24, 1024, 90);
    texturePlane(exterior, registration, side * 1.6, .02, 12, 2.8, .23, side * Math.PI / 2);
    // Passenger doors with slim recessed frames.
    for (const z of [-13.7, 10.8]) {
      const r = fuselageRadius(z);
      const door = box(exterior, graphiteEdge, side * (r - .065), .35, z, .018, 1.75, .76);
      door.rotation.z = side * -.08;
      box(exterior, pearl, side * (r - .052), .35, z, .018, 1.67, .69);
      box(exterior, aluminum, side * (r - .025), .1, z - .22, .03, .075, .16);
    }
    const cockpitWindow = box(exterior, darkGlass, side * 1.25, 1.01, -16.8, .04, .55, 1.15);
    cockpitWindow.rotation.y = side * .53; cockpitWindow.rotation.z = side * .15;
    const frontWindow = box(exterior, darkGlass, side * .63, 1.17, -17.43, .77, .48, .055);
    frontWindow.rotation.y = side * -.33; frontWindow.rotation.x = .46;
  }

  // Aerodynamic sections are closed meshes with a real curved upper/lower surface.
  function wingGeometry(stations, side, thickness = 1) {
    const positions = [], indices = [], chordSteps = 12;
    for (const face of [1, -1]) for (const [span, leading, trailing, y, depth] of stations) {
      for (let j = 0; j <= chordSteps; j++) {
        const t = j / chordSteps;
        const section = 5 * .12 * (.2969 * Math.sqrt(t) - .126 * t - .3516 * t ** 2 + .2843 * t ** 3 - .1036 * t ** 4);
        positions.push(side * span, y + face * section * depth * thickness + Math.sin(t * Math.PI) * depth * .018, THREE.MathUtils.lerp(leading, trailing, t));
      }
    }
    const faceCount = stations.length * (chordSteps + 1);
    for (let face = 0; face < 2; face++) for (let s = 0; s < stations.length - 1; s++) for (let j = 0; j < chordSteps; j++) {
      const a = face * faceCount + s * (chordSteps + 1) + j, b = a + chordSteps + 1;
      if (face === 0) indices.push(a, a + 1, b, a + 1, b + 1, b);
      else indices.push(a, b, a + 1, a + 1, b, b + 1);
    }
    for (let s = 0; s < stations.length - 1; s++) for (const j of [0, chordSteps]) {
      const a = s * (chordSteps + 1) + j, b = a + chordSteps + 1;
      indices.push(a, b, a + faceCount, b, b + faceCount, a + faceCount);
    }
    for (const s of [0, stations.length - 1]) for (let j = 0; j < chordSteps; j++) {
      const a = s * (chordSteps + 1) + j;
      indices.push(a, a + faceCount, a + 1, a + 1, a + faceCount, a + faceCount + 1);
    }
    if (side < 0) for (let i = 0; i < indices.length; i += 3) [indices[i + 1], indices[i + 2]] = [indices[i + 2], indices[i + 1]];
    const geometry = register(new THREE.BufferGeometry());
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setIndex(indices); geometry.computeVertexNormals();
    return geometry;
  }
  const wingStations=[[1.55,-4.15,5.85,-.42,8.8],[3.8,-3.15,5.91,-.25,7.3],[8.2,-.35,5.98,.03,5.4],[13.0,2.35,6.02,.35,3.1],[17.8,4.95,6.22,.83,1.23]];
  const wingSeams=[];
  const wingPoint=(side,span,t)=>{
    let section=wingStations[wingStations.length-1];
    for(let i=1;i<wingStations.length;i++)if(span<=wingStations[i][0]){const a=wingStations[i-1],b=wingStations[i],u=(span-a[0])/(b[0]-a[0]);section=a.map((v,j)=>THREE.MathUtils.lerp(v,b[j],u));break;}
    const [,lead,trail,y,depth]=section,airfoil=5*.12*(.2969*Math.sqrt(t)-.126*t-.3516*t*t+.2843*t**3-.1036*t**4);
    return [span*side,y+airfoil*depth+Math.sin(t*Math.PI)*depth*.018+.012,THREE.MathUtils.lerp(lead,trail,t)];
  };
  for (const side of [-1, 1]) {
    mesh(wingGeometry(wingStations, side), pearl, exterior);
    for(const t of [.27,.76])for(let x=2.25;x<17.4;x+=.85)wingSeams.push(...wingPoint(side,x,t),...wingPoint(side,Math.min(x+.85,17.6),t));
    for(const span of [5.5,9.75,13.45,16])wingSeams.push(...wingPoint(side,span,.27),...wingPoint(side,span,.91));
    // Fairing at the wing root.
    sphere(exterior, pearl, side * 1.69, -.58, 1.8, .65, .5, 5.2);
    // Tip rises into a smoothly swept fin, painted navy on both faces.
    mesh(wingGeometry([[17.7,4.9,6.23,.82,1.15],[18.08,5.08,6.16,1.08,1.08],[18.38,5.26,6.14,1.64,.82],[18.52,5.46,6.10,2.46,.61],[18.5,5.59,6.03,3.07,.39]], side, .55), navy, exterior);
    for (const [span, width, depth] of [[5.25,3.9,1.12],[9.12,3.4,.93]]) {
      const pivot = new THREE.Group(); pivot.position.set(side * span, -.045 + span * .03, 5.18); exterior.add(pivot);
      box(pivot, pearl, 0, 0, depth * .5, width, .12, depth);
      box(pivot, aluminum, 0, .066, .12, width, .015, .02);
      moving.flaps.push(pivot);
    }
    const aileron = new THREE.Group(); aileron.position.set(side * 14.7, .63, 5.62); exterior.add(aileron);
    box(aileron, pearl, 0, 0, .35, 4.35, .065, .72);
    moving.ailerons.push({ object: aileron, side });
    for (const x of [5.8,9.5]) sphere(exterior, pearl, side * x, -.2, 6.02, .23, .22, 1.52);
    mesh(wingGeometry([[1.35,12.6,17.85,.6,4.7],[3.8,14.08,18.01,.84,3.6],[6.6,16.01,18.34,1.24,2.21]], side, .8), pearl, exterior);
    const elevator = new THREE.Group(); elevator.position.set(side * 4.1, .95, 17.52); exterior.add(elevator);
    box(elevator, pearl, 0, 0, .31, 4.2, .075, .64); moving.elevators.push(elevator);
  }
  const seamGeometry=register(new THREE.BufferGeometry());seamGeometry.setAttribute('position',new THREE.Float32BufferAttribute(wingSeams,3));
  const seamMaterial=register(new THREE.LineBasicMaterial({color:'#73808d',transparent:true,opacity:.32}));
  exterior.add(new THREE.LineSegments(seamGeometry,seamMaterial));
  function finGeometry(points, thickness) {
    const shape = points.map(([z, y]) => new THREE.Vector2(z, y));
    const triangles = THREE.ShapeUtils.triangulateShape(shape, []), positions = [], indices = [];
    for (const side of [-1, 1]) for (const [z, y] of points) positions.push(side * thickness / 2, y, z);
    const n = points.length;
    for (const triangle of triangles) indices.push(...triangle, triangle[2] + n, triangle[1] + n, triangle[0] + n);
    for (let i = 0; i < n; i++) { const j = (i + 1) % n; indices.push(i, j, i + n, j, j + n, i + n); }
    const geo = register(new THREE.BufferGeometry()); geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3)); geo.setIndex(indices); geo.computeVertexNormals(); return geo;
  }
  mesh(finGeometry([[12.7,1.1],[16.15,9.2],[18.15,9.12],[18.77,1.04]], .25), navy, exterior);
  const rudder = new THREE.Group(); rudder.position.set(0, 1.1, 18.14); exterior.add(rudder);
  mesh(finGeometry([[0,0],[-.06,7.92],[.45,7.85],[.69,0]], .18), navy, rudder);
  moving.rudder = rudder;
  for (const side of [-1, 1]) texturePlane(exterior, birdTexture, side * .144, 5.25, 16.68, 2.42, 2.6, side * Math.PI / 2);
  sphere(exterior, aluminum, 0, -.4, 19.25, .32, .32, .69);
  for (const z of [-8.5, 7.5]) box(exterior, pearl, 0, 2.09, z, .12, .31, .7);

  for (const side of [-1, 1]) {
    const engine = new THREE.Group(); engine.position.set(side * 5.75, -1.48, -2.92); exterior.add(engine);
    box(exterior, pearl, side * 5.75, -.38, -2.18, .31, 1.49, 2.4);
    mesh(lathe([[-2.2,.94],[-2.05,1.09],[-1.45,1.14],[.8,1.1],[1.75,.86],[2.2,.65]], 48), pearl, engine);
    const lip = mesh(register(new THREE.TorusGeometry(1.0, .095, 12, 48)), aluminum, engine, 0, 0, -2.15);
    const intake = cylinder(engine, rubber, 0, 0, -1.72, .955, .36); intake.rotation.x = Math.PI / 2;
    const fan = new THREE.Group(); fan.position.z = -2.105; engine.add(fan); moving.fans.push(fan);
    const blades = new THREE.InstancedMesh(shared.box, aluminum, 24);
    for (let i = 0; i < 24; i++) {
      const a = i * Math.PI / 12;
      dummy.position.set(Math.sin(a) * .52, Math.cos(a) * .52, .02);
      dummy.rotation.set(0, .25, -a - .32); dummy.scale.set(.11, .75, .03); dummy.updateMatrix(); blades.setMatrixAt(i, dummy.matrix);
    }
    fan.add(blades); sphere(fan, aluminum, 0, 0, -.06, .24, .24, .23);
    const exhaust = cylinder(engine, rubber, 0, 0, 2.1, .61, .12); exhaust.rotation.x = Math.PI / 2;
    const exhaustLip = mesh(register(new THREE.TorusGeometry(.64, .045, 8, 32)), aluminum, engine, 0, 0, 2.15);
    sphere(engine, aluminum, 0, 0, 2.24, .24, .24, .58);
    lip.name = 'Polished intake ring'; exhaustLip.name = 'Exhaust ring';
  }
  for (const [x, z, double] of [[0,-13.5,false],[-2.5,2.2,true],[2.5,2.2,true]]) {
    const gear = new THREE.Group(); gear.position.set(x, -1.25, z); exterior.add(gear); moving.gears.push(gear);
    cylinder(gear, aluminum, 0, -1.0, 0, .115, 1.94);
    beam(gear, aluminum, [0,-.26,.5], [0,-1.65,0], .085);
    for (const side of [-1, 1]) {
      const wheel = cylinder(gear, rubber, side * .25, -2, 0, double ? .43 : .33, .23); wheel.rotation.z = Math.PI / 2;
      const hub = cylinder(gear, aluminum, side * .38, -2, 0, .14, .014); hub.rotation.z = Math.PI / 2;
      if (double) { const back = wheel.clone(); back.position.z = .8; gear.add(back); const backHub = hub.clone(); backHub.position.z = .8; gear.add(backHub); }
    }
  }
  const navigationLights = [];
  for (const [x, z, color] of [[-18.48,6.05,'#ff4446'],[18.48,6.05,'#a0ffe1'],[0,19.28,'#fff2cd']]) {
    const lightMaterial = material(color, .22, .1, { emissive: color, emissiveIntensity: 2.0 });
    navigationLights.push(sphere(exterior, lightMaterial, x, x ? 1 : .2, z, .12, .11, .12));
  }
  const beaconMaterial = material('#ff5144', .23, .1, { emissive: '#ff4b32', emissiveIntensity: 1.2 });
  sphere(exterior, beaconMaterial, 0, 2.04, .4, .15, .08, .15);
  for (const side of [-1,1]) sphere(exterior, ivory, side * 2.3, -.35, -3.8, .14,.13,.045);

  // Flight deck. Structural members leave the entire windshield genuinely open.
  box(cabin, graphite, 0, -1.3, -11.85, 5.5, .16, 5.8);
  for (const side of [-1,1]) {
    box(cabin, graphite, side * 2.64, -.28, -12.0, .24, 2.0, 4.8);
    box(cabin, graphiteEdge, side * 2.47, -.29, -12.7, .48, .16, 2.65);
    beam(cabin, graphiteEdge, [side * 2.4,.69,-14.1], [side * 2.6,1.9,-12.7], .27, .29);
    beam(cabin, rubber, [side * 2.2,.7,-14.08], [side * 2.4,1.86,-12.73], .045, .32);
    beam(cabin, led, [side * 2.37,.1,-13.97], [side * 2.37,-.15,-11.75], .033, .032);
    box(cabin, graphite, side * 2.52, 1.89, -12.1, .52,.22,3.4);
  }
  beam(cabin, graphiteEdge, [.81,.77,-14.33], [1.13,1.80,-13.18], .2,.28);
  beam(cabin, rubber, [.675,.77,-14.31], [1.0,1.80,-13.18], .037,.28);
  beam(cabin, warmTrim, [.945,.8,-14.29], [1.265,1.80,-13.18], .021,.285);
  beam(cabin, graphiteEdge, [-2.4,1.91,-12.75], [1.13,1.91,-13.2], .27,.34);
  beam(cabin, graphiteEdge, [1.13,1.91,-13.2], [2.6,1.91,-12.7], .27,.34);
  // Top electronics are positioned above the view and carry real relief.
  box(cabin, graphite, .17, 2.02, -14.09, 3.22, .27, 2.04);
  for (let i=0;i<9;i++) {
    const dial = cylinder(cabin, aluminum, -.97 + i*.27, 1.858, -14.45, .065,.04);
    if(i%3===0) {const bezel=cylinder(cabin,rubber,-.97+i*.27,1.886,-14.45,.099,.018);bezel.castShadow=false;}
    dial.name = 'Overhead rotary selector';
  }
  // Sculpted dashboard and raised glare shield.
  box(cabin, graphite, 0, -.08, -13.66, 5.08, 1.39, .28);
  box(cabin, graphiteEdge, 0, .672, -13.58, 5.14,.11,.54);
  box(cabin, rubber, 0, .727, -13.6, 5.24,.055,.62);
  box(cabin, graphite, 0, .511, -13.30, 5.0,.3,.17);
  box(cabin, aluminum, 0, -.79, -13.41, 5.03,.024,.14);
  beam(cabin, led, [-2.37,.341,-13.42], [2.38,.341,-13.42], .013,.018);

  const screens = [];
  function screen(name, x, y, z, width, height, pixelsX = 640, pixelsY = 560) {
    box(cabin, rubber, x,y,z,width+.10,height+.10,.11);
    box(cabin, graphiteEdge,x,y,z+.058,width+.026,height+.026,.022);
    const display = canvasTexture(pixelsX,pixelsY);
    const screenMaterial = register(new THREE.MeshBasicMaterial({map:display.texture,toneMapped:false}));
    const object = mesh(shared.plane,screenMaterial,cabin,x,y,z+.077);
    object.scale.set(width,height,1); object.castShadow=false; object.receiveShadow=false;
    object.name=name;
    screens.push({name,...display,object});
    // Physical selectors line the bottom edge, rather than painted fake knobs.
    for(let i=0;i<6;i++) {
      const button=box(cabin,graphiteEdge,x-width*.43+i*width*.173,y-height*.5-.048,z+.076,.066,.028,.022);
      button.castShadow=false;
    }
    return display;
  }
  const pfd = screen('Primary flight display', -1.71,-.225,-13.42,1.14,1.0);
  const nd = screen('Navigation display',-.39,-.225,-13.42,1.34,1.0,768,576);
  const engines = screen('Engine information',1.00,-.225,-13.42,1.15,1.0);
  const systems = screen('Aircraft systems',2.1,-.225,-13.42,.84,1.0,512,576);
  const apReadout = canvasTexture(1024,164);
  const apPanel=mesh(shared.plane,register(new THREE.MeshBasicMaterial({map:apReadout.texture,toneMapped:false})),cabin,0,.516,-13.201);
  apPanel.scale.set(2.76,.271,1);apPanel.castShadow=false;apPanel.receiveShadow=false;
  const apKnobs = [];
  for(const [i,id,label] of [[0,'speed','Speed'],[1,'heading','Heading'],[2,'altitude','Altitude'],[3,'vs','Vertical speed']]) {
    const x=-1.13+i*.746;
    const knob=cylinder(cabin,aluminum,x,.394,-13.09,.048,.08);knob.rotation.x=Math.PI/2;
    action(knob,id,label);apKnobs.push(knob);
    const mark=box(cabin,ivory,x,.416,-13.047,.012,.029,.006); mark.castShadow=false;
  }
  const apButton=box(cabin,graphiteEdge,1.63,.511,-13.168,.25,.165,.055);
  action(apButton,'ap','Autopilot');
  texturePlane(cabin,textTexture('AP', '#b4ebd3', 52,256,128),1.63,.519,-13.134,.175,.078);
  const gearButton=box(cabin,aluminum,-2.31,-.81,-13.24,.077,.17,.085);action(gearButton,'gear','Landing gear');
  texturePlane(cabin,textTexture('GEAR', '#c1bcae', 34,256,96),-2.31,-.935,-13.18,.24,.063);

  // Dense but economical groups of tactile avionics controls and vents.
  const littleButtons = new THREE.InstancedMesh(shared.box,graphiteEdge,62);
  const knobInstances = new THREE.InstancedMesh(shared.cylinder,aluminum,22);
  let smallIndex=0, knobIndex=0;
  for(const side of [-1,1]) {
    for(let i=0;i<12;i++) {
      dummy.position.set(side*(1.91+(i%3)*.15),.49+Math.floor(i/3)*.046,-13.155);
      dummy.scale.set(.06,.024,.025);dummy.rotation.set(0,0,0);dummy.updateMatrix();littleButtons.setMatrixAt(smallIndex++,dummy.matrix);
    }
    for(let i=0;i<5;i++) {
      dummy.position.set(side*(1.82+i*.145),.605,-13.145);dummy.scale.set(.033,.04,.033);dummy.rotation.set(Math.PI/2,0,0);dummy.updateMatrix();knobInstances.setMatrixAt(knobIndex++,dummy.matrix);
    }
    for(let j=0;j<5;j++) box(cabin,rubber,side*2.42,.21-j*.082,-13.22,.14,.039,.044);
    for(let j=0;j<7;j++) box(cabin,rubber,side*2.51,-.02,-12.42+j*.1,.12,.015,.056);
  }

  // The control pedestal sits between two independently articulated yokes.
  const pedestalStart=cabin.children.length;
  const pedestal=box(cabin,graphite,0,-.81,-12.01,.97,.53,1.77);pedestal.rotation.x=.13;
  box(cabin,graphiteEdge,0,-.481,-12.28,1.06,.077,1.7).rotation.x=.12;
  const pedestalPanel=canvasTexture(768,768,ctx=> {
    ctx.fillStyle='#17222b';ctx.fillRect(0,0,768,768);
    ctx.strokeStyle='#384c58';ctx.lineWidth=5;
    for(let y=18;y<750;y+=187) for(let x=18;x<750;x+=250){ctx.strokeRect(x,y,232,165);ctx.fillStyle='#95cee5';ctx.font='17px monospace';ctx.fillText(y<400?'FLT  NAV  PERF':'FUEL   SYSTEM',x+14,y+24);for(let j=0;j<4;j++){ctx.fillStyle=j===2?'#c4bd66':'#638b9c';ctx.fillRect(x+17,y+45+j*25,86,5);ctx.fillRect(x+125,y+45+j*25,74,5);}}
  });
  const pedestalSurface=mesh(shared.plane,inkMaterial(pedestalPanel.texture),cabin,0,-.435,-12.16);
  pedestalSurface.scale.set(.94,1.58,1);pedestalSurface.rotation.x=-Math.PI/2+.12;
  for(let i=0;i<38;i++) {
    dummy.position.set(-.42+(i%5)*.18,-.406,-13.46+Math.floor(i/5)*.15);
    dummy.scale.set(.052,.028,.033);dummy.rotation.set(0,0,0);dummy.updateMatrix();littleButtons.setMatrixAt(smallIndex++,dummy.matrix);
  }
  for(let i=0;i<12;i++) {
    dummy.position.set(-.47+(i%2)*.94,-.414,-13.48+Math.floor(i/2)*.24);
    dummy.scale.set(.025,.037,.025);dummy.rotation.set(0,0,0);dummy.updateMatrix();knobInstances.setMatrixAt(knobIndex++,dummy.matrix);
  }
  cabin.add(littleButtons,knobInstances);
  box(cabin,rubber,0,-.415,-11.83,.46,.075,.77);
  for(const x of [-.115,.115]) {
    box(cabin,aluminum,x,-.365,-11.79,.036,.018,.79);
    const lever=new THREE.Group();lever.position.set(x,-.41,-11.56);cabin.add(lever);
    beam(lever,aluminum,[0,0,0],[0,.37,-.13],.047);
    const grip=roundedBox(lever,ivory,0,.39,-.16,.15,.094,.23);
    action(grip,'throttle','Engine power');moving.throttles.push(lever);
  }
  const flapLever=new THREE.Group();flapLever.position.set(.383,-.40,-11.75);cabin.add(flapLever);
  beam(flapLever,aluminum,[0,0,0],[0,.26,-.04],.038);
  action(box(flapLever,ivory,0,.278,-.04,.085,.067,.12),'flaps','Flaps');
  moving.flapLever=flapLever;
  texturePlane(cabin,textTexture('POWER        FLAPS', '#dbc49c', 26,512,64),0,-.41,-11.38,.82,.077).rotation.x=-Math.PI/2;
  const pedestalAssembly=new THREE.Group();pedestalAssembly.position.z=-.7;
  cabin.children.slice(pedestalStart).filter(object=>object!==littleButtons&&object!==knobInstances).forEach(object=>pedestalAssembly.add(object));
  cabin.add(pedestalAssembly);
  const yokeBadge=textTexture('✈\nSkyJourney', '#c6baa4', 31,256,192);
  for(const x of [-1.16,1.32]) {
    const column=new THREE.Group();column.position.set(x,-.52,-13.0);cabin.add(column);
    beam(column,graphiteEdge,[0,-.51,.18],[0,.0,0],.13,.19);
    const yoke=new THREE.Group();yoke.position.set(0,.22,.09);column.add(yoke);moving.yokes.push(yoke);
    const curve=new THREE.CatmullRomCurve3([new THREE.Vector3(-.49,.29,0),new THREE.Vector3(-.54,-.19,.02),new THREE.Vector3(-.44,-.33,.015),new THREE.Vector3(0,-.37,0),new THREE.Vector3(.44,-.33,.015),new THREE.Vector3(.54,-.19,.02),new THREE.Vector3(.49,.29,0)]);
    mesh(register(new THREE.TubeGeometry(curve,32,.055,8,false)),rubber,yoke);
    roundedBox(yoke,graphiteEdge,0,-.14,.025,.43,.45,.13);
    roundedBox(yoke,rubber,0,-.14,.108,.385,.394,.028);
    texturePlane(yoke,yokeBadge,0,-.145,.127,.325,.257);
    for(const side of [-1,1]) {
      const grip=mesh(shared.capsule,rubber,yoke,side*.491,.19,.016);grip.scale.set(.075,.088,.071);grip.rotation.z=side*-.17;
      sphere(yoke,graphiteEdge,side*.49,.352,.01,.095,.085,.076);
      box(yoke,aluminum,side*.474,.247,.105,.047,.097,.027);
      const thumb=cylinder(yoke,graphiteEdge,side*.435,.35,.091,.044,.02);thumb.rotation.x=Math.PI/2;
    }
  }
  // Cushioned seats are behind the pilot eye, visible when looking around.
  for(const x of [-1.15,1.3]) {
    box(cabin,rubber,x,-.79,-10.54,.97,.29,1.05);
    box(cabin,graphiteEdge,x,-.08,-10.06,.97,1.16,.21).rotation.x=-.08;
    box(cabin,rubber,x,.68,-10.04,.59,.32,.24);
    for(const side of [-1,1]) box(cabin,graphiteEdge,x+side*.57,-.39,-10.66,.13,.12,.91);
  }

  // Personal items: ceramic pot, individual curved leaves, embossed notebook.
  const plantStart=cabin.children.length;
  const pot=cylinder(cabin,ivory,-2.0,-.315,-12.91,.183,.31);
  mesh(register(new THREE.TorusGeometry(.185,.018,8,24)),ivory,cabin,-2.0,-.148,-12.91).rotation.x=Math.PI/2;
  cylinder(cabin,material('#3e3527',.95,0),-2.0,-.15,-12.91,.166,.014);
  const leafMaterials=[material('#527443',.56,.0,{side:THREE.DoubleSide}),material('#849146',.52,0,{side:THREE.DoubleSide}),material('#405f37',.58,0,{side:THREE.DoubleSide})];
  const stemMaterial=material('#53643d',.8,0);
  for(let i=0;i<15;i++) {
    const angle=i*2.39996, length=.2+(i%4)*.053, stemHeight=.2+(i%5)*.055;
    const end=[-2.0+Math.sin(angle)*length*.8,-.14+stemHeight,-12.91+Math.cos(angle)*length*.8];
    beam(cabin,stemMaterial,[-2.0,-.14,-12.91],end,.009);
    const geo=register(new THREE.BufferGeometry()),verts=[],indices=[];
    for(let row=0;row<=8;row++){const t=row/8,width=Math.sin(t*Math.PI)*.066;for(let col=0;col<3;col++){const u=col-1;verts.push(u*width,Math.sin(t*Math.PI)*.05+t*.035+(1-u*u)*width*.27,t*length);}}
    for(let row=0;row<8;row++)for(let col=0;col<2;col++){const a=row*3+col;indices.push(a,a+3,a+1,a+1,a+3,a+4);}
    geo.setAttribute('position',new THREE.Float32BufferAttribute(verts,3));geo.setIndex(indices);geo.computeVertexNormals();
    const leaf=mesh(geo,leafMaterials[i%3],cabin,...end);leaf.rotation.y=angle;leaf.rotation.x=.2+(i%4)*.12;
  }
  const plantAssembly=new THREE.Group();plantAssembly.position.set(-2.28,-.25,-13.25);plantAssembly.scale.setScalar(.65);
  cabin.children.slice(plantStart).forEach(object=>{object.position.sub(new THREE.Vector3(-2,-.47,-12.91));plantAssembly.add(object);});cabin.add(plantAssembly);
  const notebookTexture=canvasTexture(512,640,ctx=>{
    ctx.fillStyle='#232c35';ctx.fillRect(0,0,512,640);ctx.strokeStyle='#5c574c';ctx.lineWidth=8;ctx.strokeRect(8,8,496,624);
    ctx.fillStyle='#b99763';ctx.font='500 35px Arial';ctx.textAlign='center';['EXPLORE','PRACTICE','IMPROVE'].forEach((t,i)=>ctx.fillText(t,256,225+i*55));
    ctx.fillStyle='#aeb0ad';ctx.font='italic 31px Georgia';['More skies,','brighter days.'].forEach((t,i)=>ctx.fillText(t,256,471+i*39));
  }).texture;
  const notebookGroup=new THREE.Group();notebookGroup.position.set(-1.94,-.61,-12.44);notebookGroup.rotation.set(-.32,.13,.03);cabin.add(notebookGroup);
  box(notebookGroup,paper,0,0,0,.64,.037,.79);
  box(notebookGroup,navy,0,.023,0,.67,.015,.81);
  texturePlane(notebookGroup,notebookTexture,0,.032,0,.65,.79).rotation.x=-Math.PI/2;
  // Right tray and actual hollow mug; the handle is a torus rather than a sprite.
  const rightAccessoriesStart=cabin.children.length;
  box(cabin,graphiteEdge,2.04,-.47,-11.93,1.03,.08,1.36);
  box(cabin,paper,1.91,-.409,-11.99,.6,.045,.73).rotation.y=.10;
  for(let i=0;i<11;i++) box(cabin,warmTrim,1.91,-.384,-12.25+i*.042,.48,.0015,.002);
  const pen=cylinder(cabin,rubber,2.07,-.359,-11.71,.013,.65);pen.rotation.z=Math.PI/2;pen.rotation.y=-.33;
  const mug=mesh(register(new THREE.CylinderGeometry(.182,.159,.36,32,1,true)),ivory,cabin,2.31,-.235,-12.11);
  const coffee=cylinder(cabin,material('#403126',.2,0),2.31,-.071,-12.11,.167,.009);
  const mugRim=mesh(register(new THREE.TorusGeometry(.174,.016,8,32)),ivory,cabin,2.31,-.052,-12.11);mugRim.rotation.x=Math.PI/2;
  const handle=mesh(register(new THREE.TorusGeometry(.105,.027,8,24)),ivory,cabin,2.52,-.24,-12.10);handle.rotation.y=Math.PI/2;
  texturePlane(cabin,textTexture('Good Flights\nBrighter Tomorrows', '#4c4e4a', 29,512,192),2.31,-.23,-11.915,.28,.197);
  mug.name='Ceramic Good Flights mug';coffee.name='Coffee surface';
  const rightAccessories=new THREE.Group();rightAccessories.position.z=-.7;
  cabin.children.slice(rightAccessoriesStart).forEach(object=>rightAccessories.add(object));cabin.add(rightAccessories);
  // Warm indirect light is fixed to the actual deck, and follows the aircraft.
  const cabinFill=new THREE.PointLight('#ffc38c',1.05,7,2);cabinFill.position.set(-1.55,.34,-12.5);cabin.add(cabinFill);
  const coolFill=new THREE.PointLight('#a9c3e1',5.0,8,2);coolFill.position.set(.7,1.4,-11.3);cabin.add(coolFill);

  const clamp=THREE.MathUtils.clamp;
  const num=(value,fallback=0)=>Number.isFinite(value)?value:fallback;
  const degree=r=>r*180/Math.PI;
  function base(ctx,w,h,title) {
    ctx.fillStyle='#081521';ctx.fillRect(0,0,w,h);
    const shade=ctx.createLinearGradient(0,0,0,h);shade.addColorStop(0,'#172c3c');shade.addColorStop(1,'#07101b');ctx.fillStyle=shade;ctx.fillRect(0,0,w,h);
    ctx.strokeStyle='#375466';ctx.lineWidth=2;ctx.strokeRect(2,2,w-4,h-4);
    ctx.font=`500 ${Math.round(w*.028)}px Arial`;ctx.fillStyle='#b7d7e4';ctx.textAlign='left';ctx.fillText(title,18,28);
  }
  function drawPFD(state,ap) {
    const ctx=pfd.context,w=pfd.canvas.width,h=pfd.canvas.height;
    base(ctx,w,h,'PFD  •  SKYJOURNEY');
    const cx=w*.5,cy=h*.47,r=w*.29;
    ctx.save();ctx.beginPath();ctx.roundRect(cx-r,cy-r,r*2,r*2,r*.18);ctx.clip();
    ctx.translate(cx,cy);ctx.rotate(-num(state.roll));ctx.translate(0,degree(num(state.pitch))*3.3);
    ctx.fillStyle='#4379bd';ctx.fillRect(-w,-h*3,w*2,h*3);ctx.fillStyle='#b97b42';ctx.fillRect(-w,0,w*2,h*3);
    ctx.strokeStyle='#e4d6b5';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(-w,0);ctx.lineTo(w,0);ctx.stroke();
    for(let p=-30;p<=30;p+=5) if(p!==0) {
      const yy=-p*3.3,half=p%10===0?51:26;ctx.strokeStyle='#e3eced';ctx.lineWidth=1.5;ctx.beginPath();ctx.moveTo(-half,yy);ctx.lineTo(half,yy);ctx.stroke();
      if(p%10===0){ctx.fillStyle='#eef2ef';ctx.font='15px Arial';ctx.textAlign='right';ctx.fillText(Math.abs(p),-half-8,yy+5);ctx.textAlign='left';ctx.fillText(Math.abs(p),half+8,yy+5);}
    }
    ctx.restore();
    ctx.strokeStyle='#f4d78a';ctx.lineWidth=4;ctx.beginPath();ctx.moveTo(cx-64,cy);ctx.lineTo(cx-19,cy);ctx.lineTo(cx-19,cy+9);ctx.moveTo(cx+64,cy);ctx.lineTo(cx+19,cy);ctx.lineTo(cx+19,cy+9);ctx.stroke();
    ctx.strokeStyle='#c9dcdf';ctx.lineWidth=2;
    for(let a=-60;a<=60;a+=10){const rad=(a-90)*Math.PI/180;const inner=r+(a%30===0?0:6);ctx.beginPath();ctx.moveTo(cx+Math.cos(rad)*inner,cy+Math.sin(rad)*inner);ctx.lineTo(cx+Math.cos(rad)*(r+13),cy+Math.sin(rad)*(r+13));ctx.stroke();}
    const speed=num(state.ias,280),alt=num(state.altitude,32000);
    for(const [x,val,step] of [[w*.08,speed,20],[w*.81,alt,1000]]){
      ctx.fillStyle='#293b52';ctx.fillRect(x,cy-r, w*.115,r*2);
      ctx.textAlign='center';ctx.font='17px monospace';ctx.fillStyle='#c7dce4';
      for(let i=-3;i<=3;i++){const v=Math.round(val/step)*step+i*step;const yy=cy-(v-val)*(r/3)/step;if(yy>cy-r+18&&yy<cy+r-12)ctx.fillText(Math.max(0,v),x+w*.057,yy+5);}
      ctx.fillStyle='#0a131d';ctx.fillRect(x-5,cy-18,w*.135,37);ctx.strokeStyle='#d3deb9';ctx.lineWidth=2;ctx.strokeRect(x-5,cy-18,w*.135,37);ctx.fillStyle='#edeee6';ctx.font='bold 24px monospace';ctx.fillText(Math.round(val),x+w*.057,cy+8);
    }
    const vs=num(state.verticalSpeed),heading=((degree(num(state.heading))%360)+360)%360;
    ctx.fillStyle='#b9d5df';ctx.textAlign='right';ctx.font='17px monospace';ctx.fillText(`VS ${vs>=0?'+':''}${Math.round(vs)}`,w-20,h-62);
    ctx.textAlign='center';ctx.font='25px monospace';ctx.fillText(`${Math.round(heading).toString().padStart(3,'0')}°`,cx,h-62);
    ctx.strokeStyle='#658293';ctx.beginPath();ctx.arc(cx,h-75,w*.21,Math.PI*1.15,Math.PI*1.85);ctx.stroke();
    ctx.font='17px Arial';ctx.fillStyle=ap?.enabled?'#91e0ba':'#b8cfe1';ctx.fillText(ap?.enabled?'AP  •  FLIGHT DIRECTOR':'MANUAL  •  ASSISTED FLIGHT',cx,58);
    ctx.fillStyle='#7fadc0';ctx.font='14px Arial';ctx.fillText('IAS · KTS           ALT · FT           ATTITUDE',cx,h-20);
    pfd.texture.needsUpdate=true;
  }
  const flightTrack=[];
  let lastTrackPosition=null;
  function drawND(state,world={}) {
    const ctx=nd.context,w=nd.canvas.width,h=nd.canvas.height;
    base(ctx,w,h,'NAV  •  ISLAND EXPLORER');
    const pos=state.position||{x:0,z:0};
    const mapX=w*.51,mapY=h*.70,mapRadius=w*.36,mapScale=mapRadius/50000;
    const heading=num(state.heading),cosHeading=Math.cos(heading),sinHeading=Math.sin(heading);
    const mapPoint=(x,z)=>{const dx=x-num(pos.x),dz=z-num(pos.z);return [mapX+(dx*cosHeading+dz*sinHeading)*mapScale,mapY+(-dx*sinHeading+dz*cosHeading)*mapScale];};
    ctx.save();ctx.beginPath();ctx.rect(w*.145,55,w*.73,h-95);ctx.clip();
    ctx.fillStyle='#112a41';ctx.fillRect(w*.145,55,w*.73,h-95);
    ctx.strokeStyle='#243d51';ctx.lineWidth=1;
    for(let i=-2;i<=2;i++){ctx.beginPath();ctx.moveTo(mapX+i*mapRadius*.4,55);ctx.lineTo(mapX+i*mapRadius*.4,h-40);ctx.moveTo(w*.145,mapY+i*mapRadius*.4);ctx.lineTo(w*.875,mapY+i*mapRadius*.4);ctx.stroke();}
    const islands=world.islands||[];
    for(const island of islands){
      const [ix,iy]=mapPoint(island.x,island.z),radiusX=num(island.rx,num(island.radius,3500))*mapScale,radiusZ=num(island.rz,num(island.radius,3500))*mapScale;
      if(ix+radiusX*1.3<0||ix-radiusX*1.3>w||iy+radiusZ*1.3<0||iy-radiusZ*1.3>h)continue;
      ctx.beginPath();for(let i=0;i<64;i++){const a=i/64*Math.PI*2;const seed=num(island.seed);const ripple=world.coast?world.coast(island,a):1+.14*Math.sin(a*3+seed)+.085*Math.sin(a*7-seed)+.045*Math.sin(a*13+seed*3);const x=ix+Math.cos(a)*radiusX*ripple,y=iy+Math.sin(a)*radiusZ*ripple;(i?ctx.lineTo(x,y):ctx.moveTo(x,y));}ctx.closePath();ctx.fillStyle='#607663';ctx.fill();ctx.strokeStyle='#b5b19b';ctx.lineWidth=2;ctx.stroke();
      ctx.beginPath();ctx.ellipse(ix-radiusX*.12,iy+radiusZ*.05,radiusX*.48,radiusZ*.36,.3,0,Math.PI*2);ctx.fillStyle='#85907a';ctx.fill();
    }
    const route=Array.isArray(world.route)?world.route:world.route?.waypoints||world.waypoints||[];
    if(route.length){ctx.strokeStyle='#de7bc4';ctx.lineWidth=2.5;ctx.beginPath();route.forEach((point,i)=>{const [x,y]=mapPoint(point.x??point.position?.x??0,point.z??point.position?.z??0);i?ctx.lineTo(x,y):ctx.moveTo(x,y);});ctx.stroke();
      route.forEach((point,i)=>{const [x,y]=mapPoint(point.x??point.position?.x??0,point.z??point.position?.z??0);ctx.strokeStyle='#e4a0d5';ctx.lineWidth=1.4;ctx.strokeRect(x-4,y-4,8,8);ctx.fillStyle='#e5d4e4';ctx.font='12px Arial';ctx.fillText(point.name||`SJ${i+1}`,x+8,y-5);});}
    if(flightTrack.length>1){ctx.strokeStyle='#71b6b2';ctx.lineWidth=1.8;ctx.beginPath();flightTrack.forEach((point,i)=>{const [x,y]=mapPoint(point.x,point.z);i?ctx.lineTo(x,y):ctx.moveTo(x,y);});ctx.stroke();}
    ctx.save();ctx.translate(mapX,mapY);ctx.fillStyle='#f0f2e9';ctx.beginPath();ctx.moveTo(0,-23);ctx.lineTo(4,-3);ctx.lineTo(20,9);ctx.lineTo(20,12);ctx.lineTo(4,7);ctx.lineTo(3,21);ctx.lineTo(10,26);ctx.lineTo(10,29);ctx.lineTo(0,26);ctx.lineTo(-10,29);ctx.lineTo(-10,26);ctx.lineTo(-3,21);ctx.lineTo(-4,7);ctx.lineTo(-20,12);ctx.lineTo(-20,9);ctx.lineTo(-4,-3);ctx.closePath();ctx.fill();ctx.restore();
    ctx.strokeStyle='#78939e';ctx.lineWidth=1;ctx.setLineDash([4,7]);ctx.beginPath();ctx.arc(mapX,mapY,mapRadius*.7,0,Math.PI*2);ctx.stroke();ctx.setLineDash([]);ctx.restore();
    const next=route[world.currentWaypoint??world.route?.index??world.route?.currentWaypoint??0];
    const distance=next?Math.hypot((next.x??next.position?.x??0)-num(pos.x),(next.z??next.position?.z??0)-num(pos.z))/1852:0;
    const eta=distance/Math.max(1,num(state.groundSpeed,280))*60;
    ctx.fillStyle='#c5dce5';ctx.textAlign='left';ctx.font='18px Arial';ctx.fillText('SPD',15,89);ctx.font='27px monospace';ctx.fillText(Math.round(num(state.ias,280)),15,121);
    ctx.font='18px Arial';ctx.fillText('ALT',15,185);ctx.font='24px monospace';ctx.fillText(Math.round(num(state.altitude,32000)),15,215);
    ctx.font='18px Arial';ctx.fillText('HDG',15,283);ctx.font='25px monospace';ctx.fillText(`${Math.round(((degree(num(state.heading))%360)+360)%360)}°`,15,314);
    ctx.textAlign='right';ctx.font='15px Arial';ctx.fillText(next?.name||'FREE FLIGHT',w-16,89);ctx.font='19px monospace';ctx.fillText(next?`${distance.toFixed(0)} NM`:'—',w-16,120);ctx.font='15px Arial';ctx.fillText('ETA',w-16,188);ctx.font='20px monospace';ctx.fillText(next?`${Math.floor(eta/60).toString().padStart(2,'0')}:${Math.floor(eta%60).toString().padStart(2,'0')}`:'—',w-16,217);
    ctx.textAlign='center';ctx.font='15px Arial';ctx.fillStyle='#8baebe';ctx.fillText('RANGE  27 NM      •      HEADING UP',w*.51,h-17);
    nd.texture.needsUpdate=true;
  }
  function ring(ctx,x,y,r,value,color) {
    ctx.lineWidth=11;ctx.strokeStyle='#314350';ctx.beginPath();ctx.arc(x,y,r,Math.PI*.72,Math.PI*2.28);ctx.stroke();
    ctx.strokeStyle=color;ctx.beginPath();ctx.arc(x,y,r,Math.PI*.72,Math.PI*.72+Math.PI*1.56*clamp(value/100,0,1));ctx.stroke();
    ctx.font='bold 29px Arial';ctx.textAlign='center';ctx.fillStyle='#e2eee5';ctx.fillText(`${Math.round(value)}%`,x,y+9);
  }
  function drawEngines(state) {
    const ctx=engines.context,w=engines.canvas.width,h=engines.canvas.height;
    base(ctx,w,h,'ENGINES  •  POWERPLANT');
    const n1=num(state.n1,27+num(state.throttle,.68)*71);
    const temperature=num(state.temperature,12),egt=num(state.egt,350+(n1-20)/78*420);
    for(let i=0;i<2;i++){
      const x=w*(.265+i*.47);
      ctx.fillStyle='#cce1e3';ctx.textAlign='center';ctx.font='25px Arial';ctx.fillText(`ENG ${i+1}`,x,84);
      ring(ctx,x,180,66,n1,'#7fc5a1');ctx.font='18px Arial';ctx.fillStyle='#b1d4d5';ctx.fillText('N1',x,277);
      ctx.font='27px monospace';ctx.fillStyle='#d5e8e5';ctx.fillText(`${Math.round(egt)} °C`,x,320);
      ctx.font='17px Arial';ctx.fillStyle='#8dabb8';ctx.fillText('EGT',x,349);
      ctx.font='24px monospace';ctx.fillStyle='#cee4df';ctx.fillText(`${(num(state.fuelFlow,(.06+(n1-20)/78*.73)/2)*3.6).toFixed(1)} t/h`,x,396);ctx.font='16px Arial';ctx.fillStyle='#8dabb8';ctx.fillText('FUEL FLOW',x,426);
    }
    ctx.strokeStyle='#35505d';ctx.beginPath();ctx.moveTo(25,459);ctx.lineTo(w-25,459);ctx.stroke();
    ctx.font='20px Arial';ctx.fillStyle='#b6d7d7';ctx.textAlign='left';const fuel=num(state.fuel,82);ctx.fillText(`FUEL ${fuel>100?(fuel/1000).toFixed(1)+' t':Math.round(fuel)+'%'}`,27,501);ctx.textAlign='right';ctx.fillText(`OAT ${Math.round(temperature)} °C`,w-27,501);
    ctx.textAlign='center';ctx.font='15px Arial';ctx.fillStyle='#7daf99';ctx.fillText('DUAL ENGINE  •  STABLE OPERATION',w*.5,h-19);
    engines.texture.needsUpdate=true;
  }
  function drawSystems(state) {
    const ctx=systems.context,w=systems.canvas.width,h=systems.canvas.height;
    base(ctx,w,h,'AIRCRAFT SYSTEMS');
    const cx=w*.5;ctx.save();ctx.translate(cx,h*.38);
    ctx.strokeStyle='#8eb5ca';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(0,-112);ctx.bezierCurveTo(22,-111,21,-53,19,-30);ctx.lineTo(122,49);ctx.lineTo(127,77);ctx.lineTo(19,28);ctx.lineTo(16,96);ctx.lineTo(60,127);ctx.lineTo(57,145);ctx.lineTo(0,119);ctx.lineTo(-57,145);ctx.lineTo(-60,127);ctx.lineTo(-16,96);ctx.lineTo(-19,28);ctx.lineTo(-127,77);ctx.lineTo(-122,49);ctx.lineTo(-19,-30);ctx.bezierCurveTo(-21,-53,-22,-111,0,-112);ctx.closePath();ctx.stroke();
    ctx.fillStyle='#9ed7b0';for(const x of [-48,48]){ctx.beginPath();ctx.ellipse(x,18,7,19,0,0,Math.PI*2);ctx.fill();}ctx.restore();
    const fuel=num(state.fuel,82), gear=Boolean(state.gear), lowFuel=fuel<=100?fuel<15:fuel<1800;
    const operationalStatus=typeof state.status==='string'&&/stall|overspeed|warning|collision|impact|damage|engine failure/i.test(state.status)?state.status:null;
    const status=operationalStatus|| (lowFuel?'Fuel reserve advisory':gear?'Landing configuration':num(state.flaps)>0?'Flaps extended':'All systems normal');
    ctx.textAlign='center';ctx.fillStyle=lowFuel?'#edd594':'#a1dfc0';ctx.font='20px Arial';ctx.fillText(status,cx,h*.74);
    ctx.strokeStyle='#567480';ctx.beginPath();ctx.moveTo(w*.23,h*.785);ctx.lineTo(w*.77,h*.785);ctx.stroke();
    ctx.font='22px Arial';ctx.fillStyle='#b2c2cd';ctx.fillText('Have a',cx,h*.86);ctx.fillText('nice flight',cx,h*.908);
    systems.texture.needsUpdate=true;
  }
  function drawAP(state,ap={}) {
    const ctx=apReadout.context,w=apReadout.canvas.width,h=apReadout.canvas.height;
    ctx.fillStyle='#101821';ctx.fillRect(0,0,w,h);ctx.textAlign='center';
    const values=[Math.round(num(ap.speed,num(state.ias,280))),Math.round(num(ap.heading,degree(num(state.heading)))),Math.round(num(ap.altitude,num(state.altitude,32000))),Math.round(num(ap.vs))];
    ['SPD','HDG','ALT','VS'].forEach((label,i)=>{
      const x=w*(.125+i*.25);ctx.fillStyle='#b6c9d4';ctx.font='25px Arial';ctx.fillText(label,x,40);ctx.fillStyle='#e0eee9';ctx.font='42px monospace';ctx.fillText(values[i],x,96);
      ctx.fillStyle=ap.enabled?'#90cead':'#697b89';ctx.fillRect(x-12,126,24,4);
      if(i){ctx.strokeStyle='#354047';ctx.beginPath();ctx.moveTo(w*i*.25,17);ctx.lineTo(w*i*.25,h-18);ctx.stroke();}
    });apReadout.texture.needsUpdate=true;
    apButton.material=ap.enabled?graphiteEdge:rubber;
  }
  let instrumentTime=-1000,lastFanTime=0;
  const cameraPositions={
    pilot:new THREE.Vector3(-.65,1.0,-11.3),copilot:new THREE.Vector3(.65,1.0,-11.3),
    cockpitTarget:new THREE.Vector3(.8,-1.8,-21),
    chase:new THREE.Vector3(-33,14,49),wing:new THREE.Vector3(-24,3,5),nose:new THREE.Vector3(0,4,-37),
  };
  function update(state,controls={},autopilot={},world={}) {
    const now=performance.now();const delta=clamp((now-lastFanTime)/1000,0,.05);lastFanTime=now;
    for(const fan of moving.fans)fan.rotation.z+=delta*(8+num(state.throttle,.7)*38);
    for(const {object,side} of moving.ailerons)object.rotation.x=side*num(controls.roll)*.21;
    const flapSetting=clamp(num(state.flaps)/3,0,1);
    for(const flap of moving.flaps)flap.rotation.x=flapSetting*.57;
    for(const elevator of moving.elevators)elevator.rotation.x=-num(controls.pitch)*.2;
    moving.rudder.rotation.y=-num(controls.yaw)*.3;
    for(const gear of moving.gears){const deployed=typeof state.gear==='number'?state.gear:state.gear?1:0;gear.visible=deployed>.025;gear.scale.y=Math.max(.02,deployed);}
    for(const yoke of moving.yokes){yoke.rotation.z=-num(controls.roll)*.62;yoke.position.z=.09+num(controls.pitch)*.075;}
    for(const lever of moving.throttles)lever.rotation.x=-(num(state.throttle,.68)-.5)*.84;
    moving.flapLever.rotation.x=flapSetting*.5;
    for(let i=0;i<apKnobs.length;i++)apKnobs[i].rotation.z=((i===0?num(autopilot.speed,280):i===1?num(autopilot.heading):i===2?num(autopilot.altitude,32000)/100:num(autopilot.vs)/100)%10)*Math.PI/5;
    beaconMaterial.emissiveIntensity=.5+Math.max(0,Math.sin(now*.003))*1.3;
    if(now-instrumentTime>100){
      instrumentTime=now;
      const pos=state.position;
      if(pos&&(!lastTrackPosition||Math.hypot(num(pos.x)-lastTrackPosition.x,num(pos.z)-lastTrackPosition.z)>180)){
        lastTrackPosition={x:num(pos.x),z:num(pos.z)};flightTrack.push(lastTrackPosition);if(flightTrack.length>600)flightTrack.shift();
      }
      // Exterior flight also advances track, while texture work follows deck visibility.
      if(cabin.visible||!screens[0].texture.image.__initialized){
        drawPFD(state,autopilot);drawND(state,world);drawEngines(state);drawSystems(state);drawAP(state,autopilot);
        screens[0].texture.image.__initialized=true;
      }
    }
  }
  update({position:{x:0,y:9753,z:0},heading:0,pitch:0,roll:0,ias:280,altitude:32000,verticalSpeed:0,throttle:.68,gear:false,flaps:0,fuel:82,temperature:12},{},{enabled:true,speed:280,heading:0,altitude:32000,vs:0},{});
  const dispose=()=>{for(const resource of resources)resource.dispose();group.clear();interactables.length=0;};
  return {group,exterior,cabin,cameraPositions,update,interactables,dispose,dimensions:{length:39,wingspan:37,height:11.2},screens};
}
