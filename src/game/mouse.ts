// Mouse controller: placeholder mesh + movement, turning, jumping, and animation state.
// Replace buildMouseModel() with a GLB loader later; the controller only needs `root`.
import * as THREE from "three";
import { groundY, resolve, type Box, type Platform } from "./collision";

export const MOUSE = {
  scale: 0.82,
  radius: 0.11,
  walk: 2.1,
  run: 3.6,
  accel: 10,
  turn: 12,
  /** Initial vertical velocity when jumping (m/s) */
  jumpVel: 1.85,
  /** Gravity (m/s²) */
  gravity: 9.0,
};

function buildMouseModel() {
  const root = new THREE.Group();
  const fur = new THREE.MeshStandardMaterial({ color: "#9c8576", roughness: 0.9 });
  const belly = new THREE.MeshStandardMaterial({ color: "#d9c6b5", roughness: 0.9 });
  const pink = new THREE.MeshStandardMaterial({ color: "#f0a3a8", roughness: 0.6 });
  const black = new THREE.MeshStandardMaterial({ color: "#1b1410", roughness: 0.2 });
  const add = (geo: THREE.BufferGeometry, m: THREE.Material, p: [number, number, number], s?: [number, number, number], parent: THREE.Object3D = body) => {
    const o = new THREE.Mesh(geo, m);
    o.position.set(...p);
    if (s) o.scale.set(...s);
    o.castShadow = true;
    parent.add(o);
    return o;
  };
  const body = new THREE.Group();
  root.add(body);
  add(new THREE.SphereGeometry(0.1, 16, 12), fur, [0, 0.1, 0], [1, 0.85, 1.45]);
  add(new THREE.SphereGeometry(0.08, 14, 10), belly, [0, 0.07, 0.02], [0.9, 0.7, 1.3]);
  const head = new THREE.Group();
  head.position.set(0, 0.14, 0.14);
  body.add(head);
  add(new THREE.SphereGeometry(0.07, 14, 12), fur, [0, 0, 0], [1, 0.95, 1.15], head);
  add(new THREE.ConeGeometry(0.045, 0.08, 12), fur, [0, -0.01, 0.08], undefined, head).rotation.x = Math.PI / 2;
  add(new THREE.SphereGeometry(0.016, 8, 6), pink, [0, -0.01, 0.12], undefined, head);
  for (const s of [-1, 1]) {
    add(new THREE.SphereGeometry(0.012, 8, 6), black, [s * 0.035, 0.02, 0.06], undefined, head);
    const ear = add(new THREE.CylinderGeometry(0.045, 0.045, 0.01, 16), fur, [s * 0.05, 0.065, -0.01], undefined, head);
    ear.rotation.set(Math.PI / 2, 0, s * 0.4);
    const inner = add(new THREE.CylinderGeometry(0.032, 0.032, 0.012, 16), pink, [s * 0.05, 0.065, -0.004], undefined, head);
    inner.rotation.set(Math.PI / 2, 0, s * 0.4);
  }
  const feet: THREE.Mesh[] = [];
  for (const [x, z] of ([[-0.05, 0.08], [0.05, 0.08], [-0.06, -0.08], [0.06, -0.08]] as const)) {
    feet.push(add(new THREE.SphereGeometry(0.022, 8, 6), pink, [x, 0.018, z], [1, 0.6, 1.4]));
  }
  const tail = new THREE.Group();
  tail.position.set(0, 0.07, -0.14);
  body.add(tail);
  const curve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, 0, 0), new THREE.Vector3(0.02, -0.03, -0.1),
    new THREE.Vector3(-0.03, -0.05, -0.2), new THREE.Vector3(0.02, -0.04, -0.3),
  ]);
  add(new THREE.TubeGeometry(curve, 16, 0.008, 6), pink, [0, 0, 0], undefined, tail);
  return { root, body, head, feet, tail };
}

export class MouseController {
  readonly model = buildMouseModel();
  readonly root = this.model.root;

  pos = { x: 0, y: 0, z: 0 };
  vel = { x: 0, y: 0, z: 0 };
  yaw = 0;

