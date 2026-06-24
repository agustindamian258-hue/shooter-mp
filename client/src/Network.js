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
    this.lastPingTime = 0;
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
      console.error('[Network] Error al conectar:', err);
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
        this.lastPingTime = Date.now();
        this.socket.emit('ping_custom', this.lastPingTime);
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
      console.error('[Network] Error:', err.message);
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
        this.game.hud.updatePlayers(Object.keys(players).length);
      }
    });

    this.socket.on('playerJoined', (data) => {
      if (data.id !== this.playerId) {
        this.game.addRemotePlayer(data.id, data);
        if (this.game.hud) {
          const count = Object.keys(this.game.remotePlayers).length + 1;
          this.game.hud.updatePlayers(count);
        }
      }
    });

    this.socket.on('playerLeft', (id) => {
      this.game.removeRemotePlayer(id);
      if (this.game.hud) {
        const count = Object.keys(this.game.remotePlayers).length + 1;
        this.game.hud.updatePlayers(count);
      }
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
        this.game.removeRemotePlayer(data.id);
        if (data.killerId === this.playerId) {
          this.game.player.kills++;
          if (this.game.hud) {
            this.game.hud.updateKills(this.game.player.kills);
            this.game.hud.addKillFeed(this.playerName, data.id.slice(0, 6));
          }
        } else {
          if (this.game.hud) {
            this.game.hud.addKillFeed('Player', data.id.slice(0, 6));
          }
        }
      }
    });

    this.socket.on('respawn', (data) => {
      this.game.player.camera.position.set(data.x, data.y || 1.7, data.z);
      this.game.player.health = 100;
      this.game.player.alive = true;
      if (this.game.hud) this.game.hud.updateHealth(100);
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
