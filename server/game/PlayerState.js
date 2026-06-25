class PlayerState {
  constructor(id, x, y, z, name) {
    this.id = id;
    this.name = name || 'Player_' + id.slice(0, 4);
    this.x = x || 0;
    this.y = y || 1.7;
    this.z = z || 0;
    this.rotY = 0;
    this.health = 100;
    this.maxHealth = 100;
    this.kills = 0;
    this.deaths = 0;
    this.alive = true;
    this.lastUpdate = 0;
    this.lastFired = 0;
    this.joinedAt = Date.now();
  }

  updatePosition(x, y, z, rotY) {
    this.x = x;
    this.y = y;
    this.z = z;
    this.rotY = rotY;
    this.lastUpdate = Date.now();
  }

  takeDamage(amount) {
    if (!this.alive) return false;
    this.health = Math.max(0, this.health - amount);
    if (this.health <= 0) {
      this.alive = false;
      this.deaths++;
      return true;
    }
    return false;
  }

  respawn() {
    this.x = (Math.random() - 0.5) * 100;
    this.y = 1.7;
    this.z = (Math.random() - 0.5) * 100;
    this.health = this.maxHealth;
    this.alive = true;
    this.lastUpdate = Date.now();
    console.log(`[PlayerState] Respawn de ${this.name} en (${this.x.toFixed(0)}, ${this.z.toFixed(0)})`);
  }

  addKill() {
    this.kills++;
  }

  serialize() {
    return {
      id: this.id,
      name: this.name,
      x: this.x,
      y: this.y,
      z: this.z,
      rotY: this.rotY,
      health: this.health,
      kills: this.kills,
      deaths: this.deaths,
      alive: this.alive
    };
  }
}

module.exports = { PlayerState };
