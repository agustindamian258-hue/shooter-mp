import { World } from './World.js';
import { Player } from './Player.js';
import { Controls } from './Controls.js';
import { Network } from './Network.js';
import { HUD } from './HUD.js';
import { Minimap } from './Minimap.js';
import { Zone } from './Zone.js';
import { WeaponSystem } from './Weapons.js';
import { SoundSystem } from './Sounds.js';
import { ParticleSystem } from './Particles.js';

class Game {
  constructor() {
    this.canvas = document.getElementById('canvas');
    this.world = null;
    this.player = null;
    this.controls = null;
    this.network = null;
    this.hud = null;
    this.minimap = null;
    this.zone = null;
    this.weapons = null;
    this.sounds = null;
    this.particles = null;
    this.remotePlayers = {};
    this.running = false;
    this.clock = { last: 0, delta: 0 };
    this.footstepTimer = 0;
    this.footstepInterval = 0.4;

    this.init();
  }

  async init() {
    this.simulateLoading();

    this.sounds = new SoundSystem();

    this.world = new World(this.canvas);
    this.player = new Player(this.world);
    this.hud = new HUD();
    this.player.setHUD(this.hud);

    this.weapons = new WeaponSystem(this.player, this.world.scene, this.world.camera);
    this.player.weapons = this.weapons;

    this.particles = new ParticleSystem(this.world.scene);
    this.world.particles = this.particles;

    this.controls = new Controls(this.player, this.world.camera, this.weapons, this.sounds);
    this.minimap = new Minimap(this);
    this.network = new Network(this);

    this.world.setGame(this);
    this.sounds.buildSounds();

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

    this.zone = new Zone(this.world, this.hud);
    this.minimap.show();
    this.network.connect(this.playerName);
    this.sounds.resume();
    this.sounds.playWindLoop();

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
    this.weapons.update(dt, this);
    this.particles.update(dt);

    if (this.zone) this.zone.update(dt, this.player);
    this.minimap.update();

    this.updateRemotePlayers(dt);
    this.updateFootsteps(dt);
    this.world.render();

    if (this.network.connected) {
      this.network.sendState();
    }
  }

  updateFootsteps(dt) {
    const moving = this.controls.joystick.active &&
      (Math.abs(this.controls.joystick.dx) > 5 ||
       Math.abs(this.controls.joystick.dy) > 5);

    if (moving && this.player.onGround) {
      this.footstepTimer -= dt;
      if (this.footstepTimer <= 0) {
        this.sounds.playFootstep();
        this.footstepTimer = this.footstepInterval;
        this.particles.spawnDust(this.player.camera.position.clone());
      }
    } else {
      this.footstepTimer = 0;
    }
  }

  addRemotePlayer(id, data) {
    if (this.remotePlayers[id]) return;
    const mesh = this.world.createPlayerMesh(false);
    mesh.position.set(data.x, data.y || 1.7, data.z || 0);
    this.remotePlayers[id] = {
      mesh,
      name: data.name || 'Player',
      health: data.health || 100,
      targetPos: { x: data.x, y: data.y || 1.7, z: data.z || 0 },
      targetRot: data.rotY || 0
    };
    if (this.hud) {
      this.hud.updatePlayers(Object.keys(this.remotePlayers).length + 1);
    }
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
    if (this.hud) {
      this.hud.updatePlayers(Object.keys(this.remotePlayers).length + 1);
    }
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
    this.particles.spawnImpact(to);
  }

  onEnemyHit(position) {
    this.particles.spawnBlood(position);
    this.sounds.playHitConfirm();
    if (this.hud) this.hud.showHitMarker();
  }

  onEnemyKilled(id, name) {
    const rp = this.remotePlayers[id];
    if (rp) {
      this.particles.spawnExplosion(rp.mesh.position.clone());
    }
    this.removeRemotePlayer(id);
    this.sounds.playKill();
    if (this.hud) {
      this.player.kills = (this.player.kills || 0) + 1;
      this.hud.updateKills(this.player.kills);
      this.hud.addKillFeed(this.playerName, name || id.slice(0, 6));
    }
  }

  showDeathScreen() {
    this.sounds.playDeath();
    document.getElementById('death-screen').style.display = 'flex';
    setTimeout(() => {
      document.getElementById('death-screen').style.display = 'none';
      this.player.respawn();
      this.weapons.currentWeapon.ammo = this.weapons.currentWeapon.maxAmmo;
      if (this.hud) {
        this.hud.updateHealth(100);
        this.hud.updateAmmo(
          this.weapons.currentWeapon.ammo,
          this.weapons.currentWeapon.reserve
        );
      }
    }, 3000);
  }
}

window.addEventListener('load', () => {
  window.game = new Game();
});
