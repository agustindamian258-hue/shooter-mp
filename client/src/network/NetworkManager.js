export class NetworkManager {
  constructor(scene) {
    this.scene = scene;
    this.socket = null;
    this.connected = false;
    this.playerId = null;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 10;
    this.reconnectDelay = 2000;
    this.reconnectTimer = null;

    this.serverUrl = 'https://shooter-mp-production.up.railway.app';
  }

  connect() {
    try {
      this.socket = io(this.serverUrl, {
        transports: ['websocket', 'polling'],
        reconnection: false,
        timeout: 10000,
        forceNew: true
      });

      this.setupListeners();
    } catch (err) {
      console.error('[Network] Error al conectar:', err);
      this.scheduleReconnect();
    }
  }

  setupListeners() {
    this.socket.on('connect', () => {
      console.log('[Network] Conectado al servidor');
      this.connected = true;
      this.reconnectAttempts = 0;
      this.playerId = this.socket.id;
      this.scene.events.emit('networkConnected', this.playerId);
    });

    this.socket.on('disconnect', (reason) => {
      console.warn('[Network] Desconectado:', reason);
      this.connected = false;
      this.scene.events.emit('networkDisconnected', reason);

      if (reason !== 'io client disconnect') {
        this.scheduleReconnect();
      }
    });

    this.socket.on('connect_error', (err) => {
      console.error('[Network] Error de conexión:', err.message);
      this.connected = false;
      this.scheduleReconnect();
    });

    this.socket.on('currentPlayers', (players) => {
      Object.entries(players).forEach(([id, data]) => {
        if (id !== this.playerId) {
          this.scene.addRemotePlayer(id, data.x, data.y);
        }
      });
    });

    this.socket.on('playerJoined', (data) => {
      if (data.id !== this.playerId) {
        this.scene.addRemotePlayer(data.id, data.x, data.y);
        this.scene.events.emit('playerJoined', data.id);
      }
    });

    this.socket.on('playerLeft', (id) => {
      this.scene.removeRemotePlayer(id);
      this.scene.events.emit('playerLeft', id);
    });

    this.socket.on('playerMoved', (data) => {
      if (data.id !== this.playerId) {
        this.scene.updateRemotePlayer(data.id, data.x, data.y, data.angle);
      }
    });

    this.socket.on('bulletFired', (data) => {
      if (data.id !== this.playerId) {
        this.scene.spawnRemoteBullet(data.x, data.y, data.angle, data.speed);
      }
    });

    this.socket.on('hitReceived', (data) => {
      if (data.targetId === this.playerId) {
        this.scene.player.takeDamage(data.damage);
      }
    });

    this.socket.on('playerKilled', (data) => {
      if (data.id === this.playerId) {
        this.scene.events.emit('playerDied');
      } else {
        this.scene.removeRemotePlayer(data.id);
        this.scene.events.emit('enemyKilled', data.id);
      }
    });

    this.socket.on('respawn', (data) => {
      this.scene.player.sprite.setPosition(data.x, data.y);
      this.scene.player.health = 100;
      this.scene.events.emit('playerHealthChanged', 100);
    });

    this.socket.on('pong_custom', (serverTime) => {
      const latency = Date.now() - serverTime;
      this.scene.events.emit('latencyUpdate', latency);
    });
  }

  sendState(x, y, angle) {
    if (!this.connected) return;
    this.socket.volatile.emit('playerMove', { x, y, angle });
  }

  sendBullet(angle, speed) {
    if (!this.connected) return;
    this.socket.emit('bulletFire', {
      x: this.scene.player.sprite.x,
      y: this.scene.player.sprite.y,
      angle,
      speed
    });
  }

  sendHit(targetId) {
    if (!this.connected) return;
    this.socket.emit('playerHit', {
      targetId,
      damage: 25
    });
  }

  ping() {
    if (!this.connected) return;
    this.socket.emit('ping_custom', Date.now());
  }

  scheduleReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('[Network] Máximo de reintentos alcanzado');
      this.scene.events.emit('networkFailed');
      return;
    }

    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);

    const delay = this.reconnectDelay * Math.min(this.reconnectAttempts + 1, 5);
    console.log(`[Network] Reintentando en ${delay}ms (intento ${this.reconnectAttempts + 1})`);

    this.reconnectTimer = setTimeout(() => {
      this.reconnectAttempts++;
      this.connect();
    }, delay);
  }

  disconnect() {
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    this.connected = false;
  }
        }
