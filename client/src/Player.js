export class Player {
  constructor(world) {
    this.world = world;
    this.hud = null;
    this.weapons = null;

    // Estado
    this.health = 100;
    this.maxHealth = 100;
    this.kills = 0;
    this.alive = true;

    // Física
    this.velocity = new THREE.Vector3();
    this.speed = 8;
    this.jumpForce = 6;
    this.gravity = -18;
    this.onGround = false;
    this.height = 1.7;
    this.groundY = this.height;

    // Cámara FPS
    this.camera = world.camera;
    this.camera.position.set(0, this.height, 0);
    this.yaw = 0;
    this.pitch = 0;
    this.minPitch = -Math.PI / 3;
    this.maxPitch = Math.PI / 3;

    // Bob de cámara al caminar
    this.bobTimer = 0;
    this.bobAmount = 0.05;
    this.bobSpeed = 8;
    this.isMoving = false;

    this.world.scene.add(this.camera);
  }

  setHUD(hud) {
    this.hud = hud;
  }

  update(dt) {
    if (!this.alive) return;
    this.updatePhysics(dt);
    this.updateCameraBob(dt);
  }

  updatePhysics(dt) {
    if (!this.onGround) {
      this.velocity.y += this.gravity * dt;
    }

    this.camera.position.y += this.velocity.y * dt;

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

  updateCameraBob(dt) {
    if (this.isMoving && this.onGround) {
      this.bobTimer += dt * this.bobSpeed;
      const bobY = Math.sin(this.bobTimer) * this.bobAmount;
      const bobX = Math.cos(this.bobTimer * 0.5) * this.bobAmount * 0.5;
      this.camera.position.y = this.groundY + bobY;

      if (this.weapons && this.weapons.currentMesh) {
        this.weapons.currentMesh.position.x = 0.22 + bobX;
      }
    } else {
      this.bobTimer *= 0.9;
      this.camera.position.y += (this.groundY - this.camera.position.y) * 0.1;
    }
  }

  move(forwardAmount, rightAmount) {
    if (!this.alive) return;

    const forward = new THREE.Vector3(
      -Math.sin(this.yaw), 0, -Math.cos(this.yaw)
    );
    const right = new THREE.Vector3(
      Math.cos(this.yaw), 0, -Math.sin(this.yaw)
    );

    const move = new THREE.Vector3();
    move.addScaledVector(forward, forwardAmount);
    move.addScaledVector(right, rightAmount);

    if (move.length() > 0) {
      move.normalize().multiplyScalar(this.speed);
      this.isMoving = true;
    } else {
      this.isMoving = false;
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

  takeDamage(amount) {
    if (!this.alive) return;
    this.health = Math.max(0, this.health - amount);

    if (this.hud) {
      this.hud.updateHealth(this.health);
      this.hud.flashDamage();
    }

    if (this.world.game && this.world.game.sounds) {
      this.world.game.sounds.playHit();
    }

    if (this.health <= 0) {
      this.alive = false;
      this.world.game.showDeathScreen();
    }
  }

  respawn() {
    this.health = this.maxHealth;
    this.alive = true;
    this.velocity.set(0, 0, 0);

    const x = (Math.random() - 0.5) * 100;
    const z = (Math.random() - 0.5) * 100;
    this.camera.position.set(x, this.height, z);
    this.yaw = 0;
    this.pitch = 0;
    this.camera.rotation.set(0, 0, 0);

    if (this.hud) {
      this.hud.updateHealth(this.health);
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
