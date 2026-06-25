export class Network {
  constructor(game) {
    this.game = game;
    this.socket = null;
    this.connected = false;
    this.playerId = null;
    this.playerName = 'Player';
    this.reconnectAttempts = 0;
    this.maxReconnects = 10;
    this.reconnectDelay = 2000;
    this.reconnectTimer = null;
    this.pingInterval = null;
    this.serverUrl = 'https://shooter-mp-production.up.railway.app';
  }

  connect(playerName) {
    this.playerName = playerName;
    try {
      this.socket = io(this.serverUrl, {
        transports: ['websocket', 'polling'],
        reconnection: false,
        timeout: 10000,
        forceNew: true,
        query: { name: playerName }
      });
      this.setupListeners();
    } catch (err) {
      console.error('[Network] Error:', err);
      this.scheduleReconnect();
    }
  }

  setupListeners() {
    this.socket.on('connect', () => {
      console.log('[Network] Conectado:', this.socket.id);
      this.connected = true;
      this.playerId = this.socket.id;
      this.reconnectAttempts = 0;

      this.pingInterval = setInterval(() => {
        const now = Date.now();
        this.socket.emit('ping_custom', now);
      }, 3000);
    });

    this.socket.on('disconnect', (reason) => {
      console.warn('[Network] Desconectado:', reason);
      this.connected = false;
      clearInterval(this.pingInterval);
      if (reason !== 'io client disconnect') {
        this.scheduleReconnect();
      }
    });

    this.socket.on('connect_error', (err) => {
      console.error('[Network] Error conexión:', err.message);
      this.connected = false;
      this.scheduleReconnect();
    });

    this.socket.on('pong_custom', (serverTime) => {
      const ms = Date.now() - serverTime;
      if (this.game.hud) this.game.hud.updatePing(ms);
    });

    this.socket.on('currentPlayers', (players) => {
      Object.entries(players).forEach(([id, data]) => {
        if (id !== this.playerId) {
          this.game.addRemotePlayer(id, data);
        }
      });
      if (this.game.hud) {
        this.game.hud.updatePlayers(Object.keys(players).length + 1);
      }
    });

    this.socket.on('playerJoined', (data) => {
      if (data.id !== this.playerId) {
        this.game.addRemotePlayer(data.id, data);
      }
    });

    this.socket.on('playerLeft', (id) => {
      this.game.removeRemotePlayer(id);
    });

    this.socket.on('playerMoved', (data) => {
      if (data.id !== this.playerId) {
        this.game.updateRemotePlayer(data.id, data);
      }
    });

    this.socket.on('playerShot', (data) => {
      if (data.id !== this.playerId) {
        const from = new THREE.Vector3(data.from.x, data.from.y, data.from.z);
        const dir = new THREE.Vector3(data.dir.x, data.dir.y, data.dir.z);
        const to = from.clone().addScaledVector(dir, 100);
        this.game.spawnBulletTrail(from, to);

        // Sonido de disparo remoto (más suave)
        if (this.game.sounds) {
          this.game.sounds.playShot('rifle');
        }
      }
    });

    this.socket.on('hitReceived', (data) => {
      if (data.targetId === this.playerId) {
        this.game.player.takeDamage(data.damage);
      }
    });

    this.socket.on('playerKilled', (data) => {
      if (data.id === this.playerId) {
        this.game.showDeathScreen();
      } else {
        const rp = this.game.remotePlayers[data.id];
        const victimName = rp ? rp.name : data.id.slice(0, 6);

        if (data.killerId === this.playerId) {
          this.game.onEnemyKilled(data.id, victimName);
        } else {
          this.game.removeRemotePlayer(data.id);
          if (this.game.hud) {
            this.game.hud.addKillFeed(
              data.killerName || 'Player',
              victimName
            );
          }
        }
      }
    });

    this.socket.on('respawn', (data) => {
      this.game.player.camera.position.set(
        data.x,
        data.y || 1.7,
        data.z
      );
      this.game.player.health = 100;
      this.game.player.alive = true;
      if (this.game.hud) this.game.hud.updateHealth(100);
    });

    this.socket.on('roomFull', () => {
      alert('Sala llena. Intentá de nuevo en unos minutos.');
    });
  }

  sendState() {
    if (!this.connected) return;
    const state = this.game.player.getState();
    state.name = this.playerName;
    this.socket.volatile.emit('playerMove', state);
  }

  sendShoot(from, dir) {
    if (!this.connected) return;
    this.socket.emit('bulletFire', { from, dir });
  }

  sendHit(targetId, damage) {
    if (!this.connected) return;
    this.socket.emit('playerHit', { targetId, damage });
  }

  scheduleReconnect() {
    if (this.reconnectAttempts >= this.maxReconnects) {
      console.error('[Network] Sin conexión');
      return;
    }
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    const delay = this.reconnectDelay * Math.min(this.reconnectAttempts + 1, 5);
    this.reconnectTimer = setTimeout(() => {
      this.reconnectAttempts++;
      this.connect(this.playerName);
    }, delay);
  }

  disconnect() {
    clearInterval(this.pingInterval);
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    this.connected = false;
  }
    }
