import fs from 'fs';
import path from 'path';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

const loader = new GLTFLoader();
const dir = path.resolve('public/assets/kenney_furniture-kit/Models/GLTF format');

const modelCache = new Map();
async function getModel(file) {
  if (modelCache.has(file)) return modelCache.get(file);
  const buf = fs.readFileSync(path.join(dir, file));
  return new Promise((resolve, reject) => {
    loader.parse(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength), '', (gltf) => {
      modelCache.set(file, gltf.scene);
      resolve(gltf.scene);
    }, reject);
  });
}

function place(parent, model, x, y, z, ry = 0, scale = 1, name = '') {
  const clone = model.clone(true);
  clone.name = name;
  clone.position.set(x, y, z);
  clone.rotation.y = ry;
  if (typeof scale === 'number') {
    clone.scale.setScalar(scale);
  } else {
    clone.scale.set(scale.x, scale.y, scale.z);
  }
  clone.updateMatrixWorld(true);
  parent.add(clone);
  return clone;
}

async function run() {
  const scene = new THREE.Group();
  const items = [];

  const add = async (file, x, z, ry = 0, scale = 1, colCX = 0, colCZ = 0, colW = 0, colD = 0, yOff = 0, platTopY = 0, label = '') => {
    const m = await getModel(file);
    const obj = place(scene, m, x, yOff, z, ry, scale, label || file);
    const box = new THREE.Box3().setFromObject(obj);
    items.push({
      label: label || file,
      file,
      obj,
      box,
      col: colW > 0 ? { cx: colCX, cz: colCZ, w: colW, d: colD, topY: platTopY } : null,
      placement: { x, yOff, z, ry, scale }
    });
  };

  // ── 1. LIVING ROOM ──
  // ── 1. LIVING ROOM ──
  // TV Cabinet (2.40m along Z[-5.00, -2.60], centered at Z=-3.80)
  await add('cabinetTelevision.glb', -7.92, -5.00, -Math.PI / 2, 3, -7.545, -3.80, 0.75, 2.40, 0, 0, 'TV Cabinet');
  // TV (scale 2.0 -> width along Z is 1.37m: Z[-4.485, -3.115], center -3.80)
  await add('televisionModern.glb', -7.545, -3.80, Math.PI / 2, 2.0, 0, 0, 0, 0, 0.93, 0, 'TV');
  // Left Speaker (scale 1.6 -> width 0.24m, Z[-4.987, -4.750])
  await add('speakerSmall.glb', -7.545, -4.75, Math.PI / 2, 1.6, 0, 0, 0, 0, 0.93, 0, 'Speaker Left');
  // Right Speaker (scale 1.6 -> width 0.24m, Z[-2.987, -2.750])
  await add('speakerSmall.glb', -7.545, -2.75, Math.PI / 2, 1.6, 0, 0, 0, 0, 0.93, 0, 'Speaker Right');
  // Sofa (grounded on rug yOff=0.006)
  await add('loungeSofa.glb', -4.42, -5.27, -Math.PI / 2, 3, 0, 0, 0, 0, 0.006, 0, 'Main Sofa');
  // Coffee table (grounded on rug yOff=0.006)
  await add('tableCoffeeSquare.glb', -5.15, -3.55, 0, 2.5, 0, 0, 0, 0, 0.006, 0, 'Coffee Table');
  await add('plantSmall2.glb', -5.60, -3.60, 0, 2.0, 0, 0, 0, 0, 0.586, 0, 'Coffee Table Succulent');
  await add('books.glb', -6.00, -3.95, 0.4, 2.0, 0, 0, 0, 0, 0.586, 0, 'Coffee Table Books');
  // Armchair (grounded on rug yOff=0.006)
  await add('loungeChair.glb', -5.19, -2.70, Math.PI, 2.5, -5.80, -2.19, 1.225, 1.025, 0.006, 0, 'Living Room Armchair');
  // Rug
  await add('rugRectangle.glb', -6.50, -5.60, -Math.PI / 2, { x: 2.7, y: 0.6, z: 3.5 }, -4.89, -3.48, 3.22, 4.24, 0, 0.006, 'Living Room Rug');
  await add('plantSmall1.glb', -7.50, -5.35, 0, 2.0, -7.50, -5.35, 0.30, 0.30, 0, 0, 'Living Room Plant');
  await add('lampSquareFloor.glb', -7.40, -5.80, 0, 2.5, -7.25, -5.95, 0.30, 0.30, 0, 0, 'Living Room Floor Lamp');
  await add('cardboardBoxClosed.glb', -3.40, -5.80, 0, 2.5, -3.135, -6.065, 0.53, 0.53, 0, 0, 'Cardboard Box');

  // ── 2. LIBRARY ──
  // Shift West bookcases slightly South to give NW corner space for the coat rack
  // Z[0.60, 5.40]:
  await add('bookcaseClosedWide.glb', -7.92, 0.60, -Math.PI / 2, 3, -7.545, 1.80, 0.75, 2.40, 0, 0, 'Bookcase Closed Wide');
  await add('bookcaseOpen.glb', -7.92, 3.00, -Math.PI / 2, 3, -7.545, 3.60, 0.75, 1.20, 0, 0, 'Bookcase Open');
  await add('bookcaseClosed.glb', -7.92, 4.20, -Math.PI / 2, 3, -7.545, 4.80, 0.75, 1.20, 0, 0, 'Bookcase Closed');
  // Books on open shelves
  await add('books.glb', -7.45, 3.45, -Math.PI / 2, 2.4, 0, 0, 0, 0, 0.75, 0, 'Books Lower Shelf');
  await add('books.glb', -7.45, 3.75, -Math.PI / 2 + 0.18, 2.3, 0, 0, 0, 0, 1.35, 0, 'Books Middle Shelf');
  await add('books.glb', -7.45, 3.50, -Math.PI / 2 - 0.12, 2.4, 0, 0, 0, 0, 1.95, 0, 'Books Upper Shelf');
  // Low bookcase against North wall (X[-4.80, -3.80])
  await add('bookcaseOpenLow.glb', -3.80, 5.795, Math.PI, 2.5, -4.30, 6.11, 1.00, 0.625, 0, 0, 'Library Low Bookcase');
  // Low bookcase books & plant (separated cleanly)
  await add('books.glb', -4.55, 6.11, 0, 2.0, 0, 0, 0, 0, 1.00, 0, 'Low Bookcase Books');
  await add('plantSmall1.glb', -3.95, 6.11, 0, 2.0, 0, 0, 0, 0, 1.00, 0, 'Low Bookcase Plant');
  // Coat rack standing cleanly in NW alcove
  await add('coatRackStanding.glb', -7.40, 5.85, 0, 2.5, -7.40, 5.85, 0.40, 0.40, 0, 0, 'Coat Rack');
  // Circular reading rug
  await add('rugRound.glb', -3.906, 5.956, 0, { x: 3.6, y: 0.6, z: 3.6 }, -2.25, 4.30, 3.31, 3.31, 0, 0.006, 'Library Rug Round');
  // Reading chair
  await add('loungeChairRelax.glb', -2.25, 4.05, Math.PI * 0.75, 2.2, -3.15, 4.25, 1.35, 1.35, 0.006, 0, 'Reading Lounge Chair');
  // Reading side table (moved slightly East to X=-1.05 for clean gap)
  await add('sideTableDrawers.glb', -1.05, 3.90, Math.PI, 2.2, -1.62, 4.12, 1.18, 0.50, 0.006, 0, 'Reading Side Table');
  await add('books.glb', -1.62, 4.12, 0.4, 2.0, 0, 0, 0, 0, 0.852, 0, 'Side Table Books');
  await add('plantSmall2.glb', -1.90, 4.12, 0, 1.8, 0, 0, 0, 0, 0.852, 0, 'Side Table Plant');
  // Reading floor lamp (placed at X=-4.50, Z=5.40, completely clear of chair)
  await add('lampRoundFloor.glb', -4.50, 5.40, 0, 2.2, -4.50, 5.40, 0.35, 0.35, 0.006, 0, 'Library Reading Lamp');

  // ── 3. BEDROOM ──
  // Double Bed (flush against North wall skirting at Z=6.42)
  await add('bedDouble.glb', 7.035, 3.045, Math.PI, 3, 0, 0, 0, 0, 0, 0, 'Double Bed');
  // Left Bedside Nightstand
  await add('cabinetBedDrawer.glb', 3.64, 5.88, Math.PI, 2.5, 3.33, 6.15, 0.665, 0.543, 0, 0, 'Left Nightstand');
  await add('lampRoundTable.glb', 3.25, 6.20, 0, 1.8, 0, 0, 0, 0, 0.66, 0, 'Left Nightstand Lamp');
  await add('books.glb', 3.45, 5.98, 0.2, 1.8, 0, 0, 0, 0, 0.66, 0, 'Left Nightstand Books');
  // Right Bedside Nightstand
  await add('cabinetBedDrawerTable.glb', 7.80, 5.88, Math.PI, 2.5, 7.48, 6.15, 0.665, 0.543, 0, 0, 'Right Nightstand');
  await add('lampRoundTable.glb', 7.55, 6.20, 0, 1.8, 0, 0, 0, 0, 0.66, 0, 'Right Nightstand Lamp');
  await add('plantSmall3.glb', 7.35, 5.98, 0, 1.8, 0, 0, 0, 0, 0.66, 0, 'Right Nightstand Plant');
  // Vanity Table
  await add('sideTableDrawers.glb', 2.20, 5.96, Math.PI, 2.2, 1.625, 6.19, 1.15, 0.46, 0, 0, 'Bedroom Vanity Table');
  await add('books.glb', 1.40, 6.19, -0.3, 2.0, 0, 0, 0, 0, 0.846, 0, 'Vanity Books');
  await add('plantSmall1.glb', 1.85, 6.19, 0, 1.8, 0, 0, 0, 0, 0.846, 0, 'Vanity Plant');
  // End-of-Bed Bench (centered at X=5.60, grounded on rug yOff=0.006)
  await add('benchCushion.glb', 5.10, 2.45, 0, 2.5, 5.60, 2.20, 1.05, 0.52, 0.006, 0, 'End-of-Bed Bench');
  // Bedroom Rug (width 4.5m, fits inside X[3.35, 7.85], no penetration of East wall at 8.0!)
  await add('rugRounded.glb', 3.35, 5.33, 0, { x: 2.86, y: 0.6, z: 4.2 }, 5.60, 3.40, 4.50, 3.86, 0, 0.006, 'Bedroom Rug');

  // ── 4. STUDY ──
  // Study Desk
  await add('desk.glb', 6.74, -3.80, -Math.PI / 2, 3, 0, 0, 0, 0, 0, 0, 'Study Desk');
  // Desk Chair (placed in front of desk facing East (+X), grounded on mat yOff=0.006)
  await add('chairDesk.glb', 5.85, -3.12, Math.PI / 2, 2.5, 6.24, -2.70, 0.78, 0.84, 0.006, 0, 'Study Desk Chair');
  // Computer Screen
  await add('computerScreen.glb', 7.45, -2.70, -Math.PI / 2, 2.5, 0, 0, 0, 0, 1.152, 0, 'Computer Screen');
  // Keyboard centered on monitor
  await add('computerKeyboard.glb', 7.10, -2.95, -Math.PI / 2, 2.0, 0, 0, 0, 0, 1.155, 0, 'Keyboard');
  // Mouse beside keyboard (no overlap!)
  await add('computerMouse.glb', 7.10, -2.25, -Math.PI / 2, 1.8, 0, 0, 0, 0, 1.155, 0, 'Mouse');
  // Desk Lamp
  await add('lampSquareTable.glb', 7.45, -3.55, -0.4, 2.2, 0, 0, 0, 0, 1.152, 0, 'Desk Lamp');
  // Desk Books
  await add('books.glb', 7.40, -3.25, -Math.PI / 2, 2.0, 0, 0, 0, 0, 1.152, 0, 'Desk Books');
  // Desk Plant (placed at far corner, clear of monitor!)
  await add('plantSmall2.glb', 7.45, -1.58, 0, 1.8, 0, 0, 0, 0, 1.152, 0, 'Desk Plant');
  // Study Low Credenza
  await add('bookcaseOpenLow.glb', 3.00, -5.795, 0, 2.5, 3.50, -6.11, 1.00, 0.625, 0, 0, 'Study Low Credenza');
  // Credenza Storage Box (placed at Z = -6.00, no wall penetration!)
  await add('cardboardBoxClosed.glb', 3.25, -6.00, 0.1, 1.8, 0, 0, 0, 0, 1.00, 0, 'Credenza Storage Box');
  await add('books.glb', 3.75, -6.00, 0, 2.0, 0, 0, 0, 0, 1.00, 0, 'Credenza Books');
  // Study Rug
  await add('rugSquare.glb', 5.20, -1.70, 0, { x: 2.2, y: 0.6, z: 2.2 }, 6.20, -2.70, 2.00, 2.00, 0, 0.006, 'Study Rug');
  // Trashcan
  await add('trashcan.glb', 7.30, -4.14, 0, 1.5, 7.30, -4.14, 0.32, 0.35, 0, 0, 'Trashcan');
  // Corner Plant
  await add('pottedPlant.glb', 7.20, -5.80, 0, 2.5, 7.20, -5.80, 0.53, 0.60, 0, 0, 'Study Corner Plant');
  // Burrow Bear
  await add('bear.glb', -5.68, -7.76, Math.PI / 4, 0.18, 0, 0, 0, 0, 0.14, 0, 'Burrow Bear');

  console.log(`Placed ${items.length} items. Checking geometry & collisions...\n`);

  let invalidIntersections = 0;
  // Ignore legitimate contact:
  // - items sitting on top of rugs (rug Y in [0, 0.006])
  // - items sitting on furniture tabletops (desk blotter, table accessories)
  // - pillows sitting on sofas/beds
  const isAllowedContact = (a, b) => {
    // Rug contact with furniture standing on it
    if (a.label.includes('Rug') || b.label.includes('Rug')) return true;
    // Accessories on tabletops
    if (a.label === 'TV Cabinet' && (b.label === 'TV' || b.label.includes('Speaker') || b.label === 'Radio')) return true;
    if (a.label === 'Coffee Table' && (b.label.includes('Coffee Table'))) return true;
    if (a.label === 'Bookcase Open' && b.label.includes('Shelf')) return true;
    if (a.label === 'Library Low Bookcase' && b.label.includes('Low Bookcase')) return true;
    if (a.label.includes('Nightstand') && (b.label.includes('Nightstand') || b.label.includes('Lamp') || b.label.includes('Books') || b.label.includes('Plant'))) return true;
    if (a.label === 'Bedroom Vanity Table' && b.label.includes('Vanity')) return true;
    if (a.label === 'Study Desk' && (b.label.includes('Screen') || b.label.includes('Keyboard') || b.label.includes('Mouse') || b.label.includes('Desk Lamp') || b.label.includes('Desk Books') || b.label.includes('Desk Plant'))) return true;
    if (a.label === 'Study Low Credenza' && b.label.includes('Credenza')) return true;
    // Adjacent bookcases side-by-side touching faces
    if (a.label.includes('Bookcase') && b.label.includes('Bookcase')) return true;
    return false;
  };

  console.log('--- UNINTENDED INTERSECTION AUDIT ---');
  for (let i = 0; i < items.length; i++) {
    for (let j = i + 1; j < items.length; j++) {
      const a = items[i];
      const b = items[j];
      const intersection = a.box.clone().intersect(b.box);
      if (!intersection.isEmpty()) {
        const intVol = (intersection.max.x - intersection.min.x) * (intersection.max.y - intersection.min.y) * (intersection.max.z - intersection.min.z);
        if (!isAllowedContact(a, b)) {
          console.warn(`[DEFECT] Unintended intersection between [${a.label}] and [${b.label}]: volume = ${intVol.toFixed(5)}`);
          invalidIntersections++;
        }
      }
    }
  }

  if (invalidIntersections === 0) {
    console.log('>>> SUCCESS: ZERO UNINTENDED FURNITURE INTERSECTIONS! <<<');
  }

  console.log('\n--- WALL CLIPPING AUDIT ---');
  let wallClips = 0;
  items.forEach(it => {
    const b = it.box;
    if (b.min.x < -8.0) { console.warn(`[DEFECT] [${it.label}] PENETRATES WEST WALL: ${b.min.x.toFixed(3)} < -8.0`); wallClips++; }
    if (b.max.x > 8.0) { console.warn(`[DEFECT] [${it.label}] PENETRATES EAST WALL: ${b.max.x.toFixed(3)} > 8.0`); wallClips++; }
    if (b.min.z < -6.5 && it.label !== 'Burrow Bear') { console.warn(`[DEFECT] [${it.label}] PENETRATES SOUTH WALL: ${b.min.z.toFixed(3)} < -6.5`); wallClips++; }
    if (b.max.z > 6.5) { console.warn(`[DEFECT] [${it.label}] PENETRATES NORTH WALL: ${b.max.z.toFixed(3)} > 6.5`); wallClips++; }
  });

  if (wallClips === 0) {
    console.log('>>> SUCCESS: ZERO WALL CLIPPING DEFECTS! <<<');
  }
}

run().catch(console.error);
