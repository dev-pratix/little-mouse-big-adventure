/**
 * furniture.ts
 * Loads Kenney GLB assets (Furniture Kit + Building Kit) and places them in the scene.
 * Returns collision boxes that merge into world.colliders.
 *
 * Design:
 *  - Each GLB is loaded once, then cloned for every placement → single HTTP fetch per model.
 *  - Furniture is arranged in a cohesive living-room layout with clear walking paths.
 *  - Collision boxes use simple axis-aligned rectangles matching visible footprints.
 *  - Room perimeter walls are handled entirely by world.ts (PlaneGeometry + ExtrudeGeometry).
 *
 * Kenney conventions (measured from GLB accessor min/max):
 *  - Models are in the +X/+Y/+Z octant mostly, sitting on Y=0.
 *  - bedDouble: 1.62 × 1.91 m native → scale 3 → 4.87 × 5.73 m world
 *  - loungeSofa: 0.98 × 0.41 m native → scale 3 → 2.94 × 1.23 m world
 *  - desk: 0.73 × 0.56 m native → scale 3 → 2.20 × 1.68 m world
 *  - bookcaseClosed / Open: 0.40 × 0.25 m native → scale 3 → 1.20 × 0.75 m world
 *  - tableCoffeeSquare: 0.40 × 0.40 m native → scale 2.5 → 1.0 × 1.0 m world
 *
 * The mouse is 0.13 m radius / ~0.26 m diameter. Furniture at 1:1 looks human-sized.
 *
 * Collider note: box(x, z, colW * scale, colD * scale)
 *   → colW/colD are pre-scale values in "model units" (not world units).
 *   → Pass colW = native_width, colD = native_depth; the helper multiplies by scale.
 */
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { box, type Box } from "./collision";
import { ROOM } from "./world";

// ── Paths (relative to public/) ──────────────────────────────────────────────
const FURN = "/assets/kenney_furniture-kit/Models/GLTF format/";

// ── Loader + cache ───────────────────────────────────────────────────────────
const loaderGLTF = new GLTFLoader();
const cache = new Map<string, THREE.Group>();

async function loadModel(url: string): Promise<THREE.Group> {
  const cached = cache.get(url);
  if (cached) return cached;
  return new Promise<THREE.Group>((resolve, reject) => {
    loaderGLTF.load(url, (gltf) => {
      cache.set(url, gltf.scene);
      resolve(gltf.scene);
    }, undefined, reject);
  });
}

/** Clone a loaded model and place it into the scene at (x, y, z) with rotation and scale. */
function place(
  parent: THREE.Group,
  model: THREE.Group,
  x: number,
  y: number,
  z: number,
  ry = 0,
  scale = 1,
): THREE.Group {
  const clone = model.clone(true);
  clone.position.set(x, y, z);
  clone.rotation.y = ry;
  clone.scale.setScalar(scale);
  clone.traverse((o) => {
    if (o instanceof THREE.Mesh) {
      o.castShadow = true;
      o.receiveShadow = true;
    }
  });
  parent.add(clone);
  return clone;
}

// ── Public interface ─────────────────────────────────────────────────────────
export interface FurnitureResult {
  colliders: Box[];
  dispose: () => void;
}

/**
 * Load all Kenney GLB assets, place them, and return collision boxes.
 * Fire-and-forget from Engine (colliders are pushed once the Promise resolves).
 */