  /** Whether the mouse's feet are on a surface this frame. */
  grounded = true;

  private phase = 0;

  headYaw = 0;
  headPitch = 0;
  private targetHeadYaw = 0;
  private targetHeadPitch = 0;

  constructor(scene: THREE.Scene) {
    this.root.scale.setScalar(MOUSE.scale);
    scene.add(this.root);
  }

  reset(x: number, z: number, yaw: number) {
    this.pos.x = x;
    this.pos.y = 0;
    this.pos.z = z;
    this.vel.x = this.vel.y = this.vel.z = 0;
    this.yaw = yaw;
    this.grounded = true;
    this.headYaw = 0;
    this.headPitch = 0;
    this.targetHeadYaw = 0;
    this.targetHeadPitch = 0;
    this.model.head.rotation.set(0, 0, 0);
    this.sync();
  }

  /**
   * Set target in world coordinates where the head should look.
   * Head yaw and pitch are smoothly interpolated in update().
   */
  setLookTarget(worldX: number, worldY: number, worldZ: number) {
    const headY = this.pos.y + 0.14 * MOUSE.scale;
    const dx = worldX - this.pos.x;
    const dy = worldY - headY;
    const dz = worldZ - this.pos.z;
    const dist = Math.hypot(dx, dz);

    // If target is too close to body center (< 0.20m), return head to neutral
    if (dist < 0.20) {
      this.targetHeadYaw = 0;
      this.targetHeadPitch = 0;
      return;
    }

    // World angle from +Z
    const worldYaw = Math.atan2(dx, dz);
    const dYaw = Math.atan2(Math.sin(worldYaw - this.yaw), Math.cos(worldYaw - this.yaw));
    const absYaw = Math.abs(dYaw);
    const signYaw = Math.sign(dYaw);

    const MAX_HEAD_YAW = 0.95; // ~55° natural neck limit
    if (absYaw < 0.05) {
      // Forward neutral deadzone
      this.targetHeadYaw = 0;
    } else if (absYaw <= MAX_HEAD_YAW) {
      this.targetHeadYaw = dYaw;
    } else if (absYaw <= Math.PI / 2) {
      this.targetHeadYaw = signYaw * MAX_HEAD_YAW;
    } else if (absYaw <= (3 * Math.PI) / 4) {
      // Smoothly blend down to 0 when cursor is in rear quarter
      const t = ((3 * Math.PI) / 4 - absYaw) / (Math.PI / 4);
      this.targetHeadYaw = signYaw * MAX_HEAD_YAW * t;
    } else {
      this.targetHeadYaw = 0;
    }

    // Pitch: positive dy means target is above head -> tilt up (negative rotation around local X)
    const pitch = -Math.atan2(dy, dist);
    const MAX_HEAD_PITCH = 0.35; // ~20° up/down
    if (Math.abs(pitch) < 0.04) {
      this.targetHeadPitch = 0;
    } else {
      this.targetHeadPitch = THREE.MathUtils.clamp(pitch, -MAX_HEAD_PITCH, MAX_HEAD_PITCH);
    }
  }

  clearLookTarget() {
    this.targetHeadYaw = 0;
    this.targetHeadPitch = 0;
  }

  get speed() {
    return Math.hypot(this.vel.x, this.vel.z);
  }

