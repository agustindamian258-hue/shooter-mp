export class Weather {
  constructor(world, sounds) {
    this.world = world;
    this.sounds = sounds;
    this.current = 'clear';
    this.timer = 60;
    this.duration = 60;
    this.transitioning = false;
    this.rainParticles = null;
    this.fogDensity = 0;
    this.lightningTimer = 0;
    this.windStrength = 0;

    this.weatherTypes = ['clear', 'clear', 'clear', 'fog', 'rain', 'storm'];

    this.createRain();
    this.createWeatherUI();
    this.createWindLines();
  }

  createRain() {
    const count = 800;
    const geo = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);
    const velocities = new Float32Array(count * 3);

    for (let i = 0; i < count; i++) {
      positions[i*3]   = (Math.random() - 0.5) * 80;
      positions[i*3+1] = Math.random() * 40;
      positions[i*3+2] = (Math.random() - 0.5) * 80;
      velocities[i*3]   = 0;
      velocities[i*3+1] = -20 - Math.random() * 10;
      velocities[i*3+2] = 0;
    }

    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('velocity', new THREE.BufferAttribute(velocities, 3));

    const mat = new THREE.PointsMaterial({
      color: 0xaaccff,
      size: 0.08,
      transparent: true,
      opacity: 0,
      sizeAttenuation: true
    });

    this.rainParticles = new THREE.Points(geo, mat);
    this.rainParticles.frustumCulled = false;
    this.world.scene.add(this.rainParticles);
    this.rainGeo = geo;
    this.rainPositions = positions;
    this.rainVelocities = velocities;
  }

  createWindLines() {
    const count = 30;
    this.windLines = [];

    for (let i = 0; i < count; i++) {
      const points = [
        new THREE.Vector3(0, 0, 0),
        new THREE.Vector3(3 + Math.random() * 4, 0, 0)
      ];
      const geo = new THREE.BufferGeometry().setFromPoints(points);
      const mat = new THREE.LineBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0
      });
      const line = new THREE.Line(geo, mat);
      line.position.set(
        (Math.random() - 0.5) * 60,
        1 + Math.random() * 10,
        (Math.random() - 0.5) * 60
      );
      this.world.scene.add(line);
      this.windLines.push({
        line,
        speed: 15 + Math.random() * 20,
        resetX: -30
      });
    }
  }

  createWeatherUI() {
    this.indicator = document.createElement('div');
    this.indicator.style.cssText = `
      position: fixed;
      top: 35px;
      left: 50%;
      transform: translateX(-50%);
      color: #fff;
      font-family: 'Arial Black', sans-serif;
      font-size: 0.6rem;
      letter-spacing: 2px;
      text-shadow: 0 1px 3px #000;
      background: rgba(0,0,0,0.4);
      padding: 2px 10px;
      border-radius: 6px;
      pointer-events: none;
      z-index: 55;
      display: none;
      transition: opacity 0.5s ease;
    `;
    document.body.appendChild(this.indicator);

    // Overlay de lluvia en pantalla
    this.rainOverlay = document.createElement('div');
    this.rainOverlay.style.cssText = `
      position: fixed;
      inset: 0;
      pointer-events: none;
      z-index: 44;
      opacity: 0;
      transition: opacity 1s ease;
      background: repeating-linear-gradient(
        90deg,
        transparent,
        transparent 98%,
        rgba(150,180,255,0.08) 100%
      );
    `;
    document.body.appendChild(this.rainOverlay);

    // Overlay de niebla
    this.fogOverlay = document.createElement('div');
    this.fogOverlay.style.cssText = `
      position: fixed;
      inset: 0;
      pointer-events: none;
      z-index: 43;
      opacity: 0;
      transition: opacity 2s ease;
      background: radial-gradient(ellipse at center,
        transparent 30%,
        rgba(180,180,180,0.4) 100%
      );
    `;
    document.body.appendChild(this.fogOverlay);
  }

  showIndicator(text) {
    this.indicator.style.display = 'block';
    this.indicator.textContent = text;
    this.indicator.style.opacity = '1';
    setTimeout(() => {
      this.indicator.style.opacity = '0';
      setTimeout(() => {
        this.indicator.style.display = 'none';
      }, 500);
    }, 3000);
  }

  setWeather(type) {
    if (this.current === type) return;
    this.current = type;

    const labels = {
      clear: '☀️ Despejado',
      fog:   '🌫 Niebla',
      rain:  '🌧 Lluvia',
      storm: '⛈ Tormenta'
    };
    this.showIndicator(labels[type] || type);

    switch (type) {
      case 'clear':
        this.rainParticles.material.opacity = 0;
        this.rainOverlay.style.opacity = '0';
        this.fogOverlay.style.opacity = '0';
        this.world.scene.fog.far = 300;
        this.windStrength = 0;
        this.windLines.forEach(w => w.line.material.opacity = 0);
        if (this.sounds) this.sounds.setVolume(0.6);
        break;

      case 'fog':
        this.rainParticles.material.opacity = 0;
        this.rainOverlay.style.opacity = '0';
        this.fogOverlay.style.opacity = '1';
        this.world.scene.fog.far = 60;
        this.world.scene.fog.near = 10;
        this.windStrength = 0.5;
        break;

      case 'rain':
        this.rainParticles.material.opacity = 0.5;
        this.rainOverlay.style.opacity = '0.4';
        this.fogOverlay.style.opacity = '0.2';
        this.world.scene.fog.far = 120;
        this.windStrength = 2;
        this.windLines.forEach(w => w.line.material.opacity = 0.15);
        this.lightningTimer = 0;
        break;

      case 'storm':
        this.rainParticles.material.opacity = 0.8;
        this.rainOverlay.style.opacity = '0.6';
        this.fogOverlay.style.opacity = '0.3';
        this.world.scene.fog.far = 80;
        this.world.scene.fog.near = 20;
        this.windStrength = 5;
        this.windLines.forEach(w => w.line.material.opacity = 0.3);
        this.lightningTimer = 5 + Math.random() * 5;
        break;
    }
  }

  triggerLightning() {
    // Flash de relámpago
    const flash = document.createElement('div');
    flash.style.cssText = `
      position: fixed;
      inset: 0;
      background: rgba(200,220,255,0.7);
      pointer-events: none;
      z-index: 80;
      transition: opacity 0.15s ease;
    `;
    document.body.appendChild(flash);

    // Sonido de trueno
    if (this.sounds) {
      this.sounds.playBuffer(this.sounds.sounds.shotgun, 0.4);
    }

    setTimeout(() => {
      flash.style.opacity = '0';
      setTimeout(() => flash.remove(), 150);
    }, 80);

    // Segundo flash más tenue
    setTimeout(() => {
      const flash2 = document.createElement('div');
      flash2.style.cssText = flash.style.cssText;
      flash2.style.background = 'rgba(200,220,255,0.3)';
      document.body.appendChild(flash2);
      setTimeout(() => {
        flash2.style.opacity = '0';
        setTimeout(() => flash2.remove(), 100);
      }, 50);
    }, 120);
  }

  update(dt, playerPos) {
    // Cambio automático de clima
    this.timer -= dt;
    if (this.timer <= 0) {
      const next = this.weatherTypes[
        Math.floor(Math.random() * this.weatherTypes.length)
      ];
      this.setWeather(next);
      this.timer = 60 + Math.random() * 120;
    }

    // Actualizar lluvia
    if (this.current === 'rain' || this.current === 'storm') {
      const pos = this.rainPositions;
      const vel = this.rainVelocities;
      const windX = this.windStrength * 0.3;

      for (let i = 0; i < pos.length / 3; i++) {
        pos[i*3]   += (vel[i*3] + windX) * dt;
        pos[i*3+1] += vel[i*3+1] * dt;
        pos[i*3+2] += vel[i*3+2] * dt;

        // Reposicionar sobre el jugador
        if (pos[i*3+1] < 0) {
          pos[i*3]   = playerPos.x + (Math.random() - 0.5) * 80;
          pos[i*3+1] = playerPos.y + 35 + Math.random() * 10;
          pos[i*3+2] = playerPos.z + (Math.random() - 0.5) * 80;
        }
      }

      this.rainGeo.attributes.position.needsUpdate = true;

      // Seguir al jugador
      this.rainParticles.position.set(0, 0, 0);

      // Relámpago en tormenta
      if (this.current === 'storm') {
        this.lightningTimer -= dt;
        if (this.lightningTimer <= 0) {
          this.triggerLightning();
          this.lightningTimer = 4 + Math.random() * 8;
        }
      }
    }

    // Líneas de viento
    if (this.windStrength > 0) {
      this.windLines.forEach(w => {
        w.line.position.x += this.windStrength * dt * w.speed * 0.1;
        w.line.position.y = playerPos.y + 1 + Math.random() * 5;
        w.line.position.z = playerPos.z + (Math.random() - 0.5) * 40;

        if (w.line.position.x > playerPos.x + 30) {
          w.line.position.x = playerPos.x - 30;
        }
      });
    }
  }

  destroy() {
    this.world.scene.remove(this.rainParticles);
    this.windLines.forEach(w => this.world.scene.remove(w.line));
    this.indicator.remove();
    this.rainOverlay.remove();
    this.fogOverlay.remove();
  }
      }
