export class NameTags {
  constructor(game) {
    this.game = game;
    this.tags = {};
    this.container = document.createElement('div');
    this.container.style.cssText = `
      position: fixed;
      inset: 0;
      pointer-events: none;
      z-index: 52;
      overflow: hidden;
    `;
    document.body.appendChild(this.container);
  }

  addTag(id, name) {
    if (this.tags[id]) return;
    const div = document.createElement('div');
    div.style.cssText = `
      position: absolute;
      transform: translate(-50%, -100%);
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 2px;
      pointer-events: none;
    `;

    const nameEl = document.createElement('div');
    nameEl.style.cssText = `
      background: rgba(0,0,0,0.65);
      color: #ff4444;
      font-family: 'Arial Black', sans-serif;
      font-size: 0.6rem;
      letter-spacing: 1px;
      padding: 2px 8px;
      border-radius: 4px;
      border: 1px solid rgba(255,60,60,0.4);
      white-space: nowrap;
    `;
    nameEl.textContent = name;

    const hpBarBg = document.createElement('div');
    hpBarBg.style.cssText = `
      width: 50px;
      height: 3px;
      background: rgba(0,0,0,0.5);
      border-radius: 2px;
      overflow: hidden;
    `;
    const hpBar = document.createElement('div');
    hpBar.style.cssText = `
      height: 100%;
      width: 100%;
      background: #00e676;
      border-radius: 2px;
      transition: width 0.2s ease, background 0.2s ease;
    `;
    hpBarBg.appendChild(hpBar);

    div.appendChild(nameEl);
    div.appendChild(hpBarBg);
    this.container.appendChild(div);

    this.tags[id] = { div, nameEl, hpBar, visible: true };
  }

  removeTag(id) {
    if (!this.tags[id]) return;
    this.tags[id].div.remove();
    delete this.tags[id];
  }

  updateTag(id, health) {
    if (!this.tags[id]) return;
    const pct = Math.max(0, health) / 100;
    this.tags[id].hpBar.style.width = (pct * 100) + '%';
    this.tags[id].hpBar.style.background =
      health > 60 ? '#00e676' :
      health > 30 ? '#ffcc00' : '#ff3d3d';
  }

  update() {
    const camera = this.game.world.camera;
    const W = window.innerWidth;
    const H = window.innerHeight;

    const projMatrix = new THREE.Matrix4();
    projMatrix.multiplyMatrices(
      camera.projectionMatrix,
      camera.matrixWorldInverse
    );

    Object.entries(this.game.remotePlayers).forEach(([id, rp]) => {
      const tag = this.tags[id];
      if (!tag) {
        this.addTag(id, rp.name || id.slice(0, 6));
        return;
      }

      // Posición sobre la cabeza del jugador
      const pos = rp.mesh.position.clone();
      pos.y += 2.2;

      const projected = pos.clone().applyMatrix4(projMatrix);

      // Si está detrás de la cámara, ocultar
      if (projected.z > 1) {
        tag.div.style.display = 'none';
        return;
      }

      // Distancia al jugador
      const dist = camera.position.distanceTo(rp.mesh.position);

      // Ocultar si está muy lejos
      if (dist > 80) {
        tag.div.style.display = 'none';
        return;
      }

      tag.div.style.display = 'flex';

      const x = (projected.x * 0.5 + 0.5) * W;
      const y = (-projected.y * 0.5 + 0.5) * H;

      tag.div.style.left = x + 'px';
      tag.div.style.top = y + 'px';

      // Fade por distancia
      const alpha = Math.max(0.3, 1 - dist / 80);
      tag.div.style.opacity = alpha.toString();

      // Escala por distancia
      const scale = Math.max(0.6, 1 - dist / 120);
      tag.div.style.transform = `translate(-50%, -100%) scale(${scale})`;

      this.updateTag(id, rp.health || 100);
    });

    // Limpiar tags de jugadores que ya no existen
    Object.keys(this.tags).forEach(id => {
      if (!this.game.remotePlayers[id]) {
        this.removeTag(id);
      }
    });
  }

  show() { this.container.style.display = 'block'; }
  hide() { this.container.style.display = 'none'; }

  destroy() {
    this.container.remove();
    this.tags = {};
  }
      }
