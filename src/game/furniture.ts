/**
 * furniture.ts
 * Loads Kenney GLB assets and places them in the scene.
 * Returns collision boxes that merge into world.colliders.
 *
 * Design:
 *  - Each GLB is loaded once, then cloned for every placement → single HTTP fetch per model.
 *  - Furniture is arranged in three recognisable zones: lounge, bedroom, work/storage.
 *  - Room perimeter walls are handled entirely by world.ts (PlaneGeometry + ExtrudeGeometry).
 *  - Collision boxes use simple axis-aligned rectangles matching visible footprints.
 *
 * Kenney GLB convention: the model's local origin is at ONE CORNER of its base,
 * NOT at the geometric centre. When we call place(model, x, 0, z) the corner
 * lands at (x, z). To centre a collider on the VISUAL footprint we must add
 * half the world-space extent to form the AABB centre.
 *
 * All placements below document the expected world footprint explicitly so
 * future edits can verify positions without loading the scene.
 *
 * Room extents (X: -12 → +12, Z: -9 → +9). Wall colliders block at |X|>=11, Z>=8, Z<=-9.
 * Mouse hole at X=-7, Z=-9. Mouse radius = 0.13 m.
 */
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { box, type Box } from "./collision";
import { contactShadowTexture } from "./textures";
import { ROOM } from "./world";

// ── Paths (relative to public/) ──────────────────────────────────────────────
const FURN = "/assets/kenney_furniture-kit/Models/GLTF format/";

// ── Loader + cache ───────────────────────────────────────────────────────────
const loaderGLTF = new GLTFLoader();
const cache = new Map<string, THREE.Group>();

/**
 * Elevates flat Kenney materials with authentic PBR properties:
 * - Natural satin wood finish with subtle sheen.
 * - Soft woven fabric matte for upholstery and rugs.
 * - Brushed and dark anodized metallic surfaces.
 * - Glossy reflective TV screen glass.
 * - Cozy warm translucent lampshade emissivity.
 */
function enhanceModelMaterials(root: THREE.Object3D) {
  root.traverse((o) => {
    if (o instanceof THREE.Mesh && o.material) {
      const mats = Array.isArray(o.material) ? o.material : [o.material];
      mats.forEach((m) => {
        if (m instanceof THREE.MeshStandardMaterial) {
          const name = (m.name || "").toLowerCase();
          if (name.includes("wood")) {
            m.roughness = 0.46;
            m.metalness = 0.04;
          } else if (name.includes("carpet") || name.includes("fabric") || name.includes("bear") || name.includes("toy")) {
            m.roughness = 0.92;
            m.metalness = 0.0;
          } else if (name.includes("metal")) {
            if (name.includes("dark")) {
              m.roughness = 0.18;
              m.metalness = 0.85;
            } else {
              m.roughness = 0.28;
              m.metalness = 0.80;
            }
          } else if (name.includes("lamp")) {
            m.roughness = 0.55;
            m.metalness = 0.05;
            m.emissive = new THREE.Color("#ffeedd");
            m.emissiveIntensity = 0.35;
          } else if (name.includes("plant") || name.includes("leaf")) {
            m.roughness = 0.55;
            m.metalness = 0.0;
          } else {
            m.roughness = 0.65;
            m.metalness = 0.05;
          }
          m.needsUpdate = true;
        }
      });
    }
  });
}

