export class Minimap {
  constructor(game) {
    this.game = game;
    this.size = 120;
    this.mapSize = 400;
    this.zoneRadius = 180;
    this.zoneTargetRadius = 60;
    this.zoneShrinkSpeed = 0.05;

    this.canvas = document.createElement('canvas');
    this.canvas.width = this.size;
    this.canvas.height = this.size;
    this.canvas.style.cssText = `
      position: fixed;
      top: 10px;
      right: 10px;
      width: ${this.size}px;
      height: ${this.size}px;
      border-radius: 50%;
      border: 2px solid rgba(255,255,255,0.3);
      z-index: 55;
      display: none;
      box-shadow: 0 0 10px rgba(0,0,0,0.5);
    `;
    document.body.appendChild(this.canvas);
    this.ctx = this.canvas.getContext('2d');
  }

  show() {
    this.canvas.style.display = 'block';
  }

  hide() {
    this.canvas.style.display = 'none';
  }

  update() {
    const ctx = this.ctx;
    const s = this.size;
    const scale = s / this.mapSize;

    ctx.clearRect(0, 0, s, s);

    // Fondo circular
    ctx.save();
    ctx.beginPath();
    ctx.arc(s/2, s/2, s/2, 0, Math.PI*2);
    ctx.clip();

    // Fondo del mapa
    ctx.fillStyle = '#2d4a1e';
    ctx.fillRect(0, 0, s, s);

    // Camino
    ctx.fillStyle = '#8a6a3a';
    ctx.fillRect(s/2 - 4, 0, 8, s);
    ctx.fillRect(0, s/2 - 4, s, 8);

    // Zona (círculo morado)
    if (this.zoneRadius > this.zoneTargetRadius) {
      this.zoneRadius -= this.zoneShrinkSpeed * 0.016;
    }
    const zoneX = s/2;
    const zoneY = s/2;
    const zoneR = this.zoneRadius * scale;

    ctx.strokeStyle = 'rgba(150,0,255,0.8)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(zoneX, zoneY, zoneR, 0, Math.PI*2);
    ctx.stroke();

    ctx.fillStyle = 'rgba(150,0,255,0.08)';
    ctx.beginPath();
    ctx.arc(zoneX, zoneY, zoneR, 0, Math.PI*2);
    ctx.fill();

    // Jugadores remotos
    Object.values(this.game.remotePlayers).forEach(rp => {
      const mx = (rp.mesh.position.x + this.mapSize/2) * scale;
      const my = (rp.mesh.position.z + this.mapSize/2) * scale;
      ctx.fillStyle = '#ff4444';
      ctx.beginPath();
      ctx.arc(mx, my, 3, 0, Math.PI*2);
      ctx.fill();
    });

    // Jugador local
    const player = this.game.player;
    const px = (player.camera.position.x + this.mapSize/2) * scale;
    const py = (player.camera.position.z + this.mapSize/2) * scale;

    // Triángulo de dirección
    ctx.save();
    ctx.translate(px, py);
    ctx.rotate(-player.yaw);
    ctx.fillStyle = '#00e5ff';
    ctx.beginPath();
    ctx.moveTo(0, -6);
    ctx.lineTo(-4, 4);
    ctx.lineTo(4, 4);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    ctx.restore();

    // Borde exterior
    ctx.strokeStyle = 'rgba(255,255,255,0.25)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(s/2, s/2, s/2 - 1, 0, Math.PI*2);
    ctx.stroke();
  }
      }
