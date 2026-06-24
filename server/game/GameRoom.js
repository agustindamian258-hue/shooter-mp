const { PlayerState } = require('./PlayerState.js');

class GameRoom {
  constructor(io) {
    this.io = io;
    this.players = {};
    this.maxPlayers = 20;
    this.tickRate = 20; // 20 ticks por segundo
    this.lastTick = Date.now();

    // Loop del servidor
    setInterval(() => this.tick(), 1000 / this.tickRate);
  }

  addPlayer(socket) {
    if (Object.keys(this.players).length >= this.maxPlayers) {
      socket.emit('roomFull');
      socket.disconnect();
      return;
    }

    // Spawn en posición aleatoria dentro del mapa
    const spawnX = Phaser ? null : this.randomSpawn();
    const x = 100 + Math.floor(Math.random() * 1400);
    const y = 100 + Math.floor(Math.random() * 1400);

    this.players[socket.id] = new PlayerState(socket.id, x, y);

    // Enviar estado actual de todos los jugadores al nuevo
    const currentPlayers = {};
    Object.entries(this.players).forEach(([id, p]) => {
      if (id !== socket.id) {
        currentPlayers[id] = p.serialize();
      }
    });
    socket.emit('currentPlayers', currentPlayers);

    // Notificar a todos que entró un jugador nuevo
    socket.broadcast.emit('playerJoined', {
      id: socket.id,
      x,
      y
    });

    console.log(`[GameRoom] Jugador añadido: ${socket.id} en (${x}, ${y})`);
  }

  removePlayer(id) {
    if (!this.players[id]) return;
    delete this.players[id];
    this.io.emit('playerLeft', id);
    console.log(`[GameRoom] Jugador eliminado: ${id}`);
  }

  handleMove(id, data) {
    const player = this.players[id];
    if (!player) return;

    // Validación básica anti-cheat: velocidad máxima
    const maxSpeed = 200;
    const dx = data.x - player.x;
    const dy = data.y - player.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const timeDelta = (Date.now() - player.lastUpdate) / 1000;
    const maxDist = maxSpeed * timeDelta * 1.5; // 50% de tolerancia por lag

    if (dist > maxDist && player.lastUpdate !== 0) {
      // Movimiento sospechoso — ignorar pero no kickear todavía
      console.warn(`[GameRoom] Movimiento sospechoso de ${id}: ${dist.toFixed(1)}px`);
      return;
    }

    // Validar límites del mapa
    const clampedX = Math.max(32, Math.min(data.x, 1568));
    const clampedY = Math.max(32, Math.min(data.y, 1568));

    player.updatePosition(clampedX, clampedY, data.angle);

    // Broadcast a todos menos al emisor (volatile = no garantizado, ok para posición)
    this.io.volatile.emit('playerMoved', {
      id,
      x: clampedX,
      y: clampedY,
      angle: data.angle
    });
  }

  handleBullet(id, data) {
    const player = this.players[id];
    if (!player) return;

    // Validar rate de disparo
    const now = Date.now();
    const minFireInterval = 200; // ms mínimo entre balas
    if (now - player.lastFired < minFireInterval) {
      console.warn(`[GameRoom] Fire rate sospechoso de ${id}`);
      return;
    }
    player.lastFired = now;

    // Broadcast bala a todos menos al emisor
    this.io.to(Array.from(this.io.sockets.sockets.keys())
      .filter(sid => sid !== id))
      .emit('bulletFired', {
        id,
        x: data.x,
        y: data.y,
        angle: data.angle,
        speed: data.speed
      });
  }

  handleHit(shooterId, data) {
    const shooter = this.players[shooterId];
    const target = this.players[data.targetId];
    if (!shooter || !target) return;

    const damage = 25; // Daño fijo server-side
    target.health -= damage;

    console.log(`[GameRoom] ${shooterId} golpeó a ${data.targetId} — HP restante: ${target.health}`);

    // Notificar al objetivo que recibió daño
    const targetSocket = this.io.sockets.sockets.get(data.targetId);
    if (targetSocket) {
      targetSocket.emit('hitReceived', {
        targetId: data.targetId,
        shooterId,
        damage
      });
    }

    // Verificar si murió
    if (target.health <= 0) {
      target.health = 0;
      this.io.emit('playerKilled', {
        id: data.targetId,
        killerId: shooterId
      });

      // Respawn después de 3 segundos
      setTimeout(() => {
        if (this.players[data.targetId]) {
          this.players[data.targetId].respawn();
          const targetSocket = this.io.sockets.sockets.get(data.targetId);
          if (targetSocket) {
            targetSocket.emit('respawn', {
              x: this.players[data.targetId].x,
              y: this.players[data.targetId].y
            });
          }
        }
      }, 3000);
    }
  }

  tick() {
    // En el futuro: lógica de zona, power-ups, etc.
    this.lastTick = Date.now();
  }

  getPlayerCount() {
    return Object.keys(this.players).length;
  }

  randomSpawn() {
    return 100 + Math.floor(Math.random() * 1400);
  }
}

module.exports = { GameRoom };
