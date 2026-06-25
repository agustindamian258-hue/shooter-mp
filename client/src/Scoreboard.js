export class Scoreboard {
  constructor(game) {
    this.game = game;
    this.visible = false;
    this.players = {};

    this.container = document.createElement('div');
    this.container.style.cssText = `
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: rgba(0,0,0,0.9);
      border: 1px solid rgba(255,107,0,0.4);
      border-radius: 12px;
      padding: 16px;
      min-width: 280px;
      z-index: 75;
      display: none;
      pointer-events: none;
    `;

    const title = document.createElement('div');
    title.style.cssText = `
      color: #ff6b00;
      font-family: 'Arial Black', sans-serif;
      font-size: 0.85rem;
      letter-spacing: 4px;
      text-align: center;
      margin-bottom: 12px;
      border-bottom: 1px solid rgba(255,107,0,0.3);
      padding-bottom: 8px;
    `;
    title.textContent = '— RANKING —';
    this.container.appendChild(title);

    this.table = document.createElement('div');
    this.table.style.cssText = `
      display: flex;
      flex-direction: column;
      gap: 4px;
    `;
    this.container.appendChild(this.table);

    document.body.appendChild(this.container);
    this.setupToggle();
  }

  setupToggle() {
    // Botón para mostrar scoreboard
    const btn = document.createElement('div');
    btn.style.cssText = `
      position: fixed;
      top: 10px;
      left: 50%;
      transform: translateX(-50%);
      background: rgba(0,0,0,0.6);
      color: #ff6b00;
      font-family: 'Arial Black', sans-serif;
      font-size: 0.6rem;
      letter-spacing: 2px;
      padding: 4px 12px;
      border-radius: 6px;
      border: 1px solid rgba(255,107,0,0.3);
      z-index: 55;
      pointer-events: all;
      cursor: pointer;
    `;
    btn.textContent = '📋 RANKING';
    btn.addEventListener('touchstart', (e) => {
      e.preventDefault();
      this.toggle();
    }, { passive: false });
    document.body.appendChild(btn);
    this.btn = btn;
  }

  toggle() {
    this.visible = !this.visible;
    this.container.style.display = this.visible ? 'block' : 'none';
    if (this.visible) this.render();
  }

  updatePlayer(id, name, kills, deaths, health) {
    this.players[id] = { id, name, kills: kills || 0, deaths: deaths || 0, health: health || 100 };
    if (this.visible) this.render();
  }

  removePlayer(id) {
    delete this.players[id];
    if (this.visible) this.render();
  }

  render() {
    this.table.innerHTML = '';

    // Header
    const header = document.createElement('div');
    header.style.cssText = `
      display: grid;
      grid-template-columns: 1fr 50px 50px 60px;
      gap: 4px;
      color: #888;
      font-family: Arial, sans-serif;
      font-size: 0.6rem;
      letter-spacing: 1px;
      padding: 0 4px 4px;
      border-bottom: 1px solid rgba(255,255,255,0.1);
      margin-bottom: 4px;
    `;
    header.innerHTML = '<span>JUGADOR</span><span style="text-align:center">KILLS</span><span style="text-align:center">MUERTES</span><span style="text-align:right">HP</span>';
    this.table.appendChild(header);

    // Ordenar por kills
    const sorted = Object.values(this.players).sort((a, b) => b.kills - a.kills);

    sorted.forEach((p, i) => {
      const row = document.createElement('div');
      const isLocal = p.id === this.game.network.playerId;
      row.style.cssText = `
        display: grid;
        grid-template-columns: 1fr 50px 50px 60px;
        gap: 4px;
        background: ${isLocal ? 'rgba(255,107,0,0.15)' : 'rgba(255,255,255,0.04)'};
        border: 1px solid ${isLocal ? 'rgba(255,107,0,0.3)' : 'transparent'};
        border-radius: 6px;
        padding: 5px 8px;
        align-items: center;
      `;

      const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i+1}.`;
      const hpColor = p.health > 60 ? '#00e676' : p.health > 30 ? '#ffcc00' : '#ff3d3d';

      row.innerHTML = `
        <span style="color:#fff;font-family:'Arial Black',sans-serif;font-size:0.65rem;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${medal} ${p.name}</span>
        <span style="color:#ff6b00;font-family:'Arial Black',sans-serif;font-size:0.75rem;text-align:center">${p.kills}</span>
        <span style="color:#888;font-family:Arial,sans-serif;font-size:0.65rem;text-align:center">${p.deaths}</span>
        <span style="color:${hpColor};font-family:'Arial Black',sans-serif;font-size:0.65rem;text-align:right">${p.health}HP</span>
      `;
      this.table.appendChild(row);
    });

    if (sorted.length === 0) {
      const empty = document.createElement('div');
      empty.style.cssText = 'color:#555;font-family:Arial,sans-serif;font-size:0.7rem;text-align:center;padding:10px;';
      empty.textContent = 'Sin jugadores';
      this.table.appendChild(empty);
    }
  }

  show() {
    this.btn.style.display = 'block';
  }

  destroy() {
    this.container.remove();
    this.btn.remove();
  }
  }
