# SkyJourney — implementation contract

Build an offline single-file WebGL flight simulator from the supplied Spanish master specification. The two reference images define the composition: pearl and navy airliner above a golden archipelago, and a physical graphite cockpit with amber lighting and working screens. All cameras share one simulation and one terrain.

- `src/simulation.js`: SI aerodynamic state, fixed step integration, assisted/manual modes, autopilot, navigation, gear/flaps and ground dynamics. Verify cruise equilibrium, turns, climbs, thrust response and takeoff with numerical tests.
- `src/aircraft.js`: procedural 39 m airliner, moving control surfaces, 3D cockpit, instrument textures and clickable physical controls.
- `src/world-data.js` and `src/world.js`: deterministic terrain shared by map and physics, runway, ocean and sky shaders, cloud volumes, weather, day/night and spatial population.
- `src/ui.js`, `src/shell.html`, `src/audio.js`: restrained reference HUD, functional panels, accessibility, touch controls and procedural audio.
- `src/main.js`: input, gamepad, cameras, quality, rendering, persistence and photo export.
- `build.mjs`: bundle Three.js and every module into a classic inline script in `index.html`. No runtime fetches, external URLs, modules, models or fonts.

Verification: numerical dynamics tests; Chromium opening `file://` with all HTTP requests denied; screenshot inspection of exterior and cabin; camera continuity, controls, weather, pause, save/restore, photo export, mobile layout and WebGL context recovery. Report measured performance and actual limitations. Development files are optional; only `index.html` is needed to play.

Motion evaluation: easing and spring damping for cameras; stagger/mask/clip-path for secondary panels; crossfade for weather; magnification for instrument focus; blur for glass panels; layout animation for responsiveness; shared aircraft symbol across map/compass; route stroke draw; 3D perspective and cloud particles. Avoid decorative morph, path morph and variable-font animation where no semantic benefit exists. Honor reduced motion.
