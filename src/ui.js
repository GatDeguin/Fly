const ICONS = {
  plane: '<path class="brand-mark" d="m21 2-3.1.5-5.6 6-7.5-3.6-2.2 1.8 6.8 5.2-4.4 4.8-3.2-.8-1.4 1.4 4 2 2 4 1.4-1.4-.8-3.2 4.8-4.4 5.2 6.8 1.8-2.2-3.6-7.5 6-5.6z"/>',
  world: '<circle cx="12" cy="12" r="10"/><ellipse cx="12" cy="12" rx="4.8" ry="10"/><path d="M2 12h20M4 6.5h16M4 17.5h16"/>',
  weather: '<path d="M6.8 18H18a4 4 0 0 0 0-8 6 6 0 0 0-11.8-1 4.6 4.6 0 0 0 .6 9Z"/>',
  camera: '<path d="M7 6.5 8.5 4h7L17 6.5h3a2 2 0 0 1 2 2V19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V8.5a2 2 0 0 1 2-2Z"/><circle cx="12" cy="13" r="4.5"/><path d="M5.5 9h.1"/>',
  settings: '<path d="m9 3 .6-2h4.8l.6 2 2.5 1.4 2-.4 2.4 4.1-1.4 1.6v2.8l1.4 1.6-2.4 4.1-2-.4-2.5 1.4-.6 2H9.6l-.6-2L6.5 18l-2 .4-2.4-4.1 1.4-1.6V9.9L2.1 8.3l2.4-4.1 2 .4Z"/><circle cx="12" cy="11.3" r="3.4"/>',
  sun: '<circle cx="12" cy="12" r="4.7"/><path d="M12 1v3m0 16v3M1 12h3m16 0h3M4.2 4.2l2.1 2.1m11.4 11.4 2.1 2.1M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1"/>',
  close: '<path d="m6 6 12 12M18 6 6 18"/>',
  prev: '<path d="m15 5-7 7 7 7"/>',
  next: '<path d="m9 5 7 7-7 7"/>',
  pause: '<path d="M8 5v14M16 5v14"/>',
  play: '<path d="m8 4 12 8-12 8Z"/>',
  sound: '<path d="m11 4-6 5H2v6h3l6 5ZM15 8a6 6 0 0 1 0 8m3-11a10 10 0 0 1 0 14"/>',
  mute: '<path d="m11 4-6 5H2v6h3l6 5ZM16 8l6 8m0-8-6 8"/>',
  fullscreen: '<path d="M9 3H3v6m12-6h6v6M3 15v6h6m12-6v6h-6"/>',
  help: '<circle cx="12" cy="12" r="10"/><path d="M9 8a3 3 0 0 1 6 0c0 2-3 2-3 4m0 4h.01"/>',
  hud: '<path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/>',
  motion: '<rect x="6" y="2" width="12" height="20" rx="2"/><path d="M10 19h4M2 9l2 3-2 3m20-6-2 3 2 3"/>',
  brake: '<circle cx="12" cy="12" r="6"/><path d="M4 5a10 10 0 0 0 0 14M20 5a10 10 0 0 1 0 14M9 8h3a2 2 0 0 1 0 4H9h4a2 2 0 0 1 0 4H9Z"/>',
};
const icon = (name, cls = '') => `<svg class="icon ${cls}" viewBox="0 0 24 24" aria-hidden="true">${ICONS[name] || ICONS.plane}</svg>`;
const CAMERAS = ['Pilot', 'Copilot', 'External', 'Chase', 'Side', 'Front', 'Left wing', 'Right wing', 'Top', 'Free', 'Orbit', 'Cinematic'];
const ROUTES = ['Golden Islands', 'Above the Clouds', 'Sunset Coast', 'Quiet Mountains', 'Blue Horizon', 'Night Lights'];
const WEATHER = ['Clear Skies', 'Golden Sunset', 'Soft Clouds', 'Ocean Breeze', 'Misty Morning', 'Overcast', 'Light Rain', 'Starry Night'];
const JOURNEYS = ['Warm coastlines and sunlit islands.', 'A quiet passage through a sea of clouds.', 'Follow the coast into the golden hour.', 'Blue ridges, deep valleys and open skies.', 'Open water and an uninterrupted horizon.', 'A gentle evening above island lights.'];
const KEYS = [['pitchDown','Pitch down','W'],['pitchUp','Pitch up','S'],['rollLeft','Roll left','A'],['rollRight','Roll right','D'],['yawLeft','Rudder left','Q'],['yawRight','Rudder right','E'],['throttleUp','Power up','Shift'],['throttleDown','Power down','Control'],['gear','Landing gear','G'],['flaps','Flaps','F'],['autopilot','Autopilot','P'],['camera','Next camera','V'],['cinematic','Cinematic cruise','C']];
const TUTORIAL = [
  ['Look around', 'Drag the view to look around. Scroll to zoom, or adjust Field of view in Camera.'],
  ['Find your favourite view', 'Press V or use the arrows below the compass to move between cockpit and exterior views.'],
  ['Read the sky', 'Open Flight. Altitude is in feet, airspeed in knots, heading in degrees. The compass follows your real heading.'],
  ['Set your power', 'Hold Shift to increase power or Ctrl to decrease it. On a phone, move the vertical throttle.'],
  ['Make a gentle turn', 'Switch autopilot off with P. Use A / D to bank and Q / E to coordinate the turn. Release to settle.'],
  ['Climb and descend', 'Use S to raise the nose and W to lower it. Keep changes gentle and watch vertical speed in Flight.'],
  ['Let the aircraft help', 'Press P to engage autopilot. Set a heading, target altitude and airspeed in the Flight panel.'],
  ['Follow a scenic journey', 'Choose a journey in World, then enable Follow route. The magenta line connects the real waypoints.'],
  ['Prepare to land', 'Choose Approach in Flight. Reduce power, press G for gear and F for flaps. Aim for the runway centreline.'],
  ['A soft arrival', 'Keep the wings level. Ease the nose up just before touchdown; hold Space to brake. Fly again whenever you like.'],
];
const TUTORIAL_ES = [
  ['Mirá a tu alrededor','Arrastrá la vista para mirar. Usá la rueda para acercarte o ajustá el campo de visión en Cámara.'],
  ['Elegí tu vista','Presioná V o las flechas debajo de la brújula para alternar entre la cabina y el exterior.'],
  ['Leé el cielo','Abrí Vuelo. La altitud está en pies, la velocidad en nudos y el rumbo en grados. La brújula muestra tu rumbo real.'],
  ['Ajustá la potencia','Mantené Shift para aumentar potencia o Ctrl para reducirla. En el teléfono, mové el acelerador vertical.'],
  ['Un giro suave','Desactivá el piloto automático con P. Usá A / D para inclinar las alas y Q / E para coordinar el giro.'],
  ['Subí y bajá','Usá S para levantar la nariz y W para bajarla. Hacé cambios suaves y observá la velocidad vertical en Vuelo.'],
  ['Dejá que el avión ayude','Activá el piloto automático con P. Elegí rumbo, altitud y velocidad en el panel Vuelo.'],
  ['Seguí una ruta','Elegí un recorrido en Mundo y activá Seguir ruta. La línea magenta conecta los puntos reales del recorrido.'],
  ['Prepará el aterrizaje','Elegí Aproximación en Vuelo. Reducí potencia, presioná G para el tren y F para los flaps. Apuntá al centro de la pista.'],
  ['Una llegada suave','Mantené las alas niveladas. Levantá suavemente la nariz antes de tocar tierra; mantené Espacio para frenar.'],
];
const SPANISH = {
  'Flight':'Vuelo','World':'Mundo','Weather':'Clima','Camera':'Cámara','External View':'Vista exterior','Settings':'Ajustes','Local Time':'Hora local','Altitude':'Altitud','Ground Speed':'Velocidad sobre suelo','Outside Temp.':'Temp. exterior',
  'The art of flying':'El arte de volar','A gentle hand. A wide-open sky.':'Manos suaves. Un cielo abierto.','Flight mode':'Modo de vuelo','Zen Flight':'Vuelo zen','Standard Flight':'Vuelo estándar','Simulation Flight':'Vuelo de simulación','Engine power':'Potencia de motores','Gear':'Tren','Flaps':'Flaps','Autopilot':'Piloto automático','Heading · °':'Rumbo · °','Altitude · ft':'Altitud · pies','Airspeed · kts':'Velocidad · nudos','Vertical speed · ft/min':'Velocidad vertical · pies/min','Vertical mode':'Modo vertical','Altitude hold':'Mantener altitud','Vertical speed':'Velocidad vertical','Follow selected route':'Seguir ruta elegida','A fresh beginning':'Un nuevo comienzo','On the runway':'En la pista','Approach':'Aproximación','Return to peaceful cruise':'Volver a un crucero tranquilo',
  'Beautiful places':'Lugares hermosos','Choose a journey, or simply follow your curiosity.':'Elegí un recorrido, o seguí tu curiosidad.','YOUR JOURNEY':'TU RECORRIDO','Scenic journeys':'Recorridos panorámicos','Warm coastlines and sunlit islands.':'Costas cálidas e islas al sol.','A quiet passage through a sea of clouds.':'Un tranquilo viaje por un mar de nubes.','Follow the coast into the golden hour.':'Seguí la costa hacia la hora dorada.','Blue ridges, deep valleys and open skies.':'Sierras azules, valles y cielos abiertos.','Open water and an uninterrupted horizon.':'Mar abierto y un horizonte infinito.','A gentle evening above island lights.':'Un atardecer suave sobre luces isleñas.','Follow route with autopilot':'Seguir ruta con piloto automático',
  'A different kind of sky':'Un cielo diferente','Weather changes gently, while your journey continues.':'El clima cambia suavemente mientras seguís volando.','Time of day':'Hora del día','Simulated local time:':'Hora local simulada:','. Light, water and cockpit illumination follow the sun.':'. La luz, el agua y la cabina siguen al sol.',
  'A new perspective':'Otra perspectiva','One continuous world. A dozen ways to see it.':'Un mismo mundo. Doce maneras de verlo.','Pilot':'Piloto','Copilot':'Copiloto','External':'Exterior','Chase':'Seguimiento','Side':'Lateral','Front':'Frente','Left wing':'Ala izquierda','Right wing':'Ala derecha','Top':'Desde arriba','Free':'Libre','Orbit':'Órbita','Cinematic':'Cinemática','Field of view':'Campo de visión','Exposure':'Exposición','Keep a little sky':'Guardá un poco de cielo','Find your frame. Capture a moment.':'Elegí tu encuadre. Capturá un momento.','Take photograph':'Tomar fotografía','Show / hide interface':'Mostrar / ocultar interfaz','Pause to compose':'Pausar para encuadrar','Drag to look or orbit. Scroll to zoom. Your photograph is saved as a PNG.':'Arrastrá para mirar u orbitar. Usá la rueda para acercarte. La foto se guarda como PNG.',
  'Make yourself at home':'Sentite como en casa','Small adjustments for a comfortable journey.':'Pequeños ajustes para un viaje cómodo.','Graphics':'Gráficos','Adaptive':'Adaptativos','Balanced':'Equilibrados','Performance':'Rendimiento','Volume':'Volumen','Mute sound':'Silenciar audio','Quiet ambient music':'Música ambiental suave','Control sensitivity':'Sensibilidad','Gamepad dead zone':'Zona muerta del mando','Phone tilt controls':'Control por inclinación','Calibrate tilt':'Calibrar inclinación','Use phone as a Wi-Fi yoke':'Teléfono como mando por Wi-Fi','Comfort & accessibility':'Confort y accesibilidad','Reduce camera motion':'Reducir movimiento','Camera movement':'Movimiento de cámara','Language':'Idioma','Learn to fly':'Aprendé a volar','Keyboard controls':'Controles de teclado','Click a key, then press its replacement. Esc cancels.':'Elegí una tecla y presioná su reemplazo. Esc cancela.','Pitch down':'Bajar nariz','Pitch up':'Levantar nariz','Roll left':'Inclinar a izquierda','Roll right':'Inclinar a derecha','Rudder left':'Timón izquierdo','Rudder right':'Timón derecho','Power up':'Aumentar potencia','Power down':'Reducir potencia','Landing gear':'Tren de aterrizaje','Next camera':'Siguiente cámara','Cinematic cruise':'Crucero cinematográfico','Mouse: drag to look, scroll to zoom. Gamepad: left stick flies, right stick looks, triggers adjust power. Space brakes.':'Mouse: arrastrá para mirar y usá la rueda para acercarte. Mando: palanca izquierda para volar, derecha para mirar y gatillos para potencia. Espacio frena.','Your saved journey':'Tu recorrido guardado','Save flight':'Guardar vuelo','Resume saved':'Reanudar guardado','Export flight':'Exportar vuelo','Import flight':'Importar vuelo','Restore settings':'Restablecer ajustes','Your settings and flight stay on this device. No account is needed.':'Los ajustes y el vuelo quedan en este dispositivo. No necesitás una cuenta.',
  'A moment to breathe.':'Un momento para respirar.','Your journey is waiting.':'Tu viaje te espera.','Take your time.':'Tomate tu tiempo.','Continue flying':'Seguir volando','Load saved flight':'Cargar vuelo guardado','Fresh journey':'Nuevo recorrido','Esc to return to the sky':'Esc para volver al cielo',
  'pitch':'cabeceo','bank':'alabeo','power':'potencia','autopilot':'piloto automático','view':'vista','PITCH · ROLL':'CABECEO · ALABEO','Back':'Anterior','Next':'Siguiente',
  'All systems normal. Enjoy the view.':'Sistemas normales. Disfrutá la vista.','On the ground. Shift increases power; Space brakes.':'En tierra. Shift aumenta potencia; Espacio frena.','Low airspeed. Gently add power.':'Velocidad baja. Aumentá suavemente la potencia.','Autopilot guiding your journey.':'El piloto automático guía tu recorrido.','Manual flight. A gentle hand on the controls.':'Vuelo manual. Manos suaves en los controles.',
};
SPANISH['Gentle phone vibration']='Vibración suave del móvil';
const n = (value, fallback = 0) => Number.isFinite(Number(value)) ? Number(value) : fallback;
const fmt = (value) => Math.round(n(value)).toLocaleString('en-US');

