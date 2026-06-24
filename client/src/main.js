import { BootScene } from './scenes/BootScene.js';
import { GameScene } from './scenes/GameScene.js';
import { UIScene } from './scenes/UIScene.js';

const config = {
  type: Phaser.AUTO,
  width: window.innerWidth,
  height: window.innerHeight,
  backgroundColor: '#0a0a1a',
  parent: 'game-container',
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { y: 0 },
      debug: false
    }
  },
  scene: [BootScene, GameScene, UIScene],
  scale: {
    mode: Phaser.Scale.RESIZE,
    autoCenter: Phaser.Scale.CENTER_BOTH
  },
  render: {
    antialias: false,
    pixelArt: true,
    roundPixels: true
  }
};

const game = new Phaser.Game(config);

// Ocultar loading screen cuando Phaser esté listo
game.events.on('ready', () => {
  const screen = document.getElementById('loading-screen');
  if (screen) screen.classList.add('hidden');
});

// Ajustar tamaño si el usuario rota el celular
window.addEventListener('resize', () => {
  game.scale.resize(window.innerWidth, window.innerHeight);
});
