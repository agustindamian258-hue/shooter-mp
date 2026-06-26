export class VehicleSystem {
  constructor(world, game) {
    this.world = world;
    this.game = game;
    this.vehicles = {};
    this.playerVehicle = null;
    this.enterRadius = 4;
    this.vehicleIdCounter = 0;

    this.createVehicles();
    this.createUI();
  }

  createVehicles() {
    // Jeeps distribuidos por el mapa
    const spawns = [
      { x: 20,  z: 0,   rot: 0 },
      { x: -30, z: 20,  rot: Math.PI / 4 },
      { x: 40,  z: -30, rot: Math.PI },
      { x: -20, z: -40, rot: Math.PI / 2 },
      { x: 60,  z: 40,  rot: Math.PI * 1.5 },
      { x: -60, z: -20, rot: 0 }
    ];

    spawns.forEach(s => {
      this.spawnVehicle('jeep', s.x, s.z, s.rot);
    });
  }

  spawnVehicle(type, x, z, rot = 0) {
    const id = 'vehicle_' + (this.vehicleIdCounter++);
    const mesh = this.buildJeep();
    mesh.position.set(x, 0.5, z);
    mesh.rotation.y = rot;
    this.world.scene.add(mesh);

    // Indicador de entrada
    const indicator = this.createEnterIndicator();
    indicator.visible = false;
    mesh.add(indicator);

    this.vehicles[id] = {
      id, type, mesh, indicator,
      x, z, rot,
      health: 200,
      maxHealth: 200,
      occupied: false,
      occupantId: null,
      velocity: new THREE.Vector3(),
      speed: 0,
      maxSpeed: 20,
      acceleration: 8,
      braking: 12,
      turnSpeed: 1.8,
      currentTurn: 0
    };

    return id;
  }

  buildJeep() {
    const group = new THREE.Group();

    // Cuerpo principal
    const bodyMat = new THREE.MeshLambertMaterial({ color: 0x4a7a3a });
    const body = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.8, 4), bodyMat);
    body.position.y = 0.4;
    body.castShadow = true;
    group.add(body);

    // Cabina
    const cabinMat = new THREE.MeshLambertMaterial({ color: 0x3a6a2a });
    const cabin = new THREE.Mesh(new THREE.BoxGeometry(2, 0.7, 2), cabinMat);
    cabin.position.set(0, 1.15, 0.3);
    cabin.castShadow = true;
    group.add(cabin);

    // Parabrisas
    const glassMat = new THREE.MeshLambertMaterial({
      color: 0x88ccff, transparent: true, opacity: 0.5
    });
    const windshield = new THREE.Mesh(new THREE.PlaneGeometry(1.8, 0.6), glassMat);
    windshield.position.set(0, 1.15, -0.7);
    windshield.rotation.x = -0.3;
    group.add(windshield);

    // Ruedas
    const wheelMat = new THREE.MeshLambertMaterial({ color: 0x1a1a1a });
    const wheelGeo = new THREE.CylinderGeometry(0.4, 0.4, 0.3, 10);
    const wheelPositions = [
      [-1.2, 0, 1.3], [1.2, 0, 1.3],
      [-1.2, 0, -1.3], [1.2, 0, -1.3]
    ];
    wheelPositions.forEach(([wx, wy, wz]) => {
      const wheel = new THREE.Mesh(wheelGeo, wheelMat);
      wheel.rotation.z = Math.PI / 2;
      wheel.position.set(wx, wy, wz);
      wheel.castShadow = true;
      group.add(wheel);

      // Aro
      const rimMat = new THREE.MeshLambertMaterial({ color: 0x888888 });
      const rim = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.32, 8), rimMat);
      rim.rotation.z = Math.PI / 2;
      rim.position.set(wx, wy, wz);
      group.add(rim);
    });

    // Faros delanteros
    const lightMat = new THREE.MeshBasicMaterial({ color: 0xffffaa });
    [-0.6, 0.6].forEach(lx => {
      const light = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.2, 0.05), lightMat);
      light.position.set(lx, 0.5, -2.02);
      group.add(light);
    });

    // Barra de protección delantera
    const barMat = new THREE.MeshLambertMaterial({ color: 0x333333 });
    const bar = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.1, 0.1), barMat);
    bar.position.set(0, 0.6, -2.1);
    group.add(bar);

    return group;
  }

  createEnterIndicator() {
    const group = new THREE.Group();
    const geo = new THREE.BoxGeometry(0.8, 0.1, 0.8);
    const mat = new THREE.MeshBasicMaterial({
      color: 0x00ff88, transparent: true, opacity: 0.7
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.y = 2;
    group.add(mesh);
    return group;
  }

  createUI() {
    // HUD del vehículo
    this.vehicleHUD = document.createElement('div');
    this.vehicleHUD.style.cssText = `
      position: fixed;
      bottom: 155px;
      left: 50%;
      transform: translateX(-50%);
      display: none;
      flex-direction: column;
      align-items: center;
      gap: 4px;
      pointer-events: none;
      z-index: 56;
    `;

    const speedLabel = document.createElement('div');
    speedLabel.style.cssText = `
      color: #00e676;
      font-family: 'Arial Black', sans-serif;
      font-size: 0.6rem;
      letter-spacing: 2px;
      text-shadow: 0 1px 3px #000;
    `;
    speedLabel.textContent = '🚙 VEHÍCULO';

    this.speedDisplay = document.createElement('div');
    this.speedDisplay.style.cssText = `
      color: #fff;
      font-family: 'Arial Black', sans-serif;
      font-size: 1.4rem;
      text-shadow: 0 2px 4px #000;
      line-height: 1;
    `;
    this.speedDisplay.textContent = '0 km/h';

    const vehicleBarBg = document.createElement('div');
    vehicleBarBg.style.cssText = `
      width: 100px; height: 5px;
      background: rgba(0,0,0,0.5);
      border-radius: 3px; overflow: hidden;
      border: 1px solid rgba(0,230,118,0.3);
    `;
    this.vehicleHealthBar = document.createElement('div');
    this.vehicleHealthBar.style.cssText = `
      height: 100%; width: 100%;
      background: linear-gradient(90deg, #00e676, #69f0ae);
      border-radius: 3px;
      transition: width 0.3s ease;
    `;
    vehicleBarBg.appendChild(this.vehicleHealthBar);

    this.vehicleHUD.appendChild(speedLabel);
    this.vehicleHUD.appendChild(this.speedDisplay);
    this.vehicleHUD.appendChild(vehicleBarBg);
    document.body.appendChild(this.vehicleHUD);

    // Botón salir del vehículo
    this.exitBtn = document.createElement('div');
    this.exitBtn.style.cssText = `
      position: fixed;
      bottom: 230px;
      left: 50%;
      transform: translateX(-50%);
      background: rgba(255,100,0,0.8);
      color: #fff;
      font-family: 'Arial Black', sans-serif;
      font-size: 0.65rem;
      letter-spacing: 2px;
      padding: 8px 18px;
      border-radius: 8px;
      display: none;
      z-index: 61;
      pointer-events: all;
      border: 1px solid rgba(255,150,0,0.6);
    `;
    this.exitBtn.textContent = '🚪 SALIR';
    this.exitBtn.addEventListener('touchstart', (e) => {
      e.preventDefault();
      this.exitVehicle();
    }, { passive: false });
    document.body.appendChild(this.exitBtn);

    // Indicador de entrada cercana
    this.enterPrompt = document.createElement('div');
    this.enterPrompt.style.cssText = `
      position: fixed;
      top: 45%;
      left: 50%;
      transform: translateX(-50%);
      background: rgba(0,0,0,0.75);
      color: #00e676;
      font-family: 'Arial Black', sans-serif;
      font-size: 0.7rem;
      letter-spacing: 2px;
      padding: 6px 16px;
      border-radius: 8px;
      display: none;
      z-index: 61;
      pointer-events: all;
      border: 1px solid rgba(0,230,118,0.4);
    `;
    this.enterPrompt.textContent = '🚙 TOCAR PARA ENTRAR';
    this.enterPrompt.addEventListener('touchstart', (e) => {
      e.preventDefault();
      this.tryEnterNearestVehicle();
    }, { passive: false });
    document.body.appendChild(this.enterPrompt);
  }

  tryEnterNearestVehicle() {
    if (this.playerVehicle) return;
    const playerPos = this.game.player.camera.position;

    let nearest = null;
    let nearestDist = this.enterRadius;

    Object.values(this.vehicles).forEach(v => {
      if (v.occupied) return;
      const dx = v.mesh.position.x - playerPos.x;
      const dz = v.mesh.position.z - playerPos.z;
      const dist = Math.sqrt(dx*dx + dz*dz);
      if (dist < nearestDist) {
        nearestDist = dist;
        nearest = v;
      }
    });

    if (nearest) this.enterVehicle(nearest);
  }

  enterVehicle(vehicle) {
    if (vehicle.occupied) return;
    vehicle.occupied = true;
    vehicle.occupantId = 'local';
    this.playerVehicle = vehicle;

    // Ocultar controles normales
    document.getElementById('joystick-zone').style.opacity = '0.3';
    document.getElementById('fire-btn').style.display = 'none';
    document.getElementById('jump-btn').style.display = 'none';
    document.getElementById('reload-btn').style.display = 'none';

    // Mostrar HUD de vehículo
    this.vehicleHUD.style.display = 'flex';
    this.exitBtn.style.display = 'block';
    this.enterPrompt.style.display = 'none';

    if (this.game.sounds) this.game.sounds.playJump();

    // Notificar al servidor
    if (this.game.network.connected) {
      this.game.network.socket.emit('vehicleEnter', { vehicleId: vehicle.id });
    }
  }

  exitVehicle() {
    if (!this.playerVehicle) return;
    const v = this.playerVehicle;

    // Mover jugador al lado del vehículo
    const exitPos = v.mesh.position.clone();
    exitPos.x += Math.sin(v.mesh.rotation.y + Math.PI/2) * 3;
    exitPos.z += Math.cos(v.mesh.rotation.y + Math.PI/2) * 3;
    exitPos.y = 1.7;
    this.game.player.camera.position.copy(exitPos);

    v.occupied = false;
    v.occupantId = null;
    v.speed = 0;
    this.playerVehicle = null;

    // Restaurar controles
    document.getElementById('joystick-zone').style.opacity = '1';
    document.getElementById('fire-btn').style.display = 'flex';
    document.getElementById('jump-btn').style.display = 'flex';
    document.getElementById('reload-btn').style.display = 'flex';

    this.vehicleHUD.style.display = 'none';
    this.exitBtn.style.display = 'none';

    if (this.game.network.connected) {
      this.game.network.socket.emit('vehicleExit', { vehicleId: v.id });
    }
  }

  updateVehicleControl(vehicle, dt) {
    const jd = this.game.controls.joystick;
    const maxDist = 40;

    const forwardInput = jd.active ? -jd.dy / maxDist : 0;
    const turnInput = jd.active ? jd.dx / maxDist : 0;

    // Aceleración
    if (Math.abs(forwardInput) > 0.1) {
      vehicle.speed += forwardInput * vehicle.acceleration * dt;
      vehicle.speed = Math.max(
        -vehicle.maxSpeed * 0.4,
        Math.min(vehicle.maxSpeed, vehicle.speed)
      );
    } else {
      // Fricción
      vehicle.speed *= Math.pow(0.85, dt * 10);
      if (Math.abs(vehicle.speed) < 0.1) vehicle.speed = 0;
    }

    // Giro
    if (Math.abs(vehicle.speed) > 0.5) {
      const turnAmount = turnInput * vehicle.turnSpeed * dt *
        Math.sign(vehicle.speed);
      vehicle.mesh.rotation.y -= turnAmount;
    }

    // Movimiento
    if (Math.abs(vehicle.speed) > 0.01) {
      const dx = -Math.sin(vehicle.mesh.rotation.y) * vehicle.speed * dt;
      const dz = -Math.cos(vehicle.mesh.rotation.y) * vehicle.speed * dt;
      vehicle.mesh.position.x += dx;
      vehicle.mesh.position.z += dz;

      // Límites del mapa
      vehicle.mesh.position.x = Math.max(-190, Math.min(190, vehicle.mesh.position.x));
      vehicle.mesh.position.z = Math.max(-190, Math.min(190, vehicle.mesh.position.z));
    }

    // Cámara sigue al vehículo (tercera persona)
    const camDist = 8;
    const camHeight = 4;
    const targetX = vehicle.mesh.position.x +
      Math.sin(vehicle.mesh.rotation.y) * camDist;
    const targetZ = vehicle.mesh.position.z +
      Math.cos(vehicle.mesh.rotation.y) * camDist;

    const cam = this.game.player.camera;
    cam.position.x += (targetX - cam.position.x) * 0.1;
    cam.position.y += (vehicle.mesh.position.y + camHeight - cam.position.y) * 0.1;
    cam.position.z += (targetZ - cam.position.z) * 0.1;

    cam.lookAt(vehicle.mesh.position.x, vehicle.mesh.position.y + 1, vehicle.mesh.position.z);

    // Girar ruedas
    vehicle.mesh.children.forEach((child, i) => {
      if (i >= 3 && i <= 6) {
        child.rotation.x += vehicle.speed * dt * 2;
      }
    });

    // Actualizar HUD
    const kmh = Math.abs(Math.round(vehicle.speed * 3.6));
    this.speedDisplay.textContent = `${kmh} km/h`;
    const healthPct = (vehicle.health / vehicle.maxHealth) * 100;
    this.vehicleHealthBar.style.width = healthPct + '%';

    // Enviar estado al servidor
    if (this.game.network.connected) {
      this.game.network.socket.volatile.emit('vehicleMove', {
        vehicleId: vehicle.id,
        x: vehicle.mesh.position.x,
        y: vehicle.mesh.position.y,
        z: vehicle.mesh.position.z,
        rotY: vehicle.mesh.rotation.y,
        speed: vehicle.speed
      });
    }
  }

  update(dt) {
    const playerPos = this.game.player.camera.position;
    let nearVehicle = false;

    Object.values(this.vehicles).forEach(v => {
      // Actualizar vehículo del jugador
      if (this.playerVehicle && v.id === this.playerVehicle.id) {
        this.updateVehicleControl(v, dt);
        return;
      }

      // Indicador de proximidad
      const dx = v.mesh.position.x - playerPos.x;
      const dz = v.mesh.position.z - playerPos.z;
      const dist = Math.sqrt(dx*dx + dz*dz);

      if (dist < this.enterRadius && !v.occupied && !this.playerVehicle) {
        v.indicator.visible = true;
        nearVehicle = true;
      } else {
        v.indicator.visible = false;
      }

      // Animar indicador
      if (v.indicator.visible) {
        v.indicator.children[0].rotation.y += dt * 2;
        v.indicator.children[0].position.y =
          2 + Math.sin(Date.now() * 0.003) * 0.2;
      }
    });

    this.enterPrompt.style.display =
      nearVehicle && !this.playerVehicle ? 'block' : 'none';
  }

  updateRemoteVehicle(data) {
    const v = this.vehicles[data.vehicleId];
    if (!v || v === this.playerVehicle) return;
    v.mesh.position.set(data.x, data.y, data.z);
    v.mesh.rotation.y = data.rotY;
  }

  destroy() {
    Object.values(this.vehicles).forEach(v => {
      this.world.scene.remove(v.mesh);
    });
    this.vehicleHUD.remove();
    this.exitBtn.remove();
    this.enterPrompt.remove();
  }
}
