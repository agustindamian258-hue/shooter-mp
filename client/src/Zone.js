export class Zone {
  constructor(world, hud) {
    this.world = world;
    this.hud = hud;

    this.currentRadius = 180;
    this.targetRadius = 80;
    this.centerX = 0;
    this.centerZ = 0;
    this.shrinkSpeed = 0.8;
    this.damagePerSecond = 5;
    this.damageTimer = 0;
    this.phase = 1;
    this.maxPhases = 4;
    this.phaseTimer = 60;
    this.phaseDuration = 60;
    this.shrinking = false;
    this.finished = false;

    this.createZoneRing();
    this.createZoneIndicator();
    this.startPhaseCountdown();
  }

  createZoneRing() {
    // Anillo visual de la zona
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
      color: 0x9900ff,
      linewidth: 2,
      transparent: true,
      opacity: 0.8
    });
    this.ring = new THREE.Line(geo, mat);
    this.ring.position.set(this.centerX, 0, this.centerZ);
    this.world.scene.add(this.ring);

    // Paredes de la zona (efecto visual)
    const wallGeo = new THREE.CylinderGeometry(
      this.currentRadius,
      this.currentRadius,
      50, 64, 1, true
    );
    const wallMat = new THREE.MeshBasicMaterial({
      color: 0x6600cc,
      transparent: true,
      opacity: 0.08,
      side: THREE.DoubleSide
    });
    this.wall = new THREE.Mesh(wallGeo, wallMat);
    this.wall.position.set(this.centerX, 25, this.centerZ);
    this.world.scene.add(this.wall);
  }

  createZoneIndicator() {
    // Indicador de zona en HUD
    this.zoneDiv = document.createElement('div');
    this.zoneDiv.style.cssText = `
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: rgba(100,0,200,0.85);
      color: #fff;
      font-family: 'Arial Black', sans-serif;
      font-size: 0.85rem;
      letter-spacing: 2px;
      padding: 8px 20px;
      border-radius: 8px;
      display: none;
      z-index: 65;
      text-align: center;
      border: 1px solid rgba(180,0,255,0.6);
    `;
    document.body.appendChild(this.zoneDiv);

    // Contador de fase
    this.phaseDiv = document.createElement('div');
    this.phaseDiv.style.cssText = `
      position: fixed;
      top: 55px;
      left: 50%;
      transform: translateX(-50%);
      color: #cc88ff;
      font-family: 'Arial Black', sans-serif;
      font-size: 0.7rem;
      letter-spacing: 2px;
      text-shadow: 0 1px 3px #000;
      z-index: 55;
      pointer-events: none;
      display: none;
    `;
    document.body.appendChild(this.phaseDiv);

    // Flecha dirección zona
    this.arrowDiv = document.createElement('div');
    this.arrowDiv.style.cssText = `
      position: fixed;
      top: 50%;
      left: 50%;
      width: 30px;
      height: 30px;
      margin-left: -15px;
      margin-top: -15px;
      color: #cc00ff;
      font-size: 1.5rem;
      display: none;
      z-index: 65;
      pointer-events: none;
      text-shadow: 0 0 8px #cc00ff;
    `;
    this.arrowDiv.textContent = '▲';
    document.body.appendChild(this.arrowDiv);
  }

  startPhaseCountdown() {
    this.phaseDiv.style.display = 'block';
    this.updatePhaseDisplay();
  }

  updatePhaseDisplay() {
    if (this.phase <= this.maxPhases) {
      this.phaseDiv.textContent = `⬡ ZONA FASE ${this.phase} — ${Math.ceil(this.phaseTimer)}s`;
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
      this.currentRadius,
      this.currentRadius,
      50, 64, 1, true
    );
  }

  isOutside(x, z) {
    const dx = x - this.centerX;
    const dz = z - this.centerZ;
    return Math.sqrt(dx*dx + dz*dz) > this.currentRadius;
  }

  getDirectionToZone(x, z) {
    const dx = this.centerX - x;
    const dz = this.centerZ - z;
    return Math.atan2(dx, dz);
  }

  update(dt, player) {
    if (this.finished) return;

    // Countdown de fase
    this.phaseTimer -= dt;
    this.updatePhaseDisplay();

    if (this.phaseTimer <= 0 && !this.shrinking) {
      this.shrinking = true;
      this.showZoneWarning();
    }

    // Achicar zona
    if (this.shrinking && this.currentRadius > this.targetRadius) {
      this.currentRadius -= this.shrinkSpeed * dt;
      this.currentRadius = Math.max(this.currentRadius, this.targetRadius);
      this.updateRingGeometry();

      // Pulso visual del anillo
      const pulse = 0.6 + Math.sin(Date.now() * 0.005) * 0.3;
      this.ring.material.opacity = pulse;
    }

    if (this.shrinking && this.currentRadius <= this.targetRadius) {
      this.shrinking = false;
      this.phase++;
      this.phaseTimer = this.phaseDuration;

      if (this.phase <= this.maxPhases) {
        this.targetRadius = Math.max(10, this.targetRadius - 20);
        this.shrinkSpeed += 0.2;
      } else {
        this.finished = true;
        this.phaseDiv.textContent = '⬡ ZONA FINAL';
      }
    }

    // Daño fuera de zona
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

      // Mostrar indicador de dirección
      this.showDirectionArrow(player);
      this.zoneDiv.style.display = 'block';
      this.zoneDiv.textContent = '☠ FUERA DE ZONA — RECIBIENDO DAÑO';
    } else {
      this.damageTimer = 0;
      this.zoneDiv.style.display = 'none';
      this.arrowDiv.style.display = 'none';
    }
  }

  showZoneWarning() {
    const warning = document.createElement('div');
    warning.style.cssText = `
      position: fixed;
      top: 30%;
      left: 50%;
      transform: translateX(-50%);
      background: rgba(100,0,200,0.9);
      color: #fff;
      font-family: 'Arial Black', sans-serif;
      font-size: 1rem;
      letter-spacing: 3px;
      padding: 12px 24px;
      border-radius: 10px;
      z-index: 70;
      text-align: center;
      border: 2px solid rgba(200,0,255,0.8);
      pointer-events: none;
    `;
    warning.textContent = '⬡ ¡LA ZONA SE ESTÁ ACHICANDO!';
    document.body.appendChild(warning);
    setTimeout(() => warning.remove(), 3000);
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
