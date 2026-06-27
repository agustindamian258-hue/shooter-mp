export class World {
  constructor(canvas) {
    this.canvas = canvas;
    this.game = null;
    this.bullets = [];
    this.dayTime = 0;
    this.dayDuration = 300;
    this.dayPhase = 'day';
    this.windowLights = [];

    this.setupRenderer();
    this.setupScene();
    this.setupLights();
    this.setupSky();
    this.buildMap();
    this.setupCamera();

    window.addEventListener('resize', () => this.onResize());
  }

  setGame(game) { this.game = game; }

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
    this.scene.fog = new THREE.Fog(0x87ceeb, 80, 400);
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
    this.sunLight.shadow.camera.far = 500;
    this.sunLight.shadow.camera.left = -150;
    this.sunLight.shadow.camera.right = 150;
    this.sunLight.shadow.camera.top = 150;
    this.sunLight.shadow.camera.bottom = -150;
    this.sunLight.shadow.bias = -0.001;
    this.scene.add(this.sunLight);

    this.fillLight = new THREE.DirectionalLight(0xaaddff, 0.3);
    this.fillLight.position.set(-50, 30, -50);
    this.scene.add(this.fillLight);

    this.moonLight = new THREE.DirectionalLight(0x334466, 0);
    this.moonLight.position.set(-80, 100, -60);
    this.scene.add(this.moonLight);

    this.starsGroup = this.createStars();
    this.starsGroup.visible = false;
    this.scene.add(this.starsGroup);
  }

  createStars() {
    const group = new THREE.Group();
    const geo = new THREE.BufferGeometry();
    const count = 600;
    const positions = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      positions[i*3]   = (Math.random() - 0.5) * 1000;
      positions[i*3+1] = 100 + Math.random() * 200;
      positions[i*3+2] = (Math.random() - 0.5) * 1000;
    }
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const mat = new THREE.PointsMaterial({
      color: 0xffffff, size: 0.8, transparent: true, opacity: 0
    });
    this.starPoints = new THREE.Points(geo, mat);
    group.add(this.starPoints);
    return group;
  }

  setupSky() {
    this.skyMesh = new THREE.Mesh(
      new THREE.SphereGeometry(500, 16, 8),
      new THREE.MeshBasicMaterial({ color: 0x87ceeb, side: THREE.BackSide })
    );
    this.scene.add(this.skyMesh);

    const sunGeo = new THREE.SphereGeometry(10, 12, 12);
    const sunMat = new THREE.MeshBasicMaterial({ color: 0xffee88 });
    this.sunMesh = new THREE.Mesh(sunGeo, sunMat);
    this.scene.add(this.sunMesh);

    const moonGeo = new THREE.SphereGeometry(7, 12, 12);
    const moonMat = new THREE.MeshBasicMaterial({ color: 0xddddff });
    this.moonMesh = new THREE.Mesh(moonGeo, moonMat);
    this.moonMesh.visible = false;
    this.scene.add(this.moonMesh);

    this.clouds = [];
    for (let i = 0; i < 20; i++) {
      const cloud = this.createCloud(
        (Math.random() - 0.5) * 500,
        60 + Math.random() * 50,
        (Math.random() - 0.5) * 500
      );
      this.clouds.push(cloud);
    }
  }

  createCloud(x, y, z) {
    const group = new THREE.Group();
    const mat = new THREE.MeshLambertMaterial({ color: 0xffffff });
    const sizes = [[10,5,8],[15,6,10],[9,5,7],[12,4,9]];
    const offsets = [[0,0,0],[9,1,0],[-8,0,1],[4,2,-3]];
    sizes.forEach((s, i) => {
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(s[0],s[1],s[2]), mat);
      mesh.position.set(offsets[i][0], offsets[i][1], offsets[i][2]);
      group.add(mesh);
    });
    group.position.set(x, y, z);
    this.scene.add(group);
    return group;
  }

  buildMap() {
    this.mapObjects = [];
    const mapSize = 600;

    // Suelo base
    const groundMat = new THREE.MeshLambertMaterial({ color: 0x5a8a3c });
    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(mapSize, mapSize, 30, 30), groundMat
    );
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    this.scene.add(ground);

    // === BIOMA 1: CIUDAD (centro) ===
    this.buildCity();

    // === BIOMA 2: BOSQUE (norte) ===
    this.buildForest(0, -150, 200, 150);

    // === BIOMA 3: PLAYA (sur) ===
    this.buildBeach(0, 180);

    // === BIOMA 4: ZONA INDUSTRIAL (este) ===
    this.buildIndustrial(180, 0);

    // === BIOMA 5: ALDEA (oeste) ===
    this.buildVillage(-180, 0);

    // === BUNKER SUBTERRÁNEO ===
    this.buildBunker(0, 0);

    // Caminos principales
    this.createRoad(0, 0, mapSize, 10, true);
    this.createRoad(0, 0, mapSize, 10, false);
    this.createRoad(100, -100, 150, 7, true);
    this.createRoad(-100, 100, 150, 7, false);

    // Río
    this.buildRiver();

    // Torres de vigilancia
    this.createWatchTower(80, -80);
    this.createWatchTower(-80, 80);
    this.createWatchTower(120, 120);
    this.createWatchTower(-120, -120);

    // Rocas dispersas
    for (let i = 0; i < 40; i++) {
      this.createRock(
        (Math.random() - 0.5) * 500,
        (Math.random() - 0.5) * 500
      );
    }

    // Cajas de loot
    const cratePos = [
      [0,-20],[20,0],[-20,0],[0,20],
      [50,-50],[-50,50],[50,50],[-50,-50],
      [100,0],[-100,0],[0,100],[0,-100]
    ];
    cratePos.forEach(([x,z]) => this.createCrate(x,z));

    // Límites del mapa
    this.createBoundaries(mapSize / 2);
  }

  buildCity() {
    // Edificios altos con múltiples pisos
    const cityBuildings = [
      { x:-30, z:-30, w:14, floors:3, d:12, color:0x8B7355 },
      { x:30,  z:-25, w:18, floors:4, d:14, color:0x9E8A6E },
      { x:-40, z:20,  w:10, floors:2, d:10, color:0x7A6548 },
      { x:45,  z:30,  w:16, floors:3, d:12, color:0x8B7355 },
      { x:0,   z:-50, w:20, floors:5, d:15, color:0x6B5C42 },
      { x:-60, z:-10, w:12, floors:2, d:10, color:0x9E8A6E },
      { x:60,  z:-15, w:14, floors:3, d:12, color:0x7A6548 },
      { x:20,  z:55,  w:22, floors:4, d:16, color:0x8B7355 },
      { x:-20, z:60,  w:12, floors:2, d:10, color:0x6B5C42 },
      { x:70,  z:60,  w:18, floors:6, d:14, color:0x5a4a35 },
      { x:-70, z:-60, w:16, floors:5, d:12, color:0x7A6548 },
    ];
    cityBuildings.forEach(b => this.createMultiFloorBuilding(b));

    // Plaza central
    const plazaMat = new THREE.MeshLambertMaterial({ color: 0x999977 });
    const plaza = new THREE.Mesh(new THREE.PlaneGeometry(30, 30), plazaMat);
    plaza.rotation.x = -Math.PI / 2;
    plaza.position.set(0, 0.02, 0);
    this.scene.add(plaza);

    // Fuente en la plaza
    this.createFountain(0, 0);
  }

  createMultiFloorBuilding({ x, z, w, floors, d, color }) {
    const floorH = 4;
    const totalH = floors * floorH;
    const group = new THREE.Group();

    const bodyMat = new THREE.MeshLambertMaterial({ color });
    const body = new THREE.Mesh(new THREE.BoxGeometry(w, totalH, d), bodyMat);
    body.position.y = totalH / 2;
    body.castShadow = true;
    body.receiveShadow = true;
    group.add(body);

    // Techo
    const roofMat = new THREE.MeshLambertMaterial({ color: 0x4a3a25 });
    const roof = new THREE.Mesh(new THREE.BoxGeometry(w+0.5, 0.8, d+0.5), roofMat);
    roof.position.y = totalH + 0.4;
    roof.castShadow = true;
    group.add(roof);

    // Pisos visibles con líneas
    for (let f = 1; f < floors; f++) {
      const floorLine = new THREE.Mesh(
        new THREE.BoxGeometry(w+0.2, 0.2, d+0.2),
        new THREE.MeshLambertMaterial({ color: 0x5a4a35 })
      );
      floorLine.position.y = f * floorH;
      group.add(floorLine);
    }

    // Ventanas por piso
    const winMat = new THREE.MeshLambertMaterial({
      color: 0x88ccff, transparent: true, opacity: 0.6
    });
    const lightMat = new THREE.MeshBasicMaterial({
      color: 0xffee88, transparent: true, opacity: 0
    });

    for (let f = 0; f < floors; f++) {
      const fy = (f * floorH) + floorH * 0.5;
      const winPositions = [
        [-w/4, fy, d/2+0.1], [w/4, fy, d/2+0.1],
        [-w/4, fy, -d/2-0.1], [w/4, fy, -d/2-0.1]
      ];
      winPositions.forEach(([wx, wy, wz]) => {
        const win = new THREE.Mesh(new THREE.PlaneGeometry(2, 2.5), winMat.clone());
        win.position.set(wx, wy, wz);
        if (Math.abs(wz) > d/2) win.rotation.y = Math.PI;
        group.add(win);

        const light = new THREE.Mesh(new THREE.PlaneGeometry(1.8, 2.2), lightMat.clone());
        light.position.set(wx, wy, wz + (wz > 0 ? 0.01 : -0.01));
        if (Math.abs(wz) > d/2) light.rotation.y = Math.PI;
        group.add(light);
        this.windowLights.push(light);
      });
    }

    // Puerta
    const doorMat = new THREE.MeshLambertMaterial({ color: 0x4a3010 });
    const door = new THREE.Mesh(new THREE.BoxGeometry(1.5, 2.5, 0.1), doorMat);
    door.position.set(0, 1.25, d/2+0.05);
    group.add(door);

    // Escalera exterior (para edificios altos)
    if (floors >= 3) {
      this.createExteriorStairs(group, w, d, totalH);
    }

    group.position.set(x, 0, z);
    this.scene.add(group);
    this.mapObjects.push(body);
  }

  createExteriorStairs(group, w, d, totalH) {
    const stepMat = new THREE.MeshLambertMaterial({ color: 0x666666 });
    const steps = 8;
    for (let i = 0; i < steps; i++) {
      const step = new THREE.Mesh(
        new THREE.BoxGeometry(1.5, 0.3, 1),
        stepMat
      );
      step.position.set(w/2 + 0.8, i * 0.4, -d/2 + i * 0.8);
      group.add(step);
    }
  }

  createFountain(x, z) {
    const group = new THREE.Group();
    const stoneMat = new THREE.MeshLambertMaterial({ color: 0x888877 });
    const waterMat = new THREE.MeshLambertMaterial({
      color: 0x4499ff, transparent: true, opacity: 0.7
    });

    const base = new THREE.Mesh(new THREE.CylinderGeometry(2.5, 3, 0.5, 16), stoneMat);
    base.position.y = 0.25;
    group.add(base);

    const basin = new THREE.Mesh(new THREE.CylinderGeometry(2.2, 2.2, 0.8, 16, 1, true), stoneMat);
    basin.position.y = 0.75;
    group.add(basin);

    const water = new THREE.Mesh(new THREE.CylinderGeometry(2.1, 2.1, 0.1, 16), waterMat);
    water.position.y = 0.8;
    group.add(water);

    const pillar = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.3, 2, 8), stoneMat);
    pillar.position.y = 1.5;
    group.add(pillar);

    group.position.set(x, 0, z);
    this.scene.add(group);
  }

  buildForest(cx, cz, w, d) {
    // Suelo de bosque más oscuro
    const forestMat = new THREE.MeshLambertMaterial({ color: 0x3a6a2a });
    const forest = new THREE.Mesh(new THREE.PlaneGeometry(w, d), forestMat);
    forest.rotation.x = -Math.PI / 2;
    forest.position.set(cx, 0.01, cz);
    forest.receiveShadow = true;
    this.scene.add(forest);

    // Muchos árboles densos
    for (let i = 0; i < 80; i++) {
      const tx = cx + (Math.random() - 0.5) * w;
      const tz = cz + (Math.random() - 0.5) * d;
      this.createTree(tx, tz, true);
    }

    // Lago en el bosque
    this.createLake(cx + 20, cz - 20, 15);

    // Cabaña en el bosque
    this.createCabin(cx - 30, cz + 30);
  }

  createLake(x, z, radius) {
    const waterMat = new THREE.MeshLambertMaterial({
      color: 0x2266aa, transparent: true, opacity: 0.8
    });
    const lake = new THREE.Mesh(new THREE.CircleGeometry(radius, 20), waterMat);
    lake.rotation.x = -Math.PI / 2;
    lake.position.set(x, 0.02, z);
    this.scene.add(lake);

    // Orilla
    const shoreMat = new THREE.MeshLambertMaterial({ color: 0xc2b280 });
    const shore = new THREE.Mesh(new THREE.CircleGeometry(radius + 3, 20), shoreMat);
    shore.rotation.x = -Math.PI / 2;
    shore.position.set(x, 0.015, z);
    this.scene.add(shore);
  }

  createCabin(x, z) {
    const group = new THREE.Group();
    const woodMat = new THREE.MeshLambertMaterial({ color: 0x8B4513 });
    const roofMat = new THREE.MeshLambertMaterial({ color: 0x4a2a0a });

    const body = new THREE.Mesh(new THREE.BoxGeometry(8, 4, 6), woodMat);
    body.position.y = 2;
    body.castShadow = true;
    group.add(body);

    const roof = new THREE.Mesh(new THREE.ConeGeometry(6, 3, 4), roofMat);
    roof.position.y = 5.5;
    roof.rotation.y = Math.PI / 4;
    roof.castShadow = true;
    group.add(roof);

    group.position.set(x, 0, z);
    this.scene.add(group);
    this.mapObjects.push(body);
  }

  buildBeach(cx, cz) {
    // Arena
    const sandMat = new THREE.MeshLambertMaterial({ color: 0xf4e0a0 });
    const sand = new THREE.Mesh(new THREE.PlaneGeometry(250, 120), sandMat);
    sand.rotation.x = -Math.PI / 2;
    sand.position.set(cx, 0.01, cz);
    sand.receiveShadow = true;
    this.scene.add(sand);

    // Mar
    const seaMat = new THREE.MeshLambertMaterial({
      color: 0x006994, transparent: true, opacity: 0.85
    });
    const sea = new THREE.Mesh(new THREE.PlaneGeometry(300, 100), seaMat);
    sea.rotation.x = -Math.PI / 2;
    sea.position.set(cx, -0.5, cz + 100);
    this.scene.add(sea);

    // Palmeras
    for (let i = 0; i < 20; i++) {
      const px = cx + (Math.random() - 0.5) * 200;
      const pz = cz + (Math.random() - 0.5) * 80;
      this.createPalmTree(px, pz);
    }

    // Casas de playa
    for (let i = 0; i < 4; i++) {
      this.createBeachHouse(cx - 80 + i * 50, cz - 20);
    }

    // Muelle
    this.createPier(cx, cz + 30);
  }

  createPalmTree(x, z) {
    const group = new THREE.Group();

    const trunkH = 5 + Math.random() * 3;
    const trunk = new THREE.Mesh(
      new THREE.CylinderGeometry(0.2, 0.4, trunkH, 6),
      new THREE.MeshLambertMaterial({ color: 0x8B6914 })
    );
    trunk.position.y = trunkH / 2;
    trunk.rotation.z = (Math.random() - 0.5) * 0.3;
    group.add(trunk);

    const leafMat = new THREE.MeshLambertMaterial({ color: 0x228B22 });
    for (let i = 0; i < 7; i++) {
      const leaf = new THREE.Mesh(
        new THREE.ConeGeometry(0.3, 3, 4),
        leafMat
      );
      const angle = (i / 7) * Math.PI * 2;
      leaf.position.set(
        Math.cos(angle) * 1.5,
        trunkH + 0.5,
        Math.sin(angle) * 1.5
      );
      leaf.rotation.z = Math.cos(angle) * 0.8;
      leaf.rotation.x = Math.sin(angle) * 0.8;
      group.add(leaf);
    }

    group.position.set(x, 0, z);
    this.scene.add(group);
  }

  createBeachHouse(x, z) {
    const group = new THREE.Group();
    const mat = new THREE.MeshLambertMaterial({ color: 0xffe4c4 });
    const roofMat = new THREE.MeshLambertMaterial({ color: 0xff6644 });

    const body = new THREE.Mesh(new THREE.BoxGeometry(8, 4, 6), mat);
    body.position.y = 3;
    body.castShadow = true;
    group.add(body);

    // Pilotes
    [[-3,0,-2],[-3,0,2],[3,0,-2],[3,0,2]].forEach(([px,py,pz]) => {
      const pillar = new THREE.Mesh(
        new THREE.CylinderGeometry(0.2, 0.2, 3, 6),
        new THREE.MeshLambertMaterial({ color: 0x8B6914 })
      );
      pillar.position.set(px, 1.5, pz);
      group.add(pillar);
    });

    const roof = new THREE.Mesh(new THREE.ConeGeometry(6, 2.5, 4), roofMat);
    roof.position.y = 5.25;
    roof.rotation.y = Math.PI / 4;
    roof.castShadow = true;
    group.add(roof);

    group.position.set(x, 0, z);
    this.scene.add(group);
    this.mapObjects.push(body);
  }

  createPier(x, z) {
    const group = new THREE.Group();
    const woodMat = new THREE.MeshLambertMaterial({ color: 0x8B6914 });

    // Tablones
    for (let i = 0; i < 12; i++) {
      const plank = new THREE.Mesh(new THREE.BoxGeometry(3, 0.2, 1.5), woodMat);
      plank.position.set(0, 0.1, z + i * 1.6 - z);
      group.add(plank);
    }

    // Pilotes
    for (let i = 0; i < 4; i++) {
      const post = new THREE.Mesh(
        new THREE.CylinderGeometry(0.15, 0.15, 2, 6), woodMat
      );
      post.position.set(i % 2 === 0 ? -1.2 : 1.2, -0.8, i * 6);
      group.add(post);
    }

    group.position.set(x, 0.5, z);
    this.scene.add(group);
  }

  buildIndustrial(cx, cz) {
    // Suelo gris
    const concreteMat = new THREE.MeshLambertMaterial({ color: 0x888888 });
    const concrete = new THREE.Mesh(new THREE.PlaneGeometry(150, 150), concreteMat);
    concrete.rotation.x = -Math.PI / 2;
    concrete.position.set(cx, 0.01, cz);
    concrete.receiveShadow = true;
    this.scene.add(concrete);

    // Fábricas
    [
      { x: cx-30, z: cz-20, w: 30, h: 15, d: 20, color: 0x666666 },
      { x: cx+20, z: cz+10, w: 25, h: 20, d: 18, color: 0x555555 },
      { x: cx-10, z: cz+40, w: 20, h: 12, d: 15, color: 0x777766 },
    ].forEach(b => {
      const mat = new THREE.MeshLambertMaterial({ color: b.color });
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(b.w, b.h, b.d), mat);
      mesh.position.set(b.x, b.h/2, b.z);
      mesh.castShadow = true;
      this.scene.add(mesh);
      this.mapObjects.push(mesh);

      // Chimeneas
      const chimney = new THREE.Mesh(
        new THREE.CylinderGeometry(1, 1.2, 8, 8),
        new THREE.MeshLambertMaterial({ color: 0x444444 })
      );
      chimney.position.set(b.x + b.w/4, b.h + 4, b.z);
      chimney.castShadow = true;
      this.scene.add(chimney);
    });

    // Tanques de combustible
    [[-20, 20], [30, -30], [0, -40]].forEach(([tx, tz]) => {
      const tank = new THREE.Mesh(
        new THREE.CylinderGeometry(4, 4, 6, 12),
        new THREE.MeshLambertMaterial({ color: 0x8B0000 })
      );
      tank.position.set(cx + tx, 3, cz + tz);
      tank.castShadow = true;
      this.scene.add(tank);
      this.mapObjects.push(tank);
    });

    // Vallas
    for (let i = 0; i < 10; i++) {
      const fence = new THREE.Mesh(
        new THREE.BoxGeometry(0.1, 2, 5),
        new THREE.MeshLambertMaterial({ color: 0x444444 })
      );
      fence.position.set(cx + 60, 1, cz - 40 + i * 8);
      this.scene.add(fence);
    }
  }

  buildVillage(cx, cz) {
    // Suelo tierra
    const dirtMat = new THREE.MeshLambertMaterial({ color: 0x8B6914 });
    const dirt = new THREE.Mesh(new THREE.PlaneGeometry(150, 150), dirtMat);
    dirt.rotation.x = -Math.PI / 2;
    dirt.position.set(cx, 0.01, cz);
    dirt.receiveShadow = true;
    this.scene.add(dirt);

    // Casas de aldea
    const housePositions = [
      [cx-30, cz-20], [cx+20, cz-30], [cx-10, cz+20],
      [cx+30, cz+20], [cx-40, cz+10], [cx+10, cz-50]
    ];
    housePositions.forEach(([hx, hz]) => {
      this.createVillageHouse(hx, hz);
    });

    // Pozo
    this.createWell(cx, cz);

    // Árboles esparcidos
    for (let i = 0; i < 20; i++) {
      this.createTree(
        cx + (Math.random() - 0.5) * 130,
        cz + (Math.random() - 0.5) * 130,
        false
      );
    }
  }

  createVillageHouse(x, z) {
    const group = new THREE.Group();
    const wallMat = new THREE.MeshLambertMaterial({ color: 0xf5deb3 });
    const roofMat = new THREE.MeshLambertMaterial({ color: 0x8B4513 });

    const body = new THREE.Mesh(new THREE.BoxGeometry(7, 4, 6), wallMat);
    body.position.y = 2;
    body.castShadow = true;
    group.add(body);

    const roof = new THREE.Mesh(new THREE.ConeGeometry(5.5, 3, 4), roofMat);
    roof.position.y = 5.5;
    roof.rotation.y = Math.PI / 4;
    group.add(roof);

    const winMat = new THREE.MeshLambertMaterial({
      color: 0x88ccff, transparent: true, opacity: 0.6
    });
    [[-2, 2.5, 3.05], [2, 2.5, 3.05]].forEach(([wx,wy,wz]) => {
      const win = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 1.2), winMat);
      win.position.set(wx, wy, wz);
      group.add(win);
    });

    group.position.set(x, 0, z);
    group.rotation.y = Math.random() * Math.PI * 2;
    this.scene.add(group);
    this.mapObjects.push(body);
  }

  createWell(x, z) {
    const group = new THREE.Group();
    const stoneMat = new THREE.MeshLambertMaterial({ color: 0x888877 });
    const woodMat = new THREE.MeshLambertMaterial({ color: 0x8B4513 });

    const base = new THREE.Mesh(
      new THREE.CylinderGeometry(1.5, 1.5, 1, 12, 1, true), stoneMat
    );
    base.position.y = 0.5;
    group.add(base);

    const top = new THREE.Mesh(
      new THREE.TorusGeometry(1.5, 0.2, 8, 16), stoneMat
    );
    top.rotation.x = Math.PI / 2;
    top.position.y = 1;
    group.add(top);

    [[-1.6, 0], [1.6, 0]].forEach(([px, pz]) => {
      const post = new THREE.Mesh(
        new THREE.CylinderGeometry(0.1, 0.1, 2, 6), woodMat
      );
      post.position.set(px, 2, pz);
      group.add(post);
    });

    const bar = new THREE.Mesh(new THREE.BoxGeometry(3.4, 0.15, 0.15), woodMat);
    bar.position.y = 3;
    group.add(bar);

    group.position.set(x, 0, z);
    this.scene.add(group);
  }

  buildBunker(cx, cz) {
    const group = new THREE.Group();
    const concreteMat = new THREE.MeshLambertMaterial({ color: 0x555566 });
    const metalMat = new THREE.MeshLambertMaterial({ color: 0x334433 });

    // Entrada del bunker (sobre tierra)
    const entrance = new THREE.Mesh(new THREE.BoxGeometry(6, 3, 8), concreteMat);
    entrance.position.set(cx, 1.5, cz - 40);
    entrance.castShadow = true;
    this.scene.add(entrance);
    this.mapObjects.push(entrance);

    // Puerta de metal
    const door = new THREE.Mesh(new THREE.BoxGeometry(2.5, 2.5, 0.2), metalMat);
    door.position.set(cx, 1.25, cz - 36.1);
    this.scene.add(door);

    // Señal
    const signGeo = new THREE.PlaneGeometry(2, 0.8);
    const signMat = new THREE.MeshBasicMaterial({ color: 0xffcc00 });
    const sign = new THREE.Mesh(signGeo, signMat);
    sign.position.set(cx, 2.8, cz - 36);
    this.scene.add(sign);

    // Escaleras de bajada
    for (let i = 0; i < 6; i++) {
      const step = new THREE.Mesh(
        new THREE.BoxGeometry(3, 0.3, 1.2),
        concreteMat
      );
      step.position.set(cx, -i * 0.5, cz - 37 - i * 1.2);
      this.scene.add(step);
    }

    // Sala subterránea
    const room = new THREE.Mesh(
      new THREE.BoxGeometry(20, 4, 20), concreteMat
    );
    room.position.set(cx, -4, cz - 50);
    this.scene.add(room);
    this.mapObjects.push(room);

    // Cajas de loot especial en el bunker
    [[cx-6,cz-44],[cx+6,cz-44],[cx-6,cz-56],[cx+6,cz-56]].forEach(([bx,bz]) => {
      const crate = new THREE.Mesh(
        new THREE.BoxGeometry(1.5, 1.5, 1.5),
        new THREE.MeshLambertMaterial({ color: 0xffaa00 })
      );
      crate.position.set(bx, -1.75, bz);
      crate.castShadow = true;
      this.scene.add(crate);
      this.mapObjects.push(crate);
    });

    // Luces del bunker
    const bunkerLight = new THREE.PointLight(0x88ff88, 1, 15);
    bunkerLight.position.set(cx, -2, cz - 50);
    this.scene.add(bunkerLight);
  }

  buildRiver() {
    const riverMat = new THREE.MeshLambertMaterial({
      color: 0x2266aa, transparent: true, opacity: 0.75
    });

    // Río horizontal que cruza el mapa
    const river = new THREE.Mesh(new THREE.PlaneGeometry(600, 18), riverMat);
    river.rotation.x = -Math.PI / 2;
    river.position.set(0, 0.05, 80);
    this.scene.add(river);

    // Orillas del río
    const bankMat = new THREE.MeshLambertMaterial({ color: 0xc2b280 });
    [-9, 9].forEach(offset => {
      const bank = new THREE.Mesh(new THREE.PlaneGeometry(600, 6), bankMat);
      bank.rotation.x = -Math.PI / 2;
      bank.position.set(0, 0.03, 80 + offset);
      this.scene.add(bank);
    });

    // Puentes sobre el río
    [-100, 0, 120].forEach(bx => {
      this.createBridge(bx, 80);
    });
  }

  createBridge(x, z) {
    const bridgeMat = new THREE.MeshLambertMaterial({ color: 0x8B7355 });
    const stoneMat = new THREE.MeshLambertMaterial({ color: 0x888877 });

    // Tablones del puente
    const bridge = new THREE.Mesh(new THREE.BoxGeometry(8, 0.5, 22), bridgeMat);
    bridge.position.set(x, 0.5, z);
    bridge.castShadow = true;
    this.scene.add(bridge);

    // Pilares
    [[-3, -8],[3, -8],[-3, 8],[3, 8]].forEach(([px, pz]) => {
      const pillar = new THREE.Mesh(
        new THREE.BoxGeometry(1, 3, 1), stoneMat
      );
      pillar.position.set(x + px, -0.5, z + pz);
      this.scene.add(pillar);
    });

    // Barandas
    [-3.5, 3.5].forEach(px => {
      const railing = new THREE.Mesh(
        new THREE.BoxGeometry(0.2, 1.2, 22), stoneMat
      );
      railing.position.set(x + px, 1.1, z);
      this.scene.add(railing);
    });

    this.mapObjects.push(bridge);
  }

  createRoad(x, z, length, width, alongX) {
    const geo = new THREE.PlaneGeometry(
      alongX ? length : width,
      alongX ? width : length
    );
    const mat = new THREE.MeshLambertMaterial({ color: 0x555555 });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.set(x, 0.02, z);
    mesh.receiveShadow = true;
    this.scene.add(mesh);

    // Línea central
    const lineMat = new THREE.MeshLambertMaterial({ color: 0xffff00 });
    const line = new THREE.Mesh(
      new THREE.PlaneGeometry(
        alongX ? length : 0.3,
        alongX ? 0.3 : length
      ), lineMat
    );
    line.rotation.x = -Math.PI / 2;
    line.position.set(x, 0.03, z);
    this.scene.add(line);
  }

  createWatchTower(x, z) {
    const group = new THREE.Group();
    const mat = new THREE.MeshLambertMaterial({ color: 0x8B6914 });

    [[-2,-2],[2,-2],[-2,2],[2,2]].forEach(([px,pz]) => {
      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.5,12,0.5), mat);
      leg.position.set(px, 6, pz);
      leg.castShadow = true;
      group.add(leg);
    });

    const platform = new THREE.Mesh(new THREE.BoxGeometry(7,0.5,7), mat);
    platform.position.y = 12;
    platform.castShadow = true;
    group.add(platform);

    const cabin = new THREE.Mesh(
      new THREE.BoxGeometry(6,4,6),
      new THREE.MeshLambertMaterial({ color: 0x6B5010 })
    );
    cabin.position.y = 14;
    cabin.castShadow = true;
    group.add(cabin);

    // Escalera
    for (let i = 0; i < 10; i++) {
      const rung = new THREE.Mesh(new THREE.BoxGeometry(1, 0.1, 0.1), mat);
      rung.position.set(2.6, i * 1.2, 0);
      group.add(rung);
    }

    group.position.set(x, 0, z);
    this.scene.add(group);
    this.mapObjects.push(platform);
  }

  createRock(x, z) {
    const size = 1 + Math.random() * 3;
    const geo = new THREE.DodecahedronGeometry(size, 0);
    const mat = new THREE.MeshLambertMaterial({
      color: new THREE.Color(0.45+Math.random()*0.1, 0.42+Math.random()*0.1, 0.38)
    });
    const rock = new THREE.Mesh(geo, mat);
    rock.position.set(x, size*0.4, z);
    rock.rotation.y = Math.random() * Math.PI * 2;
    rock.castShadow = true;
    this.scene.add(rock);
    this.mapObjects.push(rock);
  }

  createTree(x, z, dense = false) {
    const group = new THREE.Group();
    const trunkH = dense ? 4 + Math.random() * 3 : 3 + Math.random() * 2;
    const trunk = new THREE.Mesh(
      new THREE.CylinderGeometry(0.3, 0.5, trunkH, 6),
      new THREE.MeshLambertMaterial({ color: 0x6B4226 })
    );
    trunk.position.y = trunkH / 2;
    trunk.castShadow = true;
    group.add(trunk);

    const leafColor = dense
      ? new THREE.Color(0.05, 0.3 + Math.random()*0.1, 0.05)
      : new THREE.Color(0.1+Math.random()*0.1, 0.4+Math.random()*0.2, 0.1);

    const leafMat = new THREE.MeshLambertMaterial({ color: leafColor });
    const layers = dense ? 4 : 3;
    for (let i = 0; i < layers; i++) {
      const r = (dense ? 3 : 2.5) - i * 0.4;
      const leaves = new THREE.Mesh(new THREE.ConeGeometry(r, 2.5, 7), leafMat);
      leaves.position.y = trunkH + i * 1.5;
      leaves.castShadow = true;
      group.add(leaves);
    }

    group.position.set(x, 0, z);
    group.rotation.y = Math.random() * Math.PI * 2;
    this.scene.add(group);
    this.mapObjects.push(trunk);
  }

  createCrate(x, z) {
    const colors = [0xcc8800, 0xaa6600, 0xdd9900];
    const color = colors[Math.floor(Math.random() * colors.length)];
    const geo = new THREE.BoxGeometry(1.5, 1.5, 1.5);
    const mat = new THREE.MeshLambertMaterial({ color });
    const crate = new THREE.Mesh(geo, mat);
    crate.position.set(x, 0.75, z);
    crate.castShadow = true;
    crate.receiveShadow = true;
    this.scene.add(crate);
    this.mapObjects.push(crate);
  }

  createBoundaries(size) {
    const mat = new THREE.MeshLambertMaterial({ color: 0x4a6b3a });
    const wallH = 10;
    [
      { x:0,     z:-size, w:size*2+20, d:2 },
      { x:0,     z:size,  w:size*2+20, d:2 },
      { x:-size, z:0,     w:2, d:size*2+20 },
      { x:size,  z:0,     w:2, d:size*2+20 },
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
      75, window.innerWidth / window.innerHeight, 0.1, 500
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
      new THREE.Vector3(0,1,0), dir.normalize()
    );
    this.scene.add(trail);
    this.bullets.push({ mesh: trail, life: 0.08 });
  }

  updateDayNight(dt) {
    this.dayTime += dt;
    if (this.dayTime > this.dayDuration) this.dayTime = 0;

    const t = this.dayTime / this.dayDuration;
    const angle = t * Math.PI * 2;

    const sunX = Math.cos(angle) * 200;
    const sunY = Math.sin(angle) * 150;
    const sunZ = 80;

    this.sunLight.position.set(sunX, sunY, sunZ);
    this.sunMesh.position.set(sunX, sunY, sunZ);
    this.moonLight.position.set(-sunX, -sunY, -sunZ);
    this.moonMesh.position.set(-sunX*0.8, -sunY*0.8, -sunZ);

    let skyColor, ambientIntensity, sunIntensity, moonIntensity, starOpacity = 0;

    if (t < 0.25) {
      const f = t / 0.25;
      skyColor = new THREE.Color().lerpColors(new THREE.Color(0x1a0a2e), new THREE.Color(0xff7043), f);
      ambientIntensity = 0.1 + f * 0.5;
      sunIntensity = f * 1.2;
      moonIntensity = (1 - f) * 0.3;
      starOpacity = 1 - f;
      this.dayPhase = 'dawn';
    } else if (t < 0.5) {
      const f = (t - 0.25) / 0.25;
      skyColor = new THREE.Color().lerpColors(new THREE.Color(0xff7043), new THREE.Color(0x87ceeb), f);
      ambientIntensity = 0.6; sunIntensity = 1.2; moonIntensity = 0; starOpacity = 0;
      this.dayPhase = 'day';
    } else if (t < 0.75) {
      const f = (t - 0.5) / 0.25;
      skyColor = new THREE.Color().lerpColors(new THREE.Color(0x87ceeb), new THREE.Color(0xff5722), f);
      ambientIntensity = 0.6 - f*0.5; sunIntensity = 1.2 - f*1.2; moonIntensity = f*0.3; starOpacity = f*0.5;
      this.dayPhase = 'dusk';
    } else {
      const f = (t - 0.75) / 0.25;
      skyColor = new THREE.Color().lerpColors(new THREE.Color(0xff5722), new THREE.Color(0x0a0a1a), f);
      ambientIntensity = 0.1; sunIntensity = 0; moonIntensity = 0.3; starOpacity = f;
      this.dayPhase = 'night';
    }

    this.scene.background = skyColor;
    this.scene.fog.color = skyColor;
    this.skyMesh.material.color = skyColor;
    this.ambientLight.intensity = ambientIntensity;
    this.sunLight.intensity = sunIntensity;
    this.moonLight.intensity = moonIntensity;
    this.sunMesh.visible = sunY > -20;
    this.moonMesh.visible = -sunY > -20;
    this.starsGroup.visible = starOpacity > 0;
    if (this.starPoints) this.starPoints.material.opacity = starOpacity;

    // Luces de ventanas de noche
    const isNight = this.dayPhase === 'night' || this.dayPhase === 'dusk';
    this.windowLights.forEach(light => {
      light.material.opacity = isNight ? 0.7 + Math.random() * 0.1 : 0;
    });

    this.clouds.forEach((cloud, i) => {
      cloud.position.x += dt * 0.8 * (i % 2 === 0 ? 1 : -1);
      if (cloud.position.x > 300) cloud.position.x = -300;
      if (cloud.position.x < -300) cloud.position.x = 300;
    });

    this.scene.fog.far = this.dayPhase === 'night' ? 200 : 400;
    this.scene.fog.near = this.dayPhase === 'night' ? 50 : 80;
    this.renderer.toneMappingExposure = this.dayPhase === 'night' ? 0.6 : 1.2;

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
        position: fixed; top: 10px; left: 50%;
        transform: translateX(-50%);
        color: #fff; font-family: 'Arial Black', sans-serif;
        font-size: 0.65rem; letter-spacing: 2px;
        text-shadow: 0 1px 3px #000;
        background: rgba(0,0,0,0.45);
        padding: 3px 10px; border-radius: 6px;
        pointer-events: none; z-index: 55; display: none;
      `;
      document.body.appendChild(this.timeDisplay);
    }
    this.timeDisplay.style.display = 'block';
    const icons = { day:'☀️', dawn:'🌅', dusk:'🌆', night:'🌙' };
    this.timeDisplay.textContent = `${icons[phase] || '☀️'} ${time}`;
  }

  onResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  render() {
    const dt = 0.016;
    this.updateDayNight(dt);

    this.bullets = this.bullets.filter(b => {
      b.life -= dt;
      if (b.life <= 0) { this.scene.remove(b.mesh); return false; }
      return true;
    });

    this.renderer.render(this.scene, this.camera);
  }
      }