export async function loadFurniture(
  sceneGroup: THREE.Group,
): Promise<FurnitureResult> {
  const colliders: Box[] = [];
  const groups: THREE.Group[] = [];

  // ── Helper: load → place → collider ────────────────────────────────────────
  // colW and colD are NATIVE (pre-scale) model widths/depths.
  // The helper multiplies them by scale to get world-space collider dimensions.
  const add = async (
    file: string,
    x: number,
    z: number,
    ry = 0,
    colW = 0,
    colD = 0,
    scale = 1,
    yOffset = 0,
  ) => {
    try {
      const model = await loadModel(file);
      const g = place(sceneGroup, model, x, yOffset, z, ry, scale);
      groups.push(g);
      if (colW > 0 && colD > 0) {
        colliders.push(box(x, z, colW * scale, colD * scale));
      }
      return g;
    } catch (e) {
      console.warn(`[furniture] failed to load ${file}`, e);
      return null;
    }
  };


  // ═══════════════════════════════════════════════════════════════════════════
  //  FURNITURE — Cohesive layout for a tiny mouse in a human-sized room
  //
  //  Room top-down (X: -12 left → +12 right, Z: -9 back → +9 front)
  //
  //    +9 ┌─────────────────────────────────────────────────┐
  //       │ Bookcases  (left wall)   Bed + Cabinet (right)  │
  //       │ (-11, 5..7)             (7, 6.5) rotated 0      │
  //       │                                                  │
  //       │ Floor lamp              Open walking space       │
  //       │ (-8, 2)                                          │
  //     0 │ Sofa (-5, 0)            Desk (9.5, -0.5)         │
  //       │ Coffee (-5, 2.5)        Chair (7, -0.5)          │
  //       │ Chair (-1.5, 0.5)       TV cabinet (-9, -4)      │
  //       │                                                  │
  //       │ Rug (0, -1)       Cardboard box (-3.5, -7.5)     │
  //    -9 └─────────[mouse-hole @ X=-7]──────────────────────┘
  //
  // ═══════════════════════════════════════════════════════════════════════════

  // ── A. LOUNGE AREA ─────────────────────────────────────────────────────────
  //
  // loungeSofa native bounds: X[0..0.98], Z[-0.41..0], scale 3
  //   → World at position (-5.5, -1.5) rot=0:
  //     X: -5.5 to -5.5 + 0.98*3 = -5.5 to -2.56  (width 2.94 m)
  //     Z: -1.5 + (-0.41)*3 to -1.5 = -2.73 to -1.5  (depth 1.23 m, back at -2.73, front at -1.5)
  //   Sofa FRONT edge at Z = -1.5. People on sofa face +Z (toward front wall).
  //   Sofa center X = (-5.5 + -2.56) / 2 = -4.03
  //   Sofa clears left wall (minX=-12) by 6.5 m. ✓  Clears back wall by 6.5+ m. ✓
  await add(FURN + "loungeSofa.glb",  -5.5, -1.5, 0,           0.98, 0.41, 3);

  // Coffee table: native 0.40×0.40, scale 2.5 → 1.0×1.0 m world.
  // Center aligned with sofa center X (-4.0), placed 1.5 m in front of sofa front edge.
  // Sofa front at Z=-1.5, so table center at Z = -1.5 + 1.5 = 0.0
  await add(FURN + "tableCoffeeSquare.glb", -4.0, 0.0,  0,       0.40, 0.40, 2.5);

  // Lounge chair: native 0.49×0.41, scale 2.5 → 1.22×1.02 m world.
  // Placed to the right of the coffee table, facing the sofa (rot = Math.PI → faces -Z, toward sofa).
  // Center at X=-1.0, Z=0.0 — same Z-level as coffee table, facing back toward sofa.
  await add(FURN + "loungeChair.glb",  -1.0,  0.0, Math.PI,     0.49, 0.41, 2.5);

  // ── B. RUG ─────────────────────────────────────────────────────────────────
  // rugRectangle: decorative, no collision.
  // Centered under the lounge group: X≈-4.0, Z between sofa back (-2.73) and table (0.0) → Z≈-1.5
  await add(FURN + "rugRectangle.glb",  -3.5, -1.5, 0,           0,    0,    2.5);

  // ── C. FLOOR LAMP ──────────────────────────────────────────────────────────
  // Between bookcases and sofa — serves as a visual landmark
  await add(FURN + "lampSquareFloor.glb", -8.0, 2.5, 0,          0.15, 0.15, 2.5);

  // ── D. BEDROOM AREA (right side, near front/top wall) ──────────────────────
  //
  // bedDouble native: 1.62 × 1.91 m → scale 3 → 4.87 × 5.73 m world
  // X origin offset: min=-0.06, max=1.56 → center at 0.75 from origin
  // Z origin offset: min=-1.89, max=0.02 → center at -0.93 from origin
  //
  // We want the bed centered around X=8, against the top wall (Z near +9).
  // At rot=0:  world X = 8 + (-0.06..1.56)*3 = 7.82..12.68 → clips right wall!
  // Use rot=Math.PI so bed flips: X extent becomes 8 + (−1.56..0.06)*3 = 3.32..8.18
  //   and Z extent at rot=π: 8 * (−1..0) ... need to re-examine with rotation.
  //
  // Simpler: rotate π so model faces -Z (headboard visible), positioned at (7, 7).
  // At rot=π: X spans from 7-(1.62/2*3) to 7+(1.62/2*3) → roughly 7±2.43 = 4.57..9.43 ✓
  //           Z spans from 7-(1.91/2*3) to 7+(1.91/2*3) → roughly 7±2.87 = 4.13..9.87 (clips +9!)
  // Better: Z center at 6.0, Z span → 3.13..8.87 ✓
  //
  // Use rot=Math.PI, x=7.0, z=6.0
  // Collider: 1.62 × 1.91 native, scale 3 → 4.86 × 5.73 world (centered at x,z)
  await add(FURN + "bedDouble.glb",      7.0,  6.0, Math.PI,     1.62, 1.91, 3);

  // Bedside cabinet — left of bed (lower X), near headboard end
  // cabinetBedDrawer native: 0.27 × 0.38 m → scale 2.5 → 0.67 × 0.95 m
  // Bed left edge at ~4.57, so put cabinet center at X=4.0
  await add(FURN + "cabinetBedDrawer.glb", 4.0, 6.0, 0,          0.27, 0.38, 2.5);

  // Lamp on bedside cabinet (yOffset to sit on top: cabinet height 0.263*2.5 ≈ 0.66 m)
  await add(FURN + "lampRoundTable.glb",  4.0,  6.0, 0,           0,    0,    2.0, 0.66);

  // ── E. WORK AREA (right wall, center-lower) ─────────────────────────────────
  //
  // desk native: 0.73 × 0.56 m → scale 3 → 2.19 × 1.68 m world
  // Place against right wall (X near +12). At rot=-π/2 (facing left/−X):
  //   the desk's W becomes depth from the wall, D becomes the width along the wall.
  //   Origin at X=10.5, rotated -π/2: desk extends ~1.68 m along Z, 2.19 m into room.
  await add(FURN + "desk.glb",           10.5, -2.0, -Math.PI/2,  0.73, 0.56, 3);

  // Desk chair — in front of desk (toward −X from the desk)
  // chairDesk native: 0.48 × 0.44 m → scale 2.5 → 1.19 × 1.10 m
  // Desk extends from X=10.5 about 1.68 m into room (to X≈8.8). Chair at X=7.5.
  await add(FURN + "chairDesk.glb",       7.5, -2.0,  Math.PI/2,  0.48, 0.44, 2.5);

  // Computer screen on desk surface
  // desk top is at 0.384*3 ≈ 1.15 m height
  await add(FURN + "computerScreen.glb", 10.5, -2.0, -Math.PI/2,  0,    0,    2.5, 1.15);

  // ── F. BOOKCASE WALL (left wall, upper area) ────────────────────────────────
  //
  // bookcaseClosed native: 0.40 × 0.25 m → scale 3 → 1.20 × 0.75 m world
  // At rot=Math.PI/2 against left wall (X=-12), the model rotates:
  //   depth (0.25 m) becomes the X extent from wall: 0.25*3 = 0.75 m from wall
  //   width (0.40 m) becomes the Z extent: 0.40*3 = 1.20 m along wall
  //
  // Model origin: X[0..0.4], Z[-0.25..0]. At rot=π/2 and placed at X=-12:
  //   effective X from wall: 0 to 0.75 → -12 to -11.25 ✓ (inside room, not clipping)
  //
  // Three bookcases stacked along the wall:
  await add(FURN + "bookcaseClosed.glb", -11.5, 7.0, Math.PI/2,  0.40, 0.25, 3);
  await add(FURN + "bookcaseOpen.glb",   -11.5, 5.0, Math.PI/2,  0.40, 0.25, 3);
  await add(FURN + "bookcaseClosedWide.glb", -11.5, 2.5, Math.PI/2, 0.80, 0.25, 3);

  // Books — decorative, no collision, near bookcases
  await add(FURN + "books.glb",          -10.5, 5.8, 0.3,         0,    0,    2.5);

  // ── G. TV / ENTERTAINMENT AREA (left wall, lower area) ─────────────────────
  //
  // cabinetTelevision native: 0.80 × 0.25 m → scale 3 → 2.40 × 0.75 m world
  // Against left wall at rot=Math.PI/2 (cabinet face toward +X/room center)
  // At X=-11.5, rot=π/2: depth (0.75 m) comes off wall → extends to X=-10.75 ✓
  await add(FURN + "cabinetTelevision.glb", -11.5, -4.5, Math.PI/2, 0.80, 0.25, 3);

  // Television on top of cabinet (cabinet height 0.31*3 ≈ 0.93 m)
  await add(FURN + "televisionModern.glb",  -11.5, -4.5, Math.PI/2,  0,   0,    3, 0.93);

  // ── H. DECORATIVE / MISC ────────────────────────────────────────────────────

  // Potted plant — right side, near back wall (doesn't crowd the doorway area)
  await add(FURN + "pottedPlant.glb",     10.0, -7.0, 0,           0.35, 0.35, 2.5);

  // Small plant near desk
  await add(FURN + "plantSmall1.glb",     10.5, -4.5, 0,           0,    0,    2.0);

  // Trashcan near desk
  await add(FURN + "trashcan.glb",         8.5,  0.5, 0,           0.15, 0.15, 2.0);

  // Coat rack near front wall (left side)
  await add(FURN + "coatRackStanding.glb",-10.5, 8.0, 0,           0.15, 0.15, 2.5);

  // Cardboard box near mouse-hole — environmental storytelling
  // Kept well clear of the X=-7 doorway gap.
  // Box at (-3.5, -7.5): native ~0.43 m, scale 2.5 → 1.07 m. X: -3.5±0.53 = -4.03..-2.97 ✓
  await add(FURN + "cardboardBoxClosed.glb", -3.5, -7.5, 0.2,      0.43, 0.43, 2.5);

  // Doormat near front wall entrance
  await add(FURN + "rugDoormat.glb",       0.0,  8.3, 0,           0,    0,    2.5);

  // Side table between bedroom and lounge
  await add(FURN + "sideTable.glb",        2.5,  3.5, 0,           0.30, 0.30, 2.5);

  return {
    colliders,
    dispose: () => {
      for (const g of groups) {
        g.traverse((o) => {
          if (o instanceof THREE.Mesh) {
            o.geometry.dispose();
            const m = Array.isArray(o.material) ? o.material : [o.material];
            m.forEach((mat) => (mat as THREE.Material).dispose());
          }
        });
        sceneGroup.remove(g);
      }
      cache.clear();
    },
  };
}
