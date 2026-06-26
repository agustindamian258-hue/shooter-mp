export class LevelSystem {
  constructor(hud) {
    this.hud = hud;
    this.xp = 0;
    this.level = 1;
    this.kills = 0;
    this.surviveTime = 0;
    this.xpToNextLevel = 100;
    this.xpMultiplier = 1.5;

    this.xpRewards = {
      kill: 50,
      assist: 20,
      survive30s: 10,
      pickupWeapon: 5,
      zoneTime: 2,
      headshot: 25
    };

    this.createUI();
  }

  createUI() {
    // Barra de XP
    this.container = document.createElement('div');
    this.container.style.cssText = `
      position: fixed;
      bottom: 148px;
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

    const topRow = document.createElement('div');
    topRow.style.cssText = `
      display: flex;
      align-items: center;
      gap: 6px;
    `;

    this.levelBadge = document.createElement('div');
    this.levelBadge.style.cssText = `
      background: linear-gradient(135deg, #ff6b00, #ffcc00);
      color: #000;
      font-family: 'Arial Black', sans-serif;
      font-size: 0.55rem;
      letter-spacing: 1px;
      padding: 2px 6px;
      border-radius: 4px;
      min-width: 32px;
      text-align: center;
    `;
    this.levelBadge.textContent = 'LV 1';

    const xpBarBg = document.createElement('div');
    xpBarBg.style.cssText = `
      width: 100px;
      height: 4px;
      background: rgba(0,0,0,0.5);
      border-radius: 2px;
      overflow: hidden;
      border: 1px solid rgba(255,204,0,0.3);
    `;

    this.xpBar = document.createElement('div');
    this.xpBar.style.cssText = `
      height: 100%;
      width: 0%;
      background: linear-gradient(90deg, #ff6b00, #ffcc00);
      border-radius: 2px;
      transition: width 0.4s ease;
    `;
    xpBarBg.appendChild(this.xpBar);

    this.xpText = document.createElement('div');
    this.xpText.style.cssText = `
      color: #ffcc00;
      font-family: Arial, sans-serif;
      font-size: 0.5rem;
      text-shadow: 0 1px 3px #000;
    `;
    this.xpText.textContent = '0 XP';

    topRow.appendChild(this.levelBadge);
    topRow.appendChild(xpBarBg);
    topRow.appendChild(this.xpText);
    this.container.appendChild(topRow);
    document.body.appendChild(this.container);

    // Notificación de level up
    this.levelUpNotif = document.createElement('div');
    this.levelUpNotif.style.cssText = `
      position: fixed;
      top: 25%;
      left: 50%;
      transform: translateX(-50%);
      background: linear-gradient(135deg, rgba(255,107,0,0.95), rgba(255,200,0,0.95));
      color: #000;
      font-family: 'Arial Black', sans-serif;
      font-size: 1.2rem;
      letter-spacing: 4px;
      padding: 14px 30px;
      border-radius: 12px;
      pointer-events: none;
      z-index: 75;
      text-align: center;
      display: none;
      box-shadow: 0 0 30px rgba(255,150,0,0.8);
    `;
    document.body.appendChild(this.levelUpNotif);
  }

  show() {
    this.container.style.display = 'flex';
  }

  addXP(amount, reason) {
    const gained = Math.round(amount * this.xpMultiplier);
    this.xp += gained;

    this.showXPGain(gained, reason);

    while (this.xp >= this.xpToNextLevel) {
      this.xp -= this.xpToNextLevel;
      this.levelUp();
    }

    this.updateUI();
  }

  levelUp() {
    this.level++;
    this.xpToNextLevel = Math.round(this.xpToNextLevel * 1.4);

    this.showLevelUp();

    // Bonuses por nivel
    if (this.level % 5 === 0) {
      this.xpMultiplier += 0.1;
    }
  }

  showLevelUp() {
    this.levelUpNotif.innerHTML = `
      ⬆ NIVEL ${this.level}<br>
      <span style="font-size:0.65rem;letter-spacing:2px">¡SUBISTE DE NIVEL!</span>
    `;
    this.levelUpNotif.style.display = 'block';

    // Animación
    this.levelUpNotif.style.transform = 'translateX(-50%) scale(0.8)';
    this.levelUpNotif.style.transition = 'transform 0.3s ease';
    setTimeout(() => {
      this.levelUpNotif.style.transform = 'translateX(-50%) scale(1)';
    }, 50);

    setTimeout(() => {
      this.levelUpNotif.style.opacity = '0';
      this.levelUpNotif.style.transition = 'opacity 0.5s ease';
      setTimeout(() => {
        this.levelUpNotif.style.display = 'none';
        this.levelUpNotif.style.opacity = '1';
      }, 500);
    }, 3000);
  }

  showXPGain(amount, reason) {
    const div = document.createElement('div');
    div.style.cssText = `
      position: fixed;
      top: 45%;
      right: 16px;
      color: #ffcc00;
      font-family: 'Arial Black', sans-serif;
      font-size: 0.7rem;
      letter-spacing: 1px;
      text-shadow: 0 2px 4px #000;
      pointer-events: none;
      z-index: 70;
      text-align: right;
      animation: xpfade 1.5s ease forwards;
    `;
    div.textContent = `+${amount} XP`;
    if (reason) {
      div.textContent += ` (${reason})`;
    }
    document.body.appendChild(div);

    if (!document.getElementById('xp-style')) {
      const style = document.createElement('style');
      style.id = 'xp-style';
      style.textContent = `
        @keyframes xpfade {
          0%   { opacity:1; transform:translateY(0); }
          100% { opacity:0; transform:translateY(-40px); }
        }
      `;
      document.head.appendChild(style);
    }

    setTimeout(() => div.remove(), 1500);
  }

  updateUI() {
    const pct = (this.xp / this.xpToNextLevel) * 100;
    this.xpBar.style.width = pct + '%';
    this.levelBadge.textContent = `LV ${this.level}`;
    this.xpText.textContent = `${this.xp}/${this.xpToNextLevel}`;
  }

  onKill() {
    this.kills++;
    this.addXP(this.xpRewards.kill, 'KILL');
  }

  onSurvive(dt) {
    this.surviveTime += dt;
    if (this.surviveTime >= 30) {
      this.surviveTime = 0;
      this.addXP(this.xpRewards.survive30s, 'SOBREVIVIR');
    }
  }

  onPickup() {
    this.addXP(this.xpRewards.pickupWeapon, 'LOOT');
  }

  onZoneTime() {
    this.addXP(this.xpRewards.zoneTime, 'ZONA');
  }

  getLevel() { return this.level; }
  getXP() { return this.xp; }

  destroy() {
    this.container.remove();
    this.levelUpNotif.remove();
  }
  }
