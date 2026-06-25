export class Shield {
  constructor(player, hud) {
    this.player = player;
    this.hud = hud;
    this.current = 0;
    this.max = 50;
    this.rechargeRate = 5;
    this.rechargeDelay = 6;
    this.rechargeTimer = 0;
    this.recharging = false;

    this.createUI();
  }

  createUI() {
    this.container = document.createElement('div');
    this.container.style.cssText = `
      position: fixed;
      bottom: 158px;
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
      color: #44aaff;
      font-family: 'Arial Black', sans-serif;
      font-size: 0.55rem;
      letter-spacing: 2px;
      text-shadow: 0 1px 3px #000;
    `;
    label.textContent = '🛡 ESCUDO';

    const barBg = document.createElement('div');
    barBg.style.cssText = `
      width: 130px;
      height: 5px;
      background: rgba(0,0,0,0.5);
      border-radius: 3px;
      overflow: hidden;
      border: 1px solid rgba(68,170,255,0.3);
    `;

    this.bar = document.createElement('div');
    this.bar.style.cssText = `
      height: 100%;
      width: 0%;
      background: linear-gradient(90deg, #0088ff, #44aaff);
      border-radius: 3px;
      transition: width 0.3s ease;
    `;

    this.valueText = document.createElement('div');
    this.valueText.style.cssText = `
      color: #44aaff;
      font-family: 'Arial Black', sans-serif;
      font-size: 0.6rem;
      text-shadow: 0 1px 3px #000;
    `;
    this.valueText.textContent = '0 / 50';

    barBg.appendChild(this.bar);
    this.container.appendChild(label);
    this.container.appendChild(barBg);
    this.container.appendChild(this.valueText);
    document.body.appendChild(this.container);
  }

  show() {
    this.container.style.display = 'flex';
  }

  pickup(amount) {
    this.current = Math.min(this.max, this.current + amount);
    this.updateUI();
    this.showPickupEffect();
  }

  takeDamage(amount) {
    if (this.current <= 0) return amount;

    const absorbed = Math.min(this.current, amount);
    this.current -= absorbed;
    this.rechargeTimer = this.rechargeDelay;
    this.recharging = false;
    this.updateUI();
    this.flashShield();
    return amount - absorbed;
  }

  update(dt) {
    if (this.current >= this.max) return;

    if (!this.recharging) {
      this.rechargeTimer -= dt;
      if (this.rechargeTimer <= 0) {
        this.recharging = true;
      }
    } else {
      this.current = Math.min(this.max, this.current + this.rechargeRate * dt);
      this.updateUI();
    }
  }

  updateUI() {
    const pct = (this.current / this.max) * 100;
    this.bar.style.width = pct + '%';
    this.valueText.textContent = `${Math.round(this.current)} / ${this.max}`;
  }

  flashShield() {
    this.bar.style.background = 'linear-gradient(90deg, #ffffff, #88ccff)';
    setTimeout(() => {
      this.bar.style.background = 'linear-gradient(90deg, #0088ff, #44aaff)';
    }, 150);
  }

  showPickupEffect() {
    const div = document.createElement('div');
    div.style.cssText = `
      position: fixed;
      top: 40%;
      left: 50%;
      transform: translateX(-50%);
      color: #44aaff;
      font-family: 'Arial Black', sans-serif;
      font-size: 0.85rem;
      letter-spacing: 2px;
      text-shadow: 0 0 10px #0088ff;
      pointer-events: none;
      z-index: 70;
      animation: shieldfade 1s ease forwards;
    `;
    div.textContent = `🛡 +${Math.round(Math.min(this.max - this.current + 10, 10))} ESCUDO`;
    document.body.appendChild(div);

    if (!document.getElementById('shield-style')) {
      const style = document.createElement('style');
      style.id = 'shield-style';
      style.textContent = `
        @keyframes shieldfade {
          0% { opacity:1; transform:translateX(-50%) translateY(0); }
          100% { opacity:0; transform:translateX(-50%) translateY(-30px); }
        }
      `;
      document.head.appendChild(style);
    }

    setTimeout(() => div.remove(), 1000);
  }

  getShieldValue() {
    return this.current;
  }
      }
