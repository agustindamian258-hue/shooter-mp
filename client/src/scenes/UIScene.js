export class UIScene extends Phaser.Scene {
  constructor() {
    super({ key: 'UIScene' });
    this.gameScene = null;
    this.healthBar = null;
    this.healthText = null;
    this.pingText = null;
    this.killsText = null;
    this.playersText = null;
    this.joystickGraphic = null;
    this.joystickKnob = null;
    this.kills = 0;
    this.statusText = null;
  }

  init(data) {
    this.gameScene = data.gameScene;
  }

  create() {
    const W = this.scale.width;
    const H = this.scale.height;

    this.createHealthBar(W, H);
    this.createJoystickGraphic(H);
    this.createHUD(W);
    this.createStatusOverlay(W, H);
    this.setupEventListeners();
  }

  createHealthBar(W, H) {
    // Fondo barra de vida
    this.add.rectangle(W / 2, H - 30, 202, 18, 0x000000, 0.7)
      .setScrollFactor(0)
      .setDepth(10);

    this.healthBar = this.add.rectangle(W / 2, H - 30, 200, 16, 0x00e5ff)
      .setScrollFactor(0)
      .setDepth(11)
      .setOrigin(0.5, 0.5);

    this.healthText = this.add.text(W / 2, H - 30, '100 HP', {
      fontSize: '11px',
      fontFamily: 'Courier New',
      color: '#ffffff',
      stroke: '#000000',
      strokeThickness: 2
    }).setScrollFactor(0).setDepth(12).setOrigin(0.5, 0.5);

    // Ícono corazón
    this.add.text(W / 2 - 108, H - 30, '❤', {
      fontSize: '14px'
    }).setScrollFactor(0).setDepth(12).setOrigin(0.5, 0.5);
  }

  createJoystickGraphic(H) {
    // Zona visual del joystick (solo decorativa, la lógica está en Player.js)
    this.joystickGraphic = this.add.graphics();
    this.joystickGraphic.setScrollFactor(0).setDepth(10).setAlpha(0.25);
    this.joystickGraphic.lineStyle(2, 0xffffff, 1);
    this.joystickGraphic.strokeCircle(90, H - 110, 50);

    this.joystickKnob = this.add.graphics();
    this.joystickKnob.setScrollFactor(0).setDepth(11).setAlpha(0.4);
    this.joystickKnob.fillStyle(0xffffff, 1);
    this.joystickKnob.fillCircle(90, H - 110, 20);

    // Etiqueta zona disparo
    this.add.text(this.scale.width - 60, H - 60, '🔫 FIRE', {
      fontSize: '10px',
      fontFamily: 'Courier New',
      color: '#ff6b6b',
      alpha: 0.5
    }).setScrollFactor(0).setDepth(10).setOrigin(0.5, 0.5).setAlpha(0.4);
  }

  createHUD(W) {
    // Kills
    this.killsText = this.add.text(10, 10, '💀 Kills: 0', {
      fontSize: '13px',
      fontFamily: 'Courier New',
      color: '#00e5ff',
      stroke: '#000000',
      strokeThickness: 3
    }).setScrollFactor(0).setDepth(10);

    // Jugadores en sala
    this.playersText = this.add.text(10, 30, '👥 Online: 1', {
      fontSize: '11px',
      fontFamily: 'Courier New',
      color: '#aaaaaa',
      stroke: '#000000',
      strokeThickness: 2
    }).setScrollFactor(0).setDepth(10);

    // Ping
    this.pingText = this.add.text(W - 10, 10, '📶 -- ms', {
      fontSize: '11px',
      fontFamily: 'Courier New',
      color: '#00ff88',
      stroke: '#000000',
      strokeThickness: 2
    }).setScrollFactor(0).setDepth(10).setOrigin(1, 0);

    // Crosshair centro pantalla
    const cx = W / 2;
    const cy = this.scale.height / 2;
    const ch = this.add.graphics();
    ch.setScrollFactor(0).setDepth(10).setAlpha(0.6);
    ch.lineStyle(1, 0xffffff, 1);
    ch.strokeCircle(cx, cy, 6);
    ch.moveTo(cx - 12, cy); ch.lineTo(cx - 7, cy);
    ch.moveTo(cx + 7, cy);  ch.lineTo(cx + 12, cy);
    ch.moveTo(cx, cy - 12); ch.lineTo(cx, cy - 7);
    ch.moveTo(cx, cy + 7);  ch.lineTo(cx, cy + 12);
    ch.strokePath();
  }

  createStatusOverlay(W, H) {
    // Overlay de estado (conectando, muerto, etc.)
    this.statusOverlay = this.add.rectangle(W / 2, H / 2, W, H, 0x000000, 0.75)
      .setScrollFactor(0)
      .setDepth(20)
      .setVisible(false);

    this.statusText = this.add.text(W / 2, H / 2, '', {
      fontSize: '22px',
      fontFamily: 'Courier New',
      color: '#ffffff',
      stroke: '#000000',
      strokeThickness: 4,
      align: 'center'
    }).setScrollFactor(0).setDepth(21).setOrigin(0.5, 0.5).setVisible(false);

    this.statusSubText = this.add.text(W / 2, H / 2 + 40, '', {
      fontSize: '13px',
      fontFamily: 'Courier New',
      color: '#aaaaaa',
      align: 'center'
    }).setScrollFactor(0).setDepth(21).setOrigin(0.5, 0.5).setVisible(false);
  }

  setupEventListeners() {
    const gs = this.gameScene;

    gs.events.on('playerHealthChanged', (hp) => {
      this.updateHealth(hp);
    });

    gs.events.on('playerDied', () => {
      this.showStatus('💀 ELIMINADO', 'Recargando en 3 segundos...');
      this.time.delayedCall(3000, () => {
        this.hideStatus();
        this.scene.restart();
        gs.scene.restart();
      });
    });

    gs.events.on('enemyKilled', (id) => {
      this.kills++;
      this.killsText.setText(`💀 Kills: ${this.kills}`);
      this.showKillFeed();
    });

    gs.events.on('networkConnected', () => {
      this.hideStatus();
    });

    gs.events.on('networkDisconnected', () => {
      this.showStatus('📡 RECONECTANDO...', 'Esperá un momento');
    });

    gs.events.on('networkFailed', () => {
      this.showStatus('❌ SIN CONEXIÓN', 'Recargá la página');
    });

    gs.events.on('playerJoined', () => {
      this.updatePlayerCount();
    });

    gs.events.on('playerLeft', () => {
      this.updatePlayerCount();
    });

    gs.events.on('latencyUpdate', (ms) => {
      const color = ms < 80 ? '#00ff88' : ms < 150 ? '#ffea00' : '#ff3d3d';
      this.pingText.setText(`📶 ${ms}ms`);
      this.pingText.setColor(color);
    });

    // Ping periódico
    this.time.addEvent({
      delay: 3000,
      loop: true,
      callback: () => {
        if (gs.network) gs.network.ping();
      }
    });

    this.showStatus('📡 CONECTANDO...', 'Buscando servidor');
  }

  updateHealth(hp) {
    const pct = Math.max(0, hp) / 100;
    this.healthBar.setScale(pct, 1);
    this.healthText.setText(`${Math.max(0, hp)} HP`);

    if (hp > 60) {
      this.healthBar.setFillStyle(0x00e5ff);
    } else if (hp > 30) {
      this.healthBar.setFillStyle(0xffea00);
    } else {
      this.healthBar.setFillStyle(0xff3d3d);
    }
  }

  updatePlayerCount() {
    const count = Object.keys(this.gameScene.remotePlayers).length + 1;
    this.playersText.setText(`👥 Online: ${count}`);
  }

  showKillFeed() {
    const W = this.scale.width;
    const text = this.add.text(W - 10, 60, '🎯 ¡Eliminaste un jugador!', {
      fontSize: '12px',
      fontFamily: 'Courier New',
      color: '#ff3d3d',
      stroke: '#000000',
      strokeThickness: 2
    }).setScrollFactor(0).setDepth(15).setOrigin(1, 0);

    this.tweens.add({
      targets: text,
      alpha: 0,
      y: text.y - 30,
      duration: 2000,
      ease: 'Power2',
      onComplete: () => text.destroy()
    });
  }

  showStatus(title, sub = '') {
    this.statusOverlay.setVisible(true);
    this.statusText.setText(title).setVisible(true);
    this.statusSubText.setText(sub).setVisible(true);
  }

  hideStatus() {
    this.statusOverlay.setVisible(false);
    this.statusText.setVisible(false);
    this.statusSubText.setVisible(false);
  }
  }
