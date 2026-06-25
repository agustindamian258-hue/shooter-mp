export class ProximityChat {
  constructor(game) {
    this.game = game;
    this.enabled = true;
    this.maxDistance = 30;
    this.messages = [];
    this.maxMessages = 20;

    this.createUI();
    this.setupVoiceIndicator();
  }

  createUI() {
    // Contenedor principal del chat
    this.container = document.createElement('div');
    this.container.style.cssText = `
      position: fixed;
      bottom: 220px;
      left: 10px;
      width: 200px;
      z-index: 55;
      pointer-events: none;
      display: none;
    `;

    // Lista de mensajes
    this.messageList = document.createElement('div');
    this.messageList.style.cssText = `
      display: flex;
      flex-direction: column;
      gap: 3px;
      margin-bottom: 6px;
      max-height: 120px;
      overflow: hidden;
    `;
    this.container.appendChild(this.messageList);

    // Input de chat
    this.inputContainer = document.createElement('div');
    this.inputContainer.style.cssText = `
      display: none;
      gap: 4px;
      pointer-events: all;
    `;

    this.input = document.createElement('input');
    this.input.type = 'text';
    this.input.maxLength = 60;
    this.input.placeholder = 'Mensaje...';
    this.input.style.cssText = `
      flex: 1;
      background: rgba(0,0,0,0.75);
      border: 1px solid rgba(255,255,255,0.25);
      color: #fff;
      font-family: Arial, sans-serif;
      font-size: 0.7rem;
      padding: 5px 8px;
      border-radius: 6px;
      outline: none;
      width: 100%;
    `;

    const sendBtn = document.createElement('button');
    sendBtn.textContent = '↵';
    sendBtn.style.cssText = `
      background: rgba(255,107,0,0.8);
      color: #fff;
      border: none;
      border-radius: 6px;
      padding: 5px 8px;
      font-size: 0.8rem;
      cursor: pointer;
      pointer-events: all;
    `;
    sendBtn.addEventListener('touchstart', (e) => {
      e.preventDefault();
      this.sendMessage();
    }, { passive: false });

    this.input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') this.sendMessage();
      if (e.key === 'Escape') this.hideInput();
    });

    this.inputContainer.appendChild(this.input);
    this.inputContainer.appendChild(sendBtn);
    this.container.appendChild(this.inputContainer);

    document.body.appendChild(this.container);

    // Botón para abrir chat
    this.chatBtn = document.createElement('div');
    this.chatBtn.style.cssText = `
      position: fixed;
      bottom: 220px;
      left: 160px;
      width: 44px;
      height: 44px;
      background: rgba(0,0,0,0.6);
      border: 1px solid rgba(255,255,255,0.2);
      border-radius: 50%;
      display: none;
      align-items: center;
      justify-content: center;
      z-index: 60;
      pointer-events: all;
      cursor: pointer;
      font-size: 1.1rem;
    `;
    this.chatBtn.textContent = '💬';
    this.chatBtn.addEventListener('touchstart', (e) => {
      e.preventDefault();
      this.toggleInput();
    }, { passive: false });
    document.body.appendChild(this.chatBtn);
  }

  setupVoiceIndicator() {
    // Indicadores de "hablando" sobre jugadores cercanos
    this.voiceIndicators = {};
  }

  show() {
    this.container.style.display = 'block';
    this.chatBtn.style.display = 'flex';
  }

  toggleInput() {
    const visible = this.inputContainer.style.display === 'flex';
    if (visible) {
      this.hideInput();
    } else {
      this.showInput();
    }
  }

  showInput() {
    this.inputContainer.style.display = 'flex';
    this.input.focus();
  }

  hideInput() {
    this.inputContainer.style.display = 'none';
    this.input.value = '';
    this.input.blur();
  }

  sendMessage() {
    const text = this.input.value.trim();
    if (!text) return;

    const playerName = this.game.playerName || 'Tú';
    const playerPos = this.game.player.camera.position;

    // Enviar por red con posición
    if (this.game.network.connected) {
      this.game.network.sendChatMessage(text, {
        x: playerPos.x,
        y: playerPos.y,
        z: playerPos.z
      });
    }

    // Mostrar propio mensaje
    this.addMessage(playerName, text, true, 0);
    this.hideInput();
  }

  receiveMessage(data) {
    if (!this.enabled) return;

    const playerPos = this.game.player.camera.position;
    const dx = data.x - playerPos.x;
    const dz = data.z - playerPos.z;
    const dist = Math.sqrt(dx*dx + dz*dz);

    // Solo mostrar si está dentro del radio de proximidad
    if (dist > this.maxDistance) return;

    const volume = Math.max(0.2, 1 - dist / this.maxDistance);
    this.addMessage(data.name, data.text, false, dist);

    // Mostrar burbuja sobre el jugador remoto
    this.showBubble(data.senderId, data.text);

    // Efecto de volumen en sonido si hay
    if (this.game.sounds) {
      this.game.sounds.setVolume(volume * 0.6);
      setTimeout(() => this.game.sounds.setVolume(0.6), 3000);
    }
  }

  addMessage(name, text, isLocal, dist) {
    const item = document.createElement('div');
    item.style.cssText = `
      background: rgba(0,0,0,0.65);
      border-left: 2px solid ${isLocal ? '#ff6b00' : '#00aaff'};
      border-radius: 0 6px 6px 0;
      padding: 3px 8px;
      animation: chatfade 8s ease forwards;
    `;

    const nameEl = document.createElement('span');
    nameEl.style.cssText = `
      color: ${isLocal ? '#ff6b00' : '#00aaff'};
      font-family: 'Arial Black', sans-serif;
      font-size: 0.55rem;
      letter-spacing: 1px;
    `;
    nameEl.textContent = name + ': ';

    const textEl = document.createElement('span');
    textEl.style.cssText = `
      color: #fff;
      font-family: Arial, sans-serif;
      font-size: 0.65rem;
    `;
    textEl.textContent = text;

    if (!isLocal && dist > 0) {
      const distEl = document.createElement('span');
      distEl.style.cssText = `
        color: #888;
        font-family: Arial, sans-serif;
        font-size: 0.55rem;
        margin-left: 4px;
      `;
      distEl.textContent = `(${Math.round(dist)}m)`;
      item.appendChild(nameEl);
      item.appendChild(textEl);
      item.appendChild(distEl);
    } else {
      item.appendChild(nameEl);
      item.appendChild(textEl);
    }

    this.messageList.appendChild(item);
    this.messages.push(item);

    if (!document.getElementById('chat-style')) {
      const style = document.createElement('style');
      style.id = 'chat-style';
      style.textContent = `
        @keyframes chatfade {
          0%   { opacity: 1; }
          70%  { opacity: 1; }
          100% { opacity: 0; }
        }
      `;
      document.head.appendChild(style);
    }

    // Auto eliminar después de 8 segundos
    setTimeout(() => {
      item.remove();
      this.messages = this.messages.filter(m => m !== item);
    }, 8000);

    // Limitar mensajes visibles
    if (this.messages.length > this.maxMessages) {
      const old = this.messages.shift();
      old.remove();
    }
  }

  showBubble(playerId, text) {
    const rp = this.game.remotePlayers[playerId];
    if (!rp) return;

    // Crear burbuja flotante sobre el jugador
    const bubble = document.createElement('div');
    bubble.style.cssText = `
      position: fixed;
      background: rgba(0,0,0,0.8);
      color: #fff;
      font-family: Arial, sans-serif;
      font-size: 0.65rem;
      padding: 4px 8px;
      border-radius: 8px;
      border: 1px solid rgba(0,170,255,0.5);
      max-width: 120px;
      text-align: center;
      word-break: break-word;
      pointer-events: none;
      z-index: 56;
      transform: translate(-50%, -100%);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    `;
    bubble.textContent = text.length > 30 ? text.slice(0, 30) + '...' : text;
    document.body.appendChild(bubble);

    // Actualizar posición de la burbuja
    const updatePos = () => {
      const camera = this.game.world.camera;
      const W = window.innerWidth;
      const H = window.innerHeight;

      const projMatrix = new THREE.Matrix4();
      projMatrix.multiplyMatrices(
        camera.projectionMatrix,
        camera.matrixWorldInverse
      );

      const pos = rp.mesh.position.clone();
      pos.y += 2.8;
      const projected = pos.clone().applyMatrix4(projMatrix);

      if (projected.z < 1) {
        const x = (projected.x * 0.5 + 0.5) * W;
        const y = (-projected.y * 0.5 + 0.5) * H;
        bubble.style.left = x + 'px';
        bubble.style.top = y + 'px';
        bubble.style.display = 'block';
      } else {
        bubble.style.display = 'none';
      }
    };

    const interval = setInterval(updatePos, 50);
    updatePos();

    setTimeout(() => {
      clearInterval(interval);
      bubble.style.transition = 'opacity 0.5s';
      bubble.style.opacity = '0';
      setTimeout(() => bubble.remove(), 500);
    }, 5000);
  }

  destroy() {
    this.container.remove();
    this.chatBtn.remove();
  }
        }
