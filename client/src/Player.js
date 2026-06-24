export class Player {
  constructor(world) {
    this.world = world;
    this.hud = null;

    // Estado
    this.health = 100;
    this.maxHealth = 100;
    this.ammo = 30;
    this.maxAmmo = 30;
    this.reserveAmmo = 120;
    this.kills = 0;
    this.alive = true;
    this.isReloading = false;
    this.reloadTime = 2.0;
    this.reloadTimer = 0;

    // Física
    this.velocity = new THREE.Vector3();
    this.speed = 8;
    this.jumpForce = 6;
    this.gravity = -18;
    this.onGround = false;
    this.height = 1.7;
    this.groundY = this.height;

    // Cámara (FPS)
    this.camera = world.camera;
    this.camera.position.set(0, this.height, 0);
    this.yaw = 0;
    this.pitch = 0;
    this.minPitch = -Math.PI / 3;
    this.maxPitch = Math.PI / 3;

    // Disparo
    this.fireRate = 0.1;
    this.fireTimer = 0;
    this.isFiring = false;
    this.muzzleFlashTimer = 0;

    // Arma visible en primera persona
    this.setupWeaponModel();
  }

  setHUD(hud) {
    this.hud = hud;
  }

  setupWeaponModel() {
    this.weaponGroup = new THREE.Group();

    const darkMat = new THREE.MeshLambertMaterial({ color: 0x1a1a1a });
    const brownMat = new THREE.MeshLambertMaterial({ color: 0x5c3d1e });

    // Cuerpo del arma
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.1, 0.5), darkMat);
    body.position.set(0, 0, -0.3);
    this.weaponGroup.add(body);

    // Cañón
    const barrel = new THREE.Mesh(
      new THREE.CylinderGeometry(0.018, 0.018, 0.35, 8),
      darkMat
    );
    barrel.rotation.x = Math.PI / 2;
    barrel.position.set(0, 0.02, -0.55);
    this.weaponGroup.add(barrel);

    // Mango
    const grip = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.14, 0.1), brownMat);
    grip.position.set(0, -0.1, -0.18);
    grip.rotation.x = 0.2;
    this.weaponGroup.add(grip);

    // Cargador
    const mag = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.12, 0.08), darkMat);
    mag.position.set(0, -0.09, -0.28);
    this.weaponGroup.add(mag);

    // Mira
    const sight = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.03, 0.04), darkMat);
    sight.position.set(0, 0.07, -0.32);
    this.weaponGroup.add(sight);

    // Muzzle flash (oculto por defecto)
    const flashMat = new THREE.MeshBasicMaterial({ color: 0xffee44, transparent: true, opacity: 0 });
    this.muzzleFlash = new THREE.Mesh(new THREE.SphereGeometry(0.05, 6, 6), flashMat);
    this.muzzleFlash.position.set(0, 0.02, -0.75);
    this.weaponGroup.add(this.muzzleFlash);

    // Posición en pantalla (esquina inferior derecha, FPS style)
    this.weaponGroup.position.set(0.22, -0.18, -0.4);
    this.camera.add(this.weaponGroup);
    this.world.scene.add(this.camera);
  }

  addToScene() {
    this.world.scene.add(this.camera);
  }

  update(dt) {
    if (!this.alive) return;

    this.updatePhysics(dt);
    this.updateFire(dt);
    this.updateReload(dt);
    this.updateWeaponSway(dt);
  }

  updatePhysics(dt) {
    // Gravedad
    if (!this.onGround) {
      this.velocity.y += this.gravity * dt;
    }

    this.camera.position.y += this.velocity.y * dt;

    // Suelo
    if (this.camera.position.y <= this.groundY) {
      this.camera.position.y = this.groundY;
      this.velocity.y = 0;
      this.onGround = true;
    } else {
      this.onGround = false;
    }

    // Límites del mapa
    this.camera.position.x = Math.max(-195, Math.min(195, this.camera.position.x));
    this.camera.position.z = Math.max(-195, Math.min(195, this.camera.position.z));
  }

  move(forwardAmount, rightAmount) {
    if (!this.alive) return;

    const forward = new THREE.Vector3(
      -Math.sin(this.yaw),
      0,
      -Math.cos(this.yaw)
    );
    const right = new THREE.Vector3(
      Math.cos(this.yaw),
      0,
      -Math.sin(this.yaw)
    );

    const move = new THREE.Vector3();
    move.addScaledVector(forward, forwardAmount);
    move.addScaledVector(right, rightAmount);

    if (move.length() > 0) {
      move.normalize().multiplyScalar(this.speed);
    }

    this.camera.position.x += move.x * (1/60);
    this.camera.position.z += move.z * (1/60);
  }

  look(dx, dy) {
    this.yaw -= dx * 0.003;
    this.pitch -= dy * 0.003;
    this.pitch = Math.max(this.minPitch, Math.min(this.maxPitch, this.pitch));

    this.camera.rotation.order = 'YXZ';
    this.camera.rotation.y = this.yaw;
    this.camera.rotation.x = this.pitch;
  }

  jump() {
    if (this.onGround && this.alive) {
      this.velocity.y = this.jumpForce;
      this.onGround = false;
    }
  }

  startFire() {
    this.isFiring = true;
  }

  stopFire() {
    this.isFiring = false;
  }

  updateFire(dt) {
    this.fireTimer -= dt;
    if (this.muzzleFlashTimer > 0) {
      this.muzzleFlashTimer -= dt;
      if (this.muzzleFlashTimer <= 0) {
        this.muzzleFlash.material.opacity = 0;
      }
    }

    if (this.isFiring && this.fireTimer <= 0 && !this.isReloading) {
      this.shoot();
    }
  }

  shoot() {
    if (this.ammo <= 0) {
      this.startReload();
      return;
    }

    this.ammo--;
    this.fireTimer = this.fireRate;

    // Muzzle flash
    this.muzzleFlash.material.opacity = 1;
    this.muzzleFlashTimer = 0.05;

    // Retroceso visual
    this.weaponGroup.position.z += 0.04;
    setTimeout(() => {
      if (this.weaponGroup) this.weaponGroup.position.z -= 0.04;
    }, 60);

    // Calcular dirección del disparo
    const dir = new THREE.Vector3(0, 0, -1);
    dir.applyQuaternion(this.camera.quaternion);

    const from = this.camera.position.clone();
    const to = from.clone().addScaledVector(dir, 150);

    // Enviar al network
    if (this.world.game && this.world.game.network.connected) {
      this.world.game.network.sendShoot(
        { x: from.x, y: from.y, z: from.z },
        { x: dir.x, y: dir.y, z: dir.z }
      );
    }

    // Raycast contra jugadores remotos
    const raycaster = new THREE.Raycaster(from, dir.normalize());
    const remoteMeshes = Object.entries(this.world.game?.remotePlayers || {}).map(
      ([id, rp]) => ({ id, mesh: rp.mesh })
    );

    remoteMeshes.forEach(({ id, mesh }) => {
      const hits = raycaster.intersectObject(mesh, true);
      if (hits.length > 0 && hits[0].distance < 150) {
        this.world.game.network.sendHit(id, 25);
        this.world.spawnBulletTrail(from, hits[0].point);
      } else {
        this.world.spawnBulletTrail(from, to);
      }
    });

    if (remoteMeshes.length === 0) {
      this.world.spawnBulletTrail(from, to);
    }

    if (this.hud) this.hud.updateAmmo(this.ammo, this.reserveAmmo);
  }

  startReload() {
    if (this.isReloading || this.reserveAmmo <= 0 || this.ammo === this.maxAmmo) return;
    this.isReloading = true;
    this.reloadTimer = this.reloadTime;
    if (this.hud) this.hud.showReloading(true);
  }

  updateReload(dt) {
    if (!this.isReloading) return;
    this.reloadTimer -= dt;
    if (this.reloadTimer <= 0) {
      const needed = this.maxAmmo - this.ammo;
      const take = Math.min(needed, this.reserveAmmo);
      this.ammo += take;
      this.reserveAmmo -= take;
      this.isReloading = false;
      if (this.hud) {
        this.hud.showReloading(false);
        this.hud.updateAmmo(this.ammo, this.reserveAmmo);
      }
    }
  }

  updateWeaponSway(dt) {
    // Leve oscilación del arma al caminar
    const t = Date.now() * 0.003;
    this.weaponGroup.position.y = -0.18 + Math.sin(t) * 0.005;
  }

  takeDamage(amount) {
    if (!this.alive) return;
    this.health = Math.max(0, this.health - amount);
    if (this.hud) this.hud.updateHealth(this.health);

    // Efecto rojo en pantalla
    document.body.style.boxShadow = 'inset 0 0 60px rgba(255,0,0,0.5)';
    setTimeout(() => { document.body.style.boxShadow = ''; }, 300);

    if (this.health <= 0) {
      this.alive = false;
      this.world.game.showDeathScreen();
    }
  }

  respawn() {
    this.health = this.maxHealth;
    this.ammo = this.maxAmmo;
    this.alive = true;
    this.isReloading = false;
    this.velocity.set(0, 0, 0);

    const x = (Math.random() - 0.5) * 100;
    const z = (Math.random() - 0.5) * 100;
    this.camera.position.set(x, this.height, z);

    if (this.hud) {
      this.hud.updateHealth(this.health);
      this.hud.updateAmmo(this.ammo, this.reserveAmmo);
    }
  }

  getState() {
    return {
      x: this.camera.position.x,
      y: this.camera.position.y,
      z: this.camera.position.z,
      rotY: this.yaw,
      health: this.health
    };
  }
  }
