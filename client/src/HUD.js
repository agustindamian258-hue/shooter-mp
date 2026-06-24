export class HUD {
  constructor() {
    this.healthBar = document.getElementById('health-bar');
    this.healthText = document.getElementById('health-text');
    this.ammoCurrent = document.getElementById('ammo-current');
    this.ammoReserve = document.getElementById('ammo-reserve');
    this.killsCount = document.getElementById('kills-count');
    this.playersCount = document.getElementById('players-count');
    this.pingValue = document.getElementById('ping-value');
    this.killFeed = document.getElementById('kill-feed');
    this.kills = 0;

    this.reloadIndicator = this.createReloadIndicator();
  }

  createReloadIndicator() {
    const div = document.createElement('div');
    div.style.cssText = `
      position: fixed;
      bottom: 200px;
      left: 50%;
      transform: translateX(-50%);
      color: #ffcc00;
      font-family: 'Arial Black', sans-serif;
      font-size: 0.9rem;
      letter-spacing: 3px;
      text-shadow: 0 2px 4px #000;
      display: none;
      z-index: 60;
    `;
    div.textContent = '⟳ RELOADING...';
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
    }
  }

  updateAmmo(current, reserve) {
    this.ammoCurrent.textContent = current;
    this.ammoReserve.textContent = '/ ' + reserve;
    this.ammoCurrent.style.color = current === 0 ? '#ff4444' : '#ffffff';
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
      this.pingValue.style.color = '#00e676';
    } else if (ms < 150) {
      this.pingValue.style.color = '#ffcc00';
    } else {
      this.pingValue.style.color = '#ff4444';
    }
  }

  showReloading(show) {
    this.reloadIndicator.style.display = show ? 'block' : 'none';
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

    // Máximo 4 items en el feed
    const items = this.killFeed.querySelectorAll('.kill-feed-item');
    if (items.length > 4) items[0].remove();
  }

  showHitMarker() {
    const marker = document.createElement('div');
    marker.style.cssText = `
      position: fixed;
      top: 50%; left: 50%;
      transform: translate(-50%, -50%);
      color: #ff4444;
      font-size: 1.5rem;
      font-weight: bold;
      pointer-events: none;
      z-index: 70;
      text-shadow: 0 0 6px #ff0000;
    `;
    marker.textContent = '✦';
    document.body.appendChild(marker);
    setTimeout(() => marker.remove(), 200);
  }
        }
