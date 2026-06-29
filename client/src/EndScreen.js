export class EndScreen {
  constructor(game) {
    this.game = game;
    this.createUI();
  }

  createUI() {
    this.overlay = document.createElement('div');
    this.overlay.style.cssText = `
      position: fixed; inset: 0;
      background: rgba(0,0,0,0.92);
      display: none; flex-direction: column;
      align-items: center; justify-content: center;
      z-index: 90; pointer-events: all;
    `;

    this.content = document.createElement('div');
    this.content.style.cssText = `
      display: flex; flex-direction: column;
      align-items: center; gap: 12px;
      width: 90%; max-width: 320px;
    `;

    this.overlay.appendChild(this.content);
    document.body.appendChild(this.overlay);
  }

  show(stats, placement) {
    const isWin = placement === 1;

    this.content.innerHTML = `
      <div style="
        font-size: ${isWin ? '3rem' : '2rem'};
        margin-bottom: 4px;
      ">${isWin ? '🏆' : '💀'}</div>

      <div style="
        color: ${isWin ? '#ffcc00' : '#ff4444'};
        font-family: 'Arial Black', sans-serif;
        font-size: 1.4rem;
        letter-spacing: 4px;
        text-shadow: 0 0 20px ${isWin ? '#ffcc00' : '#ff0000'};
      ">${isWin ? '¡VICTORIA!' : 'ELIMINADO'}</div>

      <div style="
        color: #888;
        font-family: Arial, sans-serif;
        font-size: 0.7rem;
        letter-spacing: 2px;
        margin-bottom: 8px;
      ">#${placement} de ${stats.totalPlayers || '?'} jugadores</div>

      <div style="
        width: 100%;
        background: rgba(255,255,255,0.05);
        border: 1px solid rgba(255,255,255,0.1);
        border-radius: 12px;
        padding: 14px;
        display: flex; flex-direction: column; gap: 8px;
      ">
        ${this.statRow('💀', 'Eliminaciones', stats.kills || 0)}
        ${this.statRow('⏱', 'Tiempo sobrevivido', this.formatTime(stats.surviveTime || 0))}
        ${this.statRow('🎯', 'Precisión', `${Math.round((stats.hits || 0) / Math.max(stats.shots || 1, 1) * 100)}%`)}
        ${this.statRow('🎒', 'Items recogidos', stats.itemsPickedUp || 0)}
        ${this.statRow('💣', 'Kills con granada', stats.grenadeKills || 0)}
        ${this.statRow('⭐', 'XP ganado', `+${this.calculateXP(stats)}`)}
        ${this.statRow('📊', 'Nivel', stats.level || 1)}
      </div>

      <button id="play-again-btn" style="
        background: linear-gradient(135deg, #ff6b00, #ff9500);
        color: #fff; font-family: 'Arial Black', sans-serif;
        font-size: 0.9rem; letter-spacing: 3px;
        padding: 14px 40px; border: none; border-radius: 10px;
        cursor: pointer; margin-top: 8px;
        box-shadow: 0 0 20px rgba(255,107,0,0.5);
        width: 100%;
      ">▶ JUGAR DE NUEVO</button>
    `;

    const btn = this.content.querySelector('#play-again-btn');
    btn.addEventListener('touchstart', (e) => {
      e.preventDefault();
      this.hide();
      window.location.reload();
    }, { passive: false });

    this.overlay.style.display = 'flex';

    // Animación de entrada
    this.overlay.style.opacity = '0';
    this.overlay.style.transition = 'opacity 0.5s ease';
    setTimeout(() => { this.overlay.style.opacity = '1'; }, 50);
  }

  statRow(icon, label, value) {
    return `
      <div style="
        display: flex; justify-content: space-between; align-items: center;
        border-bottom: 1px solid rgba(255,255,255,0.05);
        padding-bottom: 6px;
      ">
        <span style="color:#888;font-family:Arial,sans-serif;font-size:0.7rem">
          ${icon} ${label}
        </span>
        <span style="color:#fff;font-family:'Arial Black',sans-serif;font-size:0.75rem">
          ${value}
        </span>
      </div>
    `;
  }

  formatTime(seconds) {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${String(s).padStart(2,'0')}`;
  }

  calculateXP(stats) {
    return (stats.kills || 0) * 50 +
      Math.floor((stats.surviveTime || 0) / 30) * 10 +
      (stats.itemsPickedUp || 0) * 5;
  }

  hide() {
    this.overlay.style.display = 'none';
  }

  destroy() {
    this.overlay.remove();
  }
                       }
