export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BootScene' });
  }

  preload() {
    const bar = document.getElementById('loading-bar');

    this.load.on('progress', (value) => {
      if (bar) bar.style.width = (value * 100) + '%';
    });

    this.load.on('complete', () => {
      const screen = document.getElementById('loading-screen');
      if (screen) screen.classList.add('hidden');
    });

    // Generamos los assets con código para no depender de imágenes externas
    this.createPlaceholderAssets();
  }

  createPlaceholderAssets() {
    // Jugador — círculo azul 32x32
    const playerGfx = this.make.graphics({ x: 0, y: 0, add: false });
    playerGfx.fillStyle(0x00e5ff, 1);
    playerGfx.fillCircle(16, 16, 14);
    playerGfx.fillStyle(0xffffff, 1);
    playerGfx.fillCircle(22, 12, 4);
    playerGfx.generateTexture('player', 32, 32);
    playerGfx.destroy();

    // Enemigo — círculo rojo 32x32
    const enemyGfx = this.make.graphics({ x: 0, y: 0, add: false });
    enemyGfx.fillStyle(0xff3d3d, 1);
    enemyGfx.fillCircle(16, 16, 14);
    enemyGfx.fillStyle(0xffffff, 1);
    enemyGfx.fillCircle(22, 12, 4);
    enemyGfx.generateTexture('enemy', 32, 32);
    enemyGfx.destroy();

    // Bala — rectángulo amarillo 8x4
    const bulletGfx = this.make.graphics({ x: 0, y: 0, add: false });
    bulletGfx.fillStyle(0xffea00, 1);
    bulletGfx.fillRect(0, 0, 8, 4);
    bulletGfx.generateTexture('bullet', 8, 4);
    bulletGfx.destroy();

    // Mapa — tile de piso 32x32
    const tileGfx = this.make.graphics({ x: 0, y: 0, add: false });
    tileGfx.fillStyle(0x1a1a2e, 1);
    tileGfx.fillRect(0, 0, 32, 32);
    tileGfx.lineStyle(1, 0x2a2a4e, 1);
    tileGfx.strokeRect(0, 0, 32, 32);
    tileGfx.generateTexture('tile', 32, 32);
    tileGfx.destroy();

    // Pared — tile oscuro 32x32
    const wallGfx = this.make.graphics({ x: 0, y: 0, add: false });
    wallGfx.fillStyle(0x3a3a5e, 1);
    wallGfx.fillRect(0, 0, 32, 32);
    wallGfx.lineStyle(2, 0x5a5a8e, 1);
    wallGfx.strokeRect(0, 0, 32, 32);
    wallGfx.generateTexture('wall', 32, 32);
    wallGfx.destroy();
  }

  create() {
    this.scene.start('GameScene');
  }
      }
