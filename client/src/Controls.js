export class Controls {
  constructor(player, camera) {
    this.player = player;
    this.camera = camera;

    // Joystick movimiento
    this.joystick = {
      active: false,
      pointerId: null,
      startX: 0,
      startY: 0,
      dx: 0,
      dy: 0
    };

    // Look (girar cámara)
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
      }
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
  }

  setupButtons() {
    // Botón FIRE
    const fireBtn = document.getElementById('fire-btn');
    fireBtn.addEventListener('touchstart', (e) => {
      e.preventDefault();
      this.player.startFire();
    }, { passive: false });
    fireBtn.addEventListener('touchend', (e) => {
      e.preventDefault();
      this.player.stopFire();
    }, { passive: false });

    // Botón JUMP
    const jumpBtn = document.getElementById('jump-btn');
    jumpBtn.addEventListener('touchstart', (e) => {
      e.preventDefault();
      this.player.jump();
    }, { passive: false });

    // Botón RELOAD
    const reloadBtn = document.getElementById('reload-btn');
    reloadBtn.addEventListener('touchstart', (e) => {
      e.preventDefault();
      this.player.startReload();
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
