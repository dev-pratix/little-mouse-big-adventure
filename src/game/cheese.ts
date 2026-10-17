// Collectibles: cheese wedges with idle bob and a pop-up collection animation.
import * as THREE from "three";

interface Cheese {
  mesh: THREE.Group;
  x: number;
  z: number;
  taken: boolean;
  t: number; // collect animation time
}

const PICK_R = 0.35;

export class CheeseField {
  private items: Cheese[] = [];
  private group = new THREE.Group();
  private geo = new THREE.CylinderGeometry(0.2, 0.2, 0.16, 20, 1, false, 0, Math.PI / 2.6);
  private mat = new THREE.MeshStandardMaterial({ color: "#f5c542", roughness: 0.45, emissive: "#6b4a00", emissiveIntensity: 0.25 });
  private holeGeo = new THREE.SphereGeometry(0.03, 8, 6);
  private holeMat = new THREE.MeshStandardMaterial({ color: "#d9a520" });
  private glowGeo = new THREE.RingGeometry(0.22, 0.3, 24);
  private glowMat = new THREE.MeshBasicMaterial({ color: "#ffe28a", transparent: true, opacity: 0.6, side: THREE.DoubleSide });

  constructor(scene: THREE.Scene, spots: [number, number][]) {
    for (const [x, z] of spots) {
      const g = new THREE.Group();
      const w = new THREE.Mesh(this.geo, this.mat);
      w.castShadow = true;
      w.position.y = 0.12;
      g.add(w);
      for (const [a, y] of [[0.4, 0.1], [0.9, 0.15]] as const) {
        const h = new THREE.Mesh(this.holeGeo, this.holeMat);
        h.position.set(Math.sin(a) * 0.2, y, Math.cos(a) * 0.2);
        g.add(h);
      }
      const ring = new THREE.Mesh(this.glowGeo, this.glowMat);
      ring.rotation.x = -Math.PI / 2;
      ring.position.y = 0.01;
      g.add(ring);
      g.position.set(x, 0, z);
      this.group.add(g);
      this.items.push({ mesh: g, x, z, taken: false, t: 0 });
    }
    scene.add(this.group);
  }

  reset() {
    for (const c of this.items) {
      c.taken = false;
      c.t = 0;
      c.mesh.visible = true;
      c.mesh.scale.setScalar(1);
      c.mesh.position.y = 0;
    }
  }

  /** returns number collected this frame */
  update(dt: number, time: number, px: number, pz: number) {
    let got = 0;
    for (const c of this.items) {
      if (!c.taken) {
        c.mesh.rotation.y = time * 1.2;
        c.mesh.children[0]!.position.y = 0.12 + Math.sin(time * 3 + c.x) * 0.03;
        if (Math.hypot(px - c.x, pz - c.z) < PICK_R) {
          c.taken = true;
          got++;
        }
      } else if (c.mesh.visible) {
        c.t += dt;
        c.mesh.position.y = c.t * 1.5;
        c.mesh.rotation.y += dt * 12;
        c.mesh.scale.setScalar(Math.max(0, 1 + c.t * 2 - c.t * c.t * 12));
        if (c.t > 0.4) c.mesh.visible = false;
      }
    }
    return got;
  }

  dispose(scene: THREE.Scene) {
    [this.geo, this.holeGeo, this.glowGeo].forEach((g) => g.dispose());
    [this.mat, this.holeMat, this.glowMat].forEach((m) => m.dispose());
    scene.remove(this.group);
  }
}
