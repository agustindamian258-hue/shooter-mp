import { Bullet } from './Bullet.js';

export class Player {
  constructor(scene, x, y, bulletsGroup) {
    this.scene = scene;
    this.bulletsGroup = bulletsGroup;
    this.speed = 180;
    this.fireRate = 250;
    this.lastFired = 0;
    this.health = 100;

    // Sprite principal
    this.sprite = scene.physics.add.sprite(x, y, 'player');
    this.sprite.setDepth(2);
    this.sprite.setCollideWorldBounds(true);

    // Controles táctiles
    this.joystickData = { active: false, startX: 0, startY: 0, dx: 0, dy: 0 };
    this.aimData = { active: false, angle: 0 };
    this.pointers = {};

    this.setupTouchControls();
  }

  setupTouchControls() {
    const scene = this.scene;
    const halfW = scene.scale.width / 2;

    scene.input.on('pointerdown', (ptr) => {
      this.pointers[ptr.id] = ptr;

      if (ptr.x < halfW) {
        // Joystick izquierdo — movimiento
        this.joystickData.active = true;
        this.joystickData.pointerId = ptr.id;
        this.joystickData.startX = ptr.x;
        this.joystickData.startY = ptr.y;
        this.joystickData.dx = 0;
        this.joystickData.dy = 0;
      } else {
        // Zona derecha — apuntar y disparar
        this.aimData.active = true;
        this.aimData.pointerId = ptr.id;
        this.aimData.startX = ptr.x;
        this.aimData.startY = ptr.y;
      }
    });

    scene.input.on('pointermove', (ptr) => {
      if (
        this.joystickData.active &&
        ptr.id === this.joystickData.pointerId
      ) {
        this.joystickData.dx = ptr.x - this.joystickData.startX;
        this.joystickData.dy = ptr.y - this.joystickData.startY;
      }

      if (
        this.aimData.active &&
        ptr.id === this.aimData.pointerId
      ) {
        const dx = ptr.x - this.aimData.startX;
        const dy = ptr.y - this.aimData.startY;
        if (Math.abs(dx) > 5 || Math.abs(dy) > 5) {
          this.aimData.angle = Math.atan2(dy, dx);
        }
      }
    });

    scene.input.on('pointerup', (ptr) => {
      delete this.pointers[ptr.id];

      if (ptr.id === this.joystickData.pointerId) {
        this.joystickData.active = false;
        this.joystickData.dx = 0;
        this.joystickData.dy = 0;
      }

      if (ptr.id === this.aimData.pointerId) {
        this.aimData.active = false;
      }
    });
  }

  fire(time) {
    if (time < this.lastFired + this.fireRate) return;
    this.lastFired = time;

    const bullet = this.bulletsGroup.get(
      this.sprite.x,
      this.sprite.y,
      'bullet'
    );

    if (bullet) {
      bullet.fireFromAngle(
        this.sprite.x,
        this.sprite.y,
        this.aimData.angle,
        600
      );

      // Notificar al servidor
      if (this.scene.network && this.scene.network.connected) {
        this.scene.network.sendBullet(this.aimData.angle, 600);
      }
    }
  }

  update(time, delta) {
    const jd = this.joystickData;
    const maxDist = 60;

    let vx = 0;
    let vy = 0;

    if (jd.active) {
      const dist = Math.sqrt(jd.dx * jd.dx + jd.dy * jd.dy);
      const norm = Math.min(dist, maxDist) / maxDist;

      if (dist > 8) {
        vx = (jd.dx / dist) * this.speed * norm;
        vy = (jd.dy / dist) * this.speed * norm;
      }
    }

    this.sprite.setVelocity(vx, vy);

    if (vx !== 0 || vy !== 0) {
      this.sprite.setAngle(Math.atan2(vy, vx) * (180 / Math.PI));
    }

    if (this.aimData.active) {
      this.fire(time);
    }
  }

  takeDamage(amount) {
    this.health -= amount;
    this.scene.events.emit('playerHealthChanged', this.health);

    if (this.health <= 0) {
      this.health = 0;
      this.scene.events.emit('playerDied');
    }
  }

  destroy() {
    this.sprite.destroy();
  }
    }
