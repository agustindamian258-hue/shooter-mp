export class Bullet extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y) {
    super(scene, x, y, 'bullet');
    this.speed = 600;
    this.lifespan = 1500;
    this.born = 0;
    this.damage = 25;
    this.active = false;
    this.visible = false;
  }

  fireFromAngle(x, y, angle, speed = 600) {
    this.setActive(true);
    this.setVisible(true);
    this.setPosition(x, y);
    this.setAngle(angle * (180 / Math.PI));
    this.born = this.scene.time.now;
    this.speed = speed;

    const vx = Math.cos(angle) * speed;
    const vy = Math.sin(angle) * speed;
    this.setVelocity(vx, vy);
    this.body.reset(x, y);
    this.body.velocity.x = vx;
    this.body.velocity.y = vy;
  }

  deactivate() {
    this.setActive(false);
    this.setVisible(false);
    this.setVelocity(0, 0);
    if (this.body) this.body.reset(0, 0);
  }

  update(time, delta) {
    if (!this.active) return;

    // Destruir bala si superó su tiempo de vida
    if (time - this.born >= this.lifespan) {
      this.deactivate();
      return;
    }

    // Destruir si sale de los límites del mundo
    const bounds = this.scene.physics.world.bounds;
    if (
      this.x < bounds.x ||
      this.x > bounds.x + bounds.width ||
      this.y < bounds.y ||
      this.y > bounds.y + bounds.height
    ) {
      this.deactivate();
    }
  }
    }
