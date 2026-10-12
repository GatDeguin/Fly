export function createAudio() {
  let context, master, engineGain, airGain, ambientGain, engineFilter, airFilter;
  let engineOscillators = [], sources = [], volume = .35, muted = false, ambient = false, suspended = false;
  let lastState = {}, lastMeta = {};
  const smooth = (param, value, duration = .55) => {
    if (!context || !param) return;
    param.setTargetAtTime(value, context.currentTime, duration);
  };
  function initialize() {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return false;
    try {
      context = new AudioContext();
      master = context.createGain(); master.gain.value = 0; master.connect(context.destination);
      engineGain = context.createGain(); engineGain.gain.value = 0; engineGain.connect(master);
      airGain = context.createGain(); airGain.gain.value = 0; airGain.connect(master);
      ambientGain = context.createGain(); ambientGain.gain.value = 0; ambientGain.connect(master);
      engineFilter = context.createBiquadFilter(); engineFilter.type = 'lowpass'; engineFilter.frequency.value = 290; engineFilter.Q.value = .35; engineFilter.connect(engineGain);
      airFilter = context.createBiquadFilter(); airFilter.type = 'lowpass'; airFilter.frequency.value = 550; airFilter.Q.value = .35; airFilter.connect(airGain);
      const buffer = context.createBuffer(1, context.sampleRate * 4, context.sampleRate);
      const data = buffer.getChannelData(0); let brown = 0;
      for (let i = 0; i < data.length; i++) { brown = (brown + (Math.random() * 2 - 1) * .021) / 1.021; data[i] = brown * 3.3; }
      for (const filter of [engineFilter, airFilter]) {
        const noise = context.createBufferSource(); noise.buffer = buffer; noise.loop = true; noise.connect(filter); noise.start(0, filter === airFilter ? 1.39 : 0); sources.push(noise);
      }
      for (const base of [43, 66, 89]) {
        const oscillator = context.createOscillator(); oscillator.type = 'sine'; oscillator.frequency.value = base;
        const gain = context.createGain(); gain.gain.value = .018; oscillator.connect(gain); gain.connect(engineGain); oscillator.start();
        engineOscillators.push({ oscillator, base }); sources.push(oscillator);
      }
      for (const [i, frequency] of [130.81, 196, 261.63, 329.63].entries()) {
        const oscillator = context.createOscillator(); oscillator.type = 'sine'; oscillator.frequency.value = frequency;
        const voice = context.createGain(); voice.gain.value = .022 / (1 + i * .45); oscillator.connect(voice); voice.connect(ambientGain);
        const lfo = context.createOscillator(); lfo.frequency.value = .035 + i * .014;
        const depth = context.createGain(); depth.gain.value = .003; lfo.connect(depth); depth.connect(voice.gain); lfo.start(); oscillator.start(); sources.push(oscillator, lfo);
      }
      return true;
    } catch (_) { context = null; return false; }
  }
  function update(state = {}, meta = {}) {
    lastState = state; lastMeta = meta;
    if (!context) return;
    const power = Math.max(0, Math.min(1, Number(state.throttle ?? .7)));
    const speed = Math.max(0, Number(state.groundSpeed ?? state.ias ?? state.speedKts ?? (state.speed != null ? state.speed * 1.943844 : 260)));
    const cockpit = /pilot|copilot|cockpit/i.test(meta.camera || state.camera || 'Pilot');
    const rain = /rain|overcast/i.test(meta.weather || '');
    smooth(master.gain, muted || suspended ? 0 : volume * .65, .2);
    smooth(engineGain.gain, (.21 + power * .5) * (cockpit ? .64 : 1));
    smooth(airGain.gain, Math.min(.53, .08 + speed / 1200) * (cockpit ? .5 : 1) + (rain ? .035 : 0));
    smooth(engineFilter.frequency, (cockpit ? 195 : 300) + power * 340);
    smooth(airFilter.frequency, (cockpit ? 300 : 580) + Math.min(speed, 500) * 1.9);
    smooth(ambientGain.gain, ambient ? .28 : 0, 1.3);
    engineOscillators.forEach(({ oscillator, base }) => smooth(oscillator.frequency, base * (.75 + power * .7), .7));
  }
  return {
    async unlock() { if (!context && !initialize()) return false; if (context.state === 'suspended' && !suspended) await context.resume().catch(() => {}); update(lastState, lastMeta); return context.state === 'running'; },
    update,
    setVolume(value) { volume = Math.max(0, Math.min(1, Number(value) || 0)); update(lastState, lastMeta); },
    setMuted(value) { muted = Boolean(value); update(lastState, lastMeta); },
    setAmbient(value) { ambient = Boolean(value); update(lastState, lastMeta); },
    suspend() { suspended = true; if (context) { smooth(master.gain, 0, .08); context.suspend().catch(() => {}); } },
    resume() { suspended = false; if (context) context.resume().then(() => update(lastState, lastMeta)).catch(() => {}); },
    dispose() { sources.forEach(source => { try { source.stop(); source.disconnect(); } catch (_) {} }); sources = []; engineOscillators = []; if (context) context.close().catch(() => {}); context = null; }
  };
}
