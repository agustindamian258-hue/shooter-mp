export class HUD {
  constructor() {
    this.healthBar = document.getElementById('health-bar');
    this.healthText = document.getElementById('health-text');
    this.ammoCurrent = document.getElementById('ammo-current');
    this.ammoReserve = document.getElementById('ammo-reserve');
    this.weaponName = document.getElementById('weapon-name');
    this.killsCount = document.getElementById('kills-count');
    this.playersCount = document.getElementById('players-count');
    this.pingValue = document.getElementById('ping-value');
    this.killFeed = document.getElementById('kill-feed');
    this.kills = 0;

    this.reloadIndicator = this.createReloadIndicator();
    this.damageOverlay = this.createDamageOverlay();
    this.weaponSwitchUI = this.createWeaponSwitchUI();
  }

  createReloadIndicator() {
    const div = document.createElement('div');
    div.style.cssText = `
      position: fixed;
      bottom: 210px;
      left: 50%;
      transform: translateX(-50%);
      color: #ffcc00;
      font-family: 'Arial Black', sans-serif;
      font-size: 0.85rem;
      letter-spacing: 3px;
      text-shadow: 0 2px 4px #000;
      display: none;
      z-index: 60;
      background: rgba(0,0,0,0.5);
      padding: 6px 16px;
      border-radius: 8px;
    `;
    div.textContent = '⟳ RECARGANDO...';
    document.body.appendChild(div);
    return div;
  }

  createDamageOverlay() {
    const div = document.createElement('div');
    div.style.cssText = `
      position: fixed;
      inset: 0;
      pointer-events: none;
      z-index: 45;
      border: 0px solid rgba(255,0,0,0);
      box-shadow: inset 0 0 0px rgba(255,0,0,0);
      transition: box-shadow 0.1s ease, opacity 0.3s ease;
      opacity: 0;
      background: radial-gradient(ellipse at center, transparent 50%, rgba(255,0,0,0.4) 100%);
    `;
    document.body.appendChild(div);
    return div;
  }

  createWeaponSwitchUI() {
    const div = document.createElement('div');
    div.style.cssText = `
      position: fixed;
      bottom: 220px;
      right: 16px;
      display: none;
      flex-direction: column;
      gap: 6px;
      z-index: 60;
      pointer-events: none;
    `;
    document.body.appendChild(div);
    return div;
  }

  updateHealth(hp) {
    const pct = Math.max(0, hp) / 100;
    this.healthBar.style.width = (pct * 100) + '%';
    this.healthText.textContent = Math.max(0, Math.round(hp)) + ' HP';

    if (hp > 60) {
      this.healthBar.style.background = 'linear-gradient(90deg, #00e676, #69f0ae)';
    } else if (hp > 30) {
      this.healthBar.style.background = 'linear-gradient(90deg, #ffcc00, #ffee55)';
    } else {
      this.healthBar.style.background = 'linear-gradient(90deg, #ff3d3d, #ff6b6b)';
      this.flashDamage();
    }
  }

  updateAmmo(current, reserve) {
    this.ammoCurrent.textContent = current;
    this.ammoReserve.textContent = '/ ' + reserve;
    this.ammoCurrent.style.color = current === 0 ? '#ff4444' :
      current <= 5 ? '#ffcc00' : '#ffffff';
  }

  setWeaponName(name) {
    if (this.weaponName) this.weaponName.textContent = name;
  }

  updateKills(kills) {
    this.kills = kills;
    this.killsCount.textContent = kills;
  }

  updatePlayers(count) {
    this.playersCount.textContent = count;
  }

  updatePing(ms) {
    this.pingValue.textContent = ms;
    if (ms < 80) {
      this.pingValue.parentElement.style.color = '#00e676';
    } else if (ms < 150) {
      this.pingValue.parentElement.style.color = '#ffcc00';
    } else {
      this.pingValue.parentElement.style.color = '#ff4444';
    }
  }

  showReloading(show) {
    this.reloadIndicator.style.display = show ? 'block' : 'none';
  }

  flashDamage() {
    this.damageOverlay.style.opacity = '1';
    setTimeout(() => {
      this.damageOverlay.style.opacity = '0';
    }, 300);
  }

  showHitMarker() {
    const marker = document.createElement('div');
    marker.style.cssText = `
      position: fixed;
      top: 50%; left: 50%;
      transform: translate(-50%, -50%);
      color: #ff4444;
      font-size: 1.8rem;
      font-weight: bold;
      pointer-events: none;
      z-index: 70;
      text-shadow: 0 0 8px #ff0000;
      animation: hitfade 0.2s ease forwards;
    `;
    marker.textContent = '✦';
    document.body.appendChild(marker);

    if (!document.getElementById('hit-style')) {
      const style = document.createElement('style');
      style.id = 'hit-style';
      style.textContent = `
        @keyframes hitfade {
          0% { opacity: 1; transform: translate(-50%,-50%) scale(1.2); }
          100% { opacity: 0; transform: translate(-50%,-50%) scale(0.8); }
        }
      `;
      document.head.appendChild(style);
    }

    setTimeout(() => marker.remove(), 200);
  }

  addKillFeed(killerName, victimName) {
    const item = document.createElement('div');
    item.className = 'kill-feed-item';
    item.textContent = `${killerName} ✦ ${victimName}`;
    this.killFeed.appendChild(item);

    setTimeout(() => {
      item.style.transition = 'opacity 0.5s';
      item.style.opacity = '0';
      setTimeout(() => item.remove(), 500);
    }, 3000);

    const items = this.killFeed.querySelectorAll('.kill-feed-item');
    if (items.length > 4) items[0].remove();
  }

  showWeaponSwitch(inventory, currentIndex, weaponData) {
    this.weaponSwitchUI.innerHTML = '';
    this.weaponSwitchUI.style.display = 'flex';

    inventory.forEach((key, i) => {
      const item = document.createElement('div');
      item.style.cssText = `
        background: ${i === currentIndex ? 'rgba(255,107,0,0.8)' : 'rgba(0,0,0,0.6)'};
        color: #fff;
        font-family: 'Arial Black', sans-serif;
        font-size: 0.6rem;
        letter-spacing: 1px;
        padding: 5px 10px;
        border-radius: 6px;
        border: 1px solid ${i === currentIndex ? '#ff6b00' : 'rgba(255,255,255,0.2)'};
        text-align: right;
      `;
      item.textContent = weaponData[key]?.name || key.toUpperCase();
      this.weaponSwitchUI.appendChild(item);
    });

    clearTimeout(this._switchTimer);
    this._switchTimer = setTimeout(() => {
      this.weaponSwitchUI.style.display = 'none';
    }, 2000);
  }

  showZoneWarning(message) {
    const div = document.createElement('div');
    div.style.cssText = `
      position: fixed;
      top: 25%;
      left: 50%;
      transform: translateX(-50%);
      background: rgba(100,0,200,0.85);
      color: #fff;
      font-family: 'Arial Black', sans-serif;
      font-size: 0.85rem;
      letter-spacing: 2px;
      padding: 10px 22px;
      border-radius: 10px;
      z-index: 70;
      text-align: center;
      border: 1px solid rgba(200,0,255,0.7);
      pointer-events: none;
    `;
    div.textContent = message;
    document.body.appendChild(div);
    setTimeout(() => div.remove(), 3000);
  }
}
