import { describe, it, expect } from "vitest";
import { groundY, platform, type Platform } from "../game/collision";
import { MOUSE } from "../game/mouse";
import { NOOK, START, isHome } from "../game/world";

describe("Mouse Grounding & Platform Detection", () => {
  const rugPlatform: Platform = platform(-4.89, -3.48, 3.22, 4.24, 0.006);
  const burrowPlatform: Platform = platform(-5.00, -7.60, 2.00, 1.60, 0.003);
  const platforms = [rugPlatform, burrowPlatform];

  it("returns 0 (hardwood floor) when mouse is outside all platforms", () => {
    const pos = { x: 0, z: 0 };
    const y = groundY(pos, MOUSE.radius, platforms, 0);
    expect(y).toBe(0);
  });

  it("detects living room rug platform when mouse walks onto it", () => {
    // Center of coffee table on rug
    const pos = { x: -5.80, z: -3.80 };
    const y = groundY(pos, MOUSE.radius, platforms, 0);
    expect(y).toBe(0.006);
  });

  it("detects living room rug beneath sofa front and armchair", () => {
    // Under sofa front edge
    expect(groundY({ x: -4.00, z: -3.80 }, MOUSE.radius, platforms, 0)).toBe(0.006);
    // Armchair
    expect(groundY({ x: -5.80, z: -2.20 }, MOUSE.radius, platforms, 0)).toBe(0.006);
  });

  it("detects burrow floor inside the expanded burrow", () => {
    // Spawn point inside burrow
    const y = groundY({ x: START.x, z: START.z }, MOUSE.radius, platforms, 0);
    expect(y).toBe(0.003);
  });

  it("burrow dimensions reflect ~25-35% interior length increase", () => {
    const originalLength = 1.20; // -6.80 - (-8.00)
    const newLength = NOOK.maxZ - NOOK.minZ; // -6.80 - (-8.40) = 1.60
    const increasePercent = ((newLength - originalLength) / originalLength) * 100;

    expect(newLength).toBeCloseTo(1.60, 2);
    expect(increasePercent).toBeCloseTo(33.33, 1);
    expect(NOOK.minZ).toBe(-8.40);
    expect(NOOK.maxZ).toBe(-6.80);
  });

  it("spawn point is inside the burrow and isHome returns true", () => {
    expect(isHome(START.x, START.z)).toBe(true);
    expect(START.x).toBe(-5.0);
    expect(START.z).toBeLessThan(-6.80);
    expect(START.z).toBeGreaterThan(NOOK.minZ);
  });

  it("spawn corridor is centered and leaves ample clearance to the door", () => {
    // Mouse radius is 0.11m (diameter 0.22m)
    // Spawn at X = -5.0, door at X = -5.0, Z = -6.50
    expect(START.x).toBe(-5.0);
    expect(START.yaw).toBe(0); // facing +Z directly towards doorway
  });
});
