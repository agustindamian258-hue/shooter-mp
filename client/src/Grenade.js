export class GrenadeSystem {
  constructor(world, game) {
    this.world = world;
    this.game = game;
    this.grenades = [];
    this.maxGrenades = 3;
    this.currentGrenades = 3;
    this.throwForce = 18;
    this.fuseTime = 3.0;
    this.explosionRadius = 8;
    this.explosionDamage = 80;

    this.createUI();
    this.createButton();
  }

  createUI() {
    this.container = document.createElement('div');
    this.container.style.cssText = `
      position: fixed;
      bottom: 215px;
      left: 155px;
      display: none;
      flex-direction: column;
      align-items: center;
      gap: 2px;
      pointer-events: none;
      z-index: 55;
    `;

    this.countEl = document.createElement('div');
    this.countEl.style.cssText = `
      color: #88ff88;
      font-family: 'Arial Black', sans-serif;
      font-size: 0.75rem;
      text-shadow: 0 1px 3px #000;
    `;
    this.countEl.textContent = '💣 x3';

    this.container.appendChild(this.countEl);
    document.body.appendChild(this.container);
  }

  createButton() {
    this.btn = document.createElement('div');
    this.btn.style.cssText = `
      position: fixed;
      bottom: 210px;
      left: 155px;
      width: 48px;
      height: 48px;
      border-radius: 50%;
      background: rgba(50,180,50,0.6);
      border: 2px solid rgba(100,220,100,0.8);
      display: none;
      align-items: center;
      justify-content: center;
      z-index: 60;
      pointer-events: all;
      box-shadow: 0 0 10px rgba(50,180,50,0.3);
    `;
    this.btn.innerHTML = '<span style="font-size:1.2rem">💣</span>';

    this.btn.addEventListener('touchstart', (e) => {
      e.preventDefault();
      this.throwGrenade();
    }, { passive: false });

    document.body.appendChild(this.btn);
  }

  show() {
    this.container.style.display = 'flex';
    this.btn.style.display = 'flex';
  }

  throwGrenade() {
    if (this.currentGrenades <= 0) {
      this.showNoGrenadeMsg();
      return;
    }

    const camera = this.game.world.camera;
    const dir = new THREE.Vector3(0, 0.3, -1);
    dir.applyQuaternion(camera.quaternion);
    dir.normalize();

    const startPos = camera.position.clone();
    startPos.y -= 0.2;

    // Geometría de la granada
    const geo = new THREE.SphereGeometry(0.12, 8, 8);
    const mat = new THREE.MeshLambertMaterial({ color: 0x2d4a1e });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.copy(startPos);
    mesh.castShadow = true;
    this.world.scene.add(mesh);

    // Pin de la granada
    const pinGeo = new THREE.TorusGeometry(0.06, 0.015, 6, 8);
    const pinMat = new THREE.MeshLambertMaterial({ color: 0xaaaaaa });
    const pin = new THREE.Mesh(pinGeo, pinMat);
    pin.position.set(0, 0.14, 0);
    mesh.add(pin);

    const velocity = dir.clone().multiplyScalar(this.throwForce);
    velocity.y += 3;

    const grenade = {
      mesh,
      velocity,
      fuseTimer: this.fuseTime,
      bounces: 0,
      maxBounces: 3,
      active: true
    };

    this.grenades.push(grenade);
    this.currentGrenades--;
    this.updateUI();

    // Enviar al servidor
    if (this.game.network.connected) {
      this.game.network.socket.emit('grenadeThrown', {
        x: startPos.x,
        y: startPos.y,
        z: startPos.z,
        vx: velocity.x,
        vy: velocity.y,
        vz: velocity.z
      });
    }

    if (this.game.sounds) {
      this.game.sounds.playJump();
    }

    // Recargar después de 30 segundos
    setTimeout(() => {
      if (this.currentGrenades < this.maxGrenades) {
        this.currentGrenades = Math.min(
          this.maxGrenades,
          this.currentGrenades + 1
        );
        this.updateUI();
      }
    }, 30000);
  }

  explode(grenade) {
    grenade.active = false;
    const pos = grenade.mesh.position.clone();

    this.world.scene.remove(grenade.mesh);

    // Partículas de explosión
    if (this.game.particles) {
      this.game.particles.spawnExplosion(pos);
    }

    // Sonido
    if (this.game.sounds) {
      this.game.sounds.playBuffer(
        this.game.sounds.sounds.shotgun, 1.0
      );
    }

    // Daño al jugador local si está cerca
    const playerPos = this.game.player.camera.position;
    const dx = pos.x - playerPos.x;
    const dy = pos.y - playerPos.y;
    const dz = pos.z - playerPos.z;
    const dist = Math.sqrt(dx*dx + dy*dy + dz*dz);

    if (dist < this.explosionRadius) {
      const dmg = this.explosionDamage * (1 - dist / this.explosionRadius);
      this.game.player.takeDamage(Math.round(dmg));
    }

    // Notificar explosión al servidor
    if (this.game.network.connected) {
      this.game.network.socket.emit('grenadeExploded', {
        x: pos.x,
        y: pos.y,
        z: pos.z,
        radius: this.explosionRadius,
        damage: this.explosionDamage
      });
    }

    // Flash de explosión en pantalla
    this.showExplosionFlash();

    // Shake de cámara
    this.cameraShake();
  }

  showExplosionFlash() {
    const flash = document.createElement('div');
    flash.style.cssText = `
      position: fixed;
      inset: 0;
      background: rgba(255,180,50,0.4);
      pointer-events: none;
      z-index: 80;
      transition: opacity 0.3s ease;
    `;
    document.body.appendChild(flash);
    setTimeout(() => {
      flash.style.opacity = '0';
      setTimeout(() => flash.remove(), 300);
    }, 50);
  }

  cameraShake() {
    const camera = this.game.world.camera;
    const originalPos = camera.position.clone();
    let shakeTime = 0;
    const shakeDuration = 0.4;
    const shakeMagnitude = 0.15;

    const shake = () => {
      shakeTime += 0.016;
      if (shakeTime < shakeDuration) {
        const intensity = (1 - shakeTime / shakeDuration) * shakeMagnitude;
        camera.position.x = originalPos.x + (Math.random() - 0.5) * intensity;
        camera.position.y = originalPos.y + (Math.random() - 0.5) * intensity;
        requestAnimationFrame(shake);
      } else {
        camera.position.copy(originalPos);
      }
    };
    requestAnimationFrame(shake);
  }

  showNoGrenadeMsg() {
    const div = document.createElement('div');
    div.style.cssText = `
      position: fixed;
      top: 40%;
      left: 50%;
      transform: translateX(-50%);
      color: #ff4444;
      font-family: 'Arial Black', sans-serif;
      font-size: 0.75rem;
      letter-spacing: 2px;
      text-shadow: 0 2px 4px #000;
      pointer-events: none;
      z-index: 70;
      background: rgba(0,0,0,0.6);
      padding: 5px 14px;
      border-radius: 8px;
    `;
    div.textContent = '💣 SIN GRANADAS';
    document.body.appendChild(div);
    setTimeout(() => div.remove(), 1500);
  }

  updateUI() {
    this.countEl.textContent = `💣 x${this.currentGrenades}`;
    this.btn.style.opacity = this.currentGrenades > 0 ? '1' : '0.4';
  }

  update(dt) {
    const gravity = -15;

    this.grenades = this.grenades.filter(g => {
      if (!g.active) return false;

      g.velocity.y += gravity * dt;
      g.mesh.position.addScaledVector(g.velocity, dt);
      g.mesh.rotation.x += dt * 5;
      g.mesh.rotation.z += dt * 3;

      // Rebotar en suelo
      if (g.mesh.position.y < 0.12) {
        g.mesh.position.y = 0.12;
        g.velocity.y *= -0.4;
        g.velocity.x *= 0.7;
        g.velocity.z *= 0.7;
        g.bounces++;

        if (g.bounces >= g.maxBounces) {
          g.velocity.set(0, 0, 0);
        }
      }

      // Cuenta regresiva
      g.fuseTimer -= dt;

      // Parpadeo antes de explotar
      if (g.fuseTimer < 1.0) {
        const blink = Math.sin(Date.now() * 0.015) > 0;
        g.mesh.material.color.setHex(blink ? 0xff2200 : 0x2d4a1e);
      }

      if (g.fuseTimer <= 0) {
        this.explode(g);
        return false;
      }

      return true;
    });
  }

  addGrenade(count = 1) {
    this.currentGrenades = Math.min(
      this.maxGrenades,
      this.currentGrenades + count
    );
    this.updateUI();
  }

  destroy() {
    this.grenades.forEach(g => this.world.scene.remove(g.mesh));
    this.grenades = [];
    this.container.remove();
    this.btn.remove();
  }
      }
