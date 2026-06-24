import { Player } from '../entities/Player.js';
import { Bullet } from '../entities/Bullet.js';
import { NetworkManager } from '../network/NetworkManager.js';

export class GameScene extends Phaser.Scene {
  constructor() {
    super({ key: 'GameScene' });
    this.player = null;
    this.remotePlayers = {};
    this.bullets = null;
    this.remoteBullets = null;
    this.network = null;
    this.map = null;
    this.walls = null;
  }

  create() {
    this.createMap();

    this.bullets = this.physics.add.group({
      classType: Bullet,
      maxSize: 50,
      runChildUpdate: true
    });

    this.remoteBullets = this.physics.add.group({
      classType: Bullet,
      maxSize: 100,
      runChildUpdate: true
    });

    this.player = new Player(this, 400, 300, this.bullets);

    // Colisión jugador con paredes
    this.physics.add.collider(this.player.sprite, this.walls);

    // Colisión balas con paredes
    this.physics.add.collider(this.bullets, this.walls, (bullet) => {
      bullet.deactivate();
    });
    this.physics.add.collider(this.remoteBullets, this.walls, (bullet) => {
      bullet.deactivate();
    });

    this.network = new NetworkManager(this);
    this.network.connect();

    // Cámara sigue al jugador
    this.cameras.main.startFollow(this.player.sprite, true, 0.1, 0.1);
    this.cameras.main.setZoom(1.5);

    // Pasar referencia de escena a UIScene
    this.scene.launch('UIScene', { gameScene: this });
  }

  createMap() {
    const mapWidth = 50;
    const mapHeight = 50;
    const tileSize = 32;

    this.walls = this.physics.add.staticGroup();

    for (let row = 0; row < mapHeight; row++) {
      for (let col = 0; col < mapWidth; col++) {
        const x = col * tileSize;
        const y = row * tileSize;
        const isBorder = row === 0 || row === mapHeight - 1 ||
                         col === 0 || col === mapWidth - 1;

        if (isBorder) {
          const wall = this.walls.create(x + 16, y + 16, 'wall');
          wall.setImmovable(true);
          wall.refreshBody();
        } else {
          this.add.image(x + 16, y + 16, 'tile');
        }
      }
    }

    // Obstáculos internos aleatorios con semilla fija
    const obstacles = [
      [5,5],[5,6],[6,5],[10,10],[10,11],[11,10],
      [20,8],[20,9],[21,8],[15,20],[16,20],[15,21],
      [30,15],[31,15],[30,16],[25,30],[25,31],[26,30],
      [40,5],[40,6],[8,35],[9,35],[35,35],[36,35]
    ];

    obstacles.forEach(([col, row]) => {
      const wall = this.walls.create(
        col * tileSize + 16,
        row * tileSize + 16,
        'wall'
      );
      wall.setImmovable(true);
      wall.refreshBody();
    });

    // Límites del mundo
    this.physics.world.setBounds(0, 0, mapWidth * tileSize, mapHeight * tileSize);
    this.cameras.main.setBounds(0, 0, mapWidth * tileSize, mapHeight * tileSize);
  }

  addRemotePlayer(id, x, y) {
    if (this.remotePlayers[id]) return;
    const sprite = this.physics.add.sprite(x, y, 'enemy');
    sprite.setDepth(1);
    this.physics.add.collider(sprite, this.walls);
    this.physics.add.overlap(this.bullets, sprite, (bullet) => {
      bullet.deactivate();
      this.network.sendHit(id);
    });
    this.remotePlayers[id] = { sprite, health: 100 };
  }

  updateRemotePlayer(id, x, y, angle) {
    if (!this.remotePlayers[id]) return;
    const p = this.remotePlayers[id];
    p.sprite.setPosition(x, y);
    p.sprite.setAngle(angle);
  }

  removeRemotePlayer(id) {
    if (!this.remotePlayers[id]) return;
    this.remotePlayers[id].sprite.destroy();
    delete this.remotePlayers[id];
  }

  spawnRemoteBullet(x, y, angle, speed) {
    const bullet = this.remoteBullets.get(x, y, 'bullet');
    if (bullet) bullet.fireFromAngle(x, y, angle, speed);
  }

  update(time, delta) {
    if (this.player) this.player.update(time, delta);

    if (this.network && this.network.connected) {
      this.network.sendState(
        this.player.sprite.x,
        this.player.sprite.y,
        this.player.sprite.angle
      );
    }
  }
      }
