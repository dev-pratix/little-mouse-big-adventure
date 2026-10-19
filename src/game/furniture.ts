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
import { box, platform, type Box, type Platform } from "./collision";
import { contactShadowTexture, waffleBlanketTexture } from "./textures";
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
            m.roughness = 0.45;
            m.metalness = 0.04;
          } else if (name.includes("carpet") || name.includes("fabric") || name.includes("bear") || name.includes("toy") || name.includes("cushion") || name.includes("pillow")) {
            m.roughness = 0.94;
            m.metalness = 0.0;
          } else if (name.includes("screen") || name.includes("glass") || name.includes("tv")) {
            m.roughness = 0.10;
            m.metalness = 0.20;
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

/** Clone a loaded model and place it into the scene at (x, y, z) with rotation and scalar or 3D scale. */
function place(
  parent: THREE.Group,
  model: THREE.Group,
  x: number,
  y: number,
  z: number,
  ry = 0,
  scale: number | { x: number; y: number; z: number } = 1,
): THREE.Group {
  const clone = model.clone(true);
  clone.position.set(x, y, z);
  clone.rotation.y = ry;
  if (typeof scale === "number") {
    clone.scale.setScalar(scale);
  } else {
    clone.scale.set(scale.x, scale.y, scale.z);
  }
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
  platforms: Platform[];
  dispose: () => void;
}

/**
 * Load all Kenney GLB assets, place them, and return collision boxes and walkable platforms.
 * Fire-and-forget from Engine (colliders & platforms are pushed once the Promise resolves).
 */
export async function loadFurniture(
  sceneGroup: THREE.Group,
): Promise<FurnitureResult> {
  const colliders: Box[] = [];
  const platforms: Platform[] = [];
  const groups: THREE.Group[] = [];

  /**
   * add — load model, place in scene, register collider or platform.
   *
   * colCX / colCZ = WORLD-SPACE CENTRE of the visible footprint (not the placement origin).
   * colW / colD   = WORLD-SPACE full extents (already scaled).
   * platTopY      = Top surface Y height. If > 0, registers as walkable platform rather than blocking wall.
   * Pass colW=0, colD=0 for purely decorative objects with no collision.
   */
  const add = async (
    file: string,
    x: number,
    z: number,
    ry = 0,
    scale: number | { x: number; y: number; z: number } = 1,
    colCX = 0,
    colCZ = 0,
    colW = 0,
    colD = 0,
    yOff = 0,
    platTopY = 0,
  ) => {
    try {
      const model = await loadModel(file);
      const g = place(sceneGroup, model, x, yOff, z, ry, scale);
      groups.push(g);
      if (colW > 0 && colD > 0) {
        if (platTopY > 0) {
          platforms.push(platform(colCX, colCZ, colW, colD, platTopY));
        } else {
          colliders.push(box(colCX, colCZ, colW, colD));
        }
      }
      return g;
    } catch (e) {
      console.warn(`[furniture] failed to load ${file}`, e);
      return null;
    }
  };

  // ── Ambient Occlusion Ground Contact Shadows ─────────────────────────────
  const shadowTex = contactShadowTexture();
  const addShadow = (x: number, z: number, w: number, d: number, y = 0.003, opacity = 0.35) => {
    const geo = new THREE.PlaneGeometry(w, d);
    const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({
      map: shadowTex,
      transparent: true,
      opacity,
      depthWrite: false,
    }));
    m.rotation.x = -Math.PI / 2;
    m.position.set(x, y, z);
    sceneGroup.add(m);
    groups.push(m as unknown as THREE.Group);
  };

  // ── Contact Shadows: 1. Living Room Suite ──
  addShadow(-7.545, -3.80, 0.95, 2.60, 0.003);  // Under TV cabinet (hardwood)
  addShadow(-3.135, -6.065, 0.65, 0.65, 0.003); // Under Cardboard box (hardwood)
  addShadow(-4.89, -3.48, 3.35, 4.35, 0.002, 0.20); // Soft ambient halo beneath living room rug
  addShadow(-3.80, -3.80, 1.45, 3.10, 0.0065);  // Under Sofa (carpet surface)
  addShadow(-5.80, -3.80, 1.25, 1.25, 0.0065);  // Under Coffee table (carpet surface)
  addShadow(-5.80, -2.19, 1.35, 1.15, 0.0065);  // Under Armchair (carpet surface)

  // ── Contact Shadows: 2. Library Reading Suite ──
  addShadow(-7.545, 3.60, 0.95, 4.90, 0.003, 0.35); // Under West wall bookcases
  addShadow(-4.30, 6.11, 1.05, 0.65, 0.003, 0.35);  // Under North wall low bookcase
  addShadow(-7.20, 6.00, 0.45, 0.45, 0.003, 0.30);  // Under NW corner coat rack
  addShadow(-2.25, 4.30, 3.40, 3.40, 0.002, 0.20);  // Soft ambient halo beneath circular reading rug
  addShadow(-3.55, 4.75, 1.45, 1.45, 0.0065, 0.35); // Under Reading chair (carpet surface)
  addShadow(-1.97, 4.62, 1.25, 0.55, 0.0065, 0.35); // Under Reading side table (carpet surface)
  addShadow(-4.20, 5.60, 0.40, 0.40, 0.0065, 0.35); // Under Reading floor lamp (carpet surface)

  // ── Contact Shadows: 3. Bedroom Sanctuary Suite ──
  addShadow(5.60, 4.75, 2.90, 3.40, 0.003, 0.38);   // Under Double bed
  addShadow(3.33, 6.15, 0.70, 0.60, 0.003, 0.35);   // Under Left nightstand
  addShadow(7.48, 6.15, 0.70, 0.60, 0.003, 0.35);   // Under Right nightstand
  addShadow(1.625, 6.19, 1.25, 0.55, 0.003, 0.35);  // Under Vanity console table
  addShadow(5.60, 3.40, 5.20, 4.00, 0.002, 0.20);   // Soft ambient halo beneath bedroom area rug
  addShadow(5.55, 2.30, 1.10, 0.55, 0.0065, 0.35);  // Under End-of-bed bench (carpet surface)

  // ── Contact Shadows: 4. Study Workstation Suite ──
  addShadow(7.33, -3.50, 1.25, 0.65, 0.003, 0.35);  // Under Desk drawer pedestal
  addShadow(7.33, -1.70, 1.25, 0.25, 0.003, 0.35);  // Under Desk far support panel
  addShadow(7.33, -2.70, 1.10, 1.20, 0.003, 0.22);  // Ambient footwell shadow
  addShadow(3.50, -6.11, 1.05, 0.65, 0.003, 0.35);  // Under Low storage credenza
  addShadow(7.30, -4.15, 0.45, 0.45, 0.003, 0.30);  // Under Trashcan
  addShadow(7.20, -5.80, 0.55, 0.55, 0.003, 0.35);  // Under Corner potted plant
  addShadow(6.20, -2.70, 2.10, 2.10, 0.002, 0.20);  // Soft ambient halo beneath chair mat
  addShadow(6.04, -2.70, 0.50, 0.50, 0.0065, 0.35); // Under Desk chair (mat surface)

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

  // Sofa Throw Pillows (plush corner accents + center lumbar pillow)
  await add(FURN + "pillow.glb",
    -4.10, -4.95, 0, 2.0,
    0, 0, 0, 0, 0.46);
  await add(FURN + "pillowBlue.glb",
    -4.10, -2.65, 0, 2.0,
    0, 0, 0, 0, 0.46);
  await add(FURN + "pillowBlueLong.glb",
    -3.65, -3.80, -Math.PI / 2, 2.0,
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

  // Coffee Table Accessories: Potted Succulent + Reading Books + Sleek Remote Control
  await add(FURN + "plantSmall2.glb",
    -5.60, -3.60, 0, 2.0,
    0, 0, 0, 0, 0.58);
  await add(FURN + "books.glb",
    -6.00, -3.95, 0.4, 2.0,
    0, 0, 0, 0, 0.58);

  // Sleek TV remote control resting beside the reading books
  const remoteM = new THREE.MeshStandardMaterial({ color: "#1a1a1a", roughness: 0.35, metalness: 0.15 });
  const remoteMesh = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.012, 0.16), remoteM);
  remoteMesh.position.set(-5.65, 0.586, -4.05);
  remoteMesh.rotation.y = 0.28;
  sceneGroup.add(remoteMesh);
  groups.push(remoteMesh as unknown as THREE.Group);

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

  // Living Room Rug (rugRectangle.glb) — centered under sofa, table, and armchair suite
  // Model local: X in [0, 1.57], Z in [-0.92, 0], Y in [0, 0.01].
  // Scaled with realistic 6mm thickness: scaleX=2.7, scaleY=0.6, scaleZ=3.5 (Y top = 0.006m).
  // Rotated ry = -Math.PI / 2 aligns longer edge along Z, framing the conversation suite:
  // World X: [-6.50, -3.28] (centered at X = -4.89)
  // World Z: [-5.60, -1.36] (centered at Z = -3.48)
  // Walkable platform with platTopY = 0.006 elevates mouse paws onto carpet surface!
  await add(FURN + "rugRectangle.glb",
    -6.50, -5.60, -Math.PI / 2, { x: 2.7, y: 0.6, z: 3.5 },
    -4.89, -3.48, 3.22, 4.24, 0, 0.006);

  // Potted Houseplant beside TV Media Cabinet (SW corner accent)
  await add(FURN + "plantSmall1.glb",
    -7.50, -5.35, 0, 2.0,
    -7.50, -5.35, 0.30, 0.30);

  // Floor lamp — living room SW corner lighting
  await add(FURN + "lampSquareFloor.glb",
    -7.40, -5.80, 0, 2.5,
    -7.25, -5.95, 0.30, 0.30);

  // Cardboard box near mouse-hole (story prop; clear of mouse-hole lane at X=-5.0)
  await add(FURN + "cardboardBoxClosed.glb",
    -3.40, -5.80, 0, 2.5,
    -3.135, -6.065, 0.53, 0.53);

  // ── 2. LIBRARY ZONE (North-West Room: X[-8, 0], Z[0, 6.5]) ─────────────────

  // West Wall Bookcases — majestic library wall facing +X into room
  // Bookcase closed wide: Z[1.20, 3.60], center Z=2.40
  await add(FURN + "bookcaseClosedWide.glb",
    -7.92, 1.20, -Math.PI / 2, 3,
    -7.545, 2.40, 0.75, 2.40);

  // Bookcase open: Z[3.60, 4.80], center Z=4.20 (open shelves)
  await add(FURN + "bookcaseOpen.glb",
    -7.92, 3.60, -Math.PI / 2, 3,
    -7.545, 4.20, 0.75, 1.20);

  // Bookcase closed: Z[4.80, 6.00], center Z=5.40
  await add(FURN + "bookcaseClosed.glb",
    -7.92, 4.80, -Math.PI / 2, 3,
    -7.545, 5.40, 0.75, 1.20);

  // Varied book collections displayed across open bookcase shelves
  await add(FURN + "books.glb",
    -7.45, 4.05, -Math.PI / 2, 2.4,
    0, 0, 0, 0, 0.75); // Lower shelf
  await add(FURN + "books.glb",
    -7.45, 4.35, -Math.PI / 2 + 0.18, 2.3,
    0, 0, 0, 0, 1.35); // Middle shelf (angled)
  await add(FURN + "books.glb",
    -7.45, 4.10, -Math.PI / 2 - 0.12, 2.4,
    0, 0, 0, 0, 1.95); // Upper shelf

  // North Wall Low Bookcase / Library Credenza (Z in [5.80, 6.42], flush against North skirting)
  await add(FURN + "bookcaseOpenLow.glb",
    -3.80, 5.795, Math.PI, 2.5,
    -4.30, 6.11, 1.00, 0.625);
  // Low bookcase tabletop accessories (Y=1.00m)
  await add(FURN + "books.glb",
    -4.45, 6.11, 0, 2.2,
    0, 0, 0, 0, 1.00);
  await add(FURN + "plantSmall1.glb",
    -4.05, 6.11, 0, 2.0,
    0, 0, 0, 0, 1.00);

  // Coat rack — North-West corner
  await add(FURN + "coatRackStanding.glb",
    -7.20, 6.00, 0, 2.5,
    -7.20, 6.00, 0.40, 0.40);

  // Cozy Reading Nook: Plush circular reading rug under chair & table
  await add(FURN + "rugRound.glb",
    -3.906, 5.956, 0, { x: 3.6, y: 0.6, z: 3.6 },
    -2.25, 4.30, 3.31, 3.31, 0, 0.006);

  // Reclining Reading Lounge Chair — angled cozily toward room center
  await add(FURN + "loungeChairRelax.glb",
    -2.60, 4.60, Math.PI * 0.75, 2.3,
    -3.55, 4.75, 1.40, 1.40);
  // Velvet accent throw pillow on reading chair
  await add(FURN + "pillowBlue.glb",
    -3.40, 4.90, Math.PI * 0.75, 2.0,
    0, 0, 0, 0, 0.45);

  // Reading Side Table with drawers
  await add(FURN + "sideTableDrawers.glb",
    -1.40, 4.40, Math.PI, 2.2,
    -1.97, 4.62, 1.18, 0.50);
  // Side table accessories atop table surface (Y=0.846m)
  await add(FURN + "books.glb",
    -1.97, 4.62, 0.4, 2.0,
    0, 0, 0, 0, 0.846);
  await add(FURN + "plantSmall2.glb",
    -2.25, 4.62, 0, 1.8,
    0, 0, 0, 0, 0.846);

  // Ceramic tea cup resting on reading side table
  const teaCupMat = new THREE.MeshStandardMaterial({ color: "#f0ece1", roughness: 0.3, metalness: 0.08 });
  const teaCupMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.035, 0.08, 16), teaCupMat);
  teaCupMesh.position.set(-1.75, 0.885, 4.62);
  teaCupMesh.castShadow = true;
  sceneGroup.add(teaCupMesh);
  groups.push(teaCupMesh as unknown as THREE.Group);

  // Arched Floor Reading Lamp standing beside reading chair
  await add(FURN + "lampRoundFloor.glb",
    -4.20, 5.60, 0, 2.5,
    -4.20, 5.60, 0.35, 0.35);

  // ── 3. BEDROOM ZONE (North-East Room: X[0, 8], Z[0, 6.5]) ──────────────────

  // Double Bed (bedDouble.glb) — headboard flush against North wall skirting (Z=6.42)
  // Native: 0.956(W) x 1.125(D), scale=3 → 2.87(X) x 3.375(Z), height 1.125m.
  // Rot=PI places headboard against North wall. Center X=5.60, Z span [3.05, 6.42].
  // Open underside clearance (0.72m) is fully accessible for mouse traversal & hiding!
  await add(FURN + "bedDouble.glb",
    7.035, 3.045, Math.PI, 3,
    0, 0, 0, 0);
  colliders.push(
    box(5.60, 6.26, 2.87, 0.32), // Solid headboard against North wall
    box(4.28, 3.15, 0.20, 0.20), // Foot-left post
    box(6.92, 3.15, 0.20, 0.20), // Foot-right post
  );

  // Decorative blue velvet lumbar accent pillow resting on bed
  await add(FURN + "pillowBlue.glb",
    5.60, 5.65, 0, 2.0,
    0, 0, 0, 0, 0.72);

  // Cozy Woven Waffle-Knit Quilt Runner folded across foot of bed
  const quiltMat = new THREE.MeshStandardMaterial({
    map: waffleBlanketTexture(),
    roughness: 0.95,
    metalness: 0.0,
  });
  const quiltMesh = new THREE.Mesh(new THREE.BoxGeometry(2.70, 0.04, 0.65), quiltMat);
  quiltMesh.position.set(5.60, 0.70, 3.65);
  quiltMesh.castShadow = true;
  quiltMesh.receiveShadow = true;
  sceneGroup.add(quiltMesh);
  groups.push(quiltMesh as unknown as THREE.Group);

  // Left Bedside Nightstand (cabinetBedDrawer.glb) — flush against North skirting at Z=6.42
  await add(FURN + "cabinetBedDrawer.glb",
    3.64, 5.88, Math.PI, 2.5,
    3.33, 6.15, 0.665, 0.543);
  // Left nightstand lamp & bedtime reading
  await add(FURN + "lampRoundTable.glb",
    3.33, 6.15, 0, 2.0,
    0, 0, 0, 0, 0.66);
  await add(FURN + "books.glb",
    3.33, 5.95, 0.2, 1.8,
    0, 0, 0, 0, 0.66);

  // Right Bedside Nightstand (cabinetBedDrawerTable.glb) — symmetrical East flank
  await add(FURN + "cabinetBedDrawerTable.glb",
    7.80, 5.88, Math.PI, 2.5,
    7.48, 6.15, 0.665, 0.543);
  // Right nightstand lamp & bedside succulent
  await add(FURN + "lampRoundTable.glb",
    7.48, 6.15, 0, 1.8,
    0, 0, 0, 0, 0.66);
  await add(FURN + "plantSmall3.glb",
    7.48, 5.95, 0, 1.8,
    0, 0, 0, 0, 0.66);

  // Bedroom Vanity / Dressing Console along North wall
  await add(FURN + "sideTableDrawers.glb",
    2.20, 5.96, Math.PI, 2.2,
    1.625, 6.19, 1.15, 0.46);
  // Console tabletop decor (Y=0.846m)
  await add(FURN + "books.glb",
    1.40, 6.19, -0.3, 2.0,
    0, 0, 0, 0, 0.846);
  await add(FURN + "plantSmall1.glb",
    1.85, 6.19, 0, 1.8,
    0, 0, 0, 0, 0.846);

  // End-of-Bed Upholstered Bench
  await add(FURN + "benchCushion.glb",
    5.05, 2.55, 0, 2.5,
    5.55, 2.30, 1.05, 0.52);

  // Large Rounded Bedroom Area Rug framing the bed suite
  await add(FURN + "rugRounded.glb",
    3.09, 5.33, 0, { x: 3.2, y: 0.6, z: 4.2 },
    5.60, 3.40, 5.02, 3.86, 0, 0.006);

  // ── 4. STUDY / WORK ZONE (South-East Room: X[0, 8], Z[-6.5, 0]) ────────────

  // Study Desk (desk.glb) — back flush against East wall skirting (X=7.92)
  // Native: 0.734(W) x 0.392(D), scale=3 → 2.20(Z) x 1.18(X), height 1.152m.
  // Rot=-PI/2, sitting front at X=6.74. Z span [-3.80, -1.60], centered at Z=-2.70.
  // Central footwell (1.40m wide, 0.73m high) is open for mouse traversal/hiding!
  await add(FURN + "desk.glb",
    6.74, -3.80, -Math.PI / 2, 3,
    0, 0, 0, 0);
  colliders.push(
    box(7.33, -3.50, 1.18, 0.60), // Drawer pedestal
    box(7.33, -1.70, 1.18, 0.20), // Far end support panel
  );

  // Ergonomic Desk Chair (chairDesk.glb) — tucked into workstation facing East (+X)
  await add(FURN + "chairDesk.glb",
    6.44, -2.70, Math.PI / 2, 2.5,
    6.04, -2.70, 0.40, 0.40);

  // Workstation Tabletop Suite (Tabletop surface at Y = 1.152m)
  // 1. Computer Monitor centered facing user
  await add(FURN + "computerScreen.glb",
    7.45, -2.70, -Math.PI / 2, 2.5,
    0, 0, 0, 0, 1.152);

  // 2. Slate Leather Desk Blotter Mat
  const blotterMat = new THREE.MeshStandardMaterial({
    color: "#22252a",
    roughness: 0.82,
    metalness: 0.08,
  });
  const blotterMesh = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.005, 0.96), blotterMat);
  blotterMesh.position.set(7.08, 1.153, -2.70);
  blotterMesh.castShadow = true;
  blotterMesh.receiveShadow = true;
  sceneGroup.add(blotterMesh);
  groups.push(blotterMesh as unknown as THREE.Group);

  // 3. Computer Keyboard & Mouse on desk blotter
  await add(FURN + "computerKeyboard.glb",
    7.10, -2.85, -Math.PI / 2, 2.0,
    0, 0, 0, 0, 1.155);
  await add(FURN + "computerMouse.glb",
    7.10, -2.40, -Math.PI / 2, 1.8,
    0, 0, 0, 0, 1.155);

  // 4. Architect Desk Lamp on corner
  await add(FURN + "lampSquareTable.glb",
    7.45, -3.55, -0.4, 2.2,
    0, 0, 0, 0, 1.152);

  // 5. Desktop reference books & notebook
  await add(FURN + "books.glb",
    7.40, -3.25, -Math.PI / 2, 2.0,
    0, 0, 0, 0, 1.152);

  // 6. Ceramic coffee mug
  const mugMat = new THREE.MeshStandardMaterial({ color: "#f7f7f7", roughness: 0.25, metalness: 0.1 });
  const mugMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.04, 0.10, 16), mugMat);
  mugMesh.position.set(7.10, 1.202, -3.25);
  mugMesh.castShadow = true;
  sceneGroup.add(mugMesh);
  groups.push(mugMesh as unknown as THREE.Group);

  // 7. Small succulent pot on desk corner
  await add(FURN + "plantSmall2.glb",
    7.42, -1.85, 0, 1.8,
    0, 0, 0, 0, 1.152);

  // Low Storage Credenza / Filing Bookcase along South wall (Z in [-6.42, -5.80])
  // Keeps Cheese #2 at (5.50, -5.50) completely clear with >2.0m of space!
  await add(FURN + "bookcaseOpenLow.glb",
    3.00, -5.795, 0, 2.5,
    3.50, -6.11, 1.00, 0.625);
  // Credenza storage box & reference manuals (Y=1.00m)
  await add(FURN + "cardboardBoxClosed.glb",
    3.25, -6.11, 0.1, 1.8,
    0, 0, 0, 0, 1.00);
  await add(FURN + "books.glb",
    3.75, -6.11, 0, 2.0,
    0, 0, 0, 0, 1.00);

  // Desk Chair Area Mat / Rug
  await add(FURN + "rugSquare.glb",
    5.20, -1.70, 0, { x: 2.2, y: 0.6, z: 2.2 },
    6.20, -2.70, 2.00, 2.00, 0, 0.006);

  // Trashcan — beside desk against East wall
  await add(FURN + "trashcan.glb",
    7.30, -4.15, 0, 1.5,
    7.30, -4.15, 0.45, 0.45);

  // Large Potted Plant — South-East corner greenery accent
  await add(FURN + "pottedPlant.glb",
    7.20, -5.80, 0, 2.5,
    7.20, -5.80, 0.50, 0.50);

  // ── 5. MINIATURE COMPANION IN MOUSE BURROW ─────────────────────────────────
  // Tiny stuffed teddy bear resting on the matchbox bed (West burrow nook)
  // Scaled down to mouse scale (~0.18 - 0.20), tucked cozily against the pillow on expanded bed.
  await add(FURN + "bear.glb",
    -5.68, -7.76, Math.PI / 4, 0.18,
    0, 0, 0, 0, 0.14);

  return {
    colliders,
    platforms,
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
