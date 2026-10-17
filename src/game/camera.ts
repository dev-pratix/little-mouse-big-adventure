// Camera controller: orbit camera that follows the mouse but allows user-controlled orbit.
import * as THREE from "three";
import { HOLE, NOOK, ROOM } from "./world";

// Default distance constant (exported for possible external use)
export const DEFAULT_DISTANCE = 3.8; // clear view of scaled mouse and room context

/**
 * FollowCamera (orbit version) – used by Engine.
 * It tracks the mouse position but the user can rotate around it with the right mouse button,
 * zoom with the wheel, and reset with the "R" key.
 */
export class FollowCamera {
  // user-controlled spherical coordinates
  yaw = 0; // horizontal angle around Y axis (radians)
  pitch = 0.45; // vertical angle from horizon (radians, ~26°)
  distance = DEFAULT_DISTANCE;

  private pos = new THREE.Vector3();
  private look = new THREE.Vector3();

  constructor(public cam: THREE.PerspectiveCamera) {}

  /**
   * Snap camera to a clear starting position.
   * The mouse spawns inside the nook (z ≈ -10.3). yaw=0 would put the camera
   * behind the mouse at z ≈ -12.3, inside the nook back wall.
   * Adding π flips the camera to the room side (z ≈ -6.5), looking toward the nook.
   */
  snap(x: number, z: number, yaw: number) {
    this.yaw = yaw + Math.PI; // camera on room side, looking toward mouse/nook
    this.pitch = 0.45;        // ~26° — shows mouse + surrounding room context
    this.distance = DEFAULT_DISTANCE;
    this.updatePosition(x, z, 0);
  }

  /** Reset to default view (same as snap but using current mouse yaw). */
  reset(x: number, z: number, mouseYaw: number) {
    this.snap(x, z, mouseYaw);
  }

  /** Add user‑controlled deltas – called from input handlers. */
  addYaw(delta: number) {
    this.yaw = (this.yaw + delta) % (2 * Math.PI);
  }
  addPitch(delta: number) {
    const min = 0.1; // ~6°
    const max = Math.PI / 2 - 0.1; // just below straight up
    this.pitch = THREE.MathUtils.clamp(this.pitch + delta, min, max);
  }
  addDistance(delta: number) {
    const min = 1.0;
    const max = 6.5;
    this.distance = THREE.MathUtils.clamp(this.distance + delta, min, max);
  }

  /** Compute camera world position from spherical coordinates. */
  private updatePosition(x: number, z: number, mouseY: number) {
    const targetY = 0.16 + mouseY; // look slightly above floor at mouse center
    this.look.set(x, targetY, z);

    const sinYaw = Math.sin(this.yaw);
    const cosYaw = Math.cos(this.yaw);
    const sinPitch = Math.sin(this.pitch);
    const cosPitch = Math.cos(this.pitch);

    const offsetX = sinYaw * cosPitch * this.distance;
    const offsetY = sinPitch * this.distance;
    const offsetZ = cosYaw * cosPitch * this.distance;

    this.pos.set(x - offsetX, targetY + offsetY, z - offsetZ);
    this.cam.position.copy(this.pos);
    this.cam.lookAt(this.look);
  }

  /** Engine calls this each frame. */
  update(
    _dt: number,
    x: number,
    z: number,
    mouseY: number,
    _mouseYaw: number,
    _moving: boolean,
    _forwardInput: number,
  ) {
    // The orbit parameters are driven by user input events; we just recompute position.
    this.updatePosition(x, z, mouseY);
  }
}
