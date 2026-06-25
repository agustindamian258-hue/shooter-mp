const { PlayerState } = require('./PlayerState.js');

class GameRoom {
  constructor(io) {
    this.io = io;
    this.players = {};
    this.maxPlayers = 20;
    this.tickRate = 20;

    setInterval(() => this.tick(), 1000 / this.tickRate);
  }

  addPlayer(socket) {
    if (Object.keys(this.players).length >= this.maxPlayers) {
      socket.emit('roomFull');
      socket.disconnect();
      return;
    }

    const name = socket.handshake.query.name || 'Player_' + socket.id.slice(0, 4);
    const x = (Math.random() - 0.5) * 100;
    const z = (Math.random() - 0.5) * 100;

    this.players[socket.id] = new PlayerState(socket.id, x, 1.7, z, name);

    const currentPlayers = {};
    Object.entries(this.players).forEach(([id, p]) => {
      if (id !== socket.id) {
        currentPlayers[id] = p.serialize();
      }
    });
    socket.emit('currentPlayers', currentPlayers);

    socket.broadcast.emit('playerJoined', {
      id: socket.id,
      ...this.players[socket.id].serialize()
    });

    console.log(`[GameRoom] + ${name} en (${x.toFixed(0)}, ${z.toFixed(0)})`);
  }

  removePlayer(id) {
    if (!this.players[id]) return;
    const name = this.players[id].name;
    delete this.players[id];
    this.io.emit('playerLeft', id);
    console.log(`[GameRoom] - ${name}`);
  }

  handleMove(id, data) {
    const player = this.players[id];
    if (!player) return;

    const maxSpeed = 250;
    const dx = data.x - player.x;
    const dz = data.z - player.z;
    const dist = Math.sqrt(dx*dx + dz*dz);
    const timeDelta = (Date.now() - player.lastUpdate) / 1000;
    const maxDist = maxSpeed * Math.max(timeDelta, 0.05) * 1.5;

    if (dist > maxDist && player.lastUpdate !== 0) {
      console.warn(`[GameRoom] Movimiento sospechoso: ${player.name} ${dist.toFixed(1)}px`);
      return;
    }

    const clampedX = Math.max(-195, Math.min(195, data.x));
    const clampedZ = Math.max(-195, Math.min(195, data.z));

    player.updatePosition(clampedX, data.y || 1.7, clampedZ, data.rotY || 0);

    this.io.volatile.emit('playerMoved', {
      id,
      x: clampedX,
      y: data.y || 1.7,
      z: clampedZ,
      rotY: data.rotY || 0,
      health: player.health,
      name: player.name
    });
  }

  handleBullet(id, data) {
    const player = this.players[id];
    if (!player) return;

    const now = Date.now();
    const minFireInterval = 80;
    if (now - player.lastFired < minFireInterval) return;
    player.lastFired = now;

    const sockets = Array.from(this.io.sockets.sockets.keys()).filter(s => s !== id);
    sockets.forEach(sid => {
      const s = this.io.sockets.sockets.get(sid);
      if (s) s.emit('playerShot', {
        id,
        from: data.from,
        dir: data.dir
      });
    });
  }

  handleHit(shooterId, data) {
    const shooter = this.players[shooterId];
    const target = this.players[data.targetId];
    if (!shooter || !target) return;

    const damage = Math.min(Math.max(data.damage || 25, 1), 100);
    const died = target.takeDamage(damage);

    console.log(`[GameRoom] ${shooter.name} → ${target.name} (${damage} dmg, HP: ${target.health})`);

    const targetSocket = this.io.sockets.sockets.get(data.targetId);
    if (targetSocket) {
      targetSocket.emit('hitReceived', {
        targetId: data.targetId,
        shooterId,
        damage
      });
    }

    if (died) {
      shooter.kills++;
      console.log(`[GameRoom] ${shooter.name} eliminó a ${target.name}`);

      this.io.emit('playerKilled', {
        id: data.targetId,
        killerId: shooterId,
        killerName: shooter.name,
        victimName: target.name
      });

      setTimeout(() => {
        if (this.players[data.targetId]) {
          this.players[data.targetId].respawn();
          const ts = this.io.sockets.sockets.get(data.targetId);
          if (ts) {
            ts.emit('respawn', {
              x: this.players[data.targetId].x,
              y: 1.7,
              z: this.players[data.targetId].z
            });
          }
        }
      }, 3000);
    }
  }

  handleChat(senderId, data) {
    const player = this.players[senderId];
    if (!player) return;

    // Validar texto
    const text = String(data.text || '').slice(0, 60).trim();
    if (!text) return;

    console.log(`[Chat] ${player.name}: ${text}`);

    // Broadcast a todos los demás con posición del emisor
    this.io.emit('chatMessage', {
      senderId,
      name: player.name,
      text,
      x: player.x,
      y: player.y,
      z: player.z
    });
  }

  handleGrenade(throwerId, data) {
    const player = this.players[throwerId];
    if (!player) return;

    // Broadcast granada a todos menos al lanzador
    const sockets = Array.from(this.io.sockets.sockets.keys()).filter(s => s !== throwerId);
    sockets.forEach(sid => {
      const s = this.io.sockets.sockets.get(sid);
      if (s) s.emit('grenadeThrown', {
        throwerId,
        x: data.x,
        y: data.y,
        z: data.z,
        vx: data.vx,
        vy: data.vy,
        vz: data.vz
      });
    });
  }

  handleGrenadeExplode(throwerId, data) {
    const player = this.players[throwerId];
    if (!player) return;

    // Broadcast explosión a todos
    this.io.emit('grenadeExploded', {
      throwerId,
      x: data.x,
      y: data.y,
      z: data.z,
      radius: Math.min(data.radius || 8, 15),
      damage: Math.min(data.damage || 80, 100)
    });

    // Aplicar daño server-side a jugadores cercanos
    Object.entries(this.players).forEach(([id, p]) => {
      if (id === throwerId) return;
      const dx = data.x - p.x;
      const dy = data.y - p.y;
      const dz = data.z - p.z;
      const dist = Math.sqrt(dx*dx + dy*dy + dz*dz);
      const radius = Math.min(data.radius || 8, 15);

      if (dist < radius) {
        const dmg = Math.round(data.damage * (1 - dist / radius));
        const died = p.takeDamage(dmg);

        const targetSocket = this.io.sockets.sockets.get(id);
        if (targetSocket) {
          targetSocket.emit('hitReceived', {
            targetId: id,
            shooterId: throwerId,
            damage: dmg
          });
        }

        if (died) {
          player.kills++;
          this.io.emit('playerKilled', {
            id,
            killerId: throwerId,
            killerName: player.name,
            victimName: p.name
          });

          setTimeout(() => {
            if (this.players[id]) {
              this.players[id].respawn();
              const ts = this.io.sockets.sockets.get(id);
              if (ts) ts.emit('respawn', {
                x: this.players[id].x,
                y: 1.7,
                z: this.players[id].z
              });
            }
          }, 3000);
        }
      }
    });
  }

  tick() {
    // Futuro: zona server-side, eventos
  }

  getPlayerCount() {
    return Object.keys(this.players).length;
  }
}

module.exports = { GameRoom };