  /**
   * @param move  x right / y forward relative to camYaw, plus jump flag
   * @param camYaw  current camera yaw (radians)
   * @param colliders  2-D wall/furniture boxes
   * @param platforms  climbable surfaces with a topY height
   */
  update(
    dt: number,
    move: { x: number; y: number; run: boolean; jump: boolean },
    camYaw: number,
    colliders: Box[],
    platforms: Platform[],
  ) {
    // ── Horizontal movement ──────────────────────────────────────────────
    const fx = Math.sin(camYaw), fz = Math.cos(camYaw);
    const rx = -fz, rz = fx;
    const max = move.run ? MOUSE.run : MOUSE.walk;
    const tx = (fx * move.y + rx * move.x) * max;
    const tz = (fz * move.y + rz * move.x) * max;
    const k = 1 - Math.exp(-MOUSE.accel * dt);
    this.vel.x += (tx - this.vel.x) * k;
    this.vel.z += (tz - this.vel.z) * k;

    // ── XZ collision ─────────────────────────────────────────────────────
    const px = this.pos.x, pz = this.pos.z;
    this.pos.x += this.vel.x * dt;
    this.pos.z += this.vel.z * dt;
    resolve(this.pos, MOUSE.radius, colliders);
    if (dt > 0) {
      this.vel.x = (this.pos.x - px) / dt;
      this.vel.z = (this.pos.z - pz) / dt;
    }

    // ── Vertical (gravity + jump + step-up) ──────────────────────────────
    const floor = groundY(this.pos, MOUSE.radius, platforms, this.pos.y);

    if (this.grounded && move.jump) {
      this.vel.y = MOUSE.jumpVel;
      this.grounded = false;
    }

    if (!this.grounded) {
      this.vel.y -= MOUSE.gravity * dt;
      this.pos.y += this.vel.y * dt;

      if (this.pos.y <= floor) {
        this.pos.y = floor;
        this.vel.y = 0;
        this.grounded = true;
      }
    } else {
      // Smoothly step up onto platforms (or back down off them)
      const target = floor;
      const diff = target - this.pos.y;
      if (diff > 0) {
        // stepping up: instant snap so the mouse doesn't sink into the object
        this.pos.y = target;
      } else {
        // stepping down: use the same gravity path so landings feel natural
        this.vel.y -= MOUSE.gravity * dt;
        this.pos.y += this.vel.y * dt;
        if (this.pos.y <= floor) {
          this.pos.y = floor;
          this.vel.y = 0;
        } else {
          this.grounded = false;
        }
      }
    }

    // ── Turning ───────────────────────────────────────────────────────────
    const sp = this.speed;
    if (sp > 0.15 && Math.hypot(tx, tz) > 0.01) {
      const target = Math.atan2(tx, tz);
      let d = target - this.yaw;
      d = Math.atan2(Math.sin(d), Math.cos(d));
      this.yaw += d * (1 - Math.exp(-MOUSE.turn * dt));
    }

    // ── Head tracking smoothing ───────────────────────────────────────────
    const headSmooth = 1 - Math.exp(-12 * dt);
    this.headYaw += (this.targetHeadYaw - this.headYaw) * headSmooth;
    this.headPitch += (this.targetHeadPitch - this.headPitch) * headSmooth;

    // ── Procedural walk cycle ─────────────────────────────────────────────
    this.phase += dt * (6 + sp * 9);
    const amt = Math.min(1, sp / MOUSE.walk);
    const m = this.model;

    if (this.grounded) {
      m.body.position.y = Math.abs(Math.sin(this.phase)) * 0.02 * amt;
    } else {
      // slight lean-back while airborne
      m.body.position.y = 0.02;
    }
    m.feet.forEach((f, i) => (f.position.z = (i < 2 ? 0.08 : -0.08) + Math.sin(this.phase + (i % 2 === (i < 2 ? 0 : 1) ? 0 : Math.PI)) * 0.03 * amt));
    m.tail.rotation.y = Math.sin(this.phase * 0.5) * (0.25 + 0.3 * amt);

    // Head yaw from cursor tracking; head pitch combines cursor tracking + subtle idle nod
    const idleNod = Math.sin(this.phase * 0.25) * 0.05 * (1 - amt);
    m.head.rotation.y = this.headYaw;
    m.head.rotation.x = this.headPitch + idleNod;

    this.sync();
  }

  private sync() {
    this.root.position.set(this.pos.x, this.pos.y, this.pos.z);
    this.root.rotation.y = this.yaw;
  }

  dispose(scene: THREE.Scene) {
    this.root.traverse((o) => {
      if (o instanceof THREE.Mesh) {
        o.geometry.dispose();
        (o.material as THREE.Material).dispose();
      }
    });
    scene.remove(this.root);
  }
}
