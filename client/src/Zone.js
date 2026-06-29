export class Zone {
  constructor(world, hud) {
    this.world = world;
    this.hud = hud;

    this.currentRadius = 280;
    this.targetRadius = 150;
    this.centerX = 0;
    this.centerZ = 0;
    this.shrinkSpeed = 0.3;
    this.damagePerSecond = 3;
    this.damageTimer = 0;
    this.phase = 1;
    this.maxPhases = 6;
    this.phaseTimer = 180; // 3 minutos por fase
    this.phaseDuration = 180;
    this.shrinking = false;
    this.finished = false;

    this.phaseConfig = [
      { radius: 280, target: 200, duration: 180, shrinkSpeed: 0.2, damage: 2 },
      { radius: 200, target: 150, duration: 150, shrinkSpeed: 0.3, damage: 3 },
      { radius: 150, target: 100, duration: 120, shrinkSpeed: 0.4, damage: 5 },
      { radius: 100, target: 60,  duration: 90,  shrinkSpeed: 0.5, damage: 8 },
      { radius: 60,  target: 30,  duration: 60,  shrinkSpeed: 0.6, damage: 12 },
      { radius: 30,  target: 10,  duration: 45,  shrinkSpeed: 0.8, damage: 20 },
    ];

    this.createZoneRing();
    this.createZoneIndicator();
  }

  createZoneRing() {
    const segments = 64;
    const points = [];
    for (let i = 0; i <= segments; i++) {
      const angle = (i / segments) * Math.PI * 2;
      points.push(new THREE.Vector3(
        Math.cos(angle) * this.currentRadius,
        0.5,
        Math.sin(angle) * this.currentRadius
      ));
    }
    const geo = new THREE.BufferGeometry().setFromPoints(points);
    const mat = new THREE.LineBasicMaterial({
      color: 0x9900ff, linewidth: 2,
      transparent: true, opacity: 0.8
    });
    this.ring = new THREE.Line(geo, mat);
    this.ring.position.set(this.centerX, 0, this.centerZ);
    this.world.scene.add(this.ring);

    const wallMat = new THREE.MeshBasicMaterial({
      color: 0x6600cc, transparent: true,
      opacity: 0.06, side: THREE.DoubleSide
    });
    this.wall = new THREE.Mesh(
      new THREE.CylinderGeometry(
        this.currentRadius, this.currentRadius, 60, 64, 1, true
      ), wallMat
    );
    this.wall.position.set(this.centerX, 30, this.centerZ);
    this.world.scene.add(this.wall);
  }

  createZoneIndicator() {
    this.zoneDiv = document.createElement('div');
    this.zoneDiv.style.cssText = `
      position: fixed; top: 50%; left: 50%;
      transform: translate(-50%, -50%);
      background: rgba(100,0,200,0.85);
      color: #fff; font-family: 'Arial Black', sans-serif;
      font-size: 0.85rem; letter-spacing: 2px;
      padding: 8px 20px; border-radius: 8px;
      display: none; z-index: 65; text-align: center;
      border: 1px solid rgba(180,0,255,0.6);
      pointer-events: none;
    `;
    document.body.appendChild(this.zoneDiv);

    this.phaseDiv = document.createElement('div');
    this.phaseDiv.style.cssText = `
      position: fixed; top: 55px; left: 50%;
      transform: translateX(-50%);
      color: #cc88ff; font-family: 'Arial Black', sans-serif;
      font-size: 0.7rem; letter-spacing: 2px;
      text-shadow: 0 1px 3px #000; z-index: 55;
      pointer-events: none; display: none;
      background: rgba(0,0,0,0.4);
      padding: 3px 10px; border-radius: 6px;
    `;
    document.body.appendChild(this.phaseDiv);
    this.phaseDiv.style.display = 'block';
    this.updatePhaseDisplay();

    this.arrowDiv = document.createElement('div');
    this.arrowDiv.style.cssText = `
      position: fixed; top: 50%; left: 50%;
      width: 30px; height: 30px;
      margin-left: -15px; margin-top: -15px;
      color: #cc00ff; font-size: 1.5rem;
      display: none; z-index: 65;
      pointer-events: none;
      text-shadow: 0 0 8px #cc00ff;
    `;
    this.arrowDiv.textContent = '▲';
    document.body.appendChild(this.arrowDiv);
  }

  updatePhaseDisplay() {
    const cfg = this.phaseConfig[Math.min(this.phase - 1, this.phaseConfig.length - 1)];
    const mins = Math.floor(this.phaseTimer / 60);
    const secs = Math.floor(this.phaseTimer % 60);
    const timeStr = `${mins}:${String(secs).padStart(2,'0')}`;

    if (this.phase <= this.maxPhases) {
      this.phaseDiv.textContent = `⬡ ZONA FASE ${this.phase}/${this.maxPhases} — ${timeStr}`;
    } else {
      this.phaseDiv.textContent = '⬡ ZONA FINAL';
    }
  }

  updateRingGeometry() {
    const segments = 64;
    const points = [];
    for (let i = 0; i <= segments; i++) {
      const angle = (i / segments) * Math.PI * 2;
      points.push(new THREE.Vector3(
        Math.cos(angle) * this.currentRadius,
        0.5,
        Math.sin(angle) * this.currentRadius
      ));
    }
    this.ring.geometry.setFromPoints(points);
    this.wall.geometry.dispose();
    this.wall.geometry = new THREE.CylinderGeometry(
      this.currentRadius, this.currentRadius, 60, 64, 1, true
    );
  }

  isOutside(x, z) {
    const dx = x - this.centerX;
    const dz = z - this.centerZ;
    return Math.sqrt(dx*dx + dz*dz) > this.currentRadius;
  }

  getDirectionToZone(x, z) {
    return Math.atan2(this.centerX - x, this.centerZ - z);
  }

  update(dt, player) {
    if (this.finished) return;

    this.phaseTimer -= dt;
    this.updatePhaseDisplay();

    if (this.phaseTimer <= 0 && !this.shrinking) {
      this.shrinking = true;
      this.showZoneWarning();

      const cfg = this.phaseConfig[Math.min(this.phase - 1, this.phaseConfig.length - 1)];
      this.targetRadius = cfg.target;
      this.shrinkSpeed = cfg.shrinkSpeed;
      this.damagePerSecond = cfg.damage;
    }

    if (this.shrinking && this.currentRadius > this.targetRadius) {
      this.currentRadius -= this.shrinkSpeed * dt;
      this.currentRadius = Math.max(this.currentRadius, this.targetRadius);
      this.updateRingGeometry();

      const pulse = 0.5 + Math.sin(Date.now() * 0.006) * 0.3;
      this.ring.material.opacity = pulse;
    }

    if (this.shrinking && this.currentRadius <= this.targetRadius + 0.1) {
      this.shrinking = false;
      this.phase++;

      if (this.phase <= this.maxPhases) {
        const cfg = this.phaseConfig[Math.min(this.phase - 1, this.phaseConfig.length - 1)];
        this.phaseDuration = cfg.duration;
        this.phaseTimer = cfg.duration;
      } else {
        this.finished = true;
        this.phaseDiv.textContent = '⬡ ZONA FINAL';
      }
    }

    const outside = this.isOutside(
      player.camera.position.x,
      player.camera.position.z
    );

    if (outside) {
      this.damageTimer += dt;
      if (this.damageTimer >= 1) {
        this.damageTimer = 0;
        player.takeDamage(this.damagePerSecond);
      }
      this.showDirectionArrow(player);
      this.zoneDiv.style.display = 'block';
      this.zoneDiv.textContent = `☠ FUERA DE ZONA — ${this.damagePerSecond} HP/s`;
    } else {
      this.damageTimer = 0;
      this.zoneDiv.style.display = 'none';
      this.arrowDiv.style.display = 'none';
    }
  }

  showZoneWarning() {
    const warning = document.createElement('div');
    warning.style.cssText = `
      position: fixed; top: 30%; left: 50%;
      transform: translateX(-50%);
      background: rgba(100,0,200,0.9);
      color: #fff; font-family: 'Arial Black', sans-serif;
      font-size: 1rem; letter-spacing: 3px;
      padding: 12px 24px; border-radius: 10px;
      z-index: 70; text-align: center;
      border: 2px solid rgba(200,0,255,0.8);
      pointer-events: none;
    `;
    warning.textContent = '⬡ ¡LA ZONA SE ESTÁ ACHICANDO!';
    document.body.appendChild(warning);
    setTimeout(() => warning.remove(), 4000);
  }

  showDirectionArrow(player) {
    const angle = this.getDirectionToZone(
      player.camera.position.x,
      player.camera.position.z
    );
    const screenAngle = angle - player.yaw;
    const dist = 120;
    const ax = window.innerWidth/2 + Math.sin(screenAngle) * dist;
    const ay = window.innerHeight/2 - Math.cos(screenAngle) * dist;

    this.arrowDiv.style.display = 'block';
    this.arrowDiv.style.left = ax + 'px';
    this.arrowDiv.style.top = ay + 'px';
    this.arrowDiv.style.transform = `rotate(${screenAngle}rad)`;
  }

  destroy() {
    this.world.scene.remove(this.ring);
    this.world.scene.remove(this.wall);
    this.zoneDiv.remove();
    this.phaseDiv.remove();
    this.arrowDiv.remove();
  }
      }
