export class Crouch {
  constructor(player, sounds) {
    this.player = player;
    this.sounds = sounds;
    this.isCrouching = false;
    this.normalHeight = 1.7;
    this.crouchHeight = 0.9;
    this.normalSpeed = 8;
    this.crouchSpeed = 4;
    this.transitionSpeed = 8;
    this.targetHeight = this.normalHeight;

    this.createButton();
  }

  createButton() {
    this.btn = document.createElement('div');
    this.btn.style.cssText = `
      position: fixed;
      bottom: 130px;
      right: 90px;
      width: 48px;
      height: 48px;
      border-radius: 50%;
      background: rgba(100,100,200,0.6);
      border: 2px solid rgba(150,150,255,0.8);
      display: none;
      align-items: center;
      justify-content: center;
      z-index: 60;
      pointer-events: all;
      box-shadow: 0 0 10px rgba(100,100,200,0.3);
    `;
    this.btn.innerHTML = '<span style="color:#fff;font-family:Arial Black,sans-serif;font-size:0.8rem">⬇</span>';

    this.btn.addEventListener('touchstart', (e) => {
      e.preventDefault();
      this.toggle();
    }, { passive: false });

    document.body.appendChild(this.btn);
  }

  show() {
    this.btn.style.display = 'flex';
  }

  toggle() {
    if (this.isCrouching) {
      this.standUp();
    } else {
      this.crouch();
    }
  }

  crouch() {
    this.isCrouching = true;
    this.targetHeight = this.crouchHeight;
    this.player.speed = this.crouchSpeed;
    this.player.groundY = this.crouchHeight;

    this.btn.style.background = 'rgba(150,150,255,0.8)';
    this.btn.style.boxShadow = '0 0 15px rgba(100,100,200,0.6)';
    this.btn.querySelector('span').textContent = '⬆';

    this.showCrouchIndicator(true);
  }

  standUp() {
    this.isCrouching = false;
    this.targetHeight = this.normalHeight;
    this.player.speed = this.player.weapons ?
      this.normalSpeed : this.normalSpeed;
    this.player.groundY = this.normalHeight;

    this.btn.style.background = 'rgba(100,100,200,0.6)';
    this.btn.style.boxShadow = '0 0 10px rgba(100,100,200,0.3)';
    this.btn.querySelector('span').textContent = '⬇';

    this.showCrouchIndicator(false);
  }

  showCrouchIndicator(show) {
    if (!this.indicator) {
      this.indicator = document.createElement('div');
      this.indicator.style.cssText = `
        position: fixed;
        bottom: 195px;
        right: 90px;
        color: #aaaaff;
        font-family: 'Arial Black', sans-serif;
        font-size: 0.55rem;
        letter-spacing: 2px;
        text-shadow: 0 1px 3px #000;
        pointer-events: none;
        z-index: 55;
        text-align: center;
        display: none;
      `;
      this.indicator.textContent = '▼ AGACHADO';
      document.body.appendChild(this.indicator);
    }
    this.indicator.style.display = show ? 'block' : 'none';
  }

  update(dt) {
    // Transición suave de altura
    const current = this.player.camera.position.y;
    const diff = this.targetHeight - current;

    if (Math.abs(diff) > 0.01) {
      this.player.camera.position.y += diff * this.transitionSpeed * dt;
    } else {
      this.player.camera.position.y = this.targetHeight;
    }
  }

  destroy() {
    this.btn.remove();
    if (this.indicator) this.indicator.remove();
  }
      }
