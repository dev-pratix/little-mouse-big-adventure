// Collectibles: cheese wedges with beacon glow, idle bob, and pop-up collection animation.
import * as THREE from "three";

interface Cheese {
  mesh: THREE.Group;
  light: THREE.PointLight;
  beacon: THREE.Mesh;
  x: number;
  z: number;
  taken: boolean;
  t: number; // collect animation time
}

const PICK_R = 0.38;

export class CheeseField {
  private items: Cheese[] = [];
  private group = new THREE.Group();
  private geo = new THREE.CylinderGeometry(0.2, 0.2, 0.16, 20, 1, false, 0, Math.PI / 2.6);
  private mat = new THREE.MeshStandardMaterial({
    color: "#f5c542",
    roughness: 0.35,
    emissive: "#855800",
    emissiveIntensity: 0.35,
  });
  private holeGeo = new THREE.SphereGeometry(0.03, 8, 6);
  private holeMat = new THREE.MeshStandardMaterial({ color: "#d9a520" });
  private glowGeo = new THREE.RingGeometry(0.24, 0.36, 24);
  private glowMat = new THREE.MeshBasicMaterial({
    color: "#ffc83b",
    transparent: true,
    opacity: 0.65,
    side: THREE.DoubleSide,
  });
  // Floating beacon marker visible over furniture at gameplay distance
  private beaconGeo = new THREE.OctahedronGeometry(0.07);
  private beaconMat = new THREE.MeshStandardMaterial({
    color: "#ffe066",
    emissive: "#ffb700",
    emissiveIntensity: 0.8,
    roughness: 0.2,
  });

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

      // Base glow ring
      const ring = new THREE.Mesh(this.glowGeo, this.glowMat);
      ring.rotation.x = -Math.PI / 2;
      ring.position.y = 0.015;
      g.add(ring);

      // Elevated floating beacon diamond
      const beacon = new THREE.Mesh(this.beaconGeo, this.beaconMat);
      beacon.position.y = 0.42;
      g.add(beacon);

      // Warm beacon light illuminating surrounding floor and walls
      const light = new THREE.PointLight("#ffaa22", 1.5, 3.5, 1.8);
      light.position.set(0, 0.35, 0);
      g.add(light);

      g.position.set(x, 0, z);
      this.group.add(g);
      this.items.push({ mesh: g, light, beacon, x, z, taken: false, t: 0 });
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
      c.light.visible = true;
      c.light.intensity = 1.5;
      c.beacon.visible = true;
    }
  }

  /** returns number collected this frame */
  update(dt: number, time: number, px: number, pz: number) {
    let got = 0;
    for (const c of this.items) {
      if (!c.taken) {
        c.mesh.rotation.y = time * 1.3;
        // Bobbing cheese wedge
        c.mesh.children[0]!.position.y = 0.12 + Math.sin(time * 3 + c.x) * 0.035;
        // Bobbing & counter-rotating beacon diamond
        c.beacon.position.y = 0.42 + Math.sin(time * 2.5 + c.z) * 0.05;
        c.beacon.rotation.y = -time * 2.2;
        // Subtle pulsing light
        c.light.intensity = 1.5 + Math.sin(time * 4 + c.x) * 0.4;

        if (Math.hypot(px - c.x, pz - c.z) < PICK_R) {
          c.taken = true;
          got++;
        }
      } else if (c.mesh.visible) {
        c.t += dt;
        c.mesh.position.y = c.t * 2.0;
        c.mesh.rotation.y += dt * 14;
        const s = Math.max(0, 1 + c.t * 2.5 - c.t * c.t * 15);
        c.mesh.scale.setScalar(s);
        c.light.intensity = Math.max(0, 2.5 * (1 - c.t / 0.45));
        if (c.t > 0.45) {
          c.mesh.visible = false;
          c.light.visible = false;
        }
      }
    }
    return got;
  }

  dispose(scene: THREE.Scene) {
    [this.geo, this.holeGeo, this.glowGeo, this.beaconGeo].forEach((g) => g.dispose());
    [this.mat, this.holeMat, this.glowMat, this.beaconMat].forEach((m) => m.dispose());
    scene.remove(this.group);
  }
}
