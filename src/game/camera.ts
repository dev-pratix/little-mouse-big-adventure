// Camera controller: orbit camera that follows the mouse with controlled zoom and collision limits.
import * as THREE from "three";
import { NOOK, ROOM } from "./world";

// Camera distance and angle constants
export const DEFAULT_DISTANCE = 3.0; // comfortable third-person distance behind mouse
export const DEFAULT_PITCH = 0.40;   // ~23° above horizontal (classic platformer angle)
export const MIN_DISTANCE = 1.4;     // minimum zoom distance (keeps mouse clearly framed)
export const MAX_DISTANCE = 4.8;     // maximum zoom distance (prevents losing character context)
export const MIN_PITCH = 0.10;       // ~6° (keeps camera strictly above floor)
export const MAX_PITCH = 1.30;       // ~75° (prevents camera flip directly overhead)

/**
 * FollowCamera – third-person gameplay camera with user orbit and controlled zoom.
 * In default view, it follows directly behind and slightly above the mouse.
 * The player can orbit 360° with mouse movement, zoom with wheel, and reset with 'R' or pause UI.
 */
export class FollowCamera {
  yaw = 0;              // horizontal angle around Y axis (radians)
  pitch = DEFAULT_PITCH; // vertical angle from horizon (radians)
  distance = DEFAULT_DISTANCE;

  private pos = new THREE.Vector3();
  private look = new THREE.Vector3();

  constructor(public cam: THREE.PerspectiveCamera) {}

  /**
   * Snap camera directly to default third-person view behind the mouse.
   * Mouse yaw=0 points North (+Z); camera sits behind (-Z), looking forward.
   */
  snap(x: number, z: number, mouseYaw: number) {
    this.yaw = mouseYaw;
    this.pitch = DEFAULT_PITCH;
    this.distance = DEFAULT_DISTANCE;
    this.updatePosition(x, z, 0);
  }

  /** Reset camera to default third-person view behind mouse without interrupting gameplay. */
  reset(x: number, z: number, mouseYaw: number) {
    this.snap(x, z, mouseYaw);
  }

  /** Add user-controlled orbit around Y axis. */
  addYaw(delta: number) {
    this.yaw = (this.yaw + delta) % (2 * Math.PI);
  }

  /** Add user-controlled vertical angle (clamped so camera never goes below floor or inverts). */
  addPitch(delta: number) {
    this.pitch = THREE.MathUtils.clamp(this.pitch + delta, MIN_PITCH, MAX_PITCH);
  }

  /** Add user-controlled zoom (strictly bounded between MIN_DISTANCE and MAX_DISTANCE). */
  addDistance(delta: number) {
    this.distance = THREE.MathUtils.clamp(this.distance + delta, MIN_DISTANCE, MAX_DISTANCE);
  }

  /** Smooth blend factor (0 = open room, 1 = under furniture) */
  private hidingBlend = 0;

  /** Compute camera world position with bounds and wall-clamping. */
  private updatePosition(x: number, z: number, mouseY: number, dt: number = 0.016, isHiding: boolean = false) {
    const targetHidingBlend = isHiding ? 1.0 : 0.0;
    this.hidingBlend += (targetHidingBlend - this.hidingBlend) * (1 - Math.exp(-6 * dt));

    // When under furniture, smoothly tuck camera closer and lower pitch to peek underneath
    const effectivePitch = THREE.MathUtils.lerp(this.pitch, 0.16, this.hidingBlend);
    const effectiveDistance = THREE.MathUtils.lerp(
      this.distance,
      Math.min(this.distance, 1.55),
      this.hidingBlend,
    );
    const targetY = THREE.MathUtils.lerp(0.16 + mouseY, 0.11 + mouseY, this.hidingBlend);
    this.look.set(x, targetY, z);

    const sinYaw = Math.sin(this.yaw);
    const cosYaw = Math.cos(this.yaw);
    const sinPitch = Math.sin(effectivePitch);
    const cosPitch = Math.cos(effectivePitch);

    const offsetX = sinYaw * cosPitch * effectiveDistance;
    const offsetY = sinPitch * effectiveDistance;
    const offsetZ = cosYaw * cosPitch * effectiveDistance;

    const idealX = x - offsetX;
    const idealY = targetY + offsetY;
    const idealZ = z - offsetZ;

    // Boundary and collision protection:
    // If the mouse is inside the nook, keep the camera inside the nest volume
    if (z < ROOM.minZ) {
      const nestCamX = THREE.MathUtils.clamp(idealX, NOOK.minX + 0.20, NOOK.maxX - 0.20);
      const nestCamZ = Math.max(NOOK.minZ + 0.25, idealZ);
      const nestCamY = THREE.MathUtils.clamp(idealY, 0.15, NOOK.h - 0.10);
      this.pos.set(nestCamX, nestCamY, nestCamZ);
    } else {
      // Main room: keep camera inside perimeter walls and above floor
      const roomCamX = THREE.MathUtils.clamp(idealX, ROOM.minX + 0.35, ROOM.maxX - 0.35);
      const roomCamZ = THREE.MathUtils.clamp(idealZ, ROOM.minZ + 0.35, ROOM.maxZ - 0.35);
      const roomCamY = Math.max(0.12, idealY);
      this.pos.set(roomCamX, roomCamY, roomCamZ);
    }

    this.cam.position.copy(this.pos);
    this.cam.lookAt(this.look);
  }

  /** Engine calls this each frame. */
  update(
    dt: number,
    x: number,
    z: number,
    mouseY: number,
    _mouseYaw: number,
    _moving: boolean,
    _forwardInput: number,
    isHiding: boolean = false,
  ) {
    this.updatePosition(x, z, mouseY, dt, isHiding);
  }
}
