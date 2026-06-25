export class Controls {
  constructor(player, camera, weapons, sounds, sprint, crouch, grenades) {
    this.player = player;
    this.camera = camera;
    this.weapons = weapons;
    this.sounds = sounds;
    this.sprint = sprint;
    this.crouch = crouch;
    this.grenades = grenades;

    this.joystick = {
      active: false,
      pointerId: null,
      startX: 0,
      startY: 0,
      dx: 0,
      dy: 0
    };

    this.look = {
      active: false,
      pointerId: null,
      lastX: 0,
      lastY: 0
    };

    this.setupJoystick();
    this.setupLookZone();
    this.setupButtons();
  }

  setupJoystick() {
    const zone = document.getElementById('joystick-zone');
    const knob = document.getElementById('joystick-knob');
    const maxDist = 40;

    zone.addEventListener('touchstart', (e) => {
      e.preventDefault();
      const t = e.changedTouches[0];
      this.joystick.active = true;
      this.joystick.pointerId = t.identifier;
      this.joystick.startX = t.clientX;
      this.joystick.startY = t.clientY;
      this.joystick.dx = 0;
      this.joystick.dy = 0;
    }, { passive: false });

    zone.addEventListener('touchmove', (e) => {
      e.preventDefault();
      for (const t of e.changedTouches) {
        if (t.identifier !== this.joystick.pointerId) continue;
        let dx = t.clientX - this.joystick.startX;
        let dy = t.clientY - this.joystick.startY;
        const dist = Math.sqrt(dx*dx + dy*dy);
        if (dist > maxDist) {
          dx = (dx / dist) * maxDist;
          dy = (dy / dist) * maxDist;
        }
        this.joystick.dx = dx;
        this.joystick.dy = dy;
        knob.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;
      }
    }, { passive: false });

    zone.addEventListener('touchend', (e) => {
      e.preventDefault();
      for (const t of e.changedTouches) {
        if (t.identifier !== this.joystick.pointerId) continue;
        this.joystick.active = false;
        this.joystick.dx = 0;
        this.joystick.dy = 0;
        knob.style.transform = 'translate(-50%, -50%)';
        if (this.sprint) this.sprint.stopSprint();
      }
    }, { passive: false });

    // Doble tap en joystick = sprint
    let lastJoyTap = 0;
    zone.addEventListener('touchstart', (e) => {
      const now = Date.now();
      if (now - lastJoyTap < 300) {
        if (this.sprint) this.sprint.startSprint();
      }
      lastJoyTap = now;
    }, { passive: false });
  }

  setupLookZone() {
    const zone = document.getElementById('look-zone');

    zone.addEventListener('touchstart', (e) => {
      e.preventDefault();
      for (const t of e.changedTouches) {
        if (this.look.active) continue;
        this.look.active = true;
        this.look.pointerId = t.identifier;
        this.look.lastX = t.clientX;
        this.look.lastY = t.clientY;
      }
    }, { passive: false });

    zone.addEventListener('touchmove', (e) => {
      e.preventDefault();
      for (const t of e.changedTouches) {
        if (t.identifier !== this.look.pointerId) continue;
        const dx = t.clientX - this.look.lastX;
        const dy = t.clientY - this.look.lastY;
        this.look.lastX = t.clientX;
        this.look.lastY = t.clientY;
        this.player.look(dx, dy);
      }
    }, { passive: false });

    zone.addEventListener('touchend', (e) => {
      e.preventDefault();
      for (const t of e.changedTouches) {
        if (t.identifier !== this.look.pointerId) continue;
        this.look.active = false;
      }
    }, { passive: false });

    // Doble tap zona derecha = cambiar arma
    let lastTap = 0;
    zone.addEventListener('touchstart', (e) => {
      const now = Date.now();
      if (now - lastTap < 300) {
        if (this.weapons) {
          this.weapons.switchWeapon();
          if (this.player.world.game && this.player.world.game.hud) {
            const g = this.player.world.game;
            g.hud.showWeaponSwitch(
              this.weapons.inventory,
              this.weapons.currentIndex,
              this.weapons.weapons
            );
          }
        }
      }
      lastTap = now;
    }, { passive: false });
  }

  setupButtons() {
    const fireBtn = document.getElementById('fire-btn');
    fireBtn.addEventListener('touchstart', (e) => {
      e.preventDefault();
      if (this.weapons) this.weapons.startFire();
      if (this.sounds) this.sounds.resume();
    }, { passive: false });
    fireBtn.addEventListener('touchend', (e) => {
      e.preventDefault();
      if (this.weapons) this.weapons.stopFire();
    }, { passive: false });

    const jumpBtn = document.getElementById('jump-btn');
    jumpBtn.addEventListener('touchstart', (e) => {
      e.preventDefault();
      this.player.jump();
      if (this.sounds) this.sounds.playJump();
    }, { passive: false });

    const reloadBtn = document.getElementById('reload-btn');
    reloadBtn.addEventListener('touchstart', (e) => {
      e.preventDefault();
      if (this.weapons) this.weapons.startReload();
      if (this.sounds) this.sounds.playReload();
    }, { passive: false });
  }

  update(dt) {
    if (!this.joystick.active) return;
    const maxDist = 40;
    const fx = this.joystick.dx / maxDist;
    const fy = this.joystick.dy / maxDist;
    const speed = this.player.speed;
    this.player.move(-fy * speed * dt, fx * speed * dt);
  }
              }
