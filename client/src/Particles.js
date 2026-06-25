export class ParticleSystem {
  constructor(scene) {
    this.scene = scene;
    this.pools = {
      blood: [],
      muzzle: [],
      dust: [],
      explosion: []
    };
    this.active = [];
  }

  getParticle(pool) {
    for (const p of this.pools[pool]) {
      if (!p.active) return p;
    }
    return null;
  }

  spawnBlood(position) {
    const count = 8 + Math.floor(Math.random() * 6);
    for (let i = 0; i < count; i++) {
      const geo = new THREE.SphereGeometry(0.04 + Math.random() * 0.06, 4, 4);
      const mat = new THREE.MeshBasicMaterial({ color: 0xcc0000 });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.copy(position);

      const vel = new THREE.Vector3(
        (Math.random() - 0.5) * 6,
        Math.random() * 5 + 2,
        (Math.random() - 0.5) * 6
      );

      const particle = { mesh, vel, life: 0.6 + Math.random() * 0.4, maxLife: 1.0, active: true, type: 'blood' };
      this.scene.add(mesh);
      this.active.push(particle);
    }
  }

  spawnMuzzleFlash(position) {
    const count = 5;
    for (let i = 0; i < count; i++) {
      const geo = new THREE.SphereGeometry(0.03 + Math.random() * 0.04, 4, 4);
      const mat = new THREE.MeshBasicMaterial({
        color: i % 2 === 0 ? 0xffee44 : 0xff8800,
        transparent: true,
        opacity: 1
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.copy(position);

      const vel = new THREE.Vector3(
        (Math.random() - 0.5) * 3,
        (Math.random() - 0.5) * 3,
        -Math.random() * 4
      );

      const particle = { mesh, vel, life: 0.08, maxLife: 0.08, active: true, type: 'muzzle' };
      this.scene.add(mesh);
      this.active.push(particle);
    }
  }

  spawnDust(position) {
    const count = 4;
    for (let i = 0; i < count; i++) {
      const geo = new THREE.SphereGeometry(0.1 + Math.random() * 0.1, 4, 4);
      const mat = new THREE.MeshBasicMaterial({
        color: 0xaa9977,
        transparent: true,
        opacity: 0.6
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.copy(position);
      mesh.position.y += 0.1;

      const vel = new THREE.Vector3(
        (Math.random() - 0.5) * 2,
        Math.random() * 1.5,
        (Math.random() - 0.5) * 2
      );

      const particle = { mesh, vel, life: 0.5 + Math.random() * 0.3, maxLife: 0.8, active: true, type: 'dust' };
      this.scene.add(mesh);
      this.active.push(particle);
    }
  }

  spawnExplosion(position) {
    // Bola de fuego central
    const count = 16;
    for (let i = 0; i < count; i++) {
      const size = 0.1 + Math.random() * 0.25;
      const geo = new THREE.SphereGeometry(size, 5, 5);
      const colors = [0xff4400, 0xff8800, 0xffcc00, 0xffffff];
      const mat = new THREE.MeshBasicMaterial({
        color: colors[Math.floor(Math.random() * colors.length)],
        transparent: true,
        opacity: 1
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.copy(position);

      const vel = new THREE.Vector3(
        (Math.random() - 0.5) * 10,
        Math.random() * 8 + 2,
        (Math.random() - 0.5) * 10
      );

      const life = 0.4 + Math.random() * 0.4;
      const particle = { mesh, vel, life, maxLife: life, active: true, type: 'explosion' };
      this.scene.add(mesh);
      this.active.push(particle);
    }

    // Humo
    for (let i = 0; i < 6; i++) {
      const geo = new THREE.SphereGeometry(0.3 + Math.random() * 0.3, 5, 5);
      const mat = new THREE.MeshBasicMaterial({
        color: 0x444444,
        transparent: true,
        opacity: 0.5
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.copy(position);

      const vel = new THREE.Vector3(
        (Math.random() - 0.5) * 3,
        Math.random() * 4 + 1,
        (Math.random() - 0.5) * 3
      );

      const life = 1.0 + Math.random() * 0.5;
      const particle = { mesh, vel, life, maxLife: life, active: true, type: 'dust' };
      this.scene.add(mesh);
      this.active.push(particle);
    }
  }

  spawnImpact(position) {
    // Chispas al impactar en pared
    const count = 6;
    for (let i = 0; i < count; i++) {
      const geo = new THREE.SphereGeometry(0.02 + Math.random() * 0.03, 3, 3);
      const mat = new THREE.MeshBasicMaterial({ color: 0xffcc00 });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.copy(position);

      const vel = new THREE.Vector3(
        (Math.random() - 0.5) * 5,
        Math.random() * 4,
        (Math.random() - 0.5) * 5
      );

      const life = 0.2 + Math.random() * 0.2;
      const particle = { mesh, vel, life, maxLife: life, active: true, type: 'muzzle' };
      this.scene.add(mesh);
      this.active.push(particle);
    }
  }

  update(dt) {
    const gravity = -12;
    const toRemove = [];

    for (let i = 0; i < this.active.length; i++) {
      const p = this.active[i];
      if (!p.active) { toRemove.push(i); continue; }

      p.life -= dt;
      if (p.life <= 0) {
        p.active = false;
        this.scene.remove(p.mesh);
        p.mesh.geometry.dispose();
        p.mesh.material.dispose();
        toRemove.push(i);
        continue;
      }

      const lifeRatio = p.life / p.maxLife;

      // Gravedad
      if (p.type !== 'muzzle') {
        p.vel.y += gravity * dt;
      }

      p.mesh.position.addScaledVector(p.vel, dt);

      // Fade out
      if (p.mesh.material.transparent) {
        if (p.type === 'blood') {
          p.mesh.material.opacity = lifeRatio;
        } else if (p.type === 'dust') {
          p.mesh.material.opacity = lifeRatio * 0.6;
          p.mesh.scale.setScalar(1 + (1 - lifeRatio) * 1.5);
        } else if (p.type === 'muzzle') {
          p.mesh.material.opacity = lifeRatio;
        } else if (p.type === 'explosion') {
          p.mesh.material.opacity = lifeRatio;
          p.mesh.scale.setScalar(1 + (1 - lifeRatio) * 2);
        }
      }

      // Rebotar en suelo
      if (p.type === 'blood' && p.mesh.position.y < 0.05) {
        p.mesh.position.y = 0.05;
        p.vel.y *= -0.3;
        p.vel.x *= 0.7;
        p.vel.z *= 0.7;
      }
    }

    // Limpiar en orden inverso
    for (let i = toRemove.length - 1; i >= 0; i--) {
      this.active.splice(toRemove[i], 1);
    }
  }
                        }
