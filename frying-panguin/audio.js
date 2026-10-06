/* A small procedural toy orchestra. No downloads, timers or gameplay randomness. */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.PanguinAudio = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, () => {
  'use strict';
  const LIMITS = Object.freeze({ voices: 48, ordinaryVoices: 36, musicVoices: 10, bpm: 126 });
  const SCALE = [523.25, 587.33, 659.25, 783.99, 880, 1046.5];
  class Soundtrack {
    constructor({ context = null } = {}) {
      this.context = context;
      // Only an explicitly injected offline renderer may schedule before running.
      this.offline = !!context && typeof context.startRendering === 'function';
      this.playbackAvailable = false;
      this.enabled = true;
      this.active = true;
      this.voices = new Set();
      this.cooldowns = new Map();
      this.phase = null;
      this.step = 0;
      this.nextBeat = 0;
      this.footDistance = 0;
      this.foot = 0;
      this.lastPosition = null;
      this.coinStep = 0;
      this.lastCoin = -Infinity;
      this.momentum = 0;
      this.lastUpdate = 0;
      this.musicLevel = .9;
      this.seed = 2718;
      if (context) this.build();
    }
    build() {
      const a = this.context;
      this.music = a.createGain(); this.music.gain.value = this.musicLevel;
      this.effects = a.createGain();
      const highpass = a.createBiquadFilter(); highpass.type = 'highpass'; highpass.frequency.value = 65;
      const lowpass = a.createBiquadFilter(); lowpass.type = 'lowpass'; lowpass.frequency.value = 5200; lowpass.Q.value = .5;
      const compressor = a.createDynamicsCompressor();
      compressor.threshold.value = -22; compressor.knee.value = 15; compressor.ratio.value = 5;
      compressor.attack.value = .004; compressor.release.value = .16;
      this.master = a.createGain(); this.master.gain.value = this.enabled && this.active ? .85 : 0;
      this.music.connect(highpass); this.effects.connect(highpass); highpass.connect(lowpass);
      lowpass.connect(compressor); compressor.connect(this.master); this.master.connect(a.destination);
      this.noise = a.createBuffer(1, Math.ceil(a.sampleRate * .5), a.sampleRate);
      const samples = this.noise.getChannelData(0);
      let seed = 8128;
      for (let i = 0; i < samples.length; i++) {
        seed = (Math.imul(seed, 1664525) + 1013904223) | 0;
        samples[i] = (seed >>> 0) / 2147483648 - 1;
      }
    }
    unlock() {
      if (!this.enabled || !this.active) return;
      try {
        if (!this.context) {
          const Audio = globalThis.AudioContext || globalThis.webkitAudioContext;
          if (!Audio) return;
          this.context = new Audio(); this.build();
        }
        if (!this.master) this.build();
        if (!this.offline && ['suspended', 'interrupted'].includes(this.context.state)) this.context.resume()?.catch(() => {});
      } catch { /* Audio is optional; unsupported/blocked devices still play. */ }
    }
    get ready() { return this.enabled && this.active && !!this.master && (this.context.state === 'running' || (this.offline && this.context.state !== 'closed')); }
    random() { this.seed = (Math.imul(this.seed, 1664525) + 1013904223) | 0; return (this.seed >>> 0) / 4294967296; }
    setEnabled(enabled) { this.enabled = enabled; this.gate(); }
    setActive(active) { this.active = active; this.gate(); }
    gate() {
      this.lastPosition = null; this.footDistance = 0; this.nextBeat = 0;
      this.playbackAvailable = false;
      this.momentum = 0;
      this.cooldowns.clear();
      if (!this.master) return;
      const t = this.context.currentTime, param = this.master.gain;
      param.cancelScheduledValues(t); param.setValueAtTime(param.value, t);
      param.linearRampToValueAtTime(this.enabled && this.active ? .85 : 0, t + .012);
      if (!this.enabled || !this.active) this.stopVoices();
    }
    stopVoices(bus = null, immediate = false) {
      const t = this.context.currentTime;
      for (const voice of this.voices) if (!bus || voice.bus === bus) {
        voice.gain.gain.cancelScheduledValues(t);
        if (immediate) voice.gain.gain.setValueAtTime(0, t);
        else voice.gain.gain.setTargetAtTime(0, t, .004);
        voice.source.stop(t + (immediate ? 0 : .02));
        voice.end = Math.min(voice.end, t + (immediate ? 0 : .02));
      }
    }
    reserveVoices(count) {
      if (!this.ready) return;
      const now = this.context.currentTime;
      for (const voice of this.voices) if (voice.end <= now) this.voices.delete(voice);
      // Retire actual sources before freeing accounting: a faded source still
      // sounding cannot be treated as a free slot. Prefer ordinary oldest voices.
      const oldest = [...this.voices].sort((a,b) => Number(a.priority)-Number(b.priority) || a.end-b.end);
      for (const voice of oldest) {
        if (this.voices.size <= LIMITS.voices - count) break;
        voice.gain.gain.cancelScheduledValues(now);
        voice.gain.gain.setValueAtTime(0, now);
        voice.source.stop(now); voice.end = now;
        this.voices.delete(voice);
      }
    }
    hurtMotif() {
      this.duck(.1, .32);
      this.bend(175, 72, .21, { volume: .095, priority: true });
      this.puff(700, .09, .055, { priority: true });
    }
    allow(key, interval) {
      if (!this.ready) return false;
      const t = this.context.currentTime;
      if (t < (this.cooldowns.get(key) ?? -Infinity)) return false;
      this.cooldowns.set(key, t + interval); return true;
    }
    voice({ frequency = 440, to = frequency, duration = .1, delay = 0, volume = .03, type = 'sine', noise = false, filter = 'lowpass', pan = 0, bus = 'effects', priority = false } = {}) {
      if (!this.ready) return;
      const a = this.context, now = a.currentTime;
      // Prune by audio time too: offline rendering doesn't deliver onended until rendering.
      for (const voice of this.voices) if (voice.end <= now) this.voices.delete(voice);
      if (this.voices.size >= (priority ? LIMITS.voices : LIMITS.ordinaryVoices)) return;
      if (bus === 'music' && [...this.voices].filter(v => v.bus === bus).length >= LIMITS.musicVoices) return;
      const t = now + delay, source = noise ? a.createBufferSource() : a.createOscillator();
      const gain = a.createGain(), nodes = [source, gain];
      if (noise) {
        source.buffer = this.noise;
        const shape = a.createBiquadFilter(); shape.type = filter; shape.Q.value = .7;
        shape.frequency.setValueAtTime(frequency, t); shape.frequency.exponentialRampToValueAtTime(Math.max(40, to), t + duration);
        source.connect(shape); shape.connect(gain); nodes.push(shape);
      } else {
        source.type = type; source.frequency.setValueAtTime(frequency, t);
        source.frequency.exponentialRampToValueAtTime(Math.max(30, to), t + duration);
        source.connect(gain);
      }
      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(volume, t + Math.min(.005, duration / 4));
      gain.gain.exponentialRampToValueAtTime(.0001, t + duration);
      gain.gain.linearRampToValueAtTime(0, t + duration + .005);
      if (a.createStereoPanner) {
        const stereo = a.createStereoPanner(); stereo.pan.value = Math.max(-.35, Math.min(.35, pan));
        gain.connect(stereo); stereo.connect(this[bus]); nodes.push(stereo);
      } else gain.connect(this[bus]);
      const voice = { source, gain, bus, priority, end: t + duration + .008 };
      this.voices.add(voice);
      source.onended = () => { this.voices.delete(voice); for (const node of nodes) node.disconnect(); };
      source.start(t); source.stop(voice.end);
    }
    note(frequency, duration = .12, volume = .03, options = {}) { this.voice({ frequency, duration, volume, ...options }); }
    bend(from, to, duration = .15, options = {}) { this.voice({ frequency: from, to, duration, type: 'triangle', volume: .045, ...options }); }
    puff(frequency, duration = .09, volume = .03, options = {}) { this.voice({ frequency, duration, volume, noise: true, ...options }); }
    duck(amount = .24, duration = .2) {
      if (!this.ready) return;
      const t = this.context.currentTime, gain = this.music.gain;
      this.duckLevel = t < (this.duckUntil || 0) ? Math.min(this.duckLevel, amount) : amount;
      this.duckUntil = Math.max(this.duckUntil || 0, t + duration);
      gain.cancelScheduledValues(t); gain.setValueAtTime(this.duckLevel, t);
      gain.setTargetAtTime(this.musicLevel, this.duckUntil, .1);
    }
    contact(material, options = {}) {
      const v = .96 + this.random() * .08;
      if (material === 'rock') {
        this.note(930 * v, .07, .044, { type: 'triangle', ...options });
        this.note(213 * v, .12, .035, { delay: .008, ...options }); this.puff(1600, .09, .04, options);
        this.note(710 * v, .085, .023, { delay: .055, type: 'triangle', ...options });
      } else if (material === 'ice') {
        this.note(1320 * v, .11, .04, options); this.note(1980 * v, .13, .017, { delay: .018, ...options });
        this.puff(2400, .075, .028, options);
      } else if (material === 'snowbank') {
        this.puff(520, .16, .085, options); this.bend(155, 65, .13, { volume: .035, ...options });
      } else if (material === 'wood') {
        this.bend(190 * v, 105, .075, { volume: .065, ...options }); this.puff(950, .1, .055, options);
        this.note(610 * v, .065, .022, { type: 'triangle', delay: .028, ...options });
        this.puff(1500, .075, .03, { delay: .055, filter: 'bandpass', ...options });
      } else {
        const voices = { chick: [650, 170, .12, 960], penguin: [390, 95, .16, 760], bear: [200, 48, .22, 490], snowbird: [1120, 330, .11, 1230] };
        const [from, to, duration, clang] = voices[material] || voices.penguin;
        this.note(clang * v, .13, .06, { type: 'triangle', ...options });
        this.note(clang * 1.47 * v, .095, .026, { delay: .008, ...options });
        this.note(clang * 1.92 * v, .12, .013, { delay: .045, ...options });
        this.puff(material === 'bear' ? 360 : 820, .065, .035, options);
        this.bend(from * v, to, duration, { delay: .025, volume: .058, ...options });
        // A short answering yelp makes each bonk a tiny comic exchange.
        this.bend(to * 1.7, from * .7, .085, { delay: .12, volume: .024, ...options });
      }
    }
    update(game) {
      if (!this.ready) {
        if (this.playbackAvailable) for (const voice of this.voices) {
          voice.source.stop(this.context.currentTime); voice.end = this.context.currentTime;
        }
        this.playbackAvailable = false; this.lastPosition = null; this.footDistance = 0; return;
      }
      const t = this.context.currentTime, p = game.player;
      if (!this.playbackAvailable) {
        this.playbackAvailable = true; this.phase = null; this.lastUpdate = t;
        this.cooldowns.clear();
      }
      this.momentum = Math.max(0, this.momentum - Math.max(0, t - this.lastUpdate) * .35);
      this.lastUpdate = t;
      if (game.phase !== this.phase) {
        this.phase = game.phase; this.step = 0; this.nextBeat = t + .04;
        this.lastPosition = null; this.footDistance = 0; this.momentum = 0;
        this.stopVoices('music');
        this.musicLevel = game.phase === 'shop' ? .48 : .9;
        this.duckUntil = t;
        this.music.gain.cancelScheduledValues(t);
        this.music.gain.setTargetAtTime(this.musicLevel, t, .08);
      }
      if (game.phase !== 'run' && game.phase !== 'shop') { this.lastPosition = null; return; }
      if (this.lastPosition) {
        const distance = Math.hypot(p.x - this.lastPosition.x, p.y - this.lastPosition.y);
        // Actual displacement: pressing into a wall is silent. Teleports are not steps.
        if (distance < 35) this.footDistance += distance;
        if (this.footDistance >= 15 && this.allow('foot', .13)) {
          this.footDistance %= 15; this.foot++;
          const pan = this.foot % 2 ? -.18 : .18;
          this.puff(650 + this.random() * 200, .085, .032, { pan });
          this.note(this.foot % 2 ? 165 : 185, .06, .012, { pan });
        }
      }
      this.lastPosition = { x: p.x, y: p.y };
      // Schedule only a tiny lookahead; never replay a backlog after a slow/hidden frame.
      const interval = 60 / LIMITS.bpm / 2;
      if (t > this.nextBeat + interval) this.nextBeat = t + .025;
      if (t + .045 < this.nextBeat) return;
      const delay = Math.max(0, this.nextBeat - t), step = this.step++ % 32;
      this.nextBeat += interval;
      const shop = game.phase === 'shop', bus = 'music';
      const root = [130.81, 164.81, 146.83, 196][Math.floor(step / 8)];
      const density = Math.max(0, Math.min(1, game.difficulty || 0));
      if (step % (shop ? 8 : 4) === 0) {
        this.note(root, shop ? .32 : .23, shop ? .017 : .038, { type: 'triangle', bus, delay });
        if (!shop) this.bend(110, 50, .12, { volume: .038, bus, delay });
      }
      const phrase = [0, -1, 2, -1, 4, 2, -1, 1, 2, -1, 4, -1, 3, -1, 1, -1,
        1, -1, 3, -1, 4, 3, -1, 2, 4, -1, 2, -1, 1, -1, -1, -1];
      if (phrase[step] >= 0 && (!shop || step % 4 === 0)) {
        this.note(SCALE[phrase[step]] / 2, shop ? .16 : .21, shop ? .011 : .031, { type: shop ? 'sine' : 'triangle', bus, delay, pan: step % 4 ? .22 : -.22 });
        this.note(SCALE[phrase[step]], .09, shop ? .003 : .01, { bus, delay, pan: .15 });
      }
      if (!shop) {
        // Shaker, hollow backbeat and answering plucks occupy different rhythmic gaps.
        this.puff(step % 2 ? 2300 : 1700, .045, step % 2 ? .021 : .011, { bus, delay, filter: 'bandpass', pan: -.2 });
        if (step % 4 === 2) {
          this.note(740, .045, .022, { bus, delay, pan: .14 });
          this.puff(1200, .075, .03, { bus, delay, filter: 'bandpass', pan: .14 });
          this.note(root * 1.5, .13, .022, { type: 'triangle', bus, delay: delay + interval / 2, pan: -.1 });
        }
        if (step % 4 === 3) {
          this.note(SCALE[(Math.floor(step / 4) + 2) % SCALE.length], .095, .014, { bus, delay: delay + interval * .55, pan: -.28 });
          this.puff(2100, .035, .01, { bus, delay: delay + interval * .55, filter: 'bandpass', pan: .25 });
        }
        if ((p.buffs?.frenzy > 0 || density > .6 || this.momentum > .25) && step % 4 === 1) {
          this.note(SCALE[(step + 1) % SCALE.length], .085, .016, { bus, delay: delay + interval * .5, pan: .28 });
        }
      }
    }
    events(events, game) {
      if (!this.ready) return;
      if (events.some(e => e.type === 'critical')) {
        this.stopVoices(null, true); this.duck(.05, .5);
        this.reserveVoices(6);
        // A pan clink, snowy thud, then a falling arcade phrase at lethal defeat.
        // All six voices finish before the 1.05-second flourish reveals Summary.
        const death = { priority: true };
        this.note(784, .11, .032, { ...death, type: 'triangle' });
        if (events.some(e => e.type === 'hurt')) this.hurtMotif();
        else {
          this.puff(480, .13, .06, death);
          this.bend(180, 60, .2, { ...death, volume: .07 });
        }
        this.note(392, .13, .032, { ...death, type: 'square', delay: .07 });
        this.note(294, .15, .028, { ...death, type: 'square', delay: .22 });
        this.bend(196, 65, .37, { ...death, volume: .065, delay: .38 });
        return;
      }
      if (game.phase === 'summary') {
        if (events.some(e => e.type === 'summary') && this.allow('summary', .5)) {
          this.stopVoices();
          this.note(392, .16, .026); this.note(262, .23, .022, { delay: .12 });
        }
        return;
      }
      // Prioritize damage/death cues before filling the ordinary voice budget.
      const important = new Set(['critical', 'hurt', 'depart', 'reset', 'powerup', 'purchase', 'contractWon']);
      const ordered = [...events.filter(e => important.has(e.type)), ...events.filter(e => !important.has(e.type))];
      for (const event of ordered) {
        const kind = event.type, material = kind === 'bonk' ? event.kind : kind === 'rockHit' ? 'rock' : kind === 'chest' ? 'wood' : event.material;
        const contact = ['bonk', 'rockHit', 'chest', 'sceneryHit'].includes(kind);
        const key = contact ? 'contact:' + material : kind;
        const interval = contact ? .075 : ({ coin: .085, swing: .16, knockout: .14, bowl: .09, charge: .18, wave: 1, honk: .55 }[kind] || .12);
        if (kind === 'powerup' && !['speed', 'frenzy', 'jelly'].includes(event.kind)) continue;
        if (kind === 'hurt') { this.reserveVoices(2); this.hurtMotif(); continue; }
        if (!this.allow(key, interval)) continue;
        const pan = Number.isFinite(event.x) ? Math.max(-.3, Math.min(.3, (event.x - game.player.x) / 350)) : 0;
        const options = { pan };
        if (contact) { this.momentum = Math.min(1, this.momentum + .12); this.contact(material, options); this.duck(.65, .055); continue; }
        if (kind === 'swing' && game.phase === 'run') {
          this.puff(1600, .105, .037, { to: 420, filter: 'bandpass', pan: game.player.facingX * .2 });
          this.bend(310, 190, .07, { volume: .013, delay: .025, pan: -game.player.facingX * .15 });
        }
        if (kind === 'coin') {
          const t = this.context.currentTime;
          if (t - this.lastCoin > .65) this.coinStep = 0;
          const pitch = SCALE[this.coinStep++ % SCALE.length]; this.lastCoin = t;
          this.momentum = Math.min(1, this.momentum + .09);
          this.note(pitch, .14, .046); this.note(pitch * 1.5, .1, .019, { delay: .027, pan: .22 });
          if (this.coinStep % 3 === 0) this.note(pitch * .5, .14, .029, { delay: .06, type: 'triangle', pan: -.22 });
        }
        if (kind === 'bowl') this.bend(310 + Math.min(event.depth || 0, 4) * 95, 560 + Math.min(event.depth || 0, 4) * 90, .085, { volume: .027, pan });
        if (kind === 'crash') { this.puff(500, .12, .07, options); this.bend(event.kind === 'bear' ? 170 : 310, 55, .19, { volume: .05, pan }); }
        if (kind === 'knockout') { this.note(392, .095, .032); this.note(659, .13, .032, { delay: .06, pan: .16 }); this.note(784, .17, .022, { delay: .12, pan: -.16 }); }
        if (kind === 'charge') { this.duck(.27, .16); this.bend(event.kind === 'snowbird' ? 710 : 150, event.kind === 'snowbird' ? 370 : 340, .17, { volume: .038, priority: true }); }
        if (kind === 'stomp') { this.duck(.22, .2); this.puff(260, .22, .12, { priority: true }); this.bend(125, 48, .2, { volume: .07, priority: true }); }
        if (kind === 'rock') this.puff(600, .13, .05, options);
        if (kind === 'depart') { this.note(262, .12, .035); this.note(392, .15, .032, { delay: .07 }); this.note(523, .15, .025, { delay: .14 }); }
        if (kind === 'reset' && event.reason !== 'initial') {
          this.stopVoices('music'); this.note(523, .13, .035); this.note(392, .22, .03, { delay: .13 });
        }
        if (kind === 'powerup' || kind === 'purchase' || kind === 'contractWon') {
          this.duck(.28, .2);
          const pitches = kind === 'contractWon' ? [392, 523, 659, 784] : [392, 587, 784];
          pitches.forEach((frequency, i) => this.note(frequency, .17, .035, { delay: i * .055, priority: true }));
        }
        if (kind === 'equip' || kind === 'contractStamp') { this.note(659, .1, .03); this.note(880, .12, .022, { delay: .055 }); }
        if (kind === 'slip') this.bend(690, 90, .18, { volume: .04, pan });
        if (kind === 'snowball') this.puff(1600, .1, .035, { to: 450, filter: 'bandpass', pan });
        if (kind === 'honk') { this.note(196, .13, .025, { type: 'triangle' }); this.note(261, .14, .023, { delay: .035, type: 'triangle' }); }
        if (kind === 'bounce') this.bend(170, 720, .14, { volume: .04, pan });
        if (kind === 'wave' && game.phase === 'run') { this.note(196, .1, .019, { pan: -.15 }); this.note(294, .12, .018, { delay: .1, pan: .15 }); }
        if (kind === 'purchaseFailed' || kind === 'supplyFailed' || kind === 'contractExpired') this.bend(165, 105, .12, { volume: .026 });
      }
    }
  }
  return { Soundtrack, LIMITS };
});
