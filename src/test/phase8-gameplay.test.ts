import { describe, it, expect } from "vitest";
import * as THREE from "three";
import { checkHiding, HIDING_ZONES, resolve } from "../game/collision";
import { MouseController, MOUSE } from "../game/mouse";
import { FollowCamera } from "../game/camera";
import { createStore } from "../game/state";
import { buildWorld, NOOK, isHome } from "../game/world";

describe("Phase 8 — Gameplay Foundation: Movement, Hiding & Mission Flow", () => {
  describe("Mouse Scurrying Gait & Foot Grounding", () => {
    it("keeps all feet grounded at floor level when stationary", () => {
      const scene = new THREE.Scene();
      const mouse = new MouseController(scene);
      mouse.reset(0, 0, 0);

      // Single tick with zero movement input
      mouse.update(0.016, { x: 0, y: 0, run: false, jump: false }, 0, [], []);

      // Base foot Y in mouse coordinate system is 0.0135
      mouse.model.feet.forEach((f) => {
        expect(f.position.y).toBeCloseTo(0.0135, 3);
      });
      mouse.dispose(scene);
    });

    it("scurrying gait lifts feet during swing and firmly grounds during stance", () => {
      const scene = new THREE.Scene();
      const mouse = new MouseController(scene);
      mouse.reset(0, 0, 0);

      // Run forward for several frames to cycle the gait
      let sawLift = false;
      let allStanceGrounded = true;

      for (let step = 0; step < 30; step++) {
        mouse.update(0.016, { x: 0, y: 1, run: true, jump: false }, 0, [], []);
        for (const foot of mouse.model.feet) {
          if (foot.position.y > 0.014) {
            sawLift = true;
          }
          // Feet must never penetrate below the ground baseline
          if (foot.position.y < 0.013) {
            allStanceGrounded = false;
          }
        }
      }

      expect(sawLift).toBe(true);
      expect(allStanceGrounded).toBe(true);
      mouse.dispose(scene);
    });

    it("diagonal foot pairs move in opposite phase (quadruped diagonal trot)", () => {
      const scene = new THREE.Scene();
      const mouse = new MouseController(scene);
      mouse.reset(0, 0, 0);

      // Advance into a walk cycle
      mouse.update(0.05, { x: 0, y: 1, run: false, jump: false }, 0, [], []);

      const feet = mouse.model.feet;
      // Foot 0 (FL) and Foot 3 (RR) should share phase (similar Z offset from base)
      const diffPairA = (feet[0].position.z - 0.08) - (feet[3].position.z - (-0.08));
      expect(Math.abs(diffPairA)).toBeLessThan(0.005);

      // Foot 1 (FR) and Foot 2 (RL) should share phase
      const diffPairB = (feet[1].position.z - 0.08) - (feet[2].position.z - (-0.08));
      expect(Math.abs(diffPairB)).toBeLessThan(0.005);

      // Pair A and Pair B should be in opposite phase
      const offsetA = feet[0].position.z - 0.08;
      const offsetB = feet[1].position.z - 0.08;
      expect(offsetA * offsetB).toBeLessThanOrEqual(0.001); // opposite signs or near zero

      mouse.dispose(scene);
    });
  });

  describe("Hiding Detection & Furniture Clearance", () => {
    it("defines the 5 designated hiding zones", () => {
      expect(HIDING_ZONES.length).toBe(5);
      const names = HIDING_ZONES.map((z) => z.name);
      expect(names).toContain("Under Sofa");
      expect(names).toContain("Under Coffee Table");
      expect(names).toContain("Under Bed");
      expect(names).toContain("Under Desk");
      expect(names).toContain("Mouse Burrow");
    });

    it("detects mouse hiding under living room sofa", () => {
      const res = checkHiding({ x: -3.80, y: 0, z: -3.80 });
      expect(res.isHiding).toBe(true);
      expect(res.zoneName).toBe("Under Sofa");
    });

    it("detects mouse hiding under living room coffee table", () => {
      const res = checkHiding({ x: -5.80, y: 0, z: -3.80 });
      expect(res.isHiding).toBe(true);
      expect(res.zoneName).toBe("Under Coffee Table");
    });

    it("detects mouse hiding under bedroom double bed", () => {
      const res = checkHiding({ x: 5.60, y: 0, z: 4.60 });
      expect(res.isHiding).toBe(true);
      expect(res.zoneName).toBe("Under Bed");
    });

    it("detects mouse hiding in study desk footwell", () => {
      const res = checkHiding({ x: 7.30, y: 0, z: -2.50 });
      expect(res.isHiding).toBe(true);
      expect(res.zoneName).toBe("Under Desk");
    });

    it("detects mouse sheltered inside mouse burrow", () => {
      const res = checkHiding({ x: -5.00, y: 0, z: -7.50 });
      expect(res.isHiding).toBe(true);
      expect(res.zoneName).toBe("Mouse Burrow");
    });

    it("returns isHiding = false when in open room or jumping above clearance", () => {
      // Center of room
      expect(checkHiding({ x: 0, y: 0, z: 0 }).isHiding).toBe(false);

      // Above sofa top (y = 1.0)
      expect(checkHiding({ x: -3.80, y: 1.0, z: -3.80 }).isHiding).toBe(false);
    });
  });

  describe("Under-Furniture Camera Adaptation", () => {
    it("smoothly adapts camera pitch and distance when isHiding is true", () => {
      const cam = new THREE.PerspectiveCamera(60, 1, 0.1, 100);
      const follow = new FollowCamera(cam);
      follow.snap(0, 0, 0);

      const initialCamY = cam.position.y;

      // Update camera while hiding under furniture for multiple frames
      for (let i = 0; i < 20; i++) {
        follow.update(0.05, 5.6, 4.6, 0, 0, false, 0, true);
      }

      // Camera height should be significantly lower to peer under the furniture
      expect(cam.position.y).toBeLessThan(initialCamY);
    });
  });

  describe("Mission Flow & Victory State", () => {
    it("handles full heist mission lifecycle: collect all cheeses, return home, victory", () => {
      const store = createStore();
      expect(store.get().phase).toBe("title");

      store.play();
      expect(store.get().phase).toBe("playing");
      expect(store.get().cheese).toBe(0);

      // Collect all cheeses
      const total = store.get().total;
      for (let i = 0; i < total; i++) {
        store.collect();
      }
      expect(store.get().cheese).toBe(total);
      expect(store.get().cheese >= store.get().total).toBe(true);

      // In the open room, mission is not complete yet
      expect(isHome(0, 0)).toBe(false);
      expect(store.get().phase).toBe("playing");

      // Returning home to the burrow completes the mission
      const insideBurrow = isHome(-5.0, -7.5);
      expect(insideBurrow).toBe(true);
      if (store.get().cheese >= store.get().total && insideBurrow) {
        store.complete();
      }
      expect(store.get().phase).toBe("complete");

      // Restart resets progress cleanly
      store.restart();
      expect(store.get().cheese).toBe(0);
      expect(store.get().phase).toBe("playing");
      expect(store.get().isHiding).toBe(false);
    });
  });

  describe("Burrow Entrance Collision Clearance (No Invisible Walls)", () => {
    it("allows unhindered traversal from burrow into living room", () => {
      const scene = new THREE.Scene();
      const world = buildWorld(scene);

      // Traverse along the doorway corridor from burrow (Z = -7.4) through doorway (Z = -6.5)
      // into living room (Z = -6.0) at X = -5.0
      for (let z = -7.4; z <= -6.0; z += 0.1) {
        const testPos = { x: -5.0, z };
        const initial = { ...testPos };
        resolve(testPos, MOUSE.radius, world.colliders);

        // Position displacement should be 0 (no collision push)
        const displacement = Math.hypot(testPos.x - initial.x, testPos.z - initial.z);
        expect(displacement).toBeLessThan(0.001);
      }

      world.dispose();
    });
  });
});