async function loadModel(url: string): Promise<THREE.Group> {
  const cached = cache.get(url);
  if (cached) return cached;
  return new Promise<THREE.Group>((resolve, reject) => {
    loaderGLTF.load(url, (gltf) => {
      enhanceModelMaterials(gltf.scene);
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

  /**
   * add — load model, place in scene, register collider.
   *
   * colCX / colCZ = WORLD-SPACE CENTRE of the visible footprint (not the placement origin).
   * colW / colD   = WORLD-SPACE full extents (already scaled).
   * Pass colW=0, colD=0 for purely decorative objects with no collision.
   */
  const add = async (
    file: string,
    x: number,
    z: number,
    ry = 0,
    scale = 1,
    colCX = 0,
    colCZ = 0,
    colW = 0,
    colD = 0,
    yOff = 0,
  ) => {
    try {
      const model = await loadModel(file);
      const g = place(sceneGroup, model, x, yOff, z, ry, scale);
      groups.push(g);
      if (colW > 0 && colD > 0) {
        colliders.push(box(colCX, colCZ, colW, colD));
      }
      return g;
    } catch (e) {
      console.warn(`[furniture] failed to load ${file}`, e);
      return null;
    }
  };

  // ── Ambient Occlusion Ground Contact Shadows ─────────────────────────────
  const shadowTex = contactShadowTexture();
  const shadowMat = new THREE.MeshBasicMaterial({
    map: shadowTex,
    transparent: true,
    opacity: 0.35,
    depthWrite: false,
  });
  const addShadow = (x: number, z: number, w: number, d: number) => {
    const geo = new THREE.PlaneGeometry(w, d);
    const m = new THREE.Mesh(geo, shadowMat);
    m.rotation.x = -Math.PI / 2;
    m.position.set(x, 0.003, z);
    sceneGroup.add(m);
    groups.push(m as unknown as THREE.Group);
  };

  // Contact shadows grounding living room suite
  addShadow(-7.545, -3.80, 0.95, 2.60);  // Under TV cabinet
  addShadow(-3.80, -3.80, 1.45, 3.10);   // Under Sofa
  addShadow(-5.80, -3.80, 1.25, 1.25);   // Under Coffee table
  addShadow(-5.80, -2.19, 1.35, 1.15);   // Under Armchair
  addShadow(-3.135, -6.065, 0.65, 0.65); // Under Cardboard box

  // =========================================================================
  //  LAYOUT — 4-Room Floor Plan (X: -8 left → +8 right, Z: -6.5 back → +6.5 front)
  //
  //  +6.5 +-----------------------------------[DOOR 4]------------------------------------+
  //       | [COAT RACK]    [--- BOOKCASES ---]        |  [SIDE TABLE] [NIGHTSTAND] [--- BED ---] |
  //       |  (-7.2, 6.0)    X: -7.92 to -7.17         |   (1.6, 6.1)   (3.3, 6.1)   (5.6, 6.2)   |
  //       |                 Z: +1.20 to +6.00         |   (Accent)     [LAMP]       (Under open) |
  //       |                 (Shelves face +X)         |                             (6.4m front) |
  //       |                                           |                                          |
  //       |                 CHEESE #3                 |                                          |
  //       |                 (-6.0, 5.0)               |                                          |
  //       |            [--- NW LIBRARY ---]           |           [--- NE BEDROOM ---]           |
  //     0 +--------------[DOOR 2]--------------------+------------------[DOOR 3]-----------------+
  //       |            [--- SW LIVING ROOM ---]       |           [--- SE STUDY ---]             |
  //       |                                           |                           CHEESE #1      |
  //       |                 [ARMCHAIR]                |                            (4.5, -2.4)   |
  //       |                 (-5.8, -2.2)              |                                          |
  //       |  [TV / CABINET] [COFFEE TABLE]  [SOFA]    |                           [CHAIR] [DESK] |
  //       |  X: -7.9 to -7.2 (-5.8, -3.8)   (-3.8,-3.8)|                           (6.0) (7.3,-2.7)
  //       |  (Screen +X)    (Under open)   (Under open)|                                  [TRASH] |
  //       |                                           |                           CHEESE #2      |
  //       |  [FLOOR LAMP]                  [BOX]      |                            (5.5, -5.5)   |
  //       |   (-7.4, -5.8)                 (-3.4,-5.8)|                          [POTTED PLANT]  |
  //       |              [ MOUSE HOLE ]               |                           (7.2, -5.8)   |
  //  -6.5 +--------------------------------------------------------------------------------------+
  //
  // =========================================================================

  // ── 1. LIVING ROOM ZONE (South-West Room: X[-8, 0], Z[-6.5, 0]) ───────────

  // TV Cabinet (cabinetTelevision.glb) — flush against West wall skirting (X=-7.92)
  // Native: 0.80(W) x 0.25(D), scale=3 → 2.40(Z) x 0.75(X). Height 0.93m.
  // Back panel at local Z=0, front doors face +X into room (rot = -PI/2).
  // Z span: Z[-5.00, -2.60], centered at Z=-3.80.
  await add(FURN + "cabinetTelevision.glb",
    -7.92, -5.00, -Math.PI / 2, 3,
    -7.545, -3.80, 0.75, 2.40);

  // Modern Television (televisionModern.glb) — centered atop TV cabinet (Y=0.93m)
  // Screen normal points East (+X) into room.
  await add(FURN + "televisionModern.glb",
    -7.545, -3.80, Math.PI / 2, 3,
    0, 0, 0, 0, 0.93);

  // Bookshelf Speakers & Tabletop Radio atop TV Cabinet
  await add(FURN + "speakerSmall.glb",
    -7.545, -4.70, Math.PI / 2, 2.4,
    0, 0, 0, 0, 0.93);
  await add(FURN + "speakerSmall.glb",
    -7.545, -2.90, Math.PI / 2, 2.4,
    0, 0, 0, 0, 0.93);
  await add(FURN + "radio.glb",
    -7.545, -4.35, Math.PI / 2, 2.2,
    0, 0, 0, 0, 0.93);

  // Main Sofa (loungeSofa.glb) — facing West (-X) directly toward the TV
  // Native: 0.98(W) x 0.41(D), scale=3 → 2.94(Z) x 1.23(X). Height 1.38m.
  // Front of seat at X=-4.42, backrest at X=-3.19. Centered at Z=-3.80.
  // Open underside clearance (0.22m) allows mouse (0.15m height) to crawl under and hide!
  await add(FURN + "loungeSofa.glb",
    -4.42, -5.27, -Math.PI / 2, 3,
    0, 0, 0, 0);
  colliders.push(
    box(-3.32, -3.80, 0.26, 2.94), // Backrest panel
    box(-4.30, -5.15, 0.16, 0.16), // Front-left leg
    box(-4.30, -2.45, 0.16, 0.16), // Front-right leg
  );

  // Sofa Corner Throw Pillows (cozy lived-in details nested against seat armrests)
  await add(FURN + "pillow.glb",
    -4.10, -4.95, 0, 2.0,
    0, 0, 0, 0, 0.46);
  await add(FURN + "pillowBlue.glb",
    -4.10, -2.65, 0, 2.0,
    0, 0, 0, 0, 0.46);

  // Coffee Table (tableCoffeeSquare.glb) — centered between TV and sofa
  // Native: 0.40x0.40, scale=2.5 → 1.0x1.0m. Table top at Y=0.58m.
  // Center: X=-5.80, Z=-3.80. Underside clearance is 0.45m (mouse traversal/hiding).
  // 4-corner leg colliders:
  await add(FURN + "tableCoffeeSquare.glb",
    -5.15, -3.55, 0, 2.5,
    0, 0, 0, 0);
  colliders.push(
    box(-6.25, -4.25, 0.10, 0.10), // Back-left leg
    box(-5.35, -4.25, 0.10, 0.10), // Back-right leg
    box(-6.25, -3.35, 0.10, 0.10), // Front-left leg
    box(-5.35, -3.35, 0.10, 0.10), // Front-right leg
  );

  // Coffee Table Accessories: Potted Succulent + Reading Books
  await add(FURN + "plantSmall2.glb",
    -5.60, -3.60, 0, 2.0,
    0, 0, 0, 0, 0.58);
  await add(FURN + "books.glb",
    -6.00, -3.95, 0.4, 2.0,
    0, 0, 0, 0, 0.58);

  // Armchair (loungeChair.glb) — North flank, naturally grouped with sofa & table
  // Seat faces South (-Z) directly into the coffee table and sofa suite.
  // Placed at center: X=-5.80, Z=-2.19.
  await add(FURN + "loungeChair.glb",
    -5.19, -2.70, Math.PI, 2.5,
    -5.80, -2.19, 1.225, 1.025);

  // Armchair Accent Pillow
  await add(FURN + "pillow.glb",
    -5.80, -2.10, Math.PI, 1.8,
    0, 0, 0, 0, 0.42);

  // Living Room Rug (rugRectangle.glb) — frames sofa, table, and armchair suite
  await add(FURN + "rugRectangle.glb",
    -5.60, -3.80, 0, 2.8,
    0, 0, 0, 0);

  // Floor lamp — living room SW corner lighting
  await add(FURN + "lampSquareFloor.glb",
    -7.40, -5.80, 0, 2.5,
    -7.25, -5.95, 0.30, 0.30);

  // Cardboard box near mouse-hole (story prop; clear of mouse-hole lane at X=-5.0)
  await add(FURN + "cardboardBoxClosed.glb",
    -3.40, -5.80, 0, 2.5,
    -3.135, -6.065, 0.53, 0.53);

  // ── 2. LIBRARY ZONE (North-West Room: X[-8, 0], Z[0, 6.5]) ─────────────────

  // Bookcases along West wall skirting (X=-7.92), shelves facing +X into room.
  // Bookcase closed wide: Z[1.20, 3.60], center Z=2.40
  await add(FURN + "bookcaseClosedWide.glb",
    -7.92, 1.20, -Math.PI / 2, 3,
    -7.545, 2.40, 0.75, 2.40);

  // Bookcase open: Z[3.60, 4.80], center Z=4.20
  await add(FURN + "bookcaseOpen.glb",
    -7.92, 3.60, -Math.PI / 2, 3,
    -7.545, 4.20, 0.75, 1.20);

  // Bookcase closed: Z[4.80, 6.00], center Z=5.40
  await add(FURN + "bookcaseClosed.glb",
    -7.92, 4.80, -Math.PI / 2, 3,
    -7.545, 5.40, 0.75, 1.20);

  // Books decoration on bookcase shelf (Y=0.75m)
  await add(FURN + "books.glb",
    -7.45, 4.20, -Math.PI / 2, 2.5,
    0, 0, 0, 0, 0.75);

  // Coat rack — North-West corner
  await add(FURN + "coatRackStanding.glb",
    -7.20, 6.00, 0, 2.5,
    -7.20, 6.00, 0.40, 0.40);

  // Reading / Accent side table
  await add(FURN + "sideTable.glb",
    -3.50, 5.20, 0, 2.2,
    -2.86, 5.47, 1.34, 0.55);

  // ── 3. BEDROOM ZONE (North-East Room: X[0, 8], Z[0, 6.5]) ──────────────────

  // Double Bed (bedDouble.glb) — headboard flush against North wall skirting (Z=6.42)
  // Native: 0.956(W) x 1.125(D), scale=3 → 2.87(X) x 3.375(Z), height 1.125m.
  // Rot=PI places headboard against North wall. Center X=5.60, Z span [3.05, 6.42].
  // Under-bed open clearance (0.72m) is a prime mouse hiding and traversal zone!
  await add(FURN + "bedDouble.glb",
    7.035, 3.045, Math.PI, 3,
    0, 0, 0, 0);
  colliders.push(
    box(5.60, 6.26, 2.87, 0.32), // Solid headboard against North wall
    box(4.28, 3.15, 0.20, 0.20), // Foot-left post
    box(6.92, 3.15, 0.20, 0.20), // Foot-right post
  );

  // Bedside Nightstand (cabinetBedDrawer.glb) — left of bed with comfortable 0.50m gap
  // Flush against North skirting at Z=6.42.
  await add(FURN + "cabinetBedDrawer.glb",
    3.64, 5.88, Math.PI, 2.5,
    3.33, 6.15, 0.665, 0.543);

  // Bedside Lamp (lampRoundTable.glb) — centered atop nightstand (Y=0.66m)
  await add(FURN + "lampRoundTable.glb",
    3.33, 6.15, 0, 2.0,
    0, 0, 0, 0, 0.66);

  // Side Table / Bedroom console — North wall accent table
  await add(FURN + "sideTable.glb",
    1.00, 5.88, 0, 2.2,
    1.64, 6.15, 1.34, 0.55);

  // Accent Rug near foot of bed (decorative, no collider)
  await add(FURN + "rugDoormat.glb",
    5.60, 2.00, 0, 2.5,
    0, 0, 0, 0);

  // ── 4. STUDY / WORK ZONE (South-East Room: X[0, 8], Z[-6.5, 0]) ────────────

  // Study Desk (desk.glb) — back flush against East wall skirting (X=7.92)
  // Native: 0.734(W) x 0.392(D), scale=3 → 2.20(Z) x 1.18(X), height 1.15m.
  // Rot=-PI/2, sitting front at X=6.74. Z span [-3.80, -1.60], centered at Z=-2.70.
  // Central footwell (1.40m wide, 0.73m high) is open for mouse traversal/hiding!
  await add(FURN + "desk.glb",
    6.74, -3.80, -Math.PI / 2, 3,
    0, 0, 0, 0);
  colliders.push(
    box(7.33, -3.50, 1.18, 0.60), // Drawer pedestal
    box(7.33, -1.70, 1.18, 0.20), // Far end support panel
  );

  // Desk Chair (chairDesk.glb) — tucked into desk workstation facing East (+X)
  // Center post collider only; legs leave clear space.
  await add(FURN + "chairDesk.glb",
    6.44, -2.70, Math.PI / 2, 2.5,
    6.04, -2.70, 0.40, 0.40);

  // Computer Screen (computerScreen.glb) — on desk surface (Y=1.15m) facing West
  await add(FURN + "computerScreen.glb",
    7.35, -3.19, -Math.PI / 2, 2.5,
    0, 0, 0, 0, 1.15);

  // Small Desk Plant (plantSmall1.glb) — decorative on desk right corner (Y=1.15m)
  await add(FURN + "plantSmall1.glb",
    7.35, -1.90, 0, 2.0,
    0, 0, 0, 0, 1.15);

  // Trashcan (trashcan.glb) — beside desk against East wall
  await add(FURN + "trashcan.glb",
    7.30, -4.30, 0, 1.5,
    7.30, -4.30, 0.50, 0.50);

  // Potted plant — South-East corner
  await add(FURN + "pottedPlant.glb",
    7.20, -5.80, 0, 2.5,
    7.20, -5.80, 0.50, 0.50);

  // ── 5. MINIATURE COMPANION IN MOUSE BURROW ─────────────────────────────────
  // Tiny stuffed teddy bear resting on the matchbox bed (West burrow nook)
  // Scaled down to mouse scale (~0.18 - 0.20), tucked cozily against the pillow.
  await add(FURN + "bear.glb",
    -5.58, -7.56, Math.PI / 4, 0.18,
    0, 0, 0, 0, 0.14);

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
