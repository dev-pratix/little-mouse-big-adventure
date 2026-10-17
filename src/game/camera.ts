// Camera controller: smooth third-person follow that eases in behind the mouse.
import * as THREE from "three";
import { HOLE, NOOK, ROOM } from "./world";

const DIST = 2.1;
const HEIGHT = 1.0;
const LOW_HEIGHT = 0.45; // near the hole so the arch doesn't block the view

export class FollowCamera {
  yaw = 0;
  private height = HEIGHT;
  private pos = new THREE.Vector3();
  private look = new THREE.Vector3();
  private tmp = new THREE.Vector3();

  constructor(public cam: THREE.PerspectiveCamera) {}

  snap(x: number, z: number, yaw: number) {
    this.yaw = yaw;
    this.compute(x, z);
    this.pos.copy(this.tmp);
    this.look.set(x, 0.2, z);
    this.cam.position.copy(this.pos);
    this.cam.lookAt(this.look);
  }

  private compute(x: number, z: number) {
    const inNookArea = z < ROOM.minZ + 2.2 && x > NOOK.minX - 0.6 && x < NOOK.maxX + 0.6;
    let cx = x - Math.sin(this.yaw) * DIST;
    let cz = z - Math.cos(this.yaw) * DIST;
    let cy = this.height;
    if (z < ROOM.minZ || (z < ROOM.minZ + 2.2 && Math.abs(x - HOLE.x) < 0.6)) {
      // mouse is inside its home: keep the camera in the nook or just outside the hole
      if (cz < ROOM.minZ + 0.2) {
        cx = Math.max(NOOK.minX + 0.15, Math.min(NOOK.maxX - 0.15, cx));
        cz = Math.max(NOOK.minZ + 0.15, cz);
        cy = Math.min(cy, NOOK.h - 0.2);
      }
    } else {
      cz = Math.max(ROOM.minZ + 0.3, cz);
    }
    cx = Math.max(ROOM.minX + 0.3, Math.min(ROOM.maxX - 0.3, cx));
    cz = Math.min(ROOM.maxZ - 0.3, cz);
    this.tmp.set(cx, cy, cz);
    return inNookArea;
  }

  /**
   * @param mouseY  current Y of the mouse (0 = floor, >0 when on platform or jumping)
   */
  update(dt: number, x: number, z: number, mouseY: number, mouseYaw: number, moving: boolean, forwardInput: number) {
    // only swing behind the mouse while it's heading away from the camera, avoids spinning on "back"
    if (moving && forwardInput > -0.2) {
      let d = mouseYaw - this.yaw;
      d = Math.atan2(Math.sin(d), Math.cos(d));
      this.yaw += d * (1 - Math.exp(-2.2 * dt));
    }
    const near = this.compute(x, z);
    const targetH = near ? LOW_HEIGHT : HEIGHT;
    this.height += (targetH - this.height) * (1 - Math.exp(-3 * dt));
    this.pos.lerp(this.tmp, 1 - Math.exp(-7 * dt));

    // Look-at target tracks mouse Y so we follow the mouse during a jump
    const lookY = 0.2 + mouseY;
    this.look.lerp(this.tmp.set(x, lookY, z), 1 - Math.exp(-12 * dt));
    this.cam.position.copy(this.pos);
    this.cam.lookAt(this.look);
  }
}
