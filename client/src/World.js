export class World {
  constructor(canvas) {
    this.canvas = canvas;
    this.game = null;
    this.bullets = [];

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
    this.renderer.fog = new THREE.Fog(0x87ceeb, 80, 300);
  }

  setupScene() {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x87ceeb);
    this.scene.fog = new THREE.Fog(0x87ceeb, 80, 300);
  }

  setupLights() {
    const ambient = new THREE.AmbientLight(0xffeedd, 0.6);
    this.scene.add(ambient);

    const sun = new THREE.DirectionalLight(0xfff5e0, 1.2);
    sun.position.set(80, 120, 60);
    sun.castShadow = true;
    sun.shadow.mapSize.width = 1024;
    sun.shadow.mapSize.height = 1024;
    sun.shadow.camera.near = 0.5;
    sun.shadow.camera.far = 400;
    sun.shadow.camera.left = -100;
    sun.shadow.camera.right = 100;
    sun.shadow.camera.top = 100;
    sun.shadow.camera.bottom = -100;
    sun.shadow.bias = -0.001;
    this.scene.add(sun);

    const fill = new THREE.DirectionalLight(0xaaddff, 0.3);
    fill.position.set(-50, 30, -50);
    this.scene.add(fill);
  }

  setupSky() {
    // Gradiente de cielo con un plano curvo
    const skyGeo = new THREE.SphereGeometry(400, 16, 8);
    const skyMat = new THREE.MeshBasicMaterial({
      color: 0x87ceeb,
      side: THREE.BackSide
    });
    this.scene.add(new THREE.Mesh(skyGeo, skyMat));

    // Nubes simples
    for (let i = 0; i < 12; i++) {
      this.createCloud(
        (Math.random() - 0.5) * 300,
        60 + Math.random() * 40,
        (Math.random() - 0.5) * 300
      );
    }
  }

  createCloud(x, y, z) {
    const group = new THREE.Group();
    const mat = new THREE.MeshLambertMaterial({ color: 0xffffff });
    const sizes = [
      [8, 4, 6], [12, 5, 8], [7, 4, 5]
    ];
    const offsets = [
      [0, 0, 0], [7, 1, 0], [-6, 0, 1]
    ];
    sizes.forEach((s, i) => {
      const geo = new THREE.BoxGeometry(s[0], s[1], s[2]);
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(offsets[i][0], offsets[i][1], offsets[i][2]);
      group.add(mesh);
    });
    group.position.set(x, y, z);
    this.scene.add(group);
  }

  buildMap() {
    this.mapObjects = [];

    // Suelo principal
    const groundGeo = new THREE.PlaneGeometry(400, 400, 20, 20);
    const groundMat = new THREE.MeshLambertMaterial({ color: 0x5a8a3c });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    this.scene.add(ground);

    // Caminos de tierra
    this.createPath(0, 0, 200, 8, true);
    this.createPath(0, 0, 200, 8, false);

    // Edificios
    const buildings = [
      { x: -30, z: -30, w: 14, h: 10, d: 12, color: 0x8B7355 },
      { x: 30, z: -25, w: 18, h: 14, d: 14, color: 0x9E8A6E },
      { x: -40, z: 20, w: 10, h: 8,  d: 10, color: 0x7A6548 },
      { x: 45, z: 30,  w: 16, h: 12, d: 12, color: 0x8B7355 },
      { x: 0,  z: -50, w: 20, h: 16, d: 15, color: 0x6B5C42 },
      { x: -60, z: -10,w: 12, h: 10, d: 10, color: 0x9E8A6E },
      { x: 60, z: -15, w: 14, h: 9,  d: 12, color: 0x7A6548 },
      { x: 20, z: 55,  w: 22, h: 18, d: 16, color: 0x8B7355 },
      { x: -20, z: 60, w: 12, h: 8,  d: 10, color: 0x6B5C42 },
    ];

    buildings.forEach(b => this.createBuilding(b));

    // Torre de vigilancia
    this.createWatchTower(50, -50);
    this.createWatchTower(-55, 45);

    // Rocas
    for (let i = 0; i < 20; i++) {
      this.createRock(
        (Math.random() - 0.5) * 180,
        (Math.random() - 0.5) * 180
      );
    }

    // Árboles
    for (let i = 0; i < 35; i++) {
      const x = (Math.random() - 0.5) * 350;
      const z = (Math.random() - 0.5) * 350;
      if (Math.abs(x) > 20 || Math.abs(z) > 20) {
        this.createTree(x, z);
      }
    }

    // Cajas de suministros
    const cratePositions = [
      [-15, -15], [15, -15], [-15, 15], [15, 15],
      [0, -30], [30, 0], [-30, 0], [0, 30]
    ];
    cratePositions.forEach(([x, z]) => this.createCrate(x, z));

    // Límites del mapa
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

    // Cuerpo
    const bodyGeo = new THREE.BoxGeometry(w, h, d);
    const bodyMat = new THREE.MeshLambertMaterial({ color });
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.position.y = h / 2;
    body.castShadow = true;
    body.receiveShadow = true;
    group.add(body);

    // Techo
    const roofGeo = new THREE.BoxGeometry(w + 0.5, 1, d + 0.5);
    const roofMat = new THREE.MeshLambertMaterial({ color: 0x5a4a35 });
    const roof = new THREE.Mesh(roofGeo, roofMat);
    roof.position.y = h + 0.5;
    roof.castShadow = true;
    group.add(roof);

    // Ventanas
    const winMat = new THREE.MeshLambertMaterial({ color: 0x88ccff, transparent: true, opacity: 0.6 });
    [[-w/4, h*0.6, d/2+0.1], [w/4, h*0.6, d/2+0.1]].forEach(([wx, wy, wz]) => {
      const winGeo = new THREE.PlaneGeometry(2, 2.5);
      const win = new THREE.Mesh(winGeo, winMat);
      win.position.set(wx, wy, wz);
      group.add(win);
    });

    group.position.set(x, 0, z);
    this.scene.add(group);
    this.mapObjects.push(body);
  }

  createWatchTower(x, z) {
    const group = new THREE.Group();
    const mat = new THREE.MeshLambertMaterial({ color: 0x8B6914 });

    // Patas
    [[-2,-2],[2,-2],[-2,2],[2,2]].forEach(([px, pz]) => {
      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.5, 10, 0.5), mat);
      leg.position.set(px, 5, pz);
      leg.castShadow = true;
      group.add(leg);
    });

    // Plataforma
    const platform = new THREE.Mesh(new THREE.BoxGeometry(6, 0.5, 6), mat);
    platform.position.y = 10;
    platform.castShadow = true;
    group.add(platform);

    // Cabina
    const cabin = new THREE.Mesh(new THREE.BoxGeometry(5, 3, 5),
      new THREE.MeshLambertMaterial({ color: 0x6B5010 }));
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
      color: new THREE.Color(0.45 + Math.random()*0.1, 0.42 + Math.random()*0.1, 0.38)
    });
    const rock = new THREE.Mesh(geo, mat);
    rock.position.set(x, size * 0.4, z);
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
      0.1 + Math.random() * 0.1,
      0.4 + Math.random() * 0.2,
      0.1
    );
    const leafMat = new THREE.MeshLambertMaterial({ color: leafColor });

    [0, 1.5, 2.8].forEach((yOff, i) => {
      const r = 2.5 - i * 0.5;
      const leaves = new THREE.Mesh(
        new THREE.ConeGeometry(r, 2.5, 7),
        leafMat
      );
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
      { x: 0,    z: -size, rx: 0, rz: 0, w: size*2, d: 2 },
      { x: 0,    z: size,  rx: 0, rz: 0, w: size*2, d: 2 },
      { x: -size,z: 0,     rx: 0, rz: 0, w: 2, d: size*2 },
      { x: size, z: 0,     rx: 0, rz: 0, w: 2, d: size*2 },
    ].forEach(w => {
      const mesh = new THREE.Mesh(
        new THREE.BoxGeometry(w.w, wallH, w.d),
        mat
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

    // Cuerpo
    const bodyMat = new THREE.MeshLambertMaterial({
      color: isLocal ? 0x2244aa : 0xcc2222
    });

    const body = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.8, 0.4), bodyMat);
    body.position.y = -0.4;
    body.castShadow = true;
    group.add(body);

    // Cabeza
    const headMat = new THREE.MeshLambertMaterial({ color: 0xffcc88 });
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.45, 0.45), headMat);
    head.position.y = 0.1;
    head.castShadow = true;
    group.add(head);

    // Casco
    const helmetMat = new THREE.MeshLambertMaterial({ color: isLocal ? 0x113388 : 0x880000 });
    const helmet = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.25, 0.48), helmetMat);
    helmet.position.y = 0.28;
    group.add(helmet);

    // Arma
    const gunMat = new THREE.MeshLambertMaterial({ color: 0x222222 });
    const gunBody = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.1, 0.5), gunMat);
    gunBody.position.set(0.3, -0.1, -0.2);
    group.add(gunBody);

    const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.4, 6), gunMat);
    barrel.rotation.x = Math.PI / 2;
    barrel.position.set(0.3, -0.08, -0.45);
    group.add(barrel);

    if (!isLocal) {
      this.scene.add(group);
    }

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
      new THREE.Vector3(0, 1, 0),
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
    // Actualizar trails de balas
    this.bullets = this.bullets.filter(b => {
      b.life -= 0.016;
      if (b.life <= 0) {
        this.scene.remove(b.mesh);
        return false;
      }
      return true;
    });

    this.renderer.render(this.scene, this.camera);
  }
  }
