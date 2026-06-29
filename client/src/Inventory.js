export class Inventory {
  constructor(game) {
    this.game = game;
    this.items = [];
    this.maxItems = 6;
    this.visible = false;

    this.createUI();
  }

  createUI() {
    // Panel principal
    this.panel = document.createElement('div');
    this.panel.style.cssText = `
      position: fixed;
      bottom: 155px;
      left: 50%;
      transform: translateX(-50%);
      display: none;
      flex-direction: row;
      gap: 6px;
      z-index: 56;
      pointer-events: none;
    `;

    // Slots
    this.slots = [];
    for (let i = 0; i < this.maxItems; i++) {
      const slot = document.createElement('div');
      slot.style.cssText = `
        width: 44px; height: 44px;
        background: rgba(0,0,0,0.65);
        border: 2px solid rgba(255,255,255,0.15);
        border-radius: 8px;
        display: flex; flex-direction: column;
        align-items: center; justify-content: center;
        position: relative; font-size: 1.2rem;
      `;
      this.panel.appendChild(slot);
      this.slots.push(slot);
    }

    document.body.appendChild(this.panel);
  }

  show() {
    this.panel.style.display = 'flex';
  }

  addItem(type, icon, color = '#fff') {
    if (this.items.length >= this.maxItems) return false;
    this.items.push({ type, icon, color });
    this.render();
    return true;
  }

  removeItem(type) {
    const idx = this.items.findIndex(i => i.type === type);
    if (idx >= 0) {
      this.items.splice(idx, 1);
      this.render();
      return true;
    }
    return false;
  }

  hasItem(type) {
    return this.items.some(i => i.type === type);
  }

  render() {
    this.slots.forEach((slot, i) => {
      const item = this.items[i];
      if (item) {
        slot.innerHTML = `
          <span style="font-size:1.1rem">${item.icon}</span>
          <span style="
            position:absolute; bottom:1px; right:3px;
            color:${item.color};
            font-family:'Arial Black',sans-serif;
            font-size:0.45rem;
            text-shadow:0 1px 2px #000;
          ">${item.type.toUpperCase().slice(0,4)}</span>
        `;
        slot.style.borderColor = item.color || 'rgba(255,255,255,0.3)';
      } else {
        slot.innerHTML = '';
        slot.style.borderColor = 'rgba(255,255,255,0.1)';
      }
    });
  }

  syncWithWeapons() {
    if (!this.game.weapons) return;
    this.items = [];
    this.game.weapons.inventory.forEach(key => {
      const w = this.game.weapons.weapons[key];
      const icons = {
        rifle: '🔫', shotgun: '🔫', sniper: '🎯', pistol: '🔫'
      };
      const colors = {
        rifle: '#88aaff', shotgun: '#ffaa44',
        sniper: '#44ff88', pistol: '#ffff44'
      };
      this.addItem(key, icons[key] || '🔫', colors[key] || '#fff');
    });

    if (this.game.grenades && this.game.grenades.currentGrenades > 0) {
      this.addItem('grenade', '💣', '#88ff88');
    }
    if (this.game.shield && this.game.shield.current > 0) {
      this.addItem('shield', '🛡', '#44aaff');
    }

    this.render();
  }

  destroy() {
    this.panel.remove();
  }
        }
