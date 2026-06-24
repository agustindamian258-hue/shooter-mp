import { World } from './World.js';
import { Player } from './Player.js';
import { Controls } from './Controls.js';
import { Network } from './Network.js';
import { HUD } from './HUD.js';

class Game {
  constructor() {
    this.canvas = document.getElementById('canvas');
    this.world = null;
    this.player = null;
    this.controls = null;
    this.network = null;
    this.hud = null;
    this.remotePlayers = {};
    this.running = false;
    this.clock = { last: 0, delta: 0 };

    this.init();
  }

  async init() {
    this.simulateLoading();

    this.world = new World(this.canvas);
    this.player = new Player(this.world);
    this.controls = new Controls(this.player, this.world.camera);
    this.hud = new HUD();
    this.network = new Network(this);

    this.world.setGame(this);
    this.player.setHUD(this.hud);

    setTimeout(() => {
      document.getElementById('loading').style.display = 'none';
      document.getElementById('menu').style.display = 'flex';
    }, 2000);
  }

  simulateLoading() {
    const bar = document.getElementById('loading-bar');
    let p = 0;
    const iv = setInterval(() => {
      p += Math.random() * 15;
      if (p >= 100) { p = 100; clearInterval(iv); }
      bar.style.width = p + '%';
    }, 150);
  }

  startGame() {
    const input = document.getElementById('name-input');
    this.playerName = input.value.trim() || 'Player_' + Math.floor(Math.random() * 9999);

    document.getElementById('menu').style.display = 'none';
    document.getElementById('hud').style.display = 'block';
    document.getElementById('controls').style.pointerEvents = 'all';

    this.network.connect(this.playerName);
    this.running = true;
    this.loop(0);
  }

  loop(timestamp) {
    if (!this.running) return;
    requestAnimationFrame((t) => this.loop(t));

    this.clock.delta = Math.min((timestamp - this.clock.last) / 1000, 0.05);
    this.clock.last = timestamp;
    const dt = this.clock.delta;

    this.controls.update(dt);
    this.player.update(dt);
    this.updateRemotePlayers(dt);
    this.world.render();

    if (this.network.connected) {
      this.network.sendState();
    }
  }

  addRemotePlayer(id, data) {
    if (this.remotePlayers[id]) return;
    const mesh = this.world.createPlayerMesh(false);
    mesh.position.set(data.x, data.y, data.z);
    this.remotePlayers[id] = {
      mesh,
      name: data.name || 'Player',
      health: data.health || 100,
      targetPos: { x: data.x, y: data.y, z: data.z },
      targetRot: data.rotY || 0
    };
  }

  updateRemotePlayer(id, data) {
    const rp = this.remotePlayers[id];
    if (!rp) return;
    rp.targetPos = { x: data.x, y: data.y, z: data.z };
    rp.targetRot = data.rotY;
    rp.health = data.health;
  }

  removeRemotePlayer(id) {
    const rp = this.remotePlayers[id];
    if (!rp) return;
    this.world.scene.remove(rp.mesh);
    delete this.remotePlayers[id];
  }

  updateRemotePlayers(dt) {
    const lerp = 1 - Math.pow(0.01, dt);
    Object.values(this.remotePlayers).forEach(rp => {
      rp.mesh.position.x += (rp.targetPos.x - rp.mesh.position.x) * lerp;
      rp.mesh.position.y += (rp.targetPos.y - rp.mesh.position.y) * lerp;
      rp.mesh.position.z += (rp.targetPos.z - rp.mesh.position.z) * lerp;
      rp.mesh.rotation.y += (rp.targetRot - rp.mesh.rotation.y) * lerp;
    });
  }

  spawnBulletTrail(from, to) {
    this.world.spawnBulletTrail(from, to);
  }

  showDeathScreen() {
    document.getElementById('death-screen').style.display = 'flex';
    setTimeout(() => {
      document.getElementById('death-screen').style.display = 'none';
      this.player.respawn();
    }, 3000);
  }
}

window.addEventListener('load', () => {
  window.game = new Game();
});
