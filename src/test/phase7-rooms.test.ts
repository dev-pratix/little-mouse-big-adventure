import { describe, it, expect, beforeAll } from "vitest";
import * as THREE from "three";
import { groundY, platform, resolve, box, type Box, type Platform } from "../game/collision";
import { MOUSE } from "../game/mouse";
import { buildWorld, CHEESE_SPOTS, ROOM, HOLE, NOOK, START } from "../game/world";

// Mock 2D canvas context for jsdom environment to suppress not-implemented warnings
HTMLCanvasElement.prototype.getContext = (() => ({
  fillRect: () => {},
  clearRect: () => {},
  getImageData: () => ({ data: [] }),
  putImageData: () => {},
  createImageData: () => [],
  setTransform: () => {},
  drawImage: () => {},
  save: () => {},
  fillText: () => {},
  restore: () => {},
  beginPath: () => {},
  moveTo: () => {},
  lineTo: () => {},
  closePath: () => {},
  stroke: () => {},
  strokeRect: () => {},
  strokeText: () => {},
  fill: () => {},
  arc: () => {},
  ellipse: () => {},
  quadraticCurveTo: () => {},
  bezierCurveTo: () => {},
  translate: () => {},
  rotate: () => {},
  createLinearGradient: () => ({ addColorStop: () => {} }),
  createRadialGradient: () => ({ addColorStop: () => {} }),
  setLineDash: () => {},
})) as unknown as typeof HTMLCanvasElement.prototype.getContext;

describe("Phase 7: Room Upgrades, Navigation & Cheese Reachability", () => {
  // Test scene
  const scene = new THREE.Scene();
  const world = buildWorld(scene);

  // Platforms defined in furniture across all 4 rooms:
  const livingRug: Platform = platform(-4.89, -3.48, 3.22, 4.24, 0.006);
  const libraryRug: Platform = platform(-2.70, 3.70, 3.31, 3.31, 0.006);
  const bedroomRug: Platform = platform(5.60, 3.40, 5.02, 3.86, 0.006);
  const studyMat: Platform = platform(6.20, -2.70, 2.00, 2.00, 0.006);
  const burrowPlatform: Platform = platform(-5.00, -7.60, 2.00, 1.60, 0.003);

  const allPlatforms = [livingRug, libraryRug, bedroomRug, studyMat, burrowPlatform];

  // Key furniture colliders in the upgraded rooms:
  const bedHeadboard = box(5.60, 6.26, 2.87, 0.32);
  const bedFootLeft = box(4.28, 3.15, 0.20, 0.20);
  const bedFootRight = box(6.92, 3.15, 0.20, 0.20);
  const deskPedestal = box(7.33, -3.50, 1.18, 0.60);
  const deskSupport = box(7.33, -1.70, 1.18, 0.20);
  const deskChair = box(6.04, -2.70, 0.40, 0.40);
  const libraryLowBookcase = box(-3.30, 6.11, 1.00, 0.625);
  const libraryChair = box(-3.10, 3.30, 1.20, 1.20);
  const studyLowBookcase = box(3.30, -6.15, 1.00, 0.625);

  const furnitureColliders: Box[] = [
    bedHeadboard,
    bedFootLeft,
    bedFootRight,
    deskPedestal,
    deskSupport,
    deskChair,
    libraryLowBookcase,
    libraryChair,
    studyLowBookcase,
  ];

  const allColliders = [...world.colliders, ...furnitureColliders];

  it("grounds the mouse correctly on all 4 room rugs/mats", () => {
    // 1. Living room rug
    expect(groundY({ x: -4.89, z: -3.48 }, MOUSE.radius, allPlatforms, 0)).toBe(0.006);

    // 2. Library circular reading rug
    expect(groundY({ x: -2.70, z: 3.70 }, MOUSE.radius, allPlatforms, 0)).toBe(0.006);

    // 3. Bedroom rounded area rug
    expect(groundY({ x: 5.60, z: 3.40 }, MOUSE.radius, allPlatforms, 0)).toBe(0.006);

    // 4. Study desk chair mat
    expect(groundY({ x: 6.20, z: -2.70 }, MOUSE.radius, allPlatforms, 0)).toBe(0.006);

    // 5. Bare hardwood floor outside platforms
    expect(groundY({ x: 1.0, z: 1.0 }, MOUSE.radius, allPlatforms, 0)).toBe(0);
  });

  it("preserves open mouse crawling and hiding space beneath the double bed", () => {
    // Under center of the bed: (X = 5.60, Z = 4.50)
    const underBedPos = { x: 5.60, z: 4.50 };
    const originalPos = { ...underBedPos };
    resolve(underBedPos, MOUSE.radius, allColliders);

    // Should NOT be pushed away by any collider
    expect(underBedPos.x).toBeCloseTo(originalPos.x, 2);
    expect(underBedPos.z).toBeCloseTo(originalPos.z, 2);
  });

  it("preserves open mouse traversal through the study desk footwell", () => {
    // Center of desk footwell: (X = 7.33, Z = -2.50)
    const footwellPos = { x: 7.33, z: -2.50 };
    const originalPos = { ...footwellPos };
    resolve(footwellPos, MOUSE.radius, allColliders);

    // Should NOT be blocked or pushed out
    expect(footwellPos.x).toBeCloseTo(originalPos.x, 2);
    expect(footwellPos.z).toBeCloseTo(originalPos.z, 2);
  });

  it("ensures all 3 cheese collectibles remain fully reachable with no collider overlap", () => {
    for (const [cx, cz] of CHEESE_SPOTS) {
      const cheesePos = { x: cx, z: cz };
      const testPos = { ...cheesePos };
      resolve(testPos, MOUSE.radius, allColliders);

      // The mouse can stand directly at the cheese position without collision displacement
      expect(testPos.x).toBeCloseTo(cheesePos.x, 2);
      expect(testPos.z).toBeCloseTo(cheesePos.z, 2);
    }
  });

  it("preserves clear mouse passage through all 4 interior doorways", () => {
    // Doorway 1 (Living Room <-> Study): Z from -2.50 to -0.30 at X = 0
    const d1 = { x: 0, z: -1.40 };
    resolve(d1, MOUSE.radius, world.colliders);
    expect(d1.x).toBeCloseTo(0, 2);
    expect(d1.z).toBeCloseTo(-1.40, 2);

    // Doorway 2 (Living Room <-> Library): X from -4.50 to -2.30 at Z = 0
    const d2 = { x: -3.40, z: 0 };
    resolve(d2, MOUSE.radius, world.colliders);
    expect(d2.x).toBeCloseTo(-3.40, 2);
    expect(d2.z).toBeCloseTo(0, 2);

    // Doorway 3 (Study <-> Bedroom): X from 1.80 to 4.00 at Z = 0
    const d3 = { x: 2.90, z: 0 };
    resolve(d3, MOUSE.radius, world.colliders);
    expect(d3.x).toBeCloseTo(2.90, 2);
    expect(d3.z).toBeCloseTo(0, 2);

    // Doorway 4 (Library <-> Bedroom): Z from 2.30 to 4.50 at X = 0
    const d4 = { x: 0, z: 3.40 };
    resolve(d4, MOUSE.radius, world.colliders);
    expect(d4.x).toBeCloseTo(0, 2);
    expect(d4.z).toBeCloseTo(3.40, 2);
  });

  world.dispose();
});
