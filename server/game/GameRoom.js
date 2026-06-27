const { PlayerState } = require('./PlayerState.js');

class GameRoom {
  constructor(io) {
    this.io = io;
    this.players = {};
    this.vehicles = {};
    this.maxPlayers = 20;
    this.tickRate = 20;

    this.initVehicles();
    setInterval(() => this.tick(), 1000 / this.tickRate);
  }

  initVehicles() {
    const spawns = [
      { x: 20,  z: 0,   rot: 0 },
      { x: -30, z: 20,  rot: Math.PI / 4 },
      { x: 40,  z: -30, rot: Math.PI },
      { x: -20, z: -40, rot: Math.PI / 2 },
      { x: 60,  z: 40,  rot: Math.PI * 1.5 },
      { x: -60, z: -20, rot: 0 }
    ];

    spawns.forEach((s, i) => {
      const id = 'vehicle_' + i;
      this.vehicles[id] = {
        id,
        type: 'jeep',
        x: s.x, y: 0.5, z: s.z,
        rotY: s.rot,
        health: 200,
        maxHealth: 200,
        occupied: false,
        occupantId: null,
        speed: 0
      };
    });
  }

  addPlayer(socket) {
    if (Object.keys(this.players).length >= this.maxPlayers) {
      socket.emit('roomFull');
      socket.disconnect();
      return;
    }

    const name = socket.handshake.query.name ||
      'Player_' + socket.id.slice(0, 4);
    const x = (Math.random() - 0.5) * 100;
    const z = (Math.random() - 0.5) * 100;

    this.players[socket.id] = new PlayerState(socket.id, x, 1.7, z, name);

    const currentPlayers = {};
    Object.entries(this.players).forEach(([id, p]) => {
      if (id !== socket.id) currentPlayers[id] = p.serialize();
    });
    socket.emit('currentPlayers', currentPlayers);
    socket.emit('currentVehicles', this.vehicles);

    socket.broadcast.emit('playerJoined', {
      id: socket.id,
      ...this.players[socket.id].serialize()
    });

    console.log(`[GameRoom] + ${name} en (${x.toFixed(0)}, ${z.toFixed(0)})`);
  }

  removePlayer(id) {
    if (!this.players[id]) return;
    const name = this.players[id].name;

    // Liberar vehículo si estaba dentro
    Object.values(this.vehicles).forEach(v => {
      if (v.occupantId === id) {
        v.occupied = false;
        v.occupantId = null;
        v.speed = 0;
        this.io.emit('vehicleUpdated', v);
      }
    });

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
      console.warn(`[GameRoom] Mov. sospechoso: ${player.name}`);
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
    if (now - player.lastFired < 80) return;
    player.lastFired = now;

    const sockets = Array.from(
      this.io.sockets.sockets.keys()
    ).filter(s => s !== id);

    sockets.forEach(sid => {
      const s = this.io.sockets.sockets.get(sid);
      if (s) s.emit('playerShot', { id, from: data.from, dir: data.dir });
    });
  }

  handleHit(shooterId, data) {
    const shooter = this.players[shooterId];
    const target = this.players[data.targetId];
    if (!shooter || !target) return;

    const damage = Math.min(Math.max(data.damage || 25, 1), 100);
    const died = target.takeDamage(damage);

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
          if (ts) ts.emit('respawn', {
            x: this.players[data.targetId].x,
            y: 1.7,
            z: this.players[data.targetId].z
          });
        }
      }, 3000);
    }
  }

  handleChat(senderId, data) {
    const player = this.players[senderId];
    if (!player) return;
    const text = String(data.text || '').slice(0, 60).trim();
    if (!text) return;

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

    const sockets = Array.from(
      this.io.sockets.sockets.keys()
    ).filter(s => s !== throwerId);

    sockets.forEach(sid => {
      const s = this.io.sockets.sockets.get(sid);
      if (s) s.emit('grenadeThrown', {
        throwerId, x: data.x, y: data.y, z: data.z,
        vx: data.vx, vy: data.vy, vz: data.vz
      });
    });
  }

  handleGrenadeExplode(throwerId, data) {
    const player = this.players[throwerId];
    if (!player) return;

    this.io.emit('grenadeExploded', {
      throwerId,
      x: data.x, y: data.y, z: data.z,
      radius: Math.min(data.radius || 8, 15),
      damage: Math.min(data.damage || 80, 100)
    });

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
        const ts = this.io.sockets.sockets.get(id);
        if (ts) ts.emit('hitReceived', {
          targetId: id, shooterId: throwerId, damage: dmg
        });

        if (died) {
          player.kills++;
          this.io.emit('playerKilled', {
            id, killerId: throwerId,
            killerName: player.name, victimName: p.name
          });
          setTimeout(() => {
            if (this.players[id]) {
              this.players[id].respawn();
              const s = this.io.sockets.sockets.get(id);
              if (s) s.emit('respawn', {
                x: this.players[id].x, y: 1.7, z: this.players[id].z
              });
            }
          }, 3000);
        }
      }
    });
  }

  handleVehicleEnter(playerId, data) {
    const vehicle = this.vehicles[data.vehicleId];
    const player = this.players[playerId];
    if (!vehicle || !player || vehicle.occupied) return;

    vehicle.occupied = true;
    vehicle.occupantId = playerId;
    this.io.emit('vehicleUpdated', vehicle);
    console.log(`[GameRoom] ${player.name} entró al vehículo ${data.vehicleId}`);
  }

  handleVehicleExit(playerId, data) {
    const vehicle = this.vehicles[data.vehicleId];
    if (!vehicle || vehicle.occupantId !== playerId) return;

    vehicle.occupied = false;
    vehicle.occupantId = null;
    vehicle.speed = 0;
    this.io.emit('vehicleUpdated', vehicle);
  }

  handleVehicleMove(playerId, data) {
    const vehicle = this.vehicles[data.vehicleId];
    if (!vehicle || vehicle.occupantId !== playerId) return;

    vehicle.x = Math.max(-195, Math.min(195, data.x));
    vehicle.y = data.y || 0.5;
    vehicle.z = Math.max(-195, Math.min(195, data.z));
    vehicle.rotY = data.rotY;
    vehicle.speed = data.speed;

    this.io.volatile.emit('vehicleMoved', {
      vehicleId: data.vehicleId,
      x: vehicle.x, y: vehicle.y, z: vehicle.z,
      rotY: vehicle.rotY, speed: vehicle.speed
    });
  }

  tick() {
    // Futuro: zona server-side
  }

  getPlayerCount() {
    return Object.keys(this.players).length;
  }
}

module.exports = { GameRoom };
