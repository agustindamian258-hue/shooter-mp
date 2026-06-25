export class LootSystem {
  constructor(world, game) {
    this.world = world;
    this.game = game;
    this.items = {};
    this.itemIdCounter = 0;
    this.pickupRadius = 2.5;

    this.itemTypes = {
      rifle:   { color: 0x2244aa, label: 'RIFLE',   type: 'weapon', h: 0.3 },
      shotgun: { color: 0x884400, label: 'SHOTGUN', type: 'weapon', h: 0.3 },
      sniper:  { color: 0x224422, label: 'SNIPER',  type: 'weapon', h: 0.3 },
      pistol:  { color: 0x444444, label: 'PISTOL',  type: 'weapon', h: 0.25 },
      ammo:    { color: 0xffcc00, label: 'MUNICIÓN',type: 'ammo',   h: 0.2 },
      shield:  { color: 0x0088ff, label: 'ESCUDO',  type: 'shield', h: 0.25 },
      medkit:  { color: 0xff2222, label: 'MEDKIT',  type: 'health', h: 0.25 }
    };

    this.labelContainer = document.createElement('div');
    this.labelContainer.style.cssText = `
      position: fixed;
      inset: 0;
      pointer-events: none;
      z-index: 51;
      overflow: hidden;
    `;
    document.body.appendChild(this.labelContainer);

    this.spawnInitialLoot();
  }

  spawnInitialLoot() {
    const spawns = [
      { type: 'rifle',   x: 10,  z: 10  },
      { type: 'shotgun', x: -15, z: 20  },
      { type: 'sniper',  x: 30,  z: -10 },
      { type: 'pistol',  x: -10, z: -15 },
      { type: 'ammo',    x: 5,   z: -20 },
      { type: 'ammo',    x: -20, z: 5   },
      { type: 'ammo',    x: 20,  z: 20  },
      { type: 'shield',  x: -5,  z: 30  },
      { type: 'shield',  x: 25,  z: -25 },
      { type: 'medkit',  x: -30, z: -10 },
      { type: 'medkit',  x: 15,  z: 35  },
      { type: 'rifle',   x: -40, z: 20  },
      { type: 'shotgun', x: 40,  z: 10  },
      { type: 'ammo',    x: 0,   z: 40  },
      { type: 'shield',  x: -20, z: -30 },
    ];

    spawns.forEach(s => this.spawnItem(s.type, s.x, 0.5, s.z));
  }

  spawnItem(type, x, y, z) {
    const info = this.itemTypes[type];
    if (!info) return;

    const id = 'item_' + (this.itemIdCounter++);
    const group = new THREE.Group();

    // Cuerpo del item
    const geo = type === 'medkit'
      ? new THREE.BoxGeometry(0.5, 0.5, 0.5)
      : type === 'ammo'
      ? new THREE.BoxGeometry(0.4, 0.25, 0.3)
      : new THREE.BoxGeometry(0.6, info.h, 0.15);

    const mat = new THREE.MeshLambertMaterial({ color: info.color });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.castShadow = true;
    group.add(mesh);

    // Cruz para medkit
    if (type === 'medkit') {
      const crossH = new THREE.Mesh(
        new THREE.BoxGeometry(0.35, 0.1, 0.1),
        new THREE.MeshLambertMaterial({ color: 0xffffff })
      );
      const crossV = new THREE.Mesh(
        new THREE.BoxGeometry(0.1, 0.1, 0.35),
        new THREE.MeshLambertMaterial({ color: 0xffffff })
      );
      crossH.position.y = 0.26;
      crossV.position.y = 0.26;
      group.add(crossH);
      group.add(crossV);
    }

    // Brillo debajo del item
    const glowGeo = new THREE.CircleGeometry(0.5, 12);
    const glowMat = new THREE.MeshBasicMaterial({
      color: info.color,
      transparent: true,
      opacity: 0.3
    });
    const glow = new THREE.Mesh(glowGeo, glowMat);
    glow.rotation.x = -Math.PI / 2;
    glow.position.y = -0.24;
    group.add(glow);

    group.position.set(x, y, z);
    this.world.scene.add(group);

    // Label HTML
    const label = document.createElement('div');
    label.style.cssText = `
      position: absolute;
      transform: translate(-50%, -100%);
      background: rgba(0,0,0,0.7);
      color: #fff;
      font-family: 'Arial Black', sans-serif;
      font-size: 0.55rem;
      letter-spacing: 1px;
      padding: 2px 6px;
      border-radius: 4px;
      border: 1px solid rgba(255,255,255,0.2);
      white-space: nowrap;
      pointer-events: none;
      display: none;
    `;
    label.textContent = `[${info.label}]`;
    this.labelContainer.appendChild(label);

    this.items[id] = {
      id, type, group, mesh, glow, label,
      x, y, z,
      bobOffset: Math.random() * Math.PI * 2,
      info
    };

    return id;
  }

  respawnItem(type) {
    const x = (Math.random() - 0.5) * 160;
    const z = (Math.random() - 0.5) * 160;
    setTimeout(() => {
      this.spawnItem(type, x, 0.5, z);
    }, 15000);
  }

  update(dt) {
    const camera = this.game.world.camera;
    const playerPos = camera.position;
    const W = window.innerWidth;
    const H = window.innerHeight;

    const projMatrix = new THREE.Matrix4();
    projMatrix.multiplyMatrices(
      camera.projectionMatrix,
      camera.matrixWorldInverse
    );

    const time = Date.now() * 0.002;

    Object.values(this.items).forEach(item => {
      // Bobbing
      item.group.position.y = item.y + Math.sin(time + item.bobOffset) * 0.15;
      item.group.rotation.y += dt * 1.2;

      // Glow pulse
      item.glow.material.opacity = 0.15 + Math.sin(time * 2 + item.bobOffset) * 0.15;

      // Distancia al jugador
      const dx = item.x - playerPos.x;
      const dz = item.z - playerPos.z;
      const dist = Math.sqrt(dx*dx + dz*dz);

      // Mostrar label si está cerca
      if (dist < 15) {
        const pos = item.group.position.clone();
        pos.y += 1;
        const projected = pos.clone().applyMatrix4(projMatrix);

        if (projected.z < 1) {
          const sx = (projected.x * 0.5 + 0.5) * W;
          const sy = (-projected.y * 0.5 + 0.5) * H;
          item.label.style.display = 'block';
          item.label.style.left = sx + 'px';
          item.label.style.top = sy + 'px';
        } else {
          item.label.style.display = 'none';
        }
      } else {
        item.label.style.display = 'none';
      }

      // Auto pickup si está muy cerca
      if (dist < this.pickupRadius) {
        this.pickup(item.id);
      }
    });
  }

  pickup(id) {
    const item = this.items[id];
    if (!item) return;

    const game = this.game;
    const type = item.type;
    const info = item.info;

    switch (info.type) {
      case 'weapon':
        if (game.weapons) {
          game.weapons.pickupWeapon(type);
          this.showPickupMsg(`🔫 ${info.label} equipado`);
        }
        break;

      case 'ammo':
        if (game.weapons) {
          const w = game.weapons.currentWeapon;
          w.reserve = Math.min(w.reserve + 30, 999);
          game.weapons.weapons[game.weapons.currentWeaponKey].reserve = w.reserve;
          if (game.hud) game.hud.updateAmmo(w.ammo, w.reserve);
          this.showPickupMsg('🔶 +30 MUNICIÓN');
        }
        break;

      case 'health':
        if (game.player && game.player.health < 100) {
          game.player.health = Math.min(100, game.player.health + 40);
          if (game.hud) game.hud.updateHealth(game.player.health);
          this.showPickupMsg('❤ +40 HP');
        } else {
          return;
        }
        break;

      case 'shield':
        if (game.shield) {
          game.shield.pickup(25);
          this.showPickupMsg('🛡 +25 ESCUDO');
        }
        break;
    }

    if (game.sounds) game.sounds.playBuffer(
      game.sounds.sounds.hitConfirm, 0.5
    );

    // Remover item
    this.world.scene.remove(item.group);
    item.label.remove();
    delete this.items[id];

    // Respawnear después de un tiempo
    this.respawnItem(type);
  }

  showPickupMsg(text) {
    const div = document.createElement('div');
    div.style.cssText = `
      position: fixed;
      top: 35%;
      left: 50%;
      transform: translateX(-50%);
      color: #fff;
      font-family: 'Arial Black', sans-serif;
      font-size: 0.8rem;
      letter-spacing: 2px;
      text-shadow: 0 2px 6px #000;
      pointer-events: none;
      z-index: 70;
      background: rgba(0,0,0,0.6);
      padding: 6px 16px;
      border-radius: 8px;
      animation: pickupfade 1.2s ease forwards;
    `;
    div.textContent = text;
    document.body.appendChild(div);

    if (!document.getElementById('pickup-style')) {
      const style = document.createElement('style');
      style.id = 'pickup-style';
      style.textContent = `
        @keyframes pickupfade {
          0% { opacity:1; transform:translateX(-50%) translateY(0); }
          100% { opacity:0; transform:translateX(-50%) translateY(-40px); }
        }
      `;
      document.head.appendChild(style);
    }

    setTimeout(() => div.remove(), 1200);
  }

  destroy() {
    Object.values(this.items).forEach(item => {
      this.world.scene.remove(item.group);
      item.label.remove();
    });
    this.items = {};
    this.labelContainer.remove();
  }
       }
