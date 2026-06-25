export class Sprint {
  constructor(player, sounds) {
    this.player = player;
    this.sounds = sounds;
    this.isSprinting = false;
    this.normalSpeed = 8;
    this.sprintSpeed = 14;
    this.stamina = 100;
    this.maxStamina = 100;
    this.drainRate = 25;
    this.rechargeRate = 15;
    this.rechargeDelay = 1.5;
    this.rechargeTimer = 0;
    this.canSprint = true;

    this.createUI();
    this.setupButton();
  }

  createUI() {
    this.container = document.createElement('div');
    this.container.style.cssText = `
      position: fixed;
      bottom: 175px;
      left: 50%;
      transform: translateX(-50%);
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 2px;
      pointer-events: none;
      z-index: 55;
      display: none;
    `;

    const label = document.createElement('div');
    label.style.cssText = `
      color: #ffcc00;
      font-family: 'Arial Black', sans-serif;
      font-size: 0.5rem;
      letter-spacing: 2px;
      text-shadow: 0 1px 3px #000;
    `;
    label.textContent = '⚡ STAMINA';

    const barBg = document.createElement('div');
    barBg.style.cssText = `
      width: 100px;
      height: 4px;
      background: rgba(0,0,0,0.5);
      border-radius: 2px;
      overflow: hidden;
      border: 1px solid rgba(255,204,0,0.3);
    `;

    this.bar = document.createElement('div');
    this.bar.style.cssText = `
      height: 100%;
      width: 100%;
      background: linear-gradient(90deg, #ffaa00, #ffee00);
      border-radius: 2px;
      transition: width 0.1s ease, background 0.3s ease;
    `;

    barBg.appendChild(this.bar);
    this.container.appendChild(label);
    this.container.appendChild(barBg);
    document.body.appendChild(this.container);
  }

  setupButton() {
    this.btn = document.createElement('div');
    this.btn.style.cssText = `
      position: fixed;
      bottom: 130px;
      left: 155px;
      width: 48px;
      height: 48px;
      border-radius: 50%;
      background: rgba(255,200,0,0.6);
      border: 2px solid rgba(255,220,50,0.8);
      display: none;
      align-items: center;
      justify-content: center;
      z-index: 60;
      pointer-events: all;
      box-shadow: 0 0 10px rgba(255,200,0,0.3);
    `;
    this.btn.innerHTML = '<span style="color:#fff;font-family:Arial Black,sans-serif;font-size:0.55rem;letter-spacing:1px">⚡</span>';

    this.btn.addEventListener('touchstart', (e) => {
      e.preventDefault();
      this.startSprint();
    }, { passive: false });

    this.btn.addEventListener('touchend', (e) => {
      e.preventDefault();
      this.stopSprint();
    }, { passive: false });

    document.body.appendChild(this.btn);
  }

  show() {
    this.container.style.display = 'flex';
    this.btn.style.display = 'flex';
  }

  startSprint() {
    if (!this.canSprint || this.stamina <= 0) return;
    this.isSprinting = true;
    this.player.speed = this.sprintSpeed;
    this.rechargeTimer = 0;

    // Efecto visual de velocidad
    this.btn.style.background = 'rgba(255,220,0,0.9)';
    this.btn.style.boxShadow = '0 0 20px rgba(255,200,0,0.7)';
  }

  stopSprint() {
    this.isSprinting = false;
    this.player.speed = this.normalSpeed;
    this.rechargeTimer = this.rechargeDelay;

    this.btn.style.background = 'rgba(255,200,0,0.6)';
    this.btn.style.boxShadow = '0 0 10px rgba(255,200,0,0.3)';
  }

  update(dt) {
    if (this.isSprinting) {
      this.stamina = Math.max(0, this.stamina - this.drainRate * dt);

      if (this.stamina <= 0) {
        this.stopSprint();
        this.canSprint = false;
        this.rechargeTimer = this.rechargeDelay * 2;
      }
    } else {
      if (this.rechargeTimer > 0) {
        this.rechargeTimer -= dt;
      } else {
        this.stamina = Math.min(this.maxStamina, this.stamina + this.rechargeRate * dt);
        if (this.stamina >= 20 && !this.canSprint) {
          this.canSprint = true;
        }
      }
    }

    this.updateUI();
  }

  updateUI() {
    const pct = (this.stamina / this.maxStamina) * 100;
    this.bar.style.width = pct + '%';

    if (this.stamina < 25) {
      this.bar.style.background = 'linear-gradient(90deg, #ff4400, #ff8800)';
      this.btn.style.opacity = '0.5';
    } else if (this.isSprinting) {
      this.bar.style.background = 'linear-gradient(90deg, #ffee00, #ffffff)';
      this.btn.style.opacity = '1';
    } else {
      this.bar.style.background = 'linear-gradient(90deg, #ffaa00, #ffee00)';
      this.btn.style.opacity = this.canSprint ? '1' : '0.6';
    }
  }

  destroy() {
    this.container.remove();
    this.btn.remove();
  }
      }
