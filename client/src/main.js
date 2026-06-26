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
import { NameTags } from './NameTags.js';
import { Scoreboard } from './Scoreboard.js';
import { Shield } from './Shield.js';
import { LootSystem } from './Loot.js';
import { ProximityChat } from './ProximityChat.js';
import { Sprint } from './Sprint.js';
import { Crouch } from './Crouch.js';
import { GrenadeSystem } from './Grenade.js';
import { Weather } from './Weather.js';
import { LevelSystem } from './LevelSystem.js';
import { Achievements } from './Achievements.js';

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
    this.nameTags = null;
    this.scoreboard = null;
    this.shield = null;
    this.loot = null;
    this.chat = null;
    this.sprint = null;
    this.crouch = null;
    this.grenades = null;
    this.weather = null;
    this.levelSystem = null;
    this.achievements = null;
    this.remotePlayers = {};
    this.running = false;
    this.clock = { last: 0, delta: 0 };
    this.footstepTimer = 0;
    this.footstepInterval = 0.4;
    this.playerName = 'Player';
    this.weatherPhaseTimer = 0;
    this.lastDayPhase = '';

    // Stats para achievements
    this.stats = {
      kills: 0,
      surviveTime: 0,
      health: 100,
      itemsPickedUp: 0,
      grenadeKills: 0,
      zoneTime: 0,
      sniperKills: 0,
      shotgunKills: 0,
      sprintDistance: 0,
      nightKills: 0,
      stormsWeathered: 0,
      level: 1
    };

    this.init();
  }

  async init() {
    this.simulateLoading();

    this.sounds = new SoundSystem();
    this.world = new World(this.canvas);
    this.player = new Player(this.world);
    this.hud = new HUD();
    this.player.setHUD(this.hud);

    this.weapons = new WeaponSystem(
      this.player, this.world.scene, this.world.camera
    );
    this.player.weapons = this.weapons;

    this.particles = new ParticleSystem(this.world.scene);
    this.world.particles = this.particles;

    this.shield = new Shield(this.player, this.hud);
    this.sprint = new Sprint(this.player, this.sounds);
    this.crouch = new Crouch(this.player, this.sounds);
    this.grenades = new GrenadeSystem(this.world, this);
    this.weather = new Weather(this.world, this.sounds);
    this.levelSystem = new LevelSystem(this.hud);
    this.achievements = new Achievements(this.levelSystem);

    this.controls = new Controls(
      this.player,
      this.world.camera,
      this.weapons,
      this.sounds,
      this.sprint,
      this.crouch,
      this.grenades
    );

    this.minimap = new Minimap(this);
    this.nameTags = new NameTags(this);
    this.scoreboard = new Scoreboard(this);
    this.chat = new ProximityChat(this);
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
    this.playerName = input.value.trim() ||
      'Player_' + Math.floor(Math.random() * 9999);

    document.getElementById('menu').style.display = 'none';
    document.getElementById('hud').style.display = 'block';
    document.getElementById('controls').style.pointerEvents = 'all';

    this.zone = new Zone(this.world, this.hud);
    this.loot = new LootSystem(this.world, this);
    this.minimap.show();
    this.shield.show();
    this.sprint.show();
    this.crouch.show();
    this.grenades.show();
    this.chat.show();
    this.scoreboard.show();
    this.levelSystem.show();
    this.achievements.show();

    this.network.connect(this.playerName);
    this.sounds.resume();
    this.sounds.playWindLoop();

    this.scoreboard.updatePlayer('local', this.playerName, 0, 0, 100);

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
    this.shield.update(dt);
    this.sprint.update(dt);
    this.crouch.update(dt);
    this.grenades.update(dt);
    if (this.loot) this.loot.update(dt);

    if (this.zone) this.zone.update(dt, this.player);
    this.minimap.update();
    this.nameTags.update();

    this.updateWeatherByDayPhase(dt);
    this.weather.update(dt, this.player.camera.position);

    this.updateRemotePlayers(dt);
    this.updateFootsteps(dt);
    this.updateStats(dt);
    this.world.render();

    if (this.network.connected) this.network.sendState();

    this.scoreboard.updatePlayer(
      'local', this.playerName,
      this.stats.kills, 0, this.player.health
    );
  }

  updateStats(dt) {
    if (!this.player.alive) return;

    // Tiempo de supervivencia
    this.stats.surviveTime += dt;
    this.stats.health = this.player.health;
    this.stats.level = this.levelSystem.getLevel();

    // XP por supervivencia
    this.levelSystem.onSurvive(dt);

    // Tiempo en zona
    if (this.zone && !this.zone.isOutside(
      this.player.camera.position.x,
      this.player.camera.position.z
    )) {
      this.stats.zoneTime += dt;
      if (this.stats.zoneTime % 30 < dt) {
        this.levelSystem.onZoneTime();
      }
    }

    // Sprint distance
    if (this.sprint && this.sprint.isSprinting) {
      this.stats.sprintDistance += this.player.speed * dt;
    }

    // Storm achievement
    if (this.weather && this.weather.current === 'storm') {
      this.stats._stormTimer = (this.stats._stormTimer || 0) + dt;
      if (this.stats._stormTimer >= 60) {
        this.stats.stormsWeathered++;
        this.stats._stormTimer = 0;
      }
    }

    // Chequear achievements
    this.achievements.check(this.stats);
  }

  updateWeatherByDayPhase(dt) {
    const phase = this.world.dayPhase;
    if (phase === this.lastDayPhase) {
      this.weatherPhaseTimer -= dt;
      if (this.weatherPhaseTimer > 0) return;
    }

    this.lastDayPhase = phase;
    this.weatherPhaseTimer = 30 + Math.random() * 60;

    switch (phase) {
      case 'dawn':
        this.weather.setWeather(Math.random() < 0.6 ? 'fog' : 'rain');
        break;
      case 'day':
        this.weather.setWeather(
          Math.random() < 0.7 ? 'clear' :
          Math.random() < 0.5 ? 'rain' : 'fog'
        );
        break;
      case 'dusk':
        this.weather.setWeather(
          Math.random() < 0.4 ? 'clear' :
          Math.random() < 0.5 ? 'rain' : 'storm'
        );
        break;
      case 'night':
        this.weather.setWeather(
          Math.random() < 0.4 ? 'fog' :
          Math.random() < 0.5 ? 'storm' : 'rain'
        );
        break;
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
        this.footstepTimer = this.sprint.isSprinting ?
          this.footstepInterval * 0.6 : this.footstepInterval;
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
    this.nameTags.addTag(id, data.name || 'Player');
    this.scoreboard.updatePlayer(id, data.name || 'Player', 0, 0, 100);
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
    rp.name = data.name || rp.name;
    this.nameTags.updateTag(id, data.health);
    this.scoreboard.updatePlayer(id, rp.name, 0, 0, data.health);
  }

  removeRemotePlayer(id) {
    const rp = this.remotePlayers[id];
    if (!rp) return;
    this.world.scene.remove(rp.mesh);
    delete this.remotePlayers[id];
    this.nameTags.removeTag(id);
    this.scoreboard.removePlayer(id);
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
    if (rp) this.particles.spawnExplosion(rp.mesh.position.clone());
    this.removeRemotePlayer(id);
    this.sounds.playKill();

    this.stats.kills++;
    this.player.kills = this.stats.kills;

    // Detectar arma usada
    const weaponKey = this.weapons.currentWeaponKey;
    if (weaponKey === 'sniper') this.stats.sniperKills++;
    if (weaponKey === 'shotgun') this.stats.shotgunKills++;

    // Kill nocturna
    if (this.world.dayPhase === 'night') this.stats.nightKills++;

    this.levelSystem.onKill();
    this.achievements.check(this.stats);

    if (this.hud) {
      this.hud.updateKills(this.stats.kills);
      this.hud.addKillFeed(this.playerName, name || id.slice(0, 6));
    }
  }

  onItemPickup() {
    this.stats.itemsPickedUp++;
    this.levelSystem.onPickup();
    this.achievements.check(this.stats);
  }

  onGrenadeKill() {
    this.stats.grenadeKills++;
    this.achievements.check(this.stats);
  }

  showDeathScreen() {
    this.sounds.playDeath();
    this.player.alive = false;
    document.getElementById('death-screen').style.display = 'flex';
    setTimeout(() => {
      document.getElementById('death-screen').style.display = 'none';
      this.player.respawn();
      this.shield.current = 0;
      this.shield.updateUI();
      if (this.weapons) {
        this.weapons.currentWeapon.ammo = this.weapons.currentWeapon.maxAmmo;
        if (this.hud) {
          this.hud.updateHealth(100);
          this.hud.updateAmmo(
            this.weapons.currentWeapon.ammo,
            this.weapons.currentWeapon.reserve
          );
        }
      }
    }, 3000);
  }
}

window.addEventListener('load', () => {
  window.game = new Game();
});
