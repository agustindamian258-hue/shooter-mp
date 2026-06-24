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

    // URL del servidor — actualizá esto cuando deployés el server
    this.serverUrl = 'https://shooter-mp-server.onrender.com';
  }

  connect() {
    try {
      this.socket = io(this.serverUrl, {
        transports: ['websocket', 'polling'],
        reconnection: false, // manejamos reconexión manualmente
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

      // Reconectar solo si no fue intencional
      if (reason !== 'io client disconnect') {
        this.scheduleReconnect();
      }
    });

    this.socket.on('connect_error', (err) => {
      console.error('[Network] Error de conexión:', err.message);
      this.connected = false;
      this.scheduleReconnect();
    });

    // Jugadores existentes al unirse a la sala
    this.socket.on('currentPlayers', (players) => {
      Object.entries(players).forEach(([id, data]) => {
        if (id !== this.playerId) {
          this.scene.addRemotePlayer(id, data.x, data.y);
        }
      });
    });

    // Nuevo jugador entró
    this.socket.on('playerJoined', (data) => {
      if (data.id !== this.playerId) {
        this.scene.addRemotePlayer(data.id, data.x, data.y);
        this.scene.events.emit('playerJoined', data.id);
      }
    });

    // Jugador salió
    this.socket.on('playerLeft', (id) => {
      this.scene.removeRemotePlayer(id);
      this.scene.events.emit('playerLeft', id);
    });

    // Estado de jugador remoto (posición + ángulo)
    this.socket.on('playerMoved', (data) => {
      if (data.id !== this.playerId) {
        this.scene.updateRemotePlayer(data.id, data.x, data.y, data.angle);
      }
    });

    // Bala disparada por jugador remoto
    this.socket.on('bulletFired', (data) => {
      if (data.id !== this.playerId) {
        this.scene.spawnRemoteBullet(data.x, data.y, data.angle, data.speed);
      }
    });

    // Recibimos un impacto
    this.socket.on('hitReceived', (data) => {
      if (data.targetId === this.playerId) {
        this.scene.player.takeDamage(data.damage);
      }
    });

    // Jugador eliminado
    this.socket.on('playerKilled', (data) => {
      if (data.id === this.playerId) {
        this.scene.events.emit('playerDied');
      } else {
        this.scene.removeRemotePlayer(data.id);
        this.scene.events.emit('enemyKilled', data.id);
      }
    });

    // Ping para medir latencia
    this.socket.on('pong_custom', (serverTime) => {
      const latency = Date.now() - serverTime;
      this.scene.events.emit('latencyUpdate', latency);
    });
  }

  // Enviar posición del jugador local (throttled en GameScene)
  sendState(x, y, angle) {
    if (!this.connected) return;
    this.socket.volatile.emit('playerMove', { x, y, angle });
  }

  // Enviar bala disparada
  sendBullet(angle, speed) {
    if (!this.connected) return;
    this.socket.emit('bulletFire', {
      x: this.scene.player.sprite.x,
      y: this.scene.player.sprite.y,
      angle,
      speed
    });
  }

  // Notificar impacto a jugador remoto
  sendHit(targetId) {
    if (!this.connected) return;
    this.socket.emit('playerHit', {
      targetId,
      damage: this.scene.player.bulletsGroup
        .getFirstAlive()?.damage ?? 25
    });
  }

  // Medir latencia
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
