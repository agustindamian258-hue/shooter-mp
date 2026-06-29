export class SkinSystem {
  constructor(game) {
    this.game = game;
    this.currentSkin = 'default';

    this.skins = {
      default: { color: 0x2244aa, helmetColor: 0x113388, name: 'Azul Clásico' },
      red:     { color: 0xaa2222, helmetColor: 0x881111, name: 'Rojo Fuego' },
      green:   { color: 0x228822, helmetColor: 0x115511, name: 'Verde Táctico' },
      black:   { color: 0x222222, helmetColor: 0x111111, name: 'Negro Sombra' },
      gold:    { color: 0xaa8800, helmetColor: 0x886600, name: 'Dorado Elite' },
      purple:  { color: 0x882288, helmetColor: 0x551155, name: 'Púrpura Royal' },
    };

    this.createUI();
  }

  createUI() {
    this.panel = document.createElement('div');
    this.panel.style.cssText = `
      position: fixed; inset: 0;
      background: rgba(0,0,0,0.9);
      display: none; flex-direction: column;
      align-items: center; justify-content: center;
      z-index: 85; pointer-events: all;
    `;

    const title = document.createElement('div');
    title.style.cssText = `
      color: #ff6b00; font-family: 'Arial Black', sans-serif;
      font-size: 1rem; letter-spacing: 4px; margin-bottom: 20px;
    `;
    title.textContent = '🎨 SKINS';

    const grid = document.createElement('div');
    grid.style.cssText = `
      display: grid; grid-template-columns: repeat(3, 1fr);
      gap: 10px; width: 280px;
    `;

    Object.entries(this.skins).forEach(([key, skin]) => {
      const card = document.createElement('div');
      card.style.cssText = `
        background: rgba(255,255,255,0.05);
        border: 2px solid ${key === this.currentSkin ? '#ff6b00' : 'rgba(255,255,255,0.15)'};
        border-radius: 10px; padding: 10px;
        display: flex; flex-direction: column;
        align-items: center; gap: 6px;
        cursor: pointer; pointer-events: all;
      `;

      // Preview del color
      const preview = document.createElement('div');
      preview.style.cssText = `
        width: 36px; height: 36px; border-radius: 50%;
        background: #${skin.color.toString(16).padStart(6,'0')};
        border: 2px solid rgba(255,255,255,0.3);
      `;

      const name = document.createElement('div');
      name.style.cssText = `
        color: #fff; font-family: Arial, sans-serif;
        font-size: 0.55rem; text-align: center; letter-spacing: 1px;
      `;
      name.textContent = skin.name;

      card.appendChild(preview);
      card.appendChild(name);
      grid.appendChild(card);

      card.addEventListener('touchstart', (e) => {
        e.preventDefault();
        this.selectSkin(key);
        // Actualizar bordes
        grid.querySelectorAll('div').forEach(c => {
          c.style.borderColor = 'rgba(255,255,255,0.15)';
        });
        card.style.borderColor = '#ff6b00';
      }, { passive: false });
    });

    const closeBtn = document.createElement('button');
    closeBtn.style.cssText = `
      margin-top: 20px;
      background: rgba(255,107,0,0.8);
      color: #fff; font-family: 'Arial Black', sans-serif;
      font-size: 0.8rem; letter-spacing: 2px;
      padding: 10px 30px; border: none; border-radius: 8px;
      cursor: pointer; pointer-events: all;
    `;
    closeBtn.textContent = '✓ CERRAR';
    closeBtn.addEventListener('touchstart', (e) => {
      e.preventDefault();
      this.hidePanel();
    }, { passive: false });

    this.panel.appendChild(title);
    this.panel.appendChild(grid);
    this.panel.appendChild(closeBtn);
    document.body.appendChild(this.panel);

    // Botón en menú principal
    this.menuBtn = document.createElement('div');
    this.menuBtn.style.cssText = `
      position: fixed;
      bottom: 20px;
      left: 50%;
      transform: translateX(-50%);
      background: rgba(0,0,0,0.6);
      color: #ff6b00;
      font-family: 'Arial Black', sans-serif;
      font-size: 0.7rem; letter-spacing: 2px;
      padding: 8px 20px; border-radius: 8px;
      border: 1px solid rgba(255,107,0,0.4);
      z-index: 91; pointer-events: all;
      cursor: pointer; display: none;
    `;
    this.menuBtn.textContent = '🎨 SKINS';
    this.menuBtn.addEventListener('touchstart', (e) => {
      e.preventDefault();
      this.showPanel();
    }, { passive: false });
    document.body.appendChild(this.menuBtn);
  }

  showInMenu() {
    this.menuBtn.style.display = 'block';
  }

  showPanel() {
    this.panel.style.display = 'flex';
  }

  hidePanel() {
    this.panel.style.display = 'none';
  }

  selectSkin(key) {
    this.currentSkin = key;
    // Aplicar al arma del jugador si ya está en juego
    if (this.game.player && this.game.weapons) {
      const skin = this.skins[key];
      // Actualizar color del modelo del jugador
      this.applyToPlayerMesh(skin);
    }
  }

  applyToPlayerMesh(skin) {
    // El color se aplica cuando el jugador respawnea
    // o se puede aplicar al mesh actual
    const camera = this.game.world.camera;
    camera.children.forEach(child => {
      if (child.isGroup) {
        child.children.forEach(mesh => {
          if (mesh.isMesh && mesh.material) {
            if (mesh.material.color.getHex() === 0x2244aa ||
                this.lastSkinColor) {
              mesh.material.color.setHex(skin.color);
            }
          }
        });
      }
    });
    this.lastSkinColor = skin.color;
  }

  getCurrentSkinColors() {
    const skin = this.skins[this.currentSkin];
    return {
      bodyColor: skin.color,
      helmetColor: skin.helmetColor
    };
  }

  destroy() {
    this.panel.remove();
    this.menuBtn.remove();
  }
                            }
