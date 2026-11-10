import * as THREE from 'three';
import {createCockpitDisplays} from './cockpit-displays.js';
import {createCockpitMaterials,createCockpitLighting} from './cockpit-finish.js';
import {createCockpitRayEffects} from './cockpit-rays.js';

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
  const graphiteEdge = material('#53595e', .41, .28);
  const rubber = material('#1a2028', .69, .03);
  const paper = material('#e4d5b8', .9, 0);
  const ivory = material('#f3eee2', .26, .02);
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

  // The flight deck is assembled around a bowed shell; the four display bays have real recesses.
  const finish=createCockpitMaterials(register);
  const cabinLighting=createCockpitLighting(cabin,finish);
  const painter=createCockpitDisplays();
  const deck=new THREE.Group();deck.name='Flight-deck structure';cabin.add(deck);
  const live=new Set();
  const keep=object=>(live.add(object),object);
  const place=(parent,name,x=0,y=0,z=0)=>{
    const object=new THREE.Group();object.name=name;object.position.set(x,y,z);parent.add(object);return object;
  };
  const noShadow=object=>(object.castShadow=false,object.receiveShadow=false,object);
  const coolLight=finish.coolBacklight||finish.backlight;
  const daylightInk='#ccd5df', warmInk='#dbbb8f';
  const tactileParts=[],detents=[],legendTextures=new Map();
  let hoverAction=null,pressedAction=null,tapAction=null,tapTime=0;
  const interactionId=value=>typeof value==='string'?value:value?.userData?.action??null;
  function setCockpitInteraction(hover,pressed){
    hoverAction=interactionId(hover);
    const next=interactionId(pressed);
    if(next&&next!==pressedAction){tapAction=next;tapTime=.084;}
    pressedAction=next;
  }
  function tactile(part,id,travel=.013){
    tactileParts.push({part,id,z:part.position.z,travel,depth:0,highlight:0});
    return part;
  }

  function moldedBeam(parent,mat,start,end,width,depth=width){
    const a=new THREE.Vector3(...start), b=new THREE.Vector3(...end);
    const item=roundedBox(parent,mat,0,0,0,width,a.distanceTo(b),depth);
    item.position.copy(a).lerp(b,.5);
    item.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),b.sub(a).normalize());
    return item;
  }
  function bowedShell(name,mat,half,profile,wrap=.38,dip=.11){
    const vertices=[],uv=[],indices=[],n=profile.length,steps=22;
    for(let i=0;i<=steps;i++){
      const u=i/steps*2-1,s=u*u;
      for(let j=0;j<n;j++){const [y,z]=profile[j];vertices.push(u*half,y-dip*s,z+wrap*s);uv.push(i/steps,j/n);}
    }
    for(let i=0;i<steps;i++)for(let j=0;j<n;j++){
      const a=i*n+j,b=a+n,d=i*n+(j+1)%n,c=d+n;indices.push(a,b,d,b,c,d);
    }
    for(let j=1;j<n-1;j++)indices.push(0,j,j+1,steps*n,steps*n+j+1,steps*n+j);
    const geometry=register(new THREE.BufferGeometry());
    geometry.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));
    geometry.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));geometry.setIndex(indices);geometry.computeVertexNormals();
    const object=mesh(geometry,mat,deck);object.name=name;return object;
  }
  function line(parent,mat,points,radius=.009,steps=14){
    const path=new THREE.CatmullRomCurve3(points.map(point=>new THREE.Vector3(...point)));
    return noShadow(mesh(register(new THREE.TubeGeometry(path,steps,radius,7,false)),mat,parent));
  }
  function faceRing(parent,mat,w,h,wall,depth,z,r=.06){
    const outline=(p,W,H,R)=>{
      const x=W/2,y=H/2;R=Math.min(R,x*.7,y*.7);
      p.moveTo(-x+R,-y);p.lineTo(x-R,-y);p.quadraticCurveTo(x,-y,x,-y+R);
      p.lineTo(x,y-R);p.quadraticCurveTo(x,y,x-R,y);p.lineTo(-x+R,y);
      p.quadraticCurveTo(-x,y,-x,y-R);p.lineTo(-x,-y+R);p.quadraticCurveTo(-x,-y,-x+R,-y);
    };
    const shape=new THREE.Shape(),hole=new THREE.Path();
    outline(shape,w,h,r);outline(hole,w-2*wall,h-2*wall,Math.max(.014,r-wall*.55));shape.holes.push(hole);
    const geometry=register(new THREE.ExtrudeGeometry(shape,{depth,bevelEnabled:true,bevelThickness:.007,bevelSize:.007,bevelSegments:2,curveSegments:4}));
    return mesh(geometry,mat,parent,0,0,z);
  }
  function pane(name,points){
    const geometry=register(new THREE.BufferGeometry());
    geometry.setAttribute('position',new THREE.Float32BufferAttribute(points.flat(),3));
    geometry.setAttribute('uv',new THREE.Float32BufferAttribute([0,0,1,0,1,1,0,1],2));
    geometry.setIndex([0,1,2,0,2,3]);geometry.computeVertexNormals();
    const glass=noShadow(mesh(geometry,finish.windshield,deck));glass.name=name;glass.renderOrder=2;
  }

  roundedBox(deck,finish.fabric,0,-1.23,-11.95,5.3,.19,5.75);
  for(const side of [-1,1]){
    const lining=roundedBox(deck,finish.wall,side*2.62,-.24,-12.16,.23,1.66,3.63);
    lining.rotation.y=side*.055;
    roundedBox(deck,finish.panel,side*2.50,.51,-12.18,.40,.095,3.3);
    roundedBox(deck,finish.edge,side*2.58,-.18,-12.47,.27,.13,2.30);
    moldedBeam(deck,finish.trim,[side*2.64,.58,-13.46],[side*2.55,.48,-10.90],.074,.095);
    moldedBeam(deck,finish.backlight,[side*2.45,.185,-13.73],[side*2.48,-.055,-11.48],.015,.018);
    moldedBeam(deck,finish.rubber,[side*2.43,.17,-13.78],[side*2.465,-.08,-11.44],.050,.041);
    roundedBox(deck,finish.rubber,side*2.58,.13,-12.58,.092,.27,.59);
    for(let i=0;i<8;i++)box(deck,finish.edge,side*2.526,.03+i*.026,-12.58,.032,.008,.47);
    const inset=roundedBox(deck,finish.coaming,side*2.29,.55,-12.49,.21,.035,.34);
    inset.rotation.y=side*.09;
    for(let i=0;i<3;i++)roundedBox(deck,finish.metal,side*2.29,.57,-12.58+i*.085,.09,.023,.044);
  }

  const LL=[-2.20,.655,-13.80],UL=[-2.61,2.20,-13.18];
  const LM=[.77,.698,-14.24],UM=[1.15,2.20,-13.31];
  const LR=[2.57,.606,-13.48],UR=[2.79,2.15,-12.93];
  const lowerSide=[-2.65,.54,-11.82],upperSide=[-2.80,2.09,-11.87];
  pane('Pilot windscreen glass',[LL,LM,UM,UL]);
  pane('Copilot windscreen glass',[LM,LR,UR,UM]);
  pane('Pilot quarter glass',[lowerSide,LL,UL,upperSide]);
  function windshieldWiper(name,left,right,upper,mirrored,armLength){
    const start=new THREE.Vector3(...left),end=new THREE.Vector3(...right);
    const across=end.clone().sub(start).normalize();
    const up=new THREE.Vector3(...upper).sub(start);
    up.addScaledVector(across,-up.dot(across)).normalize();
    const normal=new THREE.Vector3().crossVectors(across,up).normalize();
    const mount=keep(place(deck,name));mount.visible=false;
    mount.position.copy(start).lerp(end,mirrored?.87:.105).addScaledVector(normal,-.017).addScaledVector(up,-.024);
    mount.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(across,up,normal));
    const arm=place(mount,'Hinged wiper arm');
    const barrel=noShadow(cylinder(mount,finish.metal,0,0,0,.043,.034));barrel.rotation.x=Math.PI/2;
    noShadow(moldedBeam(arm,finish.metal,[0,0,.008],[armLength*.72,.008,.008],.026,.016));
    noShadow(moldedBeam(arm,finish.edge,[armLength*.6,.006,.006],[armLength*.87,-.012,.008],.015,.014));
    noShadow(roundedBox(arm,finish.metal,armLength*.80,-.012,.009,armLength*.58,.025,.021));
    noShadow(roundedBox(arm,finish.rubber,armLength*.80,-.026,.014,armLength*.64,.013,.024));
    const park=.055;
    arm.rotation.z=mirrored?Math.PI-park:park;
    return {mount,arm,mirrored,park};
  }
  const wiperRigs=[windshieldWiper('Pilot windshield wiper',LL,LM,UL,false,.97),windshieldWiper('Copilot windshield wiper',LM,LR,UM,true,.73)];
  let wiperPhase=0,wiperAngle=0;
  for(const [name,a,b,w] of [['Pilot A-pillar',LL,UL,.205],['Central windscreen mullion',LM,UM,.184],['Copilot A-pillar',LR,UR,.155]]){
    const frame=moldedBeam(deck,finish.wall,a,b,w,.17);frame.name=name;
    const sign=a[0]<0?1:-1;
    moldedBeam(deck,finish.rubber,[a[0]+sign*w*.54,a[1]-.018,a[2]+.011],[b[0]+sign*w*.54,b[1],b[2]+.011],.033,.11);
    moldedBeam(deck,finish.trim,[a[0]-sign*w*.36,a[1]+.02,a[2]+.082],[b[0]-sign*w*.36,b[1]-.02,b[2]+.082],.012,.029);
  }
  moldedBeam(deck,finish.edge,UL,UM,.138,.18);
  moldedBeam(deck,finish.edge,UM,UR,.130,.18);
  moldedBeam(deck,finish.rubber,LL,LM,.045,.083);
  moldedBeam(deck,finish.rubber,LM,LR,.043,.079);
  moldedBeam(deck,finish.wall,UL,upperSide,.142,.143);
  moldedBeam(deck,finish.edge,LL,lowerSide,.112,.129);
  bowedShell('Molded overhead liner',finish.wall,2.64,[[2.20,-12.96],[2.31,-12.98],[2.36,-11.31],[2.27,-10.58],[2.20,-10.61]],.19,.115);
  const overhead=place(deck,'Inset overhead switch panel',.19,2.195,-13.09);
  roundedBox(overhead,finish.coaming,0,.035,0,2.16,.13,1.40);
  roundedBox(overhead,finish.panel,0,-.029,-.04,1.94,.064,1.18);
  for(let bank=0;bank<3;bank++){
    const x=(bank-1)*.61;
    roundedBox(overhead,finish.rubber,x,-.073,-.11,.54,.041,.79);
    for(let i=0;i<4;i++){
      roundedBox(overhead,finish.edge,x-.146+i*.098,-.102,-.08,.074,.035,.071);
      noShadow(box(overhead,i===1?finish.backlight:coolLight,x-.146+i*.098,-.121,-.098,.029,.006,.019));
    }
    for(let i=0;i<3;i++){
      const knob=cylinder(overhead,finish.metal,x-.154+i*.154,-.108,.144,.035,.055);
      knob.rotation.x=.03;
    }
  }
  for(const x of [-.81,.81]){
    cylinder(overhead,finish.coaming,x,-.086,-.48,.109,.065);
    cylinder(overhead,finish.brushed,x,-.122,-.48,.073,.023);
    const lens=noShadow(cylinder(overhead,finish.domeLens||finish.backlight,x,-.137,-.48,.050,.012));
    lens.name='Overhead dome lens';
  }
  const overheadLamps=[];
  const overheadLegend=canvasTexture(640,120,(ctx,w,h)=>{
    ctx.fillStyle='#17202c';ctx.fillRect(0,0,w,h);ctx.strokeStyle='#647288';ctx.lineWidth=2;ctx.strokeRect(2,2,w-4,h-4);
    ctx.textAlign='center';ctx.textBaseline='middle';ctx.font='700 31px sans-serif';ctx.fillStyle='#d2dce4';
    ['DOME','CHECK','WIPER'].forEach((text,i)=>ctx.fillText(text,(i+.5)*w/3,h*.47));
  }).texture;
  texturePlane(overhead,overheadLegend,0,-.106,-.405,1.20,.136).rotation.x=Math.PI/2;
  for(let i=0;i<3;i++){
    const x=(i-1)*.400;
    noShadow(roundedBox(overhead,finish.recess||finish.coaming,x,-.113,-.324,.073,.016,.028));
    overheadLamps.push(keep(noShadow(roundedBox(overhead,i===2?finish.backlight:coolLight,x,-.124,-.324,.047,.007,.014))));
  }

  bowedShell('Bowed instrument fascia',finish.panel,2.61,[[-.82,-13.49],[-.75,-13.34],[-.36,-13.37],[.19,-13.43],[.38,-13.52],[.42,-13.75],[.31,-13.94],[-.68,-13.91],[-.84,-13.72]]);
  bowedShell('Lower knee bolster',finish.wall,2.57,[[-1.05,-13.63],[-1.00,-13.46],[-.82,-13.39],[-.74,-13.43],[-.73,-13.71],[-.97,-13.82]],.40,.08);
  bowedShell('Sculpted glare shield',finish.coaming,2.65,[[.55,-13.15],[.59,-13.07],[.645,-13.07],[.73,-13.18],[.768,-13.41],[.753,-13.77],[.716,-14.07],[.655,-14.13],[.58,-13.94]],.29,.125);
  bowedShell('Mode-control fascia',finish.edge,2.48,[[.27,-13.30],[.305,-13.16],[.55,-13.175],[.61,-13.25],[.63,-13.46],[.36,-13.60]],.33,.115);
  const curvePoints=(y,z,bow,dip,extent=2.53)=>Array.from({length:13},(_,i)=>{
    const u=i/6-1;return [u*extent,y-dip*u*u,z+bow*u*u];
  });
  line(deck,finish.trim,curvePoints(.706,-13.16,.28,.12),.014,28);
  line(deck,coolLight,curvePoints(.527,-13.137,.31,.118),.007,28);
  line(deck,finish.edge,curvePoints(-.765,-13.309,.37,.10),.016,28);
  for(const side of [-1,1]){
    const foot=place(deck,'Lower kick panel',side*1.18,-.995,-13.29);
    roundedBox(foot,finish.coaming,0,0,0,.65,.38,.16).rotation.x=-.20;
    for(const x of [-.17,.17]){
      roundedBox(foot,finish.rubber,x,-.018,.086,.225,.23,.065);
      for(let i=0;i<4;i++)noShadow(box(foot,finish.edge,x,-.082+i*.04,.124,.169,.010,.013));
    }
  }

  const screens=[],screenSources={};
  function display(parent,key,name,w,h,pixelsX,pixelsY,z=.024){
    const source=canvasTexture(pixelsX,pixelsY);
    const glass=register(new THREE.MeshBasicMaterial({map:source.texture,toneMapped:false,color:0xffffff}));
    const object=noShadow(mesh(shared.plane,glass,parent,0,0,z));object.scale.set(w,h,1);object.name=name;
    if(finish.glass){
      const cover=noShadow(mesh(shared.plane,finish.glass,parent,0,0,z+.002));
      cover.scale.set(w,h,1);cover.name=name+' anti-glare glass';cover.renderOrder=2;
    }
    const result={name,...source,object};
    screens.push(result);screenSources[key]=result;return result;
  }
  const fasciaAt=x=>{const v=x/2.6;return [.38*v*v,-.103*v*v];};
  function controlLabel(parent,text,x,y,z,w,h,color=daylightInk){
    const height=Math.max(32,Math.min(128,Math.round(256*h/w)));
    const key=text+'|'+color+'|'+height;
    if(!legendTextures.has(key))legendTextures.set(key,canvasTexture(256,height,(ctx,W,H)=>{
      ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillStyle=color;
      ctx.font='600 '+Math.round(H*.64)+'px sans-serif';ctx.fillText(text,W*.5,H*.53,W*.90);
    }).texture);
    return texturePlane(parent,legendTextures.get(key),x,y,z,w,h);
  }
  const screw=(parent,x,y,z,r=.013)=>{
    noShadow(cylinder(parent,finish.recess||finish.rubber,x,y,z-.004,r*1.24,.010)).rotation.x=Math.PI/2;
    noShadow(cylinder(parent,finish.brushed,x,y,z+.002,r,.013)).rotation.x=Math.PI/2;
    const slot=noShadow(box(parent,finish.rubber,x,y,z+.009,r*1.31,.003,.004));slot.rotation.z=(x*7+y*13)%Math.PI;
  };
  function keycap(parent,x,y,z,w,h,material=finish.edge){
    const key=noShadow(roundedBox(parent,material,x,y,z,w,h,.028));
    noShadow(roundedBox(parent,finish.rubber,x,y,z-.013,w+.015,h+.015,.020));
    return key;
  }
  function liveKey(parent,id,label,mark,x,y,z,w,h){
    const part=tactile(keep(place(parent,label,x,y,z)),id);
    noShadow(roundedBox(parent,finish.recess||finish.rubber,x,y,z-.017,w+.018,h+.014,.022));
    const button=action(noShadow(roundedBox(part,finish.knob||finish.edge,0,0,0,w,h,.032)),id,label);
    button.name=label+' key';
    controlLabel(part,mark,0,.001,.0175,w*.86,h*.72);
    return button;
  }
  const detailMatrix=new THREE.Object3D();
  function selector(parent,x,y,z,r,id,label,increment=1){
    const knob=keep(place(parent,label,x,y,z));
    const base=noShadow(cylinder(parent,finish.coaming,x,y,z-.021,r*1.31,.023));base.rotation.x=Math.PI/2;
    const rim=noShadow(cylinder(knob,finish.brushed,0,0,0,r,.069));rim.rotation.x=Math.PI/2;
    const grip=noShadow(cylinder(knob,finish.rubber,0,0,.029,r*.87,.029));grip.rotation.x=Math.PI/2;
    const cap=noShadow(cylinder(knob,finish.knob||finish.edge,0,0,.048,r*.67,.012));cap.rotation.x=Math.PI/2;
    const marker=noShadow(box(knob,finish.ivory,0,r*.42,.055,.006,r*.52,.005));
    const ribs=noShadow(register(new THREE.InstancedMesh(shared.box,finish.brushed,18)));
    ribs.name=label+' machined grip';
    for(let i=0;i<18;i++){
      const a=i*Math.PI/9;
      detailMatrix.position.set(Math.cos(a)*r*.945,Math.sin(a)*r*.945,.026);
      detailMatrix.rotation.set(0,0,a);detailMatrix.scale.set(.005,.0055,.026);detailMatrix.updateMatrix();ribs.setMatrixAt(i,detailMatrix.matrix);
    }
    knob.add(ribs);
    if(id){
      action(rim,id,label,increment);action(grip,id,label,increment);action(cap,id,label,increment);action(ribs,id,label,increment);action(marker,id,label,increment);
      tactile(knob,id,.007);detents.push({part:knob,id,increment,value:null,angle:0,target:0});
    }
    return knob;
  }
  function displayBay(key,name,x,w,pixelsX,pixelsY){
    const [wrap,dip]=fasciaAt(x),h=.84;
    const bay=place(deck,name+' bay',x,-.129+dip,-13.256+wrap);
    bay.rotation.set(-.102,-x*.035,0);
    roundedBox(bay,finish.coaming,0,0,-.066,w+.107,h+.137,.117);
    faceRing(bay,finish.brushed,w+.085,h+.106,.030,.026,.001,.046);
    faceRing(bay,finish.rubber,w+.039,h+.059,.021,.039,.020,.034);
    display(bay,key,name,w,h,pixelsX,pixelsY,.026);
    for(const side of [-1,1])for(const y of [-.424,.424])screw(bay,side*(w/2+.035),y,.047,.009);
    for(let i=0;i<5;i++){
      const x=-w*.36+i*w*.18;keycap(bay,x,-.480,.031,.061,.035);
      noShadow(box(bay,finish.accent,x,-.474,.047,.022,.003,.004));
    }
    return bay;
  }
  displayBay('pfd','Primary flight display',-1.49,1.125,720,620);
  displayBay('nd','Navigation display',-.237,1.25,760,620);
  displayBay('engines','Engine information',.96,1.053,680,620);
  displayBay('systems','Aircraft systems',1.99,.91,590,620);

  const mcp=place(deck,'Mode control panel',.17,.570,-12.959);mcp.rotation.x=-.055;
  const mcpWidth=2.50,mcpHeight=.245;
  roundedBox(mcp,finish.coaming,0,0,-.044,mcpWidth+.10,mcpHeight+.067,.098);
  faceRing(mcp,finish.edge,mcpWidth+.057,mcpHeight+.062,.025,.024,.014,.035);
  display(mcp,'ap','Mode control display',mcpWidth,mcpHeight,1140,175,.026);
  roundedBox(mcp,finish.panel,0,-.156,-.008,mcpWidth+.053,.081,.047);
  for(const [i,id,label,inc] of [[0,'speed','Speed',5],[1,'heading','Heading',5],[2,'altitude','Altitude',1000],[3,'vs','Vertical speed',250]]) {
    const x=-mcpWidth*.375+i*mcpWidth*.25;
    selector(mcp,x,-.158,.039,.044,id,label,inc);
    screw(mcp,x+.124,-.144,.033,.008);
  }
  selector(mcp,-.673,-.159,.038,.033,'ndRange','Navigation range');
  controlLabel(mcp,'RNG',-.567,-.159,.041,.085,.037,warmInk);
  liveKey(mcp,'systemPage','Systems page','SYS',-.012,-.158,.044,.124,.060);
  liveKey(mcp,'ap','Autopilot master','A/P',.606,-.158,.043,.142,.063);
  const apLamp=keep(noShadow(box(mcp,finish.backlight,.659,-.152,.064,.022,.010,.005)));
  const cabinLamps=[];
  for(const side of [-1,1]){
    const x=side<0?-1.74:1.785;
    const plate=place(deck,side<0?'Flight director and dimmer':'Flight deck service controls',x,.461,-13.063+fasciaAt(x)[0]*.65);
    plate.rotation.set(-.06,-side*.08,0);
    roundedBox(plate,finish.coaming,0,0,-.027,.49,.30,.079);
    for(const p of [-.201,.201])screw(plate,p,-.118,.024,.010);
    if(side<0){
      for(let i=0;i<3;i++){
        keycap(plate,(i-1)*.128,.066,.025,.099,.052);
        controlLabel(plate,['FD','BARO','LOC'][i],(i-1)*.128,.066,.044,.091,.037);
      }
      selector(plate,-.093,-.060,.027,.046,'cockpitDim','Cockpit lighting');
      controlLabel(plate,'DIM',.083,-.063,.044,.098,.039,warmInk);
    }else{
      controlLabel(plate,'DECK SERVICE',0,.093,.023,.308,.042,warmInk);
      for(const [i,id,label,mark] of [[0,'cockpitDome','Dome light','DOME'],[1,'cockpitChecklist','Flight checklist','CHECK'],[2,'cockpitWipers','Windshield wipers','WIPER']]){
        const dx=(i-1)*.143;
        liveKey(plate,id,label,mark,dx,.007,.043,.127,.075);
        noShadow(roundedBox(plate,finish.recess||finish.rubber,dx,-.065,.032,.048,.020,.013));
        cabinLamps.push(keep(noShadow(roundedBox(plate,i===2?finish.backlight:coolLight,dx,-.065,.042,.034,.010,.006))));
      }
    }
  }
  const gearPanel=place(deck,'Landing gear panel',-2.22,-.076,-12.935);
  gearPanel.rotation.y=.12;
  roundedBox(gearPanel,finish.coaming,0,0,-.032,.18,.362,.071);
  roundedBox(gearPanel,finish.rubber,0,-.016,.010,.079,.244,.022);
  controlLabel(gearPanel,'GEAR',0,.134,.023,.135,.041,warmInk);
  const gearSelector=tactile(keep(place(gearPanel,'Landing gear handle',0,-.036,.028)),'gear',.009);
  const gearStem=moldedBeam(gearSelector,finish.brushed,[0,-.04,0],[0,.075,.105],.035,.036);
  action(gearStem,'gear','Landing gear');
  action(roundedBox(gearSelector,finish.ivory,0,.076,.112,.112,.051,.071),'gear','Landing gear');

  // Sloped center pedestal: CDU keys, textured panels and a working twin-throttle quadrant.
  const pedestal=place(deck,'Center pedestal',.08,-.590,-12.98);pedestal.rotation.x=.202;
  roundedBox(pedestal,finish.wall,0,-.265,.025,1.05,.61,2.14);
  roundedBox(pedestal,finish.panel,0,.039,.036,1.11,.087,2.12);
  for(const side of [-1,1]){
    moldedBeam(pedestal,finish.trim,[side*.531,.075,-.91],[side*.531,.077,1.01],.026,.030);
    roundedBox(pedestal,finish.rubber,side*.39,.087,-.55,.25,.044,.63);
  }
  const consoleTexture=canvasTexture(840,700,(ctx,w,h)=>{
    ctx.fillStyle='#101720';ctx.fillRect(0,0,w,h);
    for(let row=0;row<3;row++)for(let col=0;col<3;col++){
      const x=13+col*273,y=13+row*228;
      ctx.fillStyle='#182430';ctx.fillRect(x,y,256,211);
      ctx.strokeStyle='#536174';ctx.lineWidth=2;ctx.strokeRect(x+2,y+2,252,207);
      ctx.fillStyle='#8ebac9';ctx.font='600 18px monospace';
      ctx.fillText([['COM 1','FMS / LEGS','COM 2'],['NAV 1','PERF INIT','NAV 2'],['ADF','PANEL TEST','AUDIO']][row][col],x+16,y+31);
      ctx.font='600 28px monospace';ctx.fillStyle=row===1?'#b1d8c2':'#a7d2e6';
      ctx.fillText([['124.850','ACTIVE','121.900'],['113.70','CRZ 320','115.50'],['0320','NORMAL','INT']][row][col],x+16,y+67);
      for(let i=0;i<3;i++){
        ctx.fillStyle=i===2?'#a48661':'#475e6e';ctx.fillRect(x+16,y+99+i*27,82-i*13,3);ctx.fillRect(x+150,y+99+i*27,68+i*7,3);
      }
    }
  }).texture;
  const consoleSurface=texturePlane(pedestal,consoleTexture,0,.096,-.482,.973,.694);
  consoleSurface.rotation.x=-Math.PI/2;
  for(let row=0;row<5;row++)for(let col=0;col<9;col++){
    const x=(col-4)*.099,z=-.755+row*.105;
    noShadow(roundedBox(pedestal,finish.edge,x,.106,z,.058,.025,.040));
    if((row+col)%4===0)noShadow(box(pedestal,coolLight,x,.12,z,.019,.004,.007));
  }
  for(const side of [-1,1])for(let i=0;i<3;i++)cylinder(pedestal,finish.brushed,side*.484,.109,-.73+i*.23,.027,.047);
  roundedBox(pedestal,finish.coaming,0,.10,.464,.713,.119,1.01);
  const rail=place(pedestal,'Throttle guide rails',0,.171,.448);
  for(const x of [-.119,.119]){
    roundedBox(rail,finish.rubber,x,-.016,0,.162,.041,.883);
    for(const side of [-1,1])noShadow(roundedBox(rail,finish.brushed,x+side*.066,.01,0,.014,.015,.777));
    for(let i=0;i<10;i++)noShadow(box(rail,i%3===0?finish.backlight:finish.trim,x+.076,.016,-.34+i*.077,.018,.006,.008));
    const lever=tactile(keep(place(rail,'Thrust lever',x,0,.164)),'throttle',.008);
    cylinder(lever,finish.coaming,0,.052,0,.065,.10).rotation.z=Math.PI/2;
    moldedBeam(lever,finish.brushed,[0,0,0],[0,.278,-.131],.055,.083);
    roundedBox(lever,finish.rubber,0,.273,-.114,.109,.116,.19);
    action(roundedBox(lever,finish.ivory,0,.324,-.159,.144,.080,.185),'throttle','Engine power');
    action(noShadow(roundedBox(lever,finish.edge,0,.362,-.167,.082,.010,.109)),'throttle','Engine power');
    moving.throttles.push(lever);
  }
  roundedBox(rail,finish.rubber,.316,.015,-.028,.086,.036,.73);
  for(let i=0;i<5;i++)noShadow(box(rail,finish.backlight,.355,.038,-.31+i*.116,.018,.008,.012));
  const flapLever=tactile(keep(place(rail,'Flaps detent lever',.315,.021,.06)),'flaps',.009);
  moldedBeam(flapLever,finish.brushed,[0,0,0],[0,.215,-.08],.033,.058);
  action(roundedBox(flapLever,finish.ivory,0,.224,-.088,.109,.057,.122),'flaps','Flaps');
  moving.flapLever=flapLever;
  const leverLegend=controlLabel(rail,'THRUST                FLAPS',0,.027,.443,.57,.070,warmInk);leverLegend.rotation.x=-Math.PI/2;
  const detentLegend=canvasTexture(96,512,(ctx,w,h)=>{
    ctx.fillStyle='#23262c';ctx.fillRect(0,0,w,h);
    ctx.fillStyle='#cdd8dd';ctx.font='700 52px monospace';ctx.textAlign='center';ctx.textBaseline='middle';
    for(let i=0;i<4;i++)ctx.fillText(String(i),w*.51,h*(.14+i*.24));
    ctx.fillStyle='#8f805e';ctx.fillRect(5,9,4,h-18);
  }).texture;
  texturePlane(rail,detentLegend,.403,.023,-.070,.048,.548).rotation.x=-Math.PI/2;

  function stitches(parent,path,count,zOffset=0,width=.0032){
    const thread=noShadow(register(new THREE.InstancedMesh(shared.box,finish.stitch||finish.trim,count)));
    const up=new THREE.Vector3(0,1,0),segment=new THREE.Vector3();
    thread.name='Stitched seam';
    for(let i=0;i<count;i++){
      const a=path.getPointAt((i+.08)/count),b=path.getPointAt((i+.62)/count);
      detailMatrix.position.copy(a).lerp(b,.5);detailMatrix.position.z+=zOffset;
      segment.copy(b).sub(a);detailMatrix.scale.set(width,segment.length(),width);
      detailMatrix.quaternion.setFromUnitVectors(up,segment.normalize());detailMatrix.updateMatrix();
      thread.setMatrixAt(i,detailMatrix.matrix);
    }
    parent.add(thread);return thread;
  }

  // Two articulated, multi-part yokes. Their fixed columns are separate from the moving control heads.
  const yokeBadge=textTexture('✈\nSkyJourney','#c7c1b4',36,256,182);
  const yokeCurve=new THREE.CatmullRomCurve3([
    [-.488,.256,0],[-.52,.056,.018],[-.515,-.193,.022],[-.447,-.264,.008],[-.28,-.273,.015],
    [0,-.272,.031],[.28,-.273,.015],[.447,-.264,.008],[.515,-.193,.022],[.52,.056,.018],[.488,.256,0]
  ].map(point=>new THREE.Vector3(...point)));
  const yokeBody=register(new THREE.TubeGeometry(yokeCurve,42,.064,12,false));
  for(const x of [-1.164,1.326]){
    const column=place(deck,'Yoke column',x,-.685,-12.969);
    roundedBox(column,finish.coaming,0,-.485,.145,.34,.18,.41);
    moldedBeam(column,finish.wall,[0,-.503,.18],[0,.11,.009],.183,.207);
    moldedBeam(column,finish.edge,[0,-.458,.27],[0,.075,.105],.099,.048);
    const yoke=keep(place(column,'Yoke control head',0,.156,.09));moving.yokes.push(yoke);
    mesh(yokeBody,finish.leather,yoke);
    stitches(yoke,yokeCurve,33,.064,.0027);
    roundedBox(yoke,finish.coaming,0,-.112,.009,.475,.399,.176);
    roundedBox(yoke,finish.brushed,0,-.104,.109,.431,.360,.031);
    roundedBox(yoke,finish.rubber,0,-.104,.134,.396,.325,.026);
    texturePlane(yoke,yokeBadge,0,-.100,.151,.30,.208);
    for(const side of [-1,1]){
      const hand=mesh(shared.capsule,finish.leather,yoke,side*.502,.158,.011);hand.scale.set(.078,.079,.081);hand.rotation.z=side*.154;
      const hood=roundedBox(yoke,finish.coaming,side*.496,.302,.008,.155,.146,.138);hood.rotation.z=side*.20;
      const thumb=cylinder(yoke,finish.edge,side*.492,.309,.088,.050,.026);thumb.rotation.x=Math.PI/2;
      noShadow(cylinder(yoke,finish.rubber,side*.492,.310,.105,.038,.012)).rotation.x=Math.PI/2;
      noShadow(roundedBox(yoke,finish.accent,side*.479,.155,.092,.034,.084,.018)).rotation.z=side*.13;
    }
  }

  for(const x of [-1.15,1.30]){
    roundedBox(deck,finish.fabric,x,-.803,-10.54,.97,.27,1.05);
    const seat=place(deck,'Stitched leather seat back',x,-.08,-10.09);seat.rotation.x=-.08;
    roundedBox(seat,finish.leather,0,0,0,.97,1.16,.20);
    roundedBox(seat,finish.leatherSeam||finish.leather,0,0,-.088,.744,.910,.038);
    const seam=new THREE.CatmullRomCurve3([[-.376,-.47],[-.417,-.37],[-.417,.34],[-.353,.465],[.353,.465],[.417,.34],[.417,-.37],[.376,-.47]].map(([x,y])=>new THREE.Vector3(x,y,-.105)),true);
    stitches(seat,seam,51,0,.004);
    roundedBox(deck,finish.fabric,x,.69,-10.07,.60,.31,.27);
    for(const side of [-1,1])roundedBox(deck,finish.edge,x+side*.55,-.40,-10.69,.134,.13,.87);
  }

  // Side ledges and smaller props sit outside the main instrument sight lines.
  for(const side of [-1,1]){
    const ledge=roundedBox(deck,finish.panel,side*2.25,-.493,-12.25,.77,.105,1.52);
    ledge.rotation.y=side*.09;
    moldedBeam(deck,finish.trim,[side*1.895,-.427,-12.95],[side*1.853,-.449,-11.57],.023,.031);
  }
  const soil=material('#3e3024',.94,0);
  const plant=place(deck,'Potted window plant',-2.36,-.450,-12.89);
  const potProfile=[[0,0],[.094,0],[.112,.014],[.128,.145],[.145,.192],[.149,.21],[.142,.219],[.130,.215],[.121,.192],[.109,.043],[0,.036]];
  mesh(register(new THREE.LatheGeometry(potProfile.map(p=>new THREE.Vector2(...p)),28)),finish.ivory,plant);
  cylinder(plant,soil,0,.193,0,.123,.014);
  const leaves=[material('#52653a',.54,0,{side:THREE.DoubleSide}),material('#77804b',.53,0,{side:THREE.DoubleSide}),material('#354e34',.56,0,{side:THREE.DoubleSide})];
  const stems=material('#53613a',.80,0);
  for(let i=0;i<13;i++){
    const a=i*2.39996,l=.118+(i%4)*.033,h=.13+(i%5)*.034;
    const end=[Math.sin(a)*l*.57,.187+h,Math.cos(a)*l*.57];
    moldedBeam(plant,stems,[0,.187,0],end,.007,.007);
    const verts=[],norm=[],indices=[];
    for(let row=0;row<=8;row++){
      const t=row/8,w=Math.sin(t*Math.PI)*(.029+(i%3)*.005);
      for(let col=0;col<3;col++){
        const u=col-1;verts.push(u*w,Math.sin(t*Math.PI)*.026+t*.018+(1-u*u)*w*.28,t*l);
        norm.push(col/2,t);
      }
    }
    for(let row=0;row<8;row++)for(let col=0;col<2;col++){
      const j=row*3+col;indices.push(j,j+3,j+1,j+1,j+3,j+4);
    }
    const g=register(new THREE.BufferGeometry());g.setAttribute('position',new THREE.Float32BufferAttribute(verts,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(norm,2));g.setIndex(indices);g.computeVertexNormals();
    const leaf=mesh(g,leaves[i%3],plant,...end);leaf.rotation.set(.16+(i%4)*.15,a,0);
  }
  const bookArt=canvasTexture(512,640,(ctx,w,h)=>{
    ctx.fillStyle='#252a35';ctx.fillRect(0,0,w,h);
    ctx.strokeStyle='#897653';ctx.lineWidth=4;ctx.strokeRect(19,19,w-38,h-38);
    ctx.strokeStyle='#585057';ctx.lineWidth=2;ctx.strokeRect(29,29,w-58,h-58);
    ctx.textAlign='center';ctx.fillStyle='#c8a46c';ctx.font='600 39px Arial';
    ['EXPLORE','PRACTICE','IMPROVE'].forEach((t,i)=>ctx.fillText(t,w/2,215+i*57));
    ctx.fillStyle='#ac9f8f';ctx.font='italic 28px Georgia';ctx.fillText('More skies, brighter days.',w/2,468);
  }).texture;
  const notebook=place(deck,'Left flight notebook',-2.052,-.416,-11.83);
  notebook.rotation.set(-.09,.24,.02);
  roundedBox(notebook,paper,0,0,0,.52,.033,.66);
  roundedBox(notebook,finish.leather,0,.024,0,.552,.019,.693);
  texturePlane(notebook,bookArt,0,.037,0,.527,.664).rotation.x=-Math.PI/2;

  const notepad=place(deck,'Approach checklist clipboard',2.055,-.418,-11.92);notepad.rotation.y=-.14;
  roundedBox(notepad,finish.leather,0,-.013,0,.60,.025,.70);
  roundedBox(notepad,paper,0,.004,0,.572,.026,.674);
  const checkArt=canvasTexture(530,640,(ctx,w,h)=>{
    ctx.fillStyle='#eee5ce';ctx.fillRect(0,0,w,h);ctx.fillStyle='#253348';ctx.fillRect(22,20,w-44,100);
    ctx.fillStyle='#f5ecd9';ctx.font='700 46px sans-serif';ctx.fillText('APPROACH',43,72);
    ctx.font='600 21px sans-serif';ctx.fillText('SKYJOURNEY / FLIGHT DECK',44,103);
    ctx.strokeStyle='#9b927d';ctx.lineWidth=2;
    const items=['Brief the approach','Confirm the runway','Set landing gear','Set landing flaps','Stabilize speed'];
    for(let i=0;i<items.length;i++){
      const y=172+i*68;
      ctx.strokeRect(43,y-28,28,28);ctx.beginPath();ctx.moveTo(42,y+21);ctx.lineTo(w-42,y+21);ctx.stroke();
      ctx.fillStyle='#253348';ctx.font='600 32px sans-serif';ctx.fillText(items[i],90,y);
    }
    ctx.fillStyle='#6f695c';ctx.font='600 19px sans-serif';ctx.fillText('Use the CHECK key for live indications.',43,h-38);
  }).texture;
  texturePlane(notepad,checkArt,0,.020,0,.550,.655).rotation.x=-Math.PI/2;
  roundedBox(notepad,finish.brushed,0,.033,-.305,.206,.027,.038);
  const pen=place(notepad,'Metal-tip pen',.265,.036,.064);pen.rotation.set(Math.PI/2,.025,0);
  cylinder(pen,finish.coaming,0,0,0,.012,.43);cylinder(pen,finish.brushed,0,.225,0,.009,.048);
  box(pen,finish.brushed,0,-.152,.013,.012,.094,.007);
  const mug=place(deck,'Ceramic mug',2.305,-.450,-12.57);
  const mugProfile=[[0,0],[.10,0],[.122,.016],[.137,.104],[.149,.221],[.149,.260],[.145,.274],[.135,.276],[.126,.269],[.127,.242],[.117,.079],[.090,.034],[0,.028]];
  mesh(register(new THREE.LatheGeometry(mugProfile.map(p=>new THREE.Vector2(...p)),34)),finish.ivory,mug);
  const coffeeArt=canvasTexture(160,160,(ctx,w,h)=>{
    const g=ctx.createRadialGradient(w*.39,h*.35,2,w*.5,h*.5,w*.52);
    g.addColorStop(0,'#65412b');g.addColorStop(.62,'#45271a');g.addColorStop(.91,'#29150e');g.addColorStop(1,'#8a5733');
    ctx.fillStyle=g;ctx.fillRect(0,0,w,h);
    for(let i=0;i<51;i++){
      const a=i*2.39996,r=w*(.32+(i%9)*.018);
      ctx.fillStyle=i%2?'#925e36':'#6d4027';ctx.globalAlpha=.30+(i%4)*.11;
      ctx.beginPath();ctx.arc(w*.5+Math.cos(a)*r,h*.5+Math.sin(a)*r,.5+(i%4)*.28,0,Math.PI*2);ctx.fill();
    }
    ctx.globalAlpha=1;
  }).texture;
  const coffeeMaterial=finish.coffee?register(finish.coffee.clone()):material('#ffffff',.33,.01);
  coffeeMaterial.color.set(0xffffff);coffeeMaterial.map=coffeeArt;
  const drink=noShadow(mesh(register(new THREE.CircleGeometry(.126,36)),coffeeMaterial,mug,0,.232,0));drink.rotation.x=-Math.PI/2;
  mesh(register(new THREE.TorusGeometry(.071,.018,10,22)),finish.ivory,mug,.167,.148,-.008).rotation.y=-.12;
  const cupArt=canvasTexture(384,256,(ctx,w,h)=>{
    ctx.fillStyle='#3d485f';ctx.textAlign='center';ctx.font='700 42px sans-serif';ctx.fillText('✈',w*.5,64);
    ctx.font='600 30px Georgia';ctx.fillText('Good flights',w*.5,119);
    ctx.font='italic 25px Georgia';ctx.fillText('Brighter tomorrows',w*.5,159);
    ctx.fillRect(w*.37,184,w*.26,2);
  }).texture;
  noShadow(mesh(register(new THREE.CylinderGeometry(.149,.135,.155,26,1,true,-.86,1.72)),inkMaterial(cupArt),mug,0,.129,0));

  // Batch shared static pieces without changing raycast targets or articulated controls.
  const primitiveGeometries=new Set(Object.values(shared));
  const batches=new Map(),inverse=new THREE.Matrix4(),local=new THREE.Matrix4();
  deck.updateMatrixWorld(true);inverse.copy(deck.matrixWorld).invert();
  function collect(object){
    if(live.has(object)||object.userData.action)return;
    if(object.isMesh&&!object.isInstancedMesh&&primitiveGeometries.has(object.geometry)&&!Array.isArray(object.material)&&!object.material.transparent&&!object.material.map){
      const key=object.geometry.uuid+object.material.uuid+Number(object.castShadow)+Number(object.receiveShadow);
      if(!batches.has(key))batches.set(key,[]);
      batches.get(key).push(object);
    }
    object.children.forEach(collect);
  }
  collect(deck);
  for(const batch of batches.values()){
    if(batch.length<3)continue;
    const base=batch[0],instances=register(new THREE.InstancedMesh(base.geometry,base.material,batch.length));
    instances.castShadow=base.castShadow;instances.receiveShadow=base.receiveShadow;
    instances.name='Flight deck · instanced details';
    batch.forEach((object,i)=>{local.copy(inverse).multiply(object.matrixWorld);instances.setMatrixAt(i,local);object.removeFromParent();});
    deck.add(instances);
  }

  const rayEffects=createCockpitRayEffects(cabin,finish,screenSources);
  const clamp=THREE.MathUtils.clamp;
  const num=(value,fallback=0)=>Number.isFinite(value)?value:fallback;
  let instrumentTime=-1000,lastFanTime=0,instrumentsReady=false;
  const cameraPositions={
    pilot:new THREE.Vector3(-.65,1.0,-11.3),copilot:new THREE.Vector3(.65,1.0,-11.3),
    cockpitTarget:new THREE.Vector3(.8,-1.8,-21),
    chase:new THREE.Vector3(-33,14,49),wing:new THREE.Vector3(-24,3,5),nose:new THREE.Vector3(0,4,-37),
  };
  function animateDeck(state,controls,autopilot,world,dt,flapSetting){
    const reduced=Boolean(world.reducedMotion),snap=reduced||!instrumentsReady;
    const response=rate=>snap?1:1-Math.exp(-dt*rate);
    const flightResponse=response(17),tactileResponse=response(38),turnResponse=response(21);
    for(const yoke of moving.yokes){
      yoke.rotation.z=THREE.MathUtils.lerp(yoke.rotation.z,-num(controls.roll)*.62,flightResponse);
      yoke.position.z=THREE.MathUtils.lerp(yoke.position.z,.09+num(controls.pitch)*.075,flightResponse);
    }
    for(const lever of moving.throttles)lever.rotation.x=THREE.MathUtils.lerp(lever.rotation.x,-(num(state.throttle,.68)-.5)*.84,flightResponse);
    moving.flapLever.rotation.x=THREE.MathUtils.lerp(moving.flapLever.rotation.x,flapSetting*.5,flightResponse);
    gearSelector.rotation.x=THREE.MathUtils.lerp(gearSelector.rotation.x,(num(state.gear,state.gear?1:0)-.5)*.62,flightResponse);
    apLamp.visible=Boolean(autopilot.enabled);

    const values={speed:num(autopilot.speed,280),heading:num(autopilot.heading),altitude:num(autopilot.altitude,32000),vs:num(autopilot.vs),
      ndRange:Math.log2(Math.max(1,num(world.rangeNm,40))),cockpitDim:num(world.brightness,.85)*8};
    for(const dial of detents){
      const value=values[dial.id];
      if(dial.value!==null&&value!==dial.value){
        let change=value-dial.value;
        if(dial.id==='heading')change=((change%360+540)%360)-180;
        dial.target+=clamp(change/dial.increment,-5,5)*Math.PI/6;
      }
      dial.value=value;
      dial.angle=THREE.MathUtils.lerp(dial.angle,dial.target,turnResponse);
      dial.part.rotation.z=dial.angle;
    }
    for(const item of tactileParts){
      const down=pressedAction===item.id||(!reduced&&tapTime>0&&tapAction===item.id);
      item.depth=THREE.MathUtils.lerp(item.depth,down?1:0,tactileResponse);
      item.highlight=THREE.MathUtils.lerp(item.highlight,hoverAction===item.id&&!down?1:0,tactileResponse);
      item.part.position.z=item.z-item.depth*item.travel+item.highlight*.003;
      item.part.scale.setScalar(1+item.highlight*.026-item.depth*.015);
    }
    tapTime=Math.max(0,tapTime-dt);

    const wet=num(world.rain)>.10,armed=Boolean(world.wipers),sweeping=wet&&armed&&!reduced;
    wiperPhase=sweeping?(wiperPhase+dt*(.72+clamp(num(world.rain),0,1)*.55))%1:0;
    const sweepTarget=sweeping?.5-.5*Math.cos(wiperPhase*Math.PI*2):0;
    wiperAngle=THREE.MathUtils.lerp(wiperAngle,sweepTarget,response(24));
    for(const rig of wiperRigs){
      rig.mount.visible=wet;
      const angle=rig.park+wiperAngle*1.03;
      rig.arm.rotation.z=rig.mirrored?Math.PI-angle:angle;
    }
    const dome=world.domeLight===true||num(world.domeLight)>.08;
    const annunciated=[dome,Boolean(world.checklistOpen),armed];
    for(let i=0;i<3;i++)cabinLamps[i].visible=overheadLamps[i].visible=annunciated[i];
  }
  function update(state,controls={},autopilot={},world={}) {
    const now=performance.now();const delta=clamp((now-lastFanTime)/1000,0,.05);lastFanTime=now;
    for(const fan of moving.fans)fan.rotation.z+=delta*(8+num(state.throttle,.7)*38);
    for(const {object,side} of moving.ailerons)object.rotation.x=side*num(controls.roll)*.21;
    const flapSetting=clamp(num(state.flaps)/3,0,1);
    for(const flap of moving.flaps)flap.rotation.x=flapSetting*.57;
    for(const elevator of moving.elevators)elevator.rotation.x=-num(controls.pitch)*.2;
    moving.rudder.rotation.y=-num(controls.yaw)*.3;
    for(const gear of moving.gears){const deployed=typeof state.gear==='number'?state.gear:state.gear?1:0;gear.visible=deployed>.025;gear.scale.y=Math.max(.02,deployed);}
    beaconMaterial.emissiveIntensity=.5+Math.max(0,Math.sin(now*.003))*1.3;
    if(cabin.visible||!instrumentsReady)animateDeck(state,controls,autopilot,world,clamp(num(world.dt,delta),0,.08),flapSetting);
    else {hoverAction=pressedAction=tapAction=null;tapTime=0;}
    if(cabin.visible){cabinLighting.update(world);rayEffects.update({...world,wiperPhase});}
    if(!instrumentsReady||(cabin.visible&&now-instrumentTime>=83)){
      instrumentTime=now;
      painter.paint(screenSources,state,autopilot,world);
      instrumentsReady=true;
    }
  }
  update({position:{x:0,y:9753,z:0},heading:0,pitch:0,roll:0,ias:280,altitude:32000,verticalSpeed:0,throttle:.68,gear:false,flaps:0,fuel:82,temperature:12},{},{enabled:true,speed:280,heading:0,altitude:32000,vs:0},{});
  const dispose=()=>{for(const resource of resources)resource.dispose();group.clear();interactables.length=0;};
  return {group,exterior,cabin,cameraPositions,update,interactables,dispose,setCockpitInteraction,
    get cockpitRayTracing(){return cabin.visible&&rayEffects.active;},dimensions:{length:39,wingspan:37,height:11.2},screens};
}
