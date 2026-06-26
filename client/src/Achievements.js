export class Achievements {
  constructor(levelSystem) {
    this.levelSystem = levelSystem;
    this.unlocked = new Set();

    this.list = {
      first_blood: {
        id: 'first_blood',
        name: 'Primera Sangre',
        desc: 'Conseguí tu primera kill',
        icon: '🩸',
        xp: 50,
        check: (stats) => stats.kills >= 1
      },
      five_kills: {
        id: 'five_kills',
        name: 'En Racha',
        desc: '5 kills en una partida',
        icon: '🔥',
        xp: 100,
        check: (stats) => stats.kills >= 5
      },
      ten_kills: {
        id: 'ten_kills',
        name: 'Imparable',
        desc: '10 kills en una partida',
        icon: '💀',
        xp: 200,
        check: (stats) => stats.kills >= 10
      },
      survivor: {
        id: 'survivor',
        name: 'Sobreviviente',
        desc: 'Sobreviví 5 minutos',
        icon: '⏱',
        xp: 75,
        check: (stats) => stats.surviveTime >= 300
      },
      long_survivor: {
        id: 'long_survivor',
        name: 'Resistente',
        desc: 'Sobreviví 15 minutos',
        icon: '🏆',
        xp: 200,
        check: (stats) => stats.surviveTime >= 900
      },
      low_health: {
        id: 'low_health',
        name: 'Al Límite',
        desc: 'Sobreviví con menos de 10 HP',
        icon: '❤️',
        xp: 80,
        check: (stats) => stats.health <= 10 && stats.health > 0
      },
      loot_master: {
        id: 'loot_master',
        name: 'Saqueador',
        desc: 'Recogiste 10 items',
        icon: '🎒',
        xp: 60,
        check: (stats) => stats.itemsPickedUp >= 10
      },
      grenadier: {
        id: 'grenadier',
        name: 'Granadero',
        desc: 'Eliminaste a alguien con granada',
        icon: '💣',
        xp: 120,
        check: (stats) => stats.grenadeKills >= 1
      },
      zone_master: {
        id: 'zone_master',
        name: 'Maestro de Zona',
        desc: 'Permaneciste en la zona por 3 minutos',
        icon: '⬡',
        xp: 90,
        check: (stats) => stats.zoneTime >= 180
      },
      sniper: {
        id: 'sniper',
        name: 'Francotirador',
        desc: 'Kill con el sniper a más de 50m',
        icon: '🎯',
        xp: 150,
        check: (stats) => stats.sniperKills >= 1
      },
      shotgun_master: {
        id: 'shotgun_master',
        name: 'Escopetero',
        desc: '3 kills con escopeta',
        icon: '🔫',
        xp: 100,
        check: (stats) => stats.shotgunKills >= 3
      },
      sprinter: {
        id: 'sprinter',
        name: 'Velocista',
        desc: 'Corré 500 metros en sprint',
        icon: '⚡',
        xp: 70,
        check: (stats) => stats.sprintDistance >= 500
      },
      night_owl: {
        id: 'night_owl',
        name: 'Búho Nocturno',
        desc: 'Conseguí una kill de noche',
        icon: '🌙',
        xp: 80,
        check: (stats) => stats.nightKills >= 1
      },
      storm_survivor: {
        id: 'storm_survivor',
        name: 'Tormentoso',
        desc: 'Sobreviví una tormenta completa',
        icon: '⛈',
        xp: 100,
        check: (stats) => stats.stormsWeathered >= 1
      },
      level5: {
        id: 'level5',
        name: 'Veterano',
        desc: 'Llegaste al nivel 5',
        icon: '⭐',
        xp: 0,
        check: (stats) => stats.level >= 5
      },
      level10: {
        id: 'level10',
        name: 'Élite',
        desc: 'Llegaste al nivel 10',
        icon: '🌟',
        xp: 0,
        check: (stats) => stats.level >= 10
      }
    };

    this.createUI();
  }

  createUI() {
    // Panel de achievements
    this.panel = document.createElement('div');
    this.panel.style.cssText = `
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: rgba(0,0,0,0.95);
      border: 1px solid rgba(255,107,0,0.4);
      border-radius: 14px;
      padding: 16px;
      width: 280px;
      max-height: 70vh;
      overflow-y: auto;
      z-index: 85;
      display: none;
      pointer-events: all;
    `;

    const header = document.createElement('div');
    header.style.cssText = `
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 12px;
      border-bottom: 1px solid rgba(255,107,0,0.3);
      padding-bottom: 8px;
    `;

    const title = document.createElement('div');
    title.style.cssText = `
      color: #ff6b00;
      font-family: 'Arial Black', sans-serif;
      font-size: 0.85rem;
      letter-spacing: 3px;
    `;
    title.textContent = '🏆 LOGROS';

    const closeBtn = document.createElement('div');
    closeBtn.style.cssText = `
      color: #888;
      font-size: 1.2rem;
      cursor: pointer;
      pointer-events: all;
    `;
    closeBtn.textContent = '✕';
    closeBtn.addEventListener('touchstart', (e) => {
      e.preventDefault();
      this.hidePanel();
    }, { passive: false });

    header.appendChild(title);
    header.appendChild(closeBtn);
    this.panel.appendChild(header);

    this.achievementList = document.createElement('div');
    this.achievementList.style.cssText = `
      display: flex;
      flex-direction: column;
      gap: 6px;
    `;
    this.panel.appendChild(this.achievementList);
    document.body.appendChild(this.panel);

    // Botón para abrir panel
    this.btn = document.createElement('div');
    this.btn.style.cssText = `
      position: fixed;
      top: 55px;
      left: 12px;
      background: rgba(0,0,0,0.6);
      color: #ffcc00;
      font-family: 'Arial Black', sans-serif;
      font-size: 0.55rem;
      letter-spacing: 1px;
      padding: 4px 8px;
      border-radius: 6px;
      border: 1px solid rgba(255,204,0,0.3);
      z-index: 55;
      pointer-events: all;
      cursor: pointer;
      display: none;
    `;
    this.btn.textContent = '🏆';
    this.btn.addEventListener('touchstart', (e) => {
      e.preventDefault();
      this.togglePanel();
    }, { passive: false });
    document.body.appendChild(this.btn);

    // Toast de achievement desbloqueado
    this.toast = document.createElement('div');
    this.toast.style.cssText = `
      position: fixed;
      top: 80px;
      left: 50%;
      transform: translateX(-50%);
      background: rgba(0,0,0,0.9);
      border: 1px solid #ffcc00;
      border-radius: 10px;
      padding: 10px 16px;
      display: none;
      flex-direction: column;
      align-items: center;
      gap: 2px;
      z-index: 80;
      pointer-events: none;
      min-width: 200px;
      text-align: center;
    `;
    document.body.appendChild(this.toast);
  }

  show() {
    this.btn.style.display = 'block';
    this.renderPanel();
  }

  togglePanel() {
    const visible = this.panel.style.display === 'flex';
    if (visible) {
      this.hidePanel();
    } else {
      this.showPanel();
    }
  }

  showPanel() {
    this.renderPanel();
    this.panel.style.display = 'block';
  }

  hidePanel() {
    this.panel.style.display = 'none';
  }

  renderPanel() {
    this.achievementList.innerHTML = '';

    const total = Object.keys(this.list).length;
    const unlocked = this.unlocked.size;

    const progress = document.createElement('div');
    progress.style.cssText = `
      color: #888;
      font-family: Arial, sans-serif;
      font-size: 0.65rem;
      text-align: center;
      margin-bottom: 8px;
    `;
    progress.textContent = `${unlocked} / ${total} desbloqueados`;
    this.achievementList.appendChild(progress);

    Object.values(this.list).forEach(ach => {
      const isUnlocked = this.unlocked.has(ach.id);
      const row = document.createElement('div');
      row.style.cssText = `
        display: flex;
        align-items: center;
        gap: 8px;
        background: ${isUnlocked ? 'rgba(255,107,0,0.15)' : 'rgba(255,255,255,0.03)'};
        border: 1px solid ${isUnlocked ? 'rgba(255,107,0,0.4)' : 'rgba(255,255,255,0.08)'};
        border-radius: 8px;
        padding: 8px 10px;
        opacity: ${isUnlocked ? '1' : '0.4'};
      `;

      const icon = document.createElement('div');
      icon.style.cssText = 'font-size: 1.2rem; min-width: 24px; text-align: center;';
      icon.textContent = isUnlocked ? ach.icon : '🔒';

      const info = document.createElement('div');
      info.style.cssText = 'flex: 1;';

      const name = document.createElement('div');
      name.style.cssText = `
        color: ${isUnlocked ? '#fff' : '#666'};
        font-family: 'Arial Black', sans-serif;
        font-size: 0.6rem;
        letter-spacing: 1px;
      `;
      name.textContent = ach.name;

      const desc = document.createElement('div');
      desc.style.cssText = `
        color: #666;
        font-family: Arial, sans-serif;
        font-size: 0.55rem;
        margin-top: 1px;
      `;
      desc.textContent = ach.desc;

      info.appendChild(name);
      info.appendChild(desc);

      const xpBadge = document.createElement('div');
      xpBadge.style.cssText = `
        color: #ffcc00;
        font-family: 'Arial Black', sans-serif;
        font-size: 0.5rem;
        background: rgba(255,204,0,0.1);
        padding: 2px 5px;
        border-radius: 4px;
        white-space: nowrap;
      `;
      xpBadge.textContent = ach.xp > 0 ? `+${ach.xp}XP` : '⭐';

      row.appendChild(icon);
      row.appendChild(info);
      row.appendChild(xpBadge);
      this.achievementList.appendChild(row);
    });
  }

  check(stats) {
    Object.values(this.list).forEach(ach => {
      if (!this.unlocked.has(ach.id) && ach.check(stats)) {
        this.unlock(ach);
      }
    });
  }

  unlock(ach) {
    this.unlocked.add(ach.id);
    this.showToast(ach);
    if (this.levelSystem && ach.xp > 0) {
      this.levelSystem.addXP(ach.xp, ach.name);
    }
  }

  showToast(ach) {
    this.toast.innerHTML = `
      <div style="color:#ffcc00;font-family:'Arial Black',sans-serif;font-size:0.6rem;letter-spacing:2px">
        🏆 LOGRO DESBLOQUEADO
      </div>
      <div style="font-size:1.4rem;margin:2px 0">${ach.icon}</div>
      <div style="color:#fff;font-family:'Arial Black',sans-serif;font-size:0.7rem;letter-spacing:1px">
        ${ach.name}
      </div>
      <div style="color:#888;font-family:Arial,sans-serif;font-size:0.6rem">
        ${ach.desc}
      </div>
    `;

    this.toast.style.display = 'flex';
    this.toast.style.opacity = '1';
    this.toast.style.transition = 'none';

    setTimeout(() => {
      this.toast.style.transition = 'opacity 0.5s ease';
      this.toast.style.opacity = '0';
      setTimeout(() => {
        this.toast.style.display = 'none';
        this.toast.style.opacity = '1';
      }, 500);
    }, 4000);

    this.renderPanel();
  }

  destroy() {
    this.panel.remove();
    this.btn.remove();
    this.toast.remove();
  }
      }
