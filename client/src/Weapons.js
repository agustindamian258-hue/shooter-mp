export class WeaponSystem {
  constructor(player, scene, camera) {
    this.player = player;
    this.scene = scene;
    this.camera = camera;

    this.weapons = {
      rifle: {
        name: 'ASSAULT RIFLE',
        damage: 25,
        fireRate: 0.1,
        ammo: 30,
        maxAmmo: 30,
        reserve: 120,
        spread: 0.02,
        range: 150,
        auto: true,
        reloadTime: 2.0
      },
      shotgun: {
        name: 'SHOTGUN',
        damage: 15,
        fireRate: 0.8,
        ammo: 6,
        maxAmmo: 6,
        reserve: 30,
        spread: 0.08,
        range: 40,
        auto: false,
        pellets: 8,
        reloadTime: 2.5
      },
      sniper: {
        name: 'SNIPER RIFLE',
        damage: 90,
        fireRate: 1.5,
        ammo: 5,
        maxAmmo: 5,
        reserve: 20,
        spread: 0.001,
        range: 300,
        auto: false,
        reloadTime: 3.0
      },
      pistol: {
        name: 'PISTOL',
        damage: 20,
        fireRate: 0.3,
        ammo: 12,
        maxAmmo: 12,
        reserve: 60,
        spread: 0.03,
        range: 80,
        auto: false,
        reloadTime: 1.2
      }
    };

    this.currentWeaponKey = 'rifle';
    this.currentWeapon = { ...this.weapons.rifle };
    this.inventory = ['rifle', 'pistol'];
    this.currentIndex = 0;

    this.fireTimer = 0;
    this.isReloading = false;
    this.reloadTimer = 0;
    this.isFiring = false;

    this.weaponMeshes = {};
    this.currentMesh = null;
    this.muzzleFlash = null;
    this.muzzleFlashTimer = 0;

    this.buildAllWeaponMeshes();
    this.equipWeapon(this.currentWeaponKey);
  }

  buildAllWeaponMeshes() {
    this.weaponMeshes.rifle = this.buildRifle();
    this.weaponMeshes.shotgun = this.buildShotgun();
    this.weaponMeshes.sniper = this.buildSniper();
    this.weaponMeshes.pistol = this.buildPistol();

    Object.values(this.weaponMeshes).forEach(m => {
      m.visible = false;
      this.camera.add(m);
    });
  }

  buildRifle() {
    const group = new THREE.Group();
    const dark = new THREE.MeshLambertMaterial({ color: 0x1a1a1a });
    const brown = new THREE.MeshLambertMaterial({ color: 0x5c3d1e });

    // Cuerpo
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.1, 0.55), dark);
    body.position.set(0, 0, -0.3);
    group.add(body);

    // Cañón
    const barrel = new THREE.Mesh(
      new THREE.CylinderGeometry(0.018, 0.018, 0.38, 8), dark
    );
    barrel.rotation.x = Math.PI / 2;
    barrel.position.set(0, 0.02, -0.58);
    group.add(barrel);

    // Mango
    const grip = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.14, 0.1), brown);
    grip.position.set(0, -0.1, -0.18);
    grip.rotation.x = 0.2;
    group.add(grip);

    // Cargador
    const mag = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.12, 0.08), dark);
    mag.position.set(0, -0.09, -0.28);
    group.add(mag);

    // Mira
    const sight = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.03, 0.04), dark);
    sight.position.set(0, 0.07, -0.32);
    group.add(sight);

    this.addMuzzleFlash(group, new THREE.Vector3(0, 0.02, -0.78));
    group.position.set(0.22, -0.2, -0.4);
    return group;
  }

  buildShotgun() {
    const group = new THREE.Group();
    const dark = new THREE.MeshLambertMaterial({ color: 0x2a1a0a });
    const wood = new THREE.MeshLambertMaterial({ color: 0x8B4513 });

    const body = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.1, 0.6), dark);
    body.position.set(0, 0, -0.3);
    group.add(body);

    const barrel = new THREE.Mesh(
      new THREE.CylinderGeometry(0.025, 0.025, 0.5, 8), dark
    );
    barrel.rotation.x = Math.PI / 2;
    barrel.position.set(0, 0.02, -0.62);
    group.add(barrel);

    const stock = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.09, 0.25), wood);
    stock.position.set(0, -0.01, 0.05);
    group.add(stock);

    const pump = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.06, 0.12), wood);
    pump.position.set(0, -0.03, -0.35);
    group.add(pump);

    this.addMuzzleFlash(group, new THREE.Vector3(0, 0.02, -0.88));
    group.position.set(0.22, -0.2, -0.4);
    return group;
  }

  buildSniper() {
    const group = new THREE.Group();
    const dark = new THREE.MeshLambertMaterial({ color: 0x111111 });
    const green = new THREE.MeshLambertMaterial({ color: 0x2d4a1e });

    const body = new THREE.Mesh(new THREE.BoxGeometry(0.055, 0.09, 0.7), dark);
    body.position.set(0, 0, -0.35);
    group.add(body);

    const barrel = new THREE.Mesh(
      new THREE.CylinderGeometry(0.015, 0.015, 0.55, 8), dark
    );
    barrel.rotation.x = Math.PI / 2;
    barrel.position.set(0, 0.015, -0.75);
    group.add(barrel);

    // Mira telescópica
    const scope = new THREE.Mesh(
      new THREE.CylinderGeometry(0.025, 0.025, 0.2, 8), dark
    );
    scope.rotation.x = Math.PI / 2;
    scope.position.set(0, 0.075, -0.35);
    group.add(scope);

    const stock = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.08, 0.2), green);
    stock.position.set(0, 0, 0.1);
    group.add(stock);

    const mag = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.1, 0.06), dark);
    mag.position.set(0, -0.09, -0.3);
    group.add(mag);

    this.addMuzzleFlash(group, new THREE.Vector3(0, 0.015, -1.03));
    group.position.set(0.22, -0.2, -0.4);
    return group;
  }

  buildPistol() {
    const group = new THREE.Group();
    const dark = new THREE.MeshLambertMaterial({ color: 0x222222 });
    const grey = new THREE.MeshLambertMaterial({ color: 0x555555 });

    const body = new THREE.Mesh(new THREE.BoxGeometry(0.055, 0.1, 0.28), dark);
    body.position.set(0, 0, -0.12);
    group.add(body);

    const barrel = new THREE.Mesh(
      new THREE.CylinderGeometry(0.016, 0.016, 0.2, 8), dark
    );
    barrel.rotation.x = Math.PI / 2;
    barrel.position.set(0, 0.018, -0.28);
    group.add(barrel);

    const grip = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.14, 0.09), grey);
    grip.position.set(0, -0.1, -0.04);
    grip.rotation.x = 0.15;
    group.add(grip);

    const mag = new THREE.Mesh(new THREE.BoxGeometry(0.038, 0.1, 0.06), dark);
    mag.position.set(0, -0.08, -0.08);
    group.add(mag);

    this.addMuzzleFlash(group, new THREE.Vector3(0, 0.018, -0.39));
    group.position.set(0.2, -0.2, -0.35);
    return group;
  }

  addMuzzleFlash(group, position) {
    const mat = new THREE.MeshBasicMaterial({
      color: 0xffee44, transparent: true, opacity: 0
    });
    const flash = new THREE.Mesh(new THREE.SphereGeometry(0.05, 6, 6), mat);
    flash.position.copy(position);
    flash.userData.isMuzzleFlash = true;
    group.add(flash);
  }

  getMuzzleFlash(group) {
    return group.children.find(c => c.userData.isMuzzleFlash);
  }

  equipWeapon(key) {
    if (!this.weapons[key]) return;

    if (this.currentMesh) this.currentMesh.visible = false;

    this.currentWeaponKey = key;
    this.currentWeapon = { ...this.weapons[key] };
    this.currentMesh = this.weaponMeshes[key];
    this.currentMesh.visible = true;
    this.muzzleFlash = this.getMuzzleFlash(this.currentMesh);
    this.isReloading = false;
    this.fireTimer = 0;

    if (this.player.hud) {
      this.player.hud.updateAmmo(
        this.currentWeapon.ammo,
        this.currentWeapon.reserve
      );
      this.player.hud.setWeaponName(this.currentWeapon.name);
    }
  }

  switchWeapon() {
    this.currentIndex = (this.currentIndex + 1) % this.inventory.length;
    this.equipWeapon(this.inventory[this.currentIndex]);
  }

  pickupWeapon(key) {
    if (!this.inventory.includes(key)) {
      if (this.inventory.length < 3) {
        this.inventory.push(key);
      } else {
        // Reemplazar arma actual
        this.inventory[this.currentIndex] = key;
      }
    }
    this.equipWeapon(key);
  }

  startFire() { this.isFiring = true; }
  stopFire()  { this.isFiring = false; }

  shoot(game) {
    const w = this.currentWeapon;
    if (w.ammo <= 0) { this.startReload(); return; }

    w.ammo--;
    this.fireTimer = w.fireRate;

    // Muzzle flash
    if (this.muzzleFlash) {
      this.muzzleFlash.material.opacity = 1;
      this.muzzleFlashTimer = 0.05;
    }

    // Retroceso
    this.currentMesh.position.z += 0.05;
    setTimeout(() => {
      if (this.currentMesh) this.currentMesh.position.z -= 0.05;
    }, 70);

    if (this.player.hud) {
      this.player.hud.updateAmmo(w.ammo, w.reserve);
    }

    // Pellets para escopeta
    const pellets = w.pellets || 1;
    for (let i = 0; i < pellets; i++) {
      this.fireRay(game, w);
    }
  }

  fireRay(game, w) {
    const spread = w.spread;
    const dir = new THREE.Vector3(
      (Math.random() - 0.5) * spread,
      (Math.random() - 0.5) * spread,
      -1
    ).normalize();
    dir.applyQuaternion(this.camera.quaternion);

    const from = this.camera.position.clone();
    const to = from.clone().addScaledVector(dir, w.range);

    if (game.network.connected) {
      game.network.sendShoot(
        { x: from.x, y: from.y, z: from.z },
        { x: dir.x, y: dir.y, z: dir.z }
      );
    }

    const raycaster = new THREE.Raycaster(from, dir.normalize(), 0, w.range);
    const remoteMeshes = Object.entries(game.remotePlayers || {}).map(
      ([id, rp]) => ({ id, mesh: rp.mesh })
    );

    let hit = false;
    remoteMeshes.forEach(({ id, mesh }) => {
      const hits = raycaster.intersectObject(mesh, true);
      if (hits.length > 0) {
        game.network.sendHit(id, w.damage);
        game.spawnBulletTrail(from, hits[0].point);
        if (game.hud) game.hud.showHitMarker();
        hit = true;
      }
    });

    if (!hit) game.spawnBulletTrail(from, to);
  }

  startReload() {
    const w = this.currentWeapon;
    if (this.isReloading || w.reserve <= 0 || w.ammo === w.maxAmmo) return;
    this.isReloading = true;
    this.reloadTimer = w.reloadTime;
    if (this.player.hud) this.player.hud.showReloading(true);
  }

  update(dt, game) {
    this.fireTimer -= dt;

    if (this.muzzleFlashTimer > 0) {
      this.muzzleFlashTimer -= dt;
      if (this.muzzleFlashTimer <= 0 && this.muzzleFlash) {
        this.muzzleFlash.material.opacity = 0;
      }
    }

    if (this.isFiring && this.fireTimer <= 0 && !this.isReloading) {
      if (this.currentWeapon.auto || this.fireTimer < -this.currentWeapon.fireRate * 0.5) {
        this.shoot(game);
      }
    }

    if (this.isReloading) {
      this.reloadTimer -= dt;
      if (this.reloadTimer <= 0) {
        const w = this.currentWeapon;
        const needed = w.maxAmmo - w.ammo;
        const take = Math.min(needed, w.reserve);
        w.ammo += take;
        w.reserve -= take;
        // Sincronizar con weapons base
        this.weapons[this.currentWeaponKey].ammo = w.ammo;
        this.weapons[this.currentWeaponKey].reserve = w.reserve;
        this.isReloading = false;
        if (this.player.hud) {
          this.player.hud.showReloading(false);
          this.player.hud.updateAmmo(w.ammo, w.reserve);
        }
      }
    }

    // Sway del arma
    const t = Date.now() * 0.003;
    this.currentMesh.position.y = -0.2 + Math.sin(t) * 0.004;
  }
  }
