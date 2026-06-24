class PlayerState {
  constructor(id, x, y) {
    this.id = id;
    this.x = x;
    this.y = y;
    this.angle = 0;
    this.health = 100;
    this.maxHealth = 100;
    this.kills = 0;
    this.deaths = 0;
    this.lastUpdate = 0;
    this.lastFired = 0;
    this.joinedAt = Date.now();
    this.alive = true;
  }

  updatePosition(x, y, angle) {
    this.x = x;
    this.y = y;
    this.angle = angle;
    this.lastUpdate = Date.now();
  }

  takeDamage(amount) {
    if (!this.alive) return false;
    this.health = Math.max(0, this.health - amount);
    if (this.health <= 0) {
      this.alive = false;
      this.deaths++;
      return true; // murió
    }
    return false;
  }

  respawn() {
    this.x = 100 + Math.floor(Math.random() * 1400);
    this.y = 100 + Math.floor(Math.random() * 1400);
    this.health = this.maxHealth;
    this.alive = true;
    this.lastUpdate = Date.now();
    console.log(`[PlayerState] Respawn de ${this.id} en (${this.x}, ${this.y})`);
  }

  addKill() {
    this.kills++;
  }

  serialize() {
    return {
      id: this.id,
      x: this.x,
      y: this.y,
      angle: this.angle,
      health: this.health,
      kills: this.kills,
      deaths: this.deaths,
      alive: this.alive
    };
  }
}

module.exports = { PlayerState };
