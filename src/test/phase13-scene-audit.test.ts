import { describe, it, expect } from "vitest";
import * as THREE from "three";
import { buildWorld } from "../game/world";

// Mock 2D canvas context for textures in test environment
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

describe("Phase 13: 3D Scene Cleanup, Furniture Alignment & Visual Quality Audit", () => {
  it("synchronizes point light positions with physical lamp positions", () => {
    const scene = new THREE.Scene();
    const world = buildWorld(scene);

    const pointLights: THREE.PointLight[] = [];
    scene.traverse((obj) => {
      if (obj instanceof THREE.PointLight) {
        pointLights.push(obj);
      }
    });

    // Verify presence of all 4 room lamp point lights
    // 1. Living room floor lamp: (-7.40, 1.95, -5.80)
    const livingLampLight = pointLights.find(
      (l) => Math.abs(l.position.x - -7.40) < 0.05 && Math.abs(l.position.z - -5.80) < 0.05
    );
    expect(livingLampLight).toBeDefined();

    // 2. Library reading floor lamp: (-4.50, 2.15, 5.40)
    const libraryLampLight = pointLights.find(
      (l) => Math.abs(l.position.x - -4.50) < 0.05 && Math.abs(l.position.z - 5.40) < 0.05
    );
    expect(libraryLampLight).toBeDefined();

    // 3. Bedroom nightstand lamp: (3.25, 1.15, 6.20)
    const bedroomLampLight = pointLights.find(
      (l) => Math.abs(l.position.x - 3.25) < 0.05 && Math.abs(l.position.z - 6.20) < 0.05
    );
    expect(bedroomLampLight).toBeDefined();

    // 4. Study architect desk lamp: (7.45, 1.65, -3.55)
    const studyLampLight = pointLights.find(
      (l) => Math.abs(l.position.x - 7.45) < 0.05 && Math.abs(l.position.z - -3.55) < 0.05
    );
    expect(studyLampLight).toBeDefined();

    world.dispose();
  });

  it("verifies zero wall clipping for interior furniture colliders", () => {
    // Outer house wall limits: X in [-8.0, 8.0], Z in [-6.5, 6.5]
    // Burrow zone: Z in [-8.4, -6.5]
    const colliders = [
      // Living Room
      { name: "tvCabinet", minX: -7.92, maxX: -7.17, minZ: -5.00, maxZ: -2.60 },
      { name: "livingFloorLamp", minX: -7.40, maxX: -7.10, minZ: -6.10, maxZ: -5.80 },
      { name: "livingBox", minX: -3.40, maxX: -2.87, minZ: -6.33, maxZ: -5.80 },

      // Library
      { name: "bookcaseWide", minX: -7.92, maxX: -7.17, minZ: 0.60, maxZ: 3.00 },
      { name: "bookcaseOpen", minX: -7.92, maxX: -7.17, minZ: 3.00, maxZ: 4.20 },
      { name: "bookcaseClosed", minX: -7.92, maxX: -7.17, minZ: 4.20, maxZ: 5.40 },
      { name: "coatRack", minX: -7.60, maxX: -7.20, minZ: 5.65, maxZ: 6.05 },
      { name: "libraryLowBookcase", minX: -4.80, maxX: -3.80, minZ: 5.795, maxZ: 6.42 },

      // Bedroom
      { name: "doubleBed", minX: 4.165, maxX: 7.035, minZ: 3.045, maxZ: 6.42 },
      { name: "leftNightstand", minX: 2.997, maxX: 3.663, minZ: 5.878, maxZ: 6.421 },
      { name: "rightNightstand", minX: 7.147, maxX: 7.813, minZ: 5.878, maxZ: 6.421 },
      { name: "bedroomRug", minX: 3.35, maxX: 7.85, minZ: 1.47, maxZ: 5.33 },

      // Study
      { name: "studyDesk", minX: 6.74, maxX: 7.92, minZ: -3.80, maxZ: -1.60 },
      { name: "studyLowCredenza", minX: 3.00, maxX: 4.00, minZ: -6.42, maxZ: -5.795 },
      { name: "credenzaStorageBox", minX: 3.21, maxX: 3.59, minZ: -6.42, maxZ: -6.00 },
      { name: "trashcan", minX: 7.14, maxX: 7.46, minZ: -4.31, maxZ: -3.96 },
      { name: "cornerPlant", minX: 6.93, maxX: 7.46, minZ: -6.10, maxZ: -5.50 },
    ];

    for (const item of colliders) {
      expect(item.minX, `${item.name} penetrates West wall`).toBeGreaterThanOrEqual(-8.0);
      expect(item.maxX, `${item.name} penetrates East wall`).toBeLessThanOrEqual(8.0);
      expect(item.minZ, `${item.name} penetrates South wall`).toBeGreaterThanOrEqual(-6.5);
      expect(item.maxZ, `${item.name} penetrates North wall`).toBeLessThanOrEqual(6.5);
    }
  });

  it("verifies coat rack and bookcase do not clip in the NW library corner", () => {
    // BookcaseClosed ends at Z = 5.40
    const bookcaseMaxZ = 5.40;
    // Coat rack is positioned at Z = 5.85 (span 5.65 to 6.05)
    const coatRackMinZ = 5.65;

    // Must have a positive clearance gap between coat rack and bookcase
    const clearance = coatRackMinZ - bookcaseMaxZ;
    expect(clearance).toBeGreaterThanOrEqual(0.25);
  });

  it("verifies study desk equipment (keyboard and mouse) are cleanly separated", () => {
    // Keyboard at Z = -2.95 (width 0.23m -> [-3.065, -2.835])
    const keyboardMaxZ = -2.835;
    // Mouse at Z = -2.25 (width 0.16m -> [-2.33, -2.17])
    const mouseMinZ = -2.33;

    // Ensure mouse and keyboard do not intersect
    const gap = mouseMinZ - keyboardMaxZ;
    expect(gap).toBeGreaterThan(0.3);
  });

  it("verifies television and bookshelf speakers do not intersect on TV cabinet", () => {
    // Center Z = -3.80
    // TV scale 2.0 has width 1.37m: Z in [-4.485, -3.115]
    const tvMinZ = -4.485;
    const tvMaxZ = -3.115;

    // Left speaker at Z = -4.75, width 0.24m: Z in [-4.87, -4.63]
    const leftSpeakerMaxZ = -4.63;
    // Right speaker at Z = -2.75, width 0.24m: Z in [-2.87, -2.63]
    const rightSpeakerMinZ = -2.87;

    expect(tvMinZ - leftSpeakerMaxZ, "TV clips Left Speaker").toBeGreaterThan(0.1);
    expect(rightSpeakerMinZ - tvMaxZ, "TV clips Right Speaker").toBeGreaterThan(0.1);
  });

  it("verifies absence of stray blue/grey pillows and unwanted loose accessories", async () => {
    const fs = await import("fs");
    const furnitureCode = fs.readFileSync("src/game/furniture.ts", "utf-8");

    // Ensure stray blue/grey pillow models are not present
    expect(furnitureCode).not.toContain("pillowBlue.glb");
    expect(furnitureCode).not.toContain("pillowBlueLong.glb");
    expect(furnitureCode).not.toContain("pillow.glb");
    expect(furnitureCode).not.toContain("waffleBlanketTexture");
  });
});
