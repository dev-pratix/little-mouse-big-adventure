// Collision: the mouse is a circle on the XZ plane, obstacles are axis-aligned boxes.
export interface Box {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
}

/**
 * A climbable platform: same XZ footprint as Box, plus the Y height of its top surface.
 * The mouse can step up onto it if the height is below STEP_HEIGHT.
 */
export interface Platform extends Box {
  /** Y coordinate of the top surface the mouse can stand on. */
  topY: number;
}

export const STEP_HEIGHT = 0.32; // max ledge the mouse can auto-step onto (metres)

export const box = (cx: number, cz: number, w: number, d: number): Box => ({
  minX: cx - w / 2,
  maxX: cx + w / 2,
  minZ: cz - d / 2,
  maxZ: cz + d / 2,
});

export const platform = (cx: number, cz: number, w: number, d: number, topY: number): Platform => ({
  ...box(cx, cz, w, d),
  topY,
});

/** Pushes the point (x,z) with radius r out of every box. Mutates and returns pos. */
export function resolve(pos: { x: number; z: number }, r: number, boxes: Box[]) {
  for (let pass = 0; pass < 2; pass++) {
    for (const b of boxes) {
      const nx = Math.max(b.minX, Math.min(pos.x, b.maxX));
      const nz = Math.max(b.minZ, Math.min(pos.z, b.maxZ));
      const dx = pos.x - nx;
      const dz = pos.z - nz;
      const d2 = dx * dx + dz * dz;
      if (d2 >= r * r) continue;
      if (d2 > 1e-8) {
        const d = Math.sqrt(d2);
        pos.x = nx + (dx / d) * r;
        pos.z = nz + (dz / d) * r;
      } else {
        // centre inside the box: push out along the shallowest axis
        const pl = pos.x - b.minX, pr = b.maxX - pos.x, pb = pos.z - b.minZ, pf = b.maxZ - pos.z;
        const m = Math.min(pl, pr, pb, pf);
        if (m === pl) pos.x = b.minX - r;
        else if (m === pr) pos.x = b.maxX + r;
        else if (m === pb) pos.z = b.minZ - r;
        else pos.z = b.maxZ + r;
      }
    }
  }
  return pos;
}

/**
 * Given the mouse's current XZ position, return the highest platform surface
 * directly below it (within radius r), or 0 (floor) if none.
 * Only returns platforms whose topY ≤ currentY + STEP_HEIGHT (so we don't
 * teleport upward into ceilings mid-air).
 */
export function groundY(
  pos: { x: number; z: number },
  r: number,
  platforms: Platform[],
  currentY: number,
): number {
  let best = 0; // floor
  for (const p of platforms) {
    if (p.topY > currentY + STEP_HEIGHT) continue;
    // check if mouse footprint overlaps platform XZ
    const nx = Math.max(p.minX, Math.min(pos.x, p.maxX));
    const nz = Math.max(p.minZ, Math.min(pos.z, p.maxZ));
    const dx = pos.x - nx;
    const dz = pos.z - nz;
    if (dx * dx + dz * dz < r * r) {
      best = Math.max(best, p.topY);
    }
  }
  return best;
}
