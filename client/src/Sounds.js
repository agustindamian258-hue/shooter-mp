export class SoundSystem {
  constructor() {
    this.ctx = null;
    this.enabled = true;
    this.masterVolume = 0.6;
    this.sounds = {};
    this.init();
  }

  init() {
    try {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = this.masterVolume;
      this.masterGain.connect(this.ctx.destination);
    } catch (e) {
      console.warn('[Sound] Web Audio no disponible');
      this.enabled = false;
    }
  }

  resume() {
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  createBuffer(duration, generator) {
    if (!this.enabled) return null;
    const sampleRate = this.ctx.sampleRate;
    const buffer = this.ctx.createBuffer(1, sampleRate * duration, sampleRate);
    const data = buffer.getChannelData(0);
    generator(data, sampleRate);
    return buffer;
  }

  playBuffer(buffer, volume = 1, when = 0) {
    if (!this.enabled || !buffer) return;
    const source = this.ctx.createBufferSource();
    const gain = this.ctx.createGain();
    gain.gain.value = volume;
    source.buffer = buffer;
    source.connect(gain);
    gain.connect(this.masterGain);
    source.start(this.ctx.currentTime + when);
    return source;
  }

  buildSounds() {
    // Disparo de rifle
    this.sounds.rifle = this.createBuffer(0.15, (data, sr) => {
      for (let i = 0; i < data.length; i++) {
        const t = i / sr;
        const noise = (Math.random() * 2 - 1);
        const env = Math.exp(-t * 30);
        const click = Math.exp(-t * 80) * Math.sin(t * 800);
        data[i] = (noise * 0.6 + click * 0.4) * env;
      }
    });

    // Disparo de escopeta
    this.sounds.shotgun = this.createBuffer(0.25, (data, sr) => {
      for (let i = 0; i < data.length; i++) {
        const t = i / sr;
        const noise = (Math.random() * 2 - 1);
        const env = Math.exp(-t * 18);
        const boom = Math.sin(t * 120) * Math.exp(-t * 25);
        data[i] = (noise * 0.5 + boom * 0.5) * env;
      }
    });

    // Disparo de sniper
    this.sounds.sniper = this.createBuffer(0.3, (data, sr) => {
      for (let i = 0; i < data.length; i++) {
        const t = i / sr;
        const noise = (Math.random() * 2 - 1);
        const env = Math.exp(-t * 15);
        const crack = Math.sin(t * 400) * Math.exp(-t * 40);
        data[i] = (noise * 0.3 + crack * 0.7) * env;
      }
    });

    // Disparo de pistola
    this.sounds.pistol = this.createBuffer(0.12, (data, sr) => {
      for (let i = 0; i < data.length; i++) {
        const t = i / sr;
        const noise = (Math.random() * 2 - 1);
        const env = Math.exp(-t * 40);
        const pop = Math.sin(t * 600) * Math.exp(-t * 60);
        data[i] = (noise * 0.4 + pop * 0.6) * env;
      }
    });

    // Reload
    this.sounds.reload = this.createBuffer(0.3, (data, sr) => {
      for (let i = 0; i < data.length; i++) {
        const t = i / sr;
        const click1 = Math.sin(t * 1200) * Math.exp(-t * 80) * (t < 0.05 ? 1 : 0);
        const click2 = Math.sin((t - 0.15) * 900) * Math.exp(-(t - 0.15) * 70) * (t > 0.15 ? 1 : 0);
        data[i] = (click1 + click2) * 0.8;
      }
    });

    // Hit marker (recibir daño)
    this.sounds.hit = this.createBuffer(0.08, (data, sr) => {
      for (let i = 0; i < data.length; i++) {
        const t = i / sr;
        data[i] = Math.sin(t * 800) * Math.exp(-t * 60) * 0.5;
      }
    });

    // Hit confirmado (golpear enemigo)
    this.sounds.hitConfirm = this.createBuffer(0.06, (data, sr) => {
      for (let i = 0; i < data.length; i++) {
        const t = i / sr;
        data[i] = Math.sin(t * 1400) * Math.exp(-t * 80) * 0.4;
      }
    });

    // Kill
    this.sounds.kill = this.createBuffer(0.4, (data, sr) => {
      for (let i = 0; i < data.length; i++) {
        const t = i / sr;
        const freq = 400 + t * 300;
        data[i] = Math.sin(t * freq * Math.PI * 2) * Math.exp(-t * 8) * 0.5;
      }
    });

    // Pasos
    this.sounds.footstep = this.createBuffer(0.12, (data, sr) => {
      for (let i = 0; i < data.length; i++) {
        const t = i / sr;
        const noise = Math.random() * 2 - 1;
        const env = Math.exp(-t * 30) * (t < 0.05 ? t / 0.05 : 1);
        data[i] = noise * env * 0.3;
      }
    });

    // Zona (daño)
    this.sounds.zoneDamage = this.createBuffer(0.2, (data, sr) => {
      for (let i = 0; i < data.length; i++) {
        const t = i / sr;
        data[i] = Math.sin(t * 180 * Math.PI * 2) * Math.exp(-t * 10) * 0.4;
      }
    });

    // Muerte
    this.sounds.death = this.createBuffer(1.0, (data, sr) => {
      for (let i = 0; i < data.length; i++) {
        const t = i / sr;
        const noise = Math.random() * 2 - 1;
        const env = Math.exp(-t * 3);
        const tone = Math.sin(t * 120 * Math.PI * 2) * Math.exp(-t * 5);
        data[i] = (noise * 0.3 + tone * 0.7) * env * 0.5;
      }
    });

    // Jump
    this.sounds.jump = this.createBuffer(0.15, (data, sr) => {
      for (let i = 0; i < data.length; i++) {
        const t = i / sr;
        const freq = 200 + t * 400;
        data[i] = Math.sin(t * freq * Math.PI * 2) * Math.exp(-t * 20) * 0.3;
      }
    });

    // Viento ambiente
    this.sounds.wind = this.createBuffer(2.0, (data, sr) => {
      let phase = 0;
      for (let i = 0; i < data.length; i++) {
        const t = i / sr;
        phase += (80 + Math.sin(t * 0.5) * 20) / sr * Math.PI * 2;
        const noise = Math.random() * 2 - 1;
        const filtered = noise * 0.015;
        data[i] = filtered;
      }
    });
  }

  playShot(weaponKey) {
    this.resume();
    const key = this.sounds[weaponKey] ? weaponKey : 'rifle';
    this.playBuffer(this.sounds[key], 0.8);
  }

  playReload() {
    this.resume();
    this.playBuffer(this.sounds.reload, 0.6);
  }

  playHit() {
    this.resume();
    this.playBuffer(this.sounds.hit, 0.7);
  }

  playHitConfirm() {
    this.resume();
    this.playBuffer(this.sounds.hitConfirm, 0.5);
  }

  playKill() {
    this.resume();
    this.playBuffer(this.sounds.kill, 0.8);
  }

  playFootstep() {
    this.resume();
    this.playBuffer(this.sounds.footstep, 0.3);
  }

  playZoneDamage() {
    this.resume();
    this.playBuffer(this.sounds.zoneDamage, 0.5);
  }

  playDeath() {
    this.resume();
    this.playBuffer(this.sounds.death, 0.7);
  }

  playJump() {
    this.resume();
    this.playBuffer(this.sounds.jump, 0.4);
  }

  playWindLoop() {
    if (!this.enabled || !this.sounds.wind) return;
    const source = this.ctx.createBufferSource();
    source.buffer = this.sounds.wind;
    source.loop = true;
    const gain = this.ctx.createGain();
    gain.gain.value = 0.2;
    source.connect(gain);
    gain.connect(this.masterGain);
    source.start();
    return source;
  }

  setVolume(v) {
    this.masterVolume = Math.max(0, Math.min(1, v));
    if (this.masterGain) this.masterGain.gain.value = this.masterVolume;
  }
        }