export function createUI(callbacks = {}) {
  const act = typeof callbacks === 'function' ? callbacks : callbacks.onAction || (() => {});
  let activePanel = null, activeCamera = 'External', paused = false, muted = false, photoMode = false, tutorialStep = -1;
  let toastTimer, hintTimer, bindingCapture = null, lastState = {}, lastAP = {}, lastMeta = {}, language = 'en';
  let touchPointer = null, touchOrigin = { x: 0, y: 0 };
  const listeners = [];
  const root = document.createElement('div'); root.id = 'hud';
  root.innerHTML = `
    <div class="brand hud-element">${icon('plane')}<div><div class="brand-name">SkyJourney</div><div class="brand-sub">FLIGHT SIMULATOR</div></div></div>
    <div class="brand-message hud-element">Good pilots<br>find beautiful<br>places.<span class="tiny-line"></span></div>
    <nav class="main-nav hud-element" aria-label="Simulator controls">
      ${[['flight','plane','Flight'],['world','world','World'],['weather','weather','Weather'],['camera','camera','External View'],['settings','settings','Settings']].map(([name, glyph, label]) => `<button class="nav-button ${name === 'camera' ? 'active' : ''}" data-panel="${name}" aria-label="${label}" aria-expanded="false" aria-controls="panel-${name}">${icon(glyph)}<span>${label}</span></button>`).join('')}
    </nav>
    <aside class="sky-stats hud-element" aria-label="Live flight conditions"><div class="local-time">${icon('sun')}<div><strong data-live="time">18:42</strong><span class="stat-label">Local Time</span></div></div><div class="stat"><div class="stat-value"><span data-live="altitude">—</span> ft</div><span class="stat-label">Altitude</span></div><div class="stat"><div class="stat-value"><span data-live="groundSpeed">—</span> kts</div><span class="stat-label">Ground Speed</span></div><div class="stat"><div class="stat-value"><span data-live="temperature">—</span> °C</div><span class="stat-label">Outside Temp.</span></div><div class="stat weather-stat" data-live="weather">Golden Sunset</div><div class="sky-mantra">Same sky.<br>A kinder you.<span class="tiny-line"></span></div></aside>
    <div class="lower-identity hud-element"><div class="script-line">More<br>Skies<br>Brighter<br>Days<span class="heart">♡</span></div><span class="tiny-line"></span><div class="identity-tags">EXPLORE<br>PRACTICE<br>IMPROVE</div></div>
    <div class="camera-compass hud-element"><div class="compass" aria-label="Aircraft heading"><canvas id="compass-map" width="188" height="188" aria-hidden="true"></canvas><div class="compass-rose"><span class="compass-letter north">N</span><span class="compass-letter east">E</span><span class="compass-letter south">S</span><span class="compass-letter west">W</span></div><svg class="compass-aircraft" viewBox="0 0 24 28" aria-hidden="true"><path d="m12 1-2 2-1 9-9 5v3l9-2 1 6-4 2v2l6-1 6 1v-2l-4-2 1-6 9 2v-3l-9-5-1-9Z"/></svg><span class="compass-heading" data-live="headingLabel"></span></div><div class="camera-switch"><button data-camera="prev" aria-label="Previous camera">${icon('prev')}</button><span class="camera-name">External Camera</span><button data-camera="next" aria-label="Next camera">${icon('next')}</button></div></div>
    <div class="utility-controls" aria-label="Quick controls"><button data-action="pause" title="Pause (Esc)" aria-label="Pause">${icon('pause')}</button><button data-action="mute" title="Sound" aria-label="Mute sound" aria-pressed="false">${icon('sound')}</button><button data-action="photoPanel" title="Photo mode" aria-label="Open photo controls">${icon('camera')}</button><button data-action="fullscreen" title="Fullscreen" aria-label="Toggle fullscreen">${icon('fullscreen')}</button><button data-action="hud" title="Show or hide interface (H)" aria-label="Show or hide interface">${icon('hud')}</button><button data-action="tutorial" title="Learn to fly" aria-label="Start flight tutorial">${icon('help')}</button></div>
    <div class="control-hint hud-element"><span><kbd>W S</kbd> pitch</span><span><kbd>A D</kbd> bank</span><span><kbd>Shift Ctrl</kbd> power</span><span><kbd>P</kbd> autopilot</span><span><kbd>V</kbd> view</span><button aria-label="Dismiss controls hint" data-action="dismissHint">×</button></div>
    <div class="toast" role="status" aria-live="polite" aria-atomic="true"></div>
    <div class="touch-controls hud-element"><div class="touch-joystick" role="slider" aria-label="Flight joystick, drag to pitch and roll" tabindex="0" aria-valuemin="-100" aria-valuemax="100" aria-valuenow="0"><div class="joystick-knob"></div><span class="touch-label">PITCH · ROLL</span></div><div class="touch-shortcuts"><button data-action="motion" aria-label="Enable phone tilt controls" title="Phone tilt">${icon('motion')}</button><button data-camera="next" aria-label="Next camera">${icon('camera')}</button><button data-brake aria-label="Hold to brake" title="Hold to brake">${icon('brake')}</button></div><label class="touch-throttle"><input type="range" min="0" max="100" value="70" data-input="throttle" aria-label="Throttle"><span data-live="throttleTouch">70%</span></label></div>
    <section class="pause-screen" hidden aria-label="Flight paused" role="dialog" aria-modal="true"><div class="pause-card">${icon('plane','pause-aircraft')}<h2>A moment to breathe.</h2><p>Your journey is waiting.<br>Take your time.</p><button class="primary-button" data-action="unpause">Continue flying</button><div class="button-row"><button class="soft-button" data-action="save">Save flight</button><button class="soft-button" data-action="resume">Load saved flight</button></div><div class="button-row"><button class="soft-button" data-reset="cruise">Fresh journey</button><button class="soft-button" data-action="pauseSettings">Settings</button></div><p class="panel-note" style="margin:20px 0 0">Esc to return to the sky</p></div></section>
    <section class="tutorial-card" hidden aria-label="Flight tutorial"><span class="tutorial-step"></span><div class="panel-heading"><h3></h3><button class="close-button" data-action="closeTutorial" aria-label="Close tutorial">${icon('close')}</button></div><p></p><div class="button-row"><button class="soft-button" data-action="tutorialBack">Back</button><button class="primary-button" data-action="tutorialNext">Next</button></div></section>
    <section class="unsupported" id="webgl-unsupported" hidden><div><h1>Your sky needs WebGL.</h1><p>This browser could not start the 3D renderer. Enable hardware acceleration or open SkyJourney in a recent browser on a device with WebGL support.</p><button class="primary-button" data-action="reload">Try again</button></div></section>
    <input type="file" id="import-flight" accept="application/json,.json" hidden>
  `;
  document.body.appendChild(root);
  const $ = (query) => root.querySelector(query);
  const $$ = (query) => [...root.querySelectorAll(query)];
  const on = (target, event, handler, options) => { target.addEventListener(event, handler, options); listeners.push(() => target.removeEventListener(event, handler, options)); };
  const emit = (action, value) => { act(action, value); };
  const field = (label, action, control, helper = '') => `<label class="field"><span>${label}${helper ? `<br><small>${helper}</small>` : ''}</span>${control.replace('INPUT', `data-input="${action}"`)}</label>`;
  const number = (label, action, value, min, max, step = 1, unit = '') => field(label, action, `<input INPUT type="number" value="${value}" min="${min}" max="${max}" step="${step}" aria-label="${label}${unit ? ` in ${unit}` : ''}">`);
  const range = (label, action, value, min, max, step = 1) => field(label, action, `<input INPUT type="range" value="${value}" min="${min}" max="${max}" step="${step}" aria-label="${label}">`);
  const check = (label, action, checked = false) => field(label, action, `<span class="switch"><input INPUT type="checkbox" ${checked ? 'checked' : ''} aria-label="${label}"><span class="switch-dot"></span></span>`);
  const select = (label, action, values, value) => field(label, action, `<select INPUT aria-label="${label}">${values.map(v => `<option value="${Array.isArray(v) ? v[0] : v}" ${(Array.isArray(v) ? v[0] : v) === value ? 'selected' : ''}>${Array.isArray(v) ? v[1] : v}</option>`).join('')}</select>`);
  const addPanel = (name, title, sub, content, wide = false) => {
    const panel = document.createElement('section'); panel.className = `side-panel hud-element ${wide ? 'wide' : ''}`; panel.id = `panel-${name}`; panel.hidden = true; panel.setAttribute('aria-labelledby', `title-${name}`);
    panel.innerHTML = `<div class="panel-heading"><h2 id="title-${name}">${title}</h2><button class="close-button" data-action="closePanel" aria-label="Close ${title}">${icon('close')}</button></div><p class="panel-sub">${sub}</p>${content}`;
    root.appendChild(panel); return panel;
  };
  addPanel('flight', 'The art of flying', 'A gentle hand. A wide-open sky.', `
    ${select('Flight mode','mode',[['zen','Zen Flight'],['standard','Standard Flight'],['simulation','Simulation Flight']],'zen')}
    <div class="live-flight"><div><strong data-live="ias">—</strong><span>IAS · KTS</span></div><div><strong data-live="heading">—</strong><span>HDG · DEG</span></div><div><strong data-live="vs">—</strong><span>VS · FT/MIN</span></div></div>
    ${range('Engine power','throttle',70,0,100)}
    <div class="button-row"><button class="soft-button" data-action="gear" aria-pressed="false">Gear <span data-live="gear">UP</span></button><button class="soft-button" data-action="flaps">Flaps <span data-live="flaps">0</span></button></div>
    <div class="panel-divider"></div>${check('Autopilot','autopilot',true)}
    ${number('Heading · °','apHeading',178,0,359,1,'degrees')}${number('Altitude · ft','apAltitude',32000,0,43000,100,'feet')}${number('Airspeed · kts','apSpeed',280,100,420,5,'knots')}${number('Vertical speed · ft/min','apVS',0,-3000,3000,100,'feet per minute')}
    <span class="section-label" style="margin-top:14px">Vertical mode</span><div class="radio-row"><label><input type="radio" name="verticalMode" data-input="verticalMode" value="altitude" checked>Altitude hold</label><label><input type="radio" name="verticalMode" data-input="verticalMode" value="vs">Vertical speed</label></div>
    ${check('Follow selected route','routeFollow')}
    <div class="panel-divider"></div><span class="section-label">A fresh beginning</span><div class="button-row"><button class="soft-button" data-reset="runway">On the runway</button><button class="soft-button" data-reset="approach">Approach</button></div><button class="soft-button" style="width:100%;margin-top:8px" data-reset="cruise">Return to peaceful cruise</button><p class="panel-note" data-live="flightStatus">All systems normal. Enjoy the view.</p>
  `);
  addPanel('world', 'Beautiful places', 'Choose a journey, or simply follow your curiosity.', `
    <div class="map-wrap"><canvas class="world-map" width="320" height="183" aria-label="Live map of islands, flight position and selected route"></canvas><span class="map-legend"><i></i>YOUR JOURNEY</span></div>
    <span class="section-label">Scenic journeys</span><div class="option-list">${ROUTES.map((route, i) => `<button class="option-button ${i === 0 ? 'selected' : ''}" data-route="${route}"><span>${route}<br><small>${JOURNEYS[i]}</small></span><span class="check">${i === 0 ? '✓' : ''}</span></button>`).join('')}</div>
    <div class="journey-detail" data-live="routeDetail">Choose a route to navigate the islands.</div>${check('Follow route with autopilot','routeFollow')}
  `);
  addPanel('weather', 'A different kind of sky', 'Weather changes gently, while your journey continues.', `
    <div class="option-list">${WEATHER.map(weather => `<button class="option-button ${weather === 'Golden Sunset' ? 'selected' : ''}" data-weather="${weather}"><span>${weather}</span><span class="check">${weather === 'Golden Sunset' ? '✓' : ''}</span></button>`).join('')}</div>
    <div class="panel-divider"></div>${range('Time of day','time',18.7,0,23.99,.05)}<p class="panel-note">Simulated local time: <span data-live="time">18:42</span>. Light, water and cockpit illumination follow the sun.</p>
  `);
  addPanel('camera', 'A new perspective', 'One continuous world. A dozen ways to see it.', `
    <div class="camera-grid">${CAMERAS.map(camera => `<button class="option-button ${camera === 'External' ? 'selected' : ''}" data-camera="${camera}">${camera}</button>`).join('')}</div>
    <div class="panel-divider"></div>${range('Field of view','fov',55,30,95)}${range('Exposure','exposure',1,.55,1.6,.05)}
    <div class="panel-heading photo-heading"><h2 style="font-size:15px">Keep a little sky</h2></div><p class="panel-sub">Find your frame. Capture a moment.</p><div class="photo-actions"><button class="primary-button" data-action="photo">Take photograph</button><button class="soft-button" data-action="hud">Show / hide interface</button></div>${check('Pause to compose','photoMode')}
    <p class="panel-note">Drag to look or orbit. Scroll to zoom. Your photograph is saved as a PNG.</p>
  `);
  addPanel('settings', 'Make yourself at home', 'Small adjustments for a comfortable journey.', `
    ${select('Graphics','quality',[['auto','Adaptive'],['cinematic','Cinematic'],['balanced','Balanced'],['performance','Performance']],'auto')}${range('Volume','volume',35,0,100)}${check('Mute sound','mute')}${check('Quiet ambient music','ambient')}${range('Control sensitivity','sensitivity',1,.25,2,.05)}${range('Gamepad dead zone','deadzone',.12,.03,.35,.01)}
    <div class="button-row"><button class="soft-button" data-action="motion">Phone tilt controls</button><button class="soft-button" data-action="calibrateMotion">Calibrate tilt</button></div>${check('Gentle phone vibration','haptics',false)}<button class="soft-button" style="width:100%;margin-top:8px" data-action="mobileLink">Use phone as a Wi-Fi yoke</button>
    <details class="settings-detail"><summary>Comfort & accessibility</summary>${check('Reduce camera motion','reducedMotion',window.matchMedia?.('(prefers-reduced-motion: reduce)').matches || false)}${check('Camera movement','cameraShake',true)}${select('Language','language',[['en','English'],['es','Español']],'en')}<button class="soft-button" style="width:100%" data-action="tutorial">Learn to fly</button></details>
    <details class="settings-detail"><summary>Keyboard controls</summary><p class="panel-note" style="margin:0 0 10px">Click a key, then press its replacement. Esc cancels.</p><div class="key-bindings">${KEYS.map(([action, label, key]) => `<span>${label}</span><button data-rebind="${action}" aria-label="Rebind ${label}">${key}</button>`).join('')}</div><p class="panel-note">Mouse: drag to look, scroll to zoom. Gamepad: left stick flies, right stick looks, triggers adjust power. Space brakes.</p></details>
    <details class="settings-detail"><summary>Your saved journey</summary><div class="button-row"><button class="soft-button" data-action="save">Save flight</button><button class="soft-button" data-action="resume">Resume saved</button></div><div class="button-row"><button class="soft-button" data-action="export">Export flight</button><button class="soft-button" data-action="import">Import flight</button></div><button class="soft-button" style="width:100%;margin-top:8px" data-action="resetSettings">Restore settings</button><p class="panel-note">Your settings and flight stay on this device. No account is needed.</p></details>
    <p class="panel-note">SKYJOURNEY · THE ART OF FLYING<br><span data-live="diagnostics">Self-contained. An open sky, anywhere.</span></p>
  `, true);
  const staticText = [];
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  while (walker.nextNode()) {
    const node = walker.currentNode;
    if (node.textContent.trim() && !node.parentElement.closest('[data-live],.toast,.tutorial-card,.camera-name')) staticText.push([node,node.textContent]);
  }
  const tr = (text) => language === 'es' ? SPANISH[text] || text : text;

  function toast(message) {
    clearTimeout(toastTimer); $('.toast').textContent = String(message); $('.toast').classList.add('visible');
    toastTimer = setTimeout(() => $('.toast').classList.remove('visible'), 4000);
  }
  function highlightNav() {
    $$('.nav-button').forEach(button => {
      const own = button.dataset.panel;
      button.classList.toggle('active', own === (activePanel || (/pilot|copilot/i.test(activeCamera) ? 'flight' : 'camera')));
      button.setAttribute('aria-expanded', String(own === activePanel));
    });
  }
  function togglePanel(name, focus = true) {
    if (name === 'photo') name = 'camera';
    const next = name && activePanel !== name ? name : null;
    $$('.side-panel').forEach(panel => { panel.hidden = panel.id !== `panel-${next}`; });
    const previous = activePanel; activePanel = next; highlightNav();
    if (focus) {
      if (next) $(`#panel-${next} .close-button`)?.focus({ preventScroll: true });
      else if (previous) $(`.nav-button[data-panel="${previous}"]`)?.focus({ preventScroll: true });
    }
  }
  function setCamera(name) {
    activeCamera = name || 'External';
    root.classList.toggle('cockpit-view', /pilot|copilot/i.test(activeCamera));
    $('.camera-name').textContent = `${activeCamera} ${/camera/i.test(activeCamera) ? '' : 'Camera'}`.trim();
    const label = /pilot|copilot/i.test(activeCamera) ? 'Camera' : activeCamera === 'External' ? 'External View' : 'Camera';
    $('.nav-button[data-panel="camera"] span').textContent = tr(label);
    $$('.camera-grid [data-camera]').forEach(button => button.classList.toggle('selected', button.dataset.camera === activeCamera));
    highlightNav();
  }
  function setPaused(value) {
    const changed = paused !== Boolean(value); paused = Boolean(value); $('.pause-screen').hidden = !paused || photoMode;
    if (paused && changed && !photoMode) $('.pause-screen [data-action="unpause"]').focus({ preventScroll: true });
    $('[data-action="pause"]').setAttribute('aria-label', paused ? 'Resume flight' : 'Pause');
  }
  function toggleHUD() {
    const hidden=root.classList.toggle('hud-hidden');
    $$('.hud-element').forEach(element=>{element.inert=hidden;});
    if(hidden){stopTouch();emit('brake',false);}
    return !hidden;
  }
  function tutorial(index) {
    tutorialStep = Math.max(-1, Math.min(9, index)); const card = $('.tutorial-card'); card.hidden = tutorialStep < 0;
    if (tutorialStep < 0) { emit('tutorial', -1); return; }
    $('.control-hint').classList.add('hint-faded');
    card.querySelector('.tutorial-step').textContent = language === 'es' ? `Aprendé a volar · ${tutorialStep + 1} de 10` : `Learning to fly · ${tutorialStep + 1} of 10`;
    const steps = language === 'es' ? TUTORIAL_ES : TUTORIAL;
    card.querySelector('h3').textContent = steps[tutorialStep][0]; card.querySelector('p').textContent = steps[tutorialStep][1];
    card.querySelector('[data-action="tutorialBack"]').disabled = tutorialStep === 0;
    card.querySelector('[data-action="tutorialBack"]').textContent = tr('Back');
    card.querySelector('[data-action="tutorialNext"]').textContent = tutorialStep === 9 ? (language === 'es' ? 'Disfrutá el cielo' : 'Enjoy the sky') : tr('Next'); emit('tutorial', tutorialStep);
  }
  function updateInput(action, value, checked = false) {
    $$(`[data-input="${action}"]`).forEach(input => {
      if (document.activeElement === input) return;
      if (input.type === 'radio') input.checked = input.value === String(value);
      else if (input.type === 'checkbox') input.checked = Boolean(value);
      else if (value !== undefined && value !== null) input.value = String(value);
    });
  }
  function live(name, value) { const content=tr(String(value));$$(`[data-live="${name}"]`).forEach(node => { if (node.textContent !== content) node.textContent = content; }); }
  function map(canvas, state, meta, miniature = false) {
    if (!canvas) return;
    const ctx = canvas.getContext('2d'); if (!ctx) return;
    const width = canvas.width, height = canvas.height, x = n(state.position?.x ?? state.x), z = n(state.position?.z ?? state.z);
    const islands = meta.islands || [];
    const points = Array.isArray(meta.waypoints) ? meta.waypoints : Array.isArray(meta.routeWaypoints) ? meta.routeWaypoints : [];
    const extent = miniature ? 34000 : Math.max(27000, ...islands.map(island => Math.hypot(n(island.x) - x, n(island.z) - z) + n(island.radius ?? island.rx, 3000))) * 1.13;
    const scale = Math.min(width, height) / (extent * 2), mx = width / 2, my = height / 2;
    const project = (px, pz) => [mx + (px - x) * scale, my + (pz - z) * scale];
    ctx.clearRect(0,0,width,height); ctx.fillStyle = miniature ? '#4b6178' : '#263e58'; ctx.fillRect(0,0,width,height);
    if (!miniature) { ctx.strokeStyle = '#adbed711'; ctx.lineWidth = 1; for (let grid = -2; grid <= 2; grid++) { const gx = mx + grid * width / 5; const gy = my + grid * height / 5; ctx.beginPath();ctx.moveTo(gx,0);ctx.lineTo(gx,height);ctx.moveTo(0,gy);ctx.lineTo(width,gy);ctx.stroke(); } }
    islands.forEach((island, i) => {
      const [ix, iz] = project(n(island.x), n(island.z)); const rx = n(island.rx ?? island.radius, 3000) * scale, rz = n(island.rz ?? island.radius, 2300) * scale;
      ctx.beginPath();
      for (let a = 0; a <= 36; a++) { const angle = a / 36 * Math.PI * 2; const irregular = .86 + .14 * Math.sin(angle * 5 + i * 1.7) + .06 * Math.cos(angle * 9 + i); const px = ix + Math.cos(angle) * rx * irregular, py = iz + Math.sin(angle) * rz * irregular; if (a === 0) ctx.moveTo(px,py); else ctx.lineTo(px,py); }
      ctx.closePath(); ctx.fillStyle = miniature ? '#8ea29d' : '#6f9085'; ctx.strokeStyle = miniature ? '#cbd0b599' : '#adc0a299'; ctx.lineWidth = .7; ctx.fill();ctx.stroke();
    });
    if (points.length) {
      ctx.strokeStyle = '#e4a8e4';ctx.lineWidth = miniature ? 1 : 1.5;ctx.setLineDash([3,4]);ctx.beginPath();
      points.forEach((point,i) => { const [px,pz] = project(n(point.x ?? point.position?.x),n(point.z ?? point.position?.z));i ? ctx.lineTo(px,pz) : ctx.moveTo(px,pz); });ctx.stroke();ctx.setLineDash([]);
      if (!miniature) points.forEach((point,i) => { const [px,pz] = project(n(point.x ?? point.position?.x),n(point.z ?? point.position?.z));ctx.beginPath();ctx.arc(px,pz,2.5,0,Math.PI*2);ctx.fillStyle='#f0b9eb';ctx.fill();if (i === n(meta.waypointIndex ?? lastAP.waypointIndex)) { ctx.fillStyle = '#e3d9ed';ctx.font='9px Segoe UI';ctx.fillText(point.name || `WPT ${i+1}`,px+6,pz-4); } });
    }
    if (!miniature) { ctx.save();ctx.translate(mx,my);ctx.rotate(n(state.heading));ctx.fillStyle='#fff7ed';ctx.beginPath();ctx.moveTo(0,-10);ctx.lineTo(2,-2);ctx.lineTo(9,3);ctx.lineTo(9,5);ctx.lineTo(2,3);ctx.lineTo(1,8);ctx.lineTo(4,10);ctx.lineTo(-4,10);ctx.lineTo(-1,8);ctx.lineTo(-2,3);ctx.lineTo(-9,5);ctx.lineTo(-9,3);ctx.lineTo(-2,-2);ctx.closePath();ctx.fill();ctx.restore();ctx.font='9px Segoe UI';ctx.fillStyle='#b6c7da';ctx.fillText(`${Math.round(extent*2/1852)} NM`,width-45,height-11); }
  }
  function update(state = {}, ap = {}, meta = {}) {
    lastState = state; lastAP = ap; lastMeta = meta;
    const altitude = n(state.altitude ?? state.altitudeFt, n(state.position?.y) * 3.28084);
    const heading = ((n(state.heading) * 180 / Math.PI) % 360 + 360) % 360;
    const ias = n(state.ias ?? state.speedKts, n(state.speed) * 1.943844);
    const speed = n(state.groundSpeed, ias);
    const time = ((n(meta.time ?? meta.hour, 18.7) % 24) + 24) % 24;
    const hours = Math.floor(time), minutes = Math.floor((time - hours) * 60 + .00001);
    live('time', `${String(hours).padStart(2,'0')}:${String(minutes).padStart(2,'0')}`);
    live('altitude',fmt(altitude)); live('groundSpeed',fmt(speed));live('temperature',Math.round(n(state.temperature ?? state.temperatureC,15 - altitude / 3.28084 * .0065)));
    live('weather',meta.weather || state.weather || 'Golden Sunset');live('ias',fmt(ias));live('heading',`${(Math.round(heading)%360).toString().padStart(3,'0')}°`);live('headingLabel',`${(Math.round(heading)%360).toString().padStart(3,'0')}°`);
    live('vs',`${n(state.verticalSpeed) >= 0 ? '+' : ''}${fmt(state.verticalSpeed)}`);live('gear',n(state.gear) > .5 ? 'DOWN' : 'UP');live('flaps',`${n(state.flaps)}`);live('throttleTouch',`${Math.round(n(state.throttle,.7)*100)}%`);
    $('[data-action="gear"]').setAttribute('aria-pressed',String(n(state.gear) > .5));
    $('.compass-rose').style.transform = `rotate(${-heading}deg)`;
    $$('.compass-letter').forEach(letter=>{letter.style.transform=`rotate(${heading}deg)`;});
    $('#compass-map').style.transform = `rotate(${-heading}deg)`;
    if (meta.camera && meta.camera !== activeCamera) setCamera(meta.camera);
    if(meta.photoMode!==undefined && photoMode!==Boolean(meta.photoMode)){photoMode=Boolean(meta.photoMode);updateInput('photoMode',photoMode);setPaused(paused);}
    if (meta.paused !== undefined && Boolean(meta.paused) !== paused) setPaused(meta.paused);
    updateInput('throttle',n(state.throttle,.7)*100);updateInput('autopilot',Boolean(ap.enabled));updateInput('apHeading',ap.heading==null?undefined:Math.round(ap.heading)%360);updateInput('apAltitude',ap.altitude==null?undefined:Math.round(ap.altitude));updateInput('apSpeed',ap.speed==null?undefined:Math.round(ap.speed));updateInput('apVS',ap.vs ?? ap.verticalSpeed);updateInput('verticalMode',ap.verticalMode);updateInput('routeFollow',ap.routeFollow ?? ap.followRoute ?? ap.route);
    if(meta.language && language!==meta.language){language=meta.language;applyLanguage(false);}
    updateInput('time',time);['mode','quality','fov','exposure','sensitivity','deadzone','language'].forEach(key => { if(meta[key] !== undefined) updateInput(key,meta[key]); });
    ['ambient','haptics','reducedMotion','cameraShake','photoMode'].forEach(key => { if(meta[key] !== undefined) updateInput(key,meta[key]); });
    if(meta.volume !== undefined) updateInput('volume',n(meta.volume)*100);
    if(meta.muted !== undefined && muted !== Boolean(meta.muted)) { muted=Boolean(meta.muted);updateMute(); }
    if(meta.keyBindings || meta.controls) { const bindings=meta.keyBindings || meta.controls; $$('[data-rebind]').forEach(button => { if(bindings[button.dataset.rebind] && button!==bindingCapture?.button) button.textContent = String(bindings[button.dataset.rebind]).replace(/^Key|^Digit/,'').replace(/Left$|Right$/,'').replace('Control','Ctrl'); }); }
    $$('[data-route]').forEach(button => { const selected=button.dataset.route===meta.route;button.classList.toggle('selected',selected);button.querySelector('.check').textContent=selected?'✓':''; });
    $$('[data-weather]').forEach(button => { const selected=button.dataset.weather===meta.weather;button.classList.toggle('selected',selected);button.querySelector('.check').textContent=selected?'✓':''; });
    live('diagnostics', `${Math.round(n(meta.fps)) || '—'} FPS · ${meta.quality || 'Adaptive'} quality`);
    const points=Array.isArray(meta.waypoints)?meta.waypoints:[];const index=n(meta.waypointIndex ?? ap.waypointIndex);const waypoint=points[index];
    if(waypoint) { const distance=Math.hypot(n(waypoint.x)-n(state.position?.x),n(waypoint.z)-n(state.position?.z))/1852;const eta=speed>30?`${Math.round(distance/speed*60)} min`:'—';live('routeDetail',`${waypoint.name || `Waypoint ${index+1}`} · ${distance.toFixed(1)} NM · ${eta} at current speed`); }
    else live('routeDetail',meta.route?`${meta.route} · ${points.length} scenic waypoints`:'Choose a route to navigate the islands.');
    live('flightStatus',state.status || (state.onGround ? 'On the ground. Shift increases power; Space brakes.' : n(state.ias) < 130 ? 'Low airspeed. Gently add power.' : ap.enabled ? 'Autopilot guiding your journey.' : 'Manual flight. A gentle hand on the controls.'));
    if(activePanel==='world') map($('.world-map'),state,meta);map($('#compass-map'),state,meta,true);
  }
  function updateMute() { const button=$('[data-action="mute"]');button.innerHTML=icon(muted?'mute':'sound');button.setAttribute('aria-label',muted?'Unmute sound':'Mute sound');button.setAttribute('aria-pressed',String(muted));updateInput('mute',muted); }

  on(root,'click',event => {
    const button=event.target.closest('button');if(!button)return;
    if(button.dataset.panel) { togglePanel(button.dataset.panel); return; }
    if(button.dataset.camera) { emit('camera',button.dataset.camera);return; }
    if(button.dataset.route) { emit('route',button.dataset.route);toast(`${button.dataset.route}. A beautiful way to go.`);return; }
    if(button.dataset.weather) { emit('weather',button.dataset.weather);toast(`Welcoming ${button.dataset.weather.toLowerCase()}.`);return; }
    if(button.dataset.reset) { emit('reset',button.dataset.reset);if(paused)emit('pause',false);toast(button.dataset.reset==='runway'?'Ready when you are. Increase power to take off.':button.dataset.reset==='approach'?'The runway is ahead. Gear and flaps are ready.':'A fresh sky. Enjoy the journey.');return; }
    if(button.dataset.rebind) { if(bindingCapture) { bindingCapture.button.classList.remove('waiting');bindingCapture.button.textContent=bindingCapture.original; }bindingCapture={action:button.dataset.rebind,button,original:button.textContent};button.classList.add('waiting');button.textContent='Press key';return; }
    const action=button.dataset.action;if(!action)return;
    switch(action) {
      case 'closePanel':togglePanel(null);break;
      case 'dismissHint':$('.control-hint').classList.add('hint-faded');break;
      case 'pause':emit('pause',!paused);break;
      case 'unpause':emit('pause',false);break;
      case 'pauseSettings':emit('pause',false);togglePanel('settings');break;
      case 'mute':muted=!muted;updateMute();emit('mute',muted);break;
      case 'gear':emit('gear',n(lastState.gearTarget ?? lastState.gear)<=.5);break;
      case 'flaps':emit('flaps',(n(lastState.flaps)+1)%4);break;
      case 'photoPanel':togglePanel('camera');break;
      case 'tutorial':tutorial(0);break;
      case 'closeTutorial':tutorial(-1);break;
      case 'tutorialBack':tutorial(tutorialStep-1);break;
      case 'tutorialNext':if(tutorialStep===9){tutorial(-1);toast('The sky is yours. Fly. Explore. Breathe.');}else tutorial(tutorialStep+1);break;
      case 'import':$('#import-flight').click();break;
      case 'calibrateMotion':emit('motion','calibrate');break;
      case 'motion':emit('motion','enable');break;
      case 'reload':location.reload();break;
      default:emit(action);break;
    }
  });
  on(root,'input',event => {
    const input=event.target;if(!input.dataset.input || input.type!=='range')return;
    let value=n(input.value);const action=input.dataset.input;if(action==='throttle'||action==='volume')value/=100;emit(action,value);
  });
  on(root,'change',event => {
    const input=event.target;
    if(input.id==='import-flight') { const file=input.files?.[0];if(file){file.text().then(text => {if(text.length>2e6)throw new Error('File is too large.');const data=JSON.parse(text);if(!data||typeof data!=='object'||Array.isArray(data))throw new Error('Invalid flight file.');emit('import',data);}).catch(error => toast(`Could not import this flight. ${error.message}`));}input.value='';return; }
    const action=input.dataset.input;if(!action || input.type==='range')return;
    let value=input.type==='checkbox'?input.checked:input.type==='number'?Math.max(n(input.min,-Infinity),Math.min(n(input.max,Infinity),n(input.value))):input.value;
    if(action==='mute'){muted=Boolean(value);updateMute();}if(action==='photoMode')photoMode=Boolean(value);if(action==='language'){language=value;applyLanguage();}emit(action,value);
  });
  function applyLanguage(notify = true) {
    const es=language==='es'; document.documentElement.lang=language;
    staticText.forEach(([node,original])=>{if(node.isConnected){const text=original.trim();node.textContent=original.replace(text,tr(text));}});
    const labels=es?['Vuelo','Mundo','Clima','Cámara','Ajustes']:['Flight','World','Weather',/pilot|copilot/i.test(activeCamera)?'Camera':'External View','Settings'];
    $$('.nav-button span').forEach((span,index)=>{span.textContent=labels[index];});
    const headings=es?['El arte de volar','Lugares hermosos','Un cielo diferente','Otra perspectiva','Sentite como en casa']:['The art of flying','Beautiful places','A different kind of sky','A new perspective','Make yourself at home'];
    ['flight','world','weather','camera','settings'].forEach((name,index)=>{$(`#title-${name}`).textContent=headings[index];});
    if(tutorialStep>=0)tutorial(tutorialStep);
    if(notify)toast(es?'Idioma: español. Buen vuelo.':'Language: English. Have a beautiful flight.');
  }
  on(window,'keydown',event => {
    if(bindingCapture) {
      event.preventDefault();event.stopImmediatePropagation();const capture=bindingCapture;bindingCapture=null;capture.button.classList.remove('waiting');
      if(event.key==='Escape'){capture.button.textContent=capture.original;return;}
      const key=event.key===' '?'Space':event.key.length===1?event.key.toUpperCase():event.key;capture.button.textContent=key;emit('rebind',{action:capture.action,key:event.key,code:event.code});toast(`Control updated: ${key}.`);return;
    }
    if(event.key==='Escape' && activePanel) { event.preventDefault();event.stopImmediatePropagation();togglePanel(null);return; }
    if(event.key==='Escape' && tutorialStep>=0) {event.preventDefault();event.stopImmediatePropagation();tutorial(-1);return;}
    if((event.key===' '||event.key==='Enter') && event.target.closest?.('button,summary')) {event.stopImmediatePropagation();return;}
    if(event.key==='Tab' && paused) {
      const buttons=[...$('.pause-screen').querySelectorAll('button')];const first=buttons[0],last=buttons[buttons.length-1];
      if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus();}else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();}
    }
    if(event.target===$('.touch-joystick') && /^Arrow/.test(event.key)){event.preventDefault();const value=event.key==='ArrowLeft'?-1:event.key==='ArrowRight'?1:0;const pitch=event.key==='ArrowUp'?1:event.key==='ArrowDown'?-1:0;emit('touch',{pitch,roll:value,yaw:0});}
  },true);
  on(window,'keyup',event=>{if(event.target===$('.touch-joystick')&&/^Arrow/.test(event.key))emit('touch',{pitch:0,roll:0,yaw:0});});
  const joystick=$('.touch-joystick'),knob=$('.joystick-knob');
  const moveTouch=event=>{
    if(event.pointerId!==touchPointer)return;event.preventDefault();let dx=event.clientX-touchOrigin.x,dy=event.clientY-touchOrigin.y;const radius=joystick.clientWidth*.32;const distance=Math.hypot(dx,dy);if(distance>radius){dx*=radius/distance;dy*=radius/distance;}
    knob.style.transform=`translate(${dx}px,${dy}px)`;joystick.setAttribute('aria-valuenow',String(Math.round(dx/radius*100)));joystick.setAttribute('aria-valuetext',`Pitch ${Math.round(-dy/radius*100)}, roll ${Math.round(dx/radius*100)}`);emit('touch',{pitch:-dy/radius,roll:dx/radius,yaw:0});
  };
  const stopTouch=event=>{if(event&&event.pointerId!==touchPointer)return;touchPointer=null;knob.style.transform='';joystick.setAttribute('aria-valuenow','0');emit('touch',{pitch:0,roll:0,yaw:0});};
  on(joystick,'pointerdown',event=>{event.preventDefault();touchPointer=event.pointerId;const rect=joystick.getBoundingClientRect();touchOrigin={x:rect.left+rect.width/2,y:rect.top+rect.height/2};joystick.setPointerCapture(event.pointerId);moveTouch(event);});on(joystick,'pointermove',moveTouch);on(joystick,'pointerup',stopTouch);on(joystick,'pointercancel',stopTouch);on(window,'blur',()=>stopTouch());
  const brakeButton=$('[data-brake]');
  on(brakeButton,'pointerdown',event=>{event.preventDefault();brakeButton.setPointerCapture(event.pointerId);emit('brake',true);});
  ['pointerup','pointercancel','lostpointercapture'].forEach(event=>on(brakeButton,event,()=>emit('brake',false)));
  on(window,'blur',()=>emit('brake',false));
  hintTimer=setTimeout(()=>$('.control-hint').classList.add('hint-faded'),14000);
  return { update, toast, setCamera, toggleHUD, togglePanel, setPaused,
    get panelOpen(){return activePanel;},
    showUnsupported(message){$('#webgl-unsupported').hidden=false;if(message)$('#webgl-unsupported p').textContent=message;},
    showHint(){clearTimeout(hintTimer);$('.control-hint').classList.remove('hint-faded');hintTimer=setTimeout(()=>$('.control-hint').classList.add('hint-faded'),14000);},
    dispose(){clearTimeout(toastTimer);clearTimeout(hintTimer);listeners.forEach(remove=>remove());root.remove();},
  };
}

