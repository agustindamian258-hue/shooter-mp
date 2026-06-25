export class World {
  constructor(canvas) {
    this.canvas = canvas;
    this.game = null;
    this.bullets = [];
    this.dayTime = 0;
    this.dayDuration = 300;
    this.dayPhase = 'day';

    this.setupRenderer();
    this.setupScene();
    this.setupLights();
    this.setupSky();
    this.buildMap();
    this.setupCamera();

    window.addEventListener('resize', () => this.onResize());
  }

  setGame(game) {
    this.game = game;
  }

  setupRenderer() {
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: false,
      powerPreference: 'high-performance'
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.2;
  }

  setupScene() {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x87ceeb);
    this.scene.fog = new THREE.Fog(0x87ceeb, 80, 300);
  }

  setupLights() {
    this.ambientLight = new THREE.AmbientLight(0xffeedd, 0.6);
    this.scene.add(this.ambientLight);

    this.sunLight = new THREE.DirectionalLight(0xfff5e0, 1.2);
    this.sunLight.position.set(80, 120, 60);
    this.sunLight.castShadow = true;
    this.sunLight.shadow.mapSize.width = 1024;
    this.sunLight.shadow.mapSize.height = 1024;
    this.sunLight.shadow.camera.near = 0.5;
    this.sunLight.shadow.camera.far = 400;
    this.sunLight.shadow.camera.left = -100;
    this.sunLight.shadow.camera.right = 100;
    this.sunLight.shadow.camera.top = 100;
    this.sunLight.shadow.camera.bottom = -100;
    this.sunLight.shadow.bias = -0.001;
    this.scene.add(this.sunLight);

    this.fillLight = new THREE.DirectionalLight(0xaaddff, 0.3);
    this.fillLight.position.set(-50, 30, -50);
    this.scene.add(this.fillLight);

    // Luna para la noche
    this.moonLight = new THREE.DirectionalLight(0x334466, 0);
    this.moonLight.position.set(-80, 100, -60);
    this.scene.add(this.moonLight);

    // Estrellas
    this.starsGroup = this.createStars();
    this.starsGroup.visible = false;
    this.scene.add(this.starsGroup);
  }

  createStars() {
    const group = new THREE.Group();
    const geo = new THREE.BufferGeometry();
    const count = 500;
    const positions = new Float32Array(count * 3);

    for (let i = 0; i < count; i++) {
      positions[i*3]   = (Math.random() - 0.5) * 800;
      positions[i*3+1] = 100 + Math.random() * 200;
      positions[i*3+2] = (Math.random() - 0.5) * 800;
    }

    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const mat = new THREE.PointsMaterial({
      color: 0xffffff,
      size: 0.8,
      transparent: true,
      opacity: 0
    });

    this.starPoints = new THREE.Points(geo, mat);
    group.add(this.starPoints);
    return group;
  }

  setupSky() {
    this.skyMesh = new THREE.Mesh(
      new THREE.SphereGeometry(400, 16, 8),
      new THREE.MeshBasicMaterial({ color: 0x87ceeb, side: THREE.BackSide })
    );
    this.scene.add(this.skyMesh);

    // Sol visible
    const sunGeo = new THREE.SphereGeometry(8, 12, 12);
    const sunMat = new THREE.MeshBasicMaterial({ color: 0xffee88 });
    this.sunMesh = new THREE.Mesh(sunGeo, sunMat);
    this.sunMesh.position.set(80, 120, 60);
    this.scene.add(this.sunMesh);

    // Luna
    const moonGeo = new THREE.SphereGeometry(6, 12, 12);
    const moonMat = new THREE.MeshBasicMaterial({ color: 0xddddff });
    this.moonMesh = new THREE.Mesh(moonGeo, moonMat);
    this.moonMesh.position.set(-80, 100, -60);
    this.moonMesh.visible = false;
    this.scene.add(this.moonMesh);

    // Nubes
    this.clouds = [];
    for (let i = 0; i < 12; i++) {
      const cloud = this.createCloud(
        (Math.random() - 0.5) * 300,
        60 + Math.random() * 40,
        (Math.random() - 0.5) * 300
      );
      this.clouds.push(cloud);
    }
  }

  createCloud(x, y, z) {
    const group = new THREE.Group();
    const mat = new THREE.MeshLambertMaterial({ color: 0xffffff });
    const sizes = [[8,4,6],[12,5,8],[7,4,5]];
    const offsets = [[0,0,0],[7,1,0],[-6,0,1]];
    sizes.forEach((s, i) => {
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(s[0],s[1],s[2]), mat);
      mesh.position.set(offsets[i][0], offsets[i][1], offsets[i][2]);
      group.add(mesh);
    });
    group.position.set(x, y, z);
    this.scene.add(group);
    return group;
  }

  updateDayNight(dt) {
    this.dayTime += dt;
    if (this.dayTime > this.dayDuration) this.dayTime = 0;

    const t = this.dayTime / this.dayDuration;
    const angle = t * Math.PI * 2;

    // Posición del sol y luna
    const sunX = Math.cos(angle) * 150;
    const sunY = Math.sin(angle) * 120;
    const sunZ = 60;

    this.sunLight.position.set(sunX, sunY, sunZ);
    this.sunMesh.position.set(sunX, sunY, sunZ);
    this.moonLight.position.set(-sunX, -sunY, -sunZ);
    this.moonMesh.position.set(-sunX * 0.8, -sunY * 0.8, -sunZ);

    // Fases del día
    let skyColor, fogColor, ambientIntensity, sunIntensity, moonIntensity;
    let starOpacity = 0;

    if (t < 0.25) {
      // Amanecer
      const f = t / 0.25;
      skyColor = new THREE.Color().lerpColors(
        new THREE.Color(0x1a0a2e),
        new THREE.Color(0xff7043),
        f
      );
      ambientIntensity = 0.1 + f * 0.5;
      sunIntensity = f * 1.2;
      moonIntensity = (1 - f) * 0.3;
      starOpacity = 1 - f;
      this.dayPhase = 'dawn';
    } else if (t < 0.5) {
      // Día
      const f = (t - 0.25) / 0.25;
      skyColor = new THREE.Color().lerpColors(
        new THREE.Color(0xff7043),
        new THREE.Color(0x87ceeb),
        f
      );
      ambientIntensity = 0.6;
      sunIntensity = 1.2;
      moonIntensity = 0;
      starOpacity = 0;
      this.dayPhase = 'day';
    } else if (t < 0.75) {
      // Atardecer
      const f = (t - 0.5) / 0.25;
      skyColor = new THREE.Color().lerpColors(
        new THREE.Color(0x87ceeb),
        new THREE.Color(0xff5722),
        f
      );
      ambientIntensity = 0.6 - f * 0.5;
      sunIntensity = 1.2 - f * 1.2;
      moonIntensity = f * 0.3;
      starOpacity = f * 0.5;
      this.dayPhase = 'dusk';
    } else {
      // Noche
      const f = (t - 0.75) / 0.25;
      skyColor = new THREE.Color().lerpColors(
        new THREE.Color(0xff5722),
        new THREE.Color(0x0a0a1a),
        f
      );
      ambientIntensity = 0.1;
      sunIntensity = 0;
      moonIntensity = 0.3;
      starOpacity = f;
      this.dayPhase = 'night';
    }

    // Aplicar colores
    this.scene.background = skyColor;
    this.scene.fog.color = skyColor;
    this.skyMesh.material.color = skyColor;
    this.ambientLight.intensity = ambientIntensity;
    this.sunLight.intensity = sunIntensity;
    this.moonLight.intensity = moonIntensity;

    // Sol/Luna visibilidad
    this.sunMesh.visible = sunY > -20;
    this.moonMesh.visible = -sunY > -20;

    // Estrellas
    this.starsGroup.visible = starOpacity > 0;
    if (this.starPoints) {
      this.starPoints.material.opacity = starOpacity;
    }

    // Mover nubes lentamente
    this.clouds.forEach((cloud, i) => {
      cloud.position.x += dt * 0.5 * (i % 2 === 0 ? 1 : -1);
      if (cloud.position.x > 200) cloud.position.x = -200;
      if (cloud.position.x < -200) cloud.position.x = 200;
    });

    // Niebla densa de noche
    this.scene.fog.far = this.dayPhase === 'night' ? 150 : 300;
    this.scene.fog.near = this.dayPhase === 'night' ? 40 : 80;

    // Exposición del renderer
    this.renderer.toneMappingExposure = this.dayPhase === 'night' ? 0.6 : 1.2;

    // Mostrar indicador de hora en HUD
    if (this.game && this.game.hud) {
      const hours = Math.floor(t * 24);
      const mins = Math.floor((t * 24 - hours) * 60);
      const timeStr = `${String(hours).padStart(2,'0')}:${String(mins).padStart(2,'0')}`;
      this.updateTimeDisplay(timeStr, this.dayPhase);
    }
  }

  updateTimeDisplay(time, phase) {
    if (!this.timeDisplay) {
      this.timeDisplay = document.createElement('div');
      this.timeDisplay.style.cssText = `
        position: fixed;
        top: 10px;
        left: 50%;
        transform: translateX(-50%);
        color: #fff;
        font-family: 'Arial Black', sans-serif;
        font-size: 0.65rem;
        letter-spacing: 2px;
        text-shadow: 0 1px 3px #000;
        background: rgba(0,0,0,0.4);
        padding: 3px 10px;
        border-radius: 6px;
        pointer-events: none;
        z-index: 55;
        display: none;
      `;
      document.body.appendChild(this.timeDisplay);
    }
    this.timeDisplay.style.display = 'block';
    const icons = { day:'☀️', dawn:'🌅', dusk:'🌆', night:'🌙' };
    this.timeDisplay.textContent = `${icons[phase] || '☀️'} ${time}`;
  }

  buildMap() {
    this.mapObjects = [];

    const groundGeo = new THREE.PlaneGeometry(400, 400, 20, 20);
    const groundMat = new THREE.MeshLambertMaterial({ color: 0x5a8a3c });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    this.scene.add(ground);

    this.createPath(0, 0, 200, 8, true);
    this.createPath(0, 0, 200, 8, false);

    const buildings = [
      { x: -30, z: -30, w: 14, h: 10, d: 12, color: 0x8B7355 },
      { x: 30,  z: -25, w: 18, h: 14, d: 14, color: 0x9E8A6E },
      { x: -40, z: 20,  w: 10, h: 8,  d: 10, color: 0x7A6548 },
      { x: 45,  z: 30,  w: 16, h: 12, d: 12, color: 0x8B7355 },
      { x: 0,   z: -50, w: 20, h: 16, d: 15, color: 0x6B5C42 },
      { x: -60, z: -10, w: 12, h: 10, d: 10, color: 0x9E8A6E },
      { x: 60,  z: -15, w: 14, h: 9,  d: 12, color: 0x7A6548 },
      { x: 20,  z: 55,  w: 22, h: 18, d: 16, color: 0x8B7355 },
      { x: -20, z: 60,  w: 12, h: 8,  d: 10, color: 0x6B5C42 },
    ];
    buildings.forEach(b => this.createBuilding(b));

    this.createWatchTower(50, -50);
    this.createWatchTower(-55, 45);

    for (let i = 0; i < 20; i++) {
      this.createRock(
        (Math.random() - 0.5) * 180,
        (Math.random() - 0.5) * 180
      );
    }

    for (let i = 0; i < 35; i++) {
      const x = (Math.random() - 0.5) * 350;
      const z = (Math.random() - 0.5) * 350;
      if (Math.abs(x) > 20 || Math.abs(z) > 20) {
        this.createTree(x, z);
      }
    }

    const cratePositions = [
      [-15,-15],[15,-15],[-15,15],[15,15],
      [0,-30],[30,0],[-30,0],[0,30]
    ];
    cratePositions.forEach(([x,z]) => this.createCrate(x,z));

    this.createBoundaries();
  }

  createPath(x, z, length, width, alongX) {
    const geo = new THREE.PlaneGeometry(
      alongX ? length : width,
      alongX ? width : length
    );
    const mat = new THREE.MeshLambertMaterial({ color: 0xa0865a });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.set(x, 0.01, z);
    mesh.receiveShadow = true;
    this.scene.add(mesh);
  }

  createBuilding({ x, z, w, h, d, color }) {
    const group = new THREE.Group();
    const bodyMat = new THREE.MeshLambertMaterial({ color });
    const body = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), bodyMat);
    body.position.y = h / 2;
    body.castShadow = true;
    body.receiveShadow = true;
    group.add(body);

    const roofMat = new THREE.MeshLambertMaterial({ color: 0x5a4a35 });
    const roof = new THREE.Mesh(new THREE.BoxGeometry(w+0.5, 1, d+0.5), roofMat);
    roof.position.y = h + 0.5;
    roof.castShadow = true;
    group.add(roof);

    const winMat = new THREE.MeshLambertMaterial({
      color: 0x88ccff, transparent: true, opacity: 0.6
    });
    [[-w/4, h*0.6, d/2+0.1],[w/4, h*0.6, d/2+0.1]].forEach(([wx,wy,wz]) => {
      const win = new THREE.Mesh(new THREE.PlaneGeometry(2, 2.5), winMat);
      win.position.set(wx, wy, wz);
      group.add(win);
    });

    // Luces de ventana de noche
    const lightGeo = new THREE.PlaneGeometry(1.8, 2.3);
    const lightMat = new THREE.MeshBasicMaterial({
      color: 0xffee88, transparent: true, opacity: 0
    });
    this.windowLights = this.windowLights || [];
    [[-w/4, h*0.6, d/2+0.11],[w/4, h*0.6, d/2+0.11]].forEach(([wx,wy,wz]) => {
      const light = new THREE.Mesh(lightGeo, lightMat.clone());
      light.position.set(wx, wy, wz);
      group.add(light);
      this.windowLights.push(light);
    });

    group.position.set(x, 0, z);
    this.scene.add(group);
    this.mapObjects.push(body);
  }

  createWatchTower(x, z) {
    const group = new THREE.Group();
    const mat = new THREE.MeshLambertMaterial({ color: 0x8B6914 });
    [[-2,-2],[2,-2],[-2,2],[2,2]].forEach(([px,pz]) => {
      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.5,10,0.5), mat);
      leg.position.set(px, 5, pz);
      leg.castShadow = true;
      group.add(leg);
    });
    const platform = new THREE.Mesh(new THREE.BoxGeometry(6,0.5,6), mat);
    platform.position.y = 10;
    platform.castShadow = true;
    group.add(platform);
    const cabin = new THREE.Mesh(
      new THREE.BoxGeometry(5,3,5),
      new THREE.MeshLambertMaterial({ color: 0x6B5010 })
    );
    cabin.position.y = 12;
    cabin.castShadow = true;
    group.add(cabin);
    group.position.set(x, 0, z);
    this.scene.add(group);
    this.mapObjects.push(platform);
  }

  createRock(x, z) {
    const size = 1 + Math.random() * 2.5;
    const geo = new THREE.DodecahedronGeometry(size, 0);
    const mat = new THREE.MeshLambertMaterial({
      color: new THREE.Color(0.45+Math.random()*0.1, 0.42+Math.random()*0.1, 0.38)
    });
    const rock = new THREE.Mesh(geo, mat);
    rock.position.set(x, size*0.4, z);
    rock.rotation.y = Math.random() * Math.PI * 2;
    rock.castShadow = true;
    rock.receiveShadow = true;
    this.scene.add(rock);
    this.mapObjects.push(rock);
  }

  createTree(x, z) {
    const group = new THREE.Group();
    const trunkH = 3 + Math.random() * 2;
    const trunk = new THREE.Mesh(
      new THREE.CylinderGeometry(0.3, 0.5, trunkH, 6),
      new THREE.MeshLambertMaterial({ color: 0x6B4226 })
    );
    trunk.position.y = trunkH / 2;
    trunk.castShadow = true;
    group.add(trunk);

    const leafColor = new THREE.Color(
      0.1+Math.random()*0.1,
      0.4+Math.random()*0.2,
      0.1
    );
    const leafMat = new THREE.MeshLambertMaterial({ color: leafColor });
    [0, 1.5, 2.8].forEach((yOff) => {
      const r = 2.5 - yOff * 0.3;
      const leaves = new THREE.Mesh(new THREE.ConeGeometry(r, 2.5, 7), leafMat);
      leaves.position.y = trunkH + yOff;
      leaves.castShadow = true;
      group.add(leaves);
    });

    group.position.set(x, 0, z);
    group.rotation.y = Math.random() * Math.PI * 2;
    this.scene.add(group);
    this.mapObjects.push(trunk);
  }

  createCrate(x, z) {
    const geo = new THREE.BoxGeometry(1.5, 1.5, 1.5);
    const mat = new THREE.MeshLambertMaterial({ color: 0xcc8800 });
    const crate = new THREE.Mesh(geo, mat);
    crate.position.set(x, 0.75, z);
    crate.castShadow = true;
    crate.receiveShadow = true;
    this.scene.add(crate);
    this.mapObjects.push(crate);
  }

  createBoundaries() {
    const mat = new THREE.MeshLambertMaterial({ color: 0x4a6b3a });
    const wallH = 8;
    const size = 200;
    [
      { x:0,     z:-size, w:size*2, d:2 },
      { x:0,     z:size,  w:size*2, d:2 },
      { x:-size, z:0,     w:2, d:size*2 },
      { x:size,  z:0,     w:2, d:size*2 },
    ].forEach(w => {
      const mesh = new THREE.Mesh(
        new THREE.BoxGeometry(w.w, wallH, w.d), mat
      );
      mesh.position.set(w.x, wallH/2, w.z);
      mesh.castShadow = true;
      this.scene.add(mesh);
      this.mapObjects.push(mesh);
    });
  }

  setupCamera() {
    this.camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      400
    );
    this.camera.position.set(0, 1.7, 0);
  }

  createPlayerMesh(isLocal = false) {
    const group = new THREE.Group();
    const bodyMat = new THREE.MeshLambertMaterial({
      color: isLocal ? 0x2244aa : 0xcc2222
    });
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.8, 0.4), bodyMat);
    body.position.y = -0.4;
    body.castShadow = true;
    group.add(body);

    const headMat = new THREE.MeshLambertMaterial({ color: 0xffcc88 });
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.45, 0.45), headMat);
    head.position.y = 0.1;
    head.castShadow = true;
    group.add(head);

    const helmetMat = new THREE.MeshLambertMaterial({
      color: isLocal ? 0x113388 : 0x880000
    });
    const helmet = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.25, 0.48), helmetMat);
    helmet.position.y = 0.28;
    group.add(helmet);

    const gunMat = new THREE.MeshLambertMaterial({ color: 0x222222 });
    const gunBody = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.1, 0.5), gunMat);
    gunBody.position.set(0.3, -0.1, -0.2);
    group.add(gunBody);

    const barrel = new THREE.Mesh(
      new THREE.CylinderGeometry(0.025, 0.025, 0.4, 6), gunMat
    );
    barrel.rotation.x = Math.PI / 2;
    barrel.position.set(0.3, -0.08, -0.45);
    group.add(barrel);

    if (!isLocal) this.scene.add(group);
    return group;
  }

  spawnBulletTrail(from, to) {
    const dir = new THREE.Vector3().subVectors(to, from);
    const length = dir.length();
    const geo = new THREE.CylinderGeometry(0.02, 0.02, length, 4);
    const mat = new THREE.MeshBasicMaterial({ color: 0xffee44 });
    const trail = new THREE.Mesh(geo, mat);
    const mid = new THREE.Vector3().addVectors(from, to).multiplyScalar(0.5);
    trail.position.copy(mid);
    trail.quaternion.setFromUnitVectors(
      new THREE.Vector3(0,1,0),
      dir.normalize()
    );
    this.scene.add(trail);
    this.bullets.push({ mesh: trail, life: 0.08 });
  }

  onResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  render() {
    const dt = 0.016;

    // Actualizar ciclo día/noche
    this.updateDayNight(dt);

    // Luces de ventanas de noche
    if (this.windowLights) {
      const isNight = this.dayPhase === 'night' || this.dayPhase === 'dusk';
      this.windowLights.forEach(light => {
        light.material.opacity = isNight ? 0.7 : 0;
      });
    }

    // Bullets
    this.bullets = this.bullets.filter(b => {
      b.life -= dt;
      if (b.life <= 0) {
        this.scene.remove(b.mesh);
        return false;
      }
      return true;
    });

    this.renderer.render(this.scene, this.camera);
  }
                   }
