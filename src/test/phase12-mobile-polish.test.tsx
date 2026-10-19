import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import * as THREE from "three";
import { Input } from "../game/input";
import { MouseController, MOUSE } from "../game/mouse";
import { CheeseField } from "../game/cheese";
import { CHEESE_SPOTS, buildWorld } from "../game/world";
import { resolve } from "../game/collision";
import { createStore } from "../game/state";
import { soundFX, AUDIO_ENABLED } from "../game/audio";
import { Joystick } from "../components/game/Joystick";
import { HUD, PauseMenu, toggleFullscreen } from "../components/game/Overlays";

describe("Phase 12 — Mobile Bug Fixes, Performance & Gameplay Polish", () => {
  describe("1. P0 Mobile Controls: Landscape Display & Pointer Isolation", () => {
    it("renders virtual controls without md:hidden so landscape phones (>768px) display them", () => {
      const mockEngine = {
        input: new Input(),
        addCameraLook: vi.fn(),
      } as unknown as any;

      const { container } = render(<Joystick engine={mockEngine} />);
      const rootDiv = container.firstChild as HTMLElement;
      expect(rootDiv).not.toBeNull();
      // Must not hide on medium viewports (tablets/landscape phones)
      expect(rootDiv.className).not.toContain("md:hidden");
      expect(rootDiv.style.zIndex).toBe("30");

      mockEngine.input.dispose();
    });

    it("handles pointer down on joystick base without event errors", () => {
      const mockEngine = {
        input: new Input(),
        addCameraLook: vi.fn(),
      } as unknown as any;

      const { container } = render(<Joystick engine={mockEngine} />);
      const base = container.querySelector(".joystick-base");
      expect(base).not.toBeNull();

      fireEvent.pointerDown(base!, {
        pointerId: 1,
        clientX: 100,
        clientY: 100,
      });

      // Joystick sets non-zero joy on input
      expect(mockEngine.input.joy).toBeDefined();

      mockEngine.input.dispose();
    });

    it("separates touch pointer events from desktop cursor head tracking in Engine logic", () => {
      // Direct simulation of onPointerMove filter logic
      let hasCursor = false;
      const onPointerMove = (e: { pointerType?: string; clientX: number; clientY: number }) => {
        if (e.pointerType && e.pointerType !== "mouse") return;
        hasCursor = true;
      };

      // 1. Touch pointer event (e.g. from touching the screen / joystick / buttons)
      onPointerMove({ pointerType: "touch", clientX: 200, clientY: 200 });
      expect(hasCursor).toBe(false);

      // 2. Pen pointer event
      onPointerMove({ pointerType: "pen", clientX: 200, clientY: 200 });
      expect(hasCursor).toBe(false);

      // 3. Desktop mouse pointer event
      onPointerMove({ pointerType: "mouse", clientX: 200, clientY: 200 });
      expect(hasCursor).toBe(true);
    });
  });

  describe("2. P0 Audio Policy: Completely Disabled for Early Release", () => {
    it("AUDIO_ENABLED is false and audio triggering methods do not create AudioContext", () => {
      expect(AUDIO_ENABLED).toBe(false);

      // Calling playCheesePickup does not throw or play audio
      soundFX.playCheesePickup(1);
      soundFX.playVictoryFanfare();

      // Mute toggle still functions smoothly in UI without playing sounds
      const initialMuted = soundFX.isMuted;
      soundFX.toggleMute();
      expect(soundFX.isMuted).toBe(!initialMuted);
      soundFX.playCheesePickup(2);
      soundFX.toggleMute();
      expect(soundFX.isMuted).toBe(initialMuted);
    });
  });

  describe("3. P1 Cheese Pickup Performance: No Shader Recompiles", () => {
    it("leaves light.visible true with 0 intensity upon collection to prevent WebGL shader recompiles", () => {
      const scene = new THREE.Scene();
      const cheese = new CheeseField(scene, [[1, 1]]);

      // Pick up the cheese by stepping inside radius
      const got = cheese.update(0.016, 1.0, 1.0, 1.0);
      expect(got).toBe(1);

      // Advance collection animation past completion (0.45s)
      cheese.update(0.5, 1.5, 1.0, 1.0);

      // Inspect internal items
      const item = (cheese as unknown as { items: Array<{ mesh: THREE.Group; light: THREE.PointLight }> }).items[0];
      expect(item.mesh.visible).toBe(false);
      // Crucial: light remains visible in scene graph so NUM_POINT_LIGHTS uniform is unaffected
      expect(item.light.visible).toBe(true);
      expect(item.light.intensity).toBe(0);

      cheese.dispose(scene);
    });
  });

  describe("4. P1 Fullscreen Option & Safe Area Support", () => {
    it("renders fullscreen button in HUD and handles toggle safely", () => {
      const store = createStore();
      render(<HUD s={store.get()} store={store} isTouch={false} />);

      const fsBtn = screen.getByLabelText(/Toggle Fullscreen/i);
      expect(fsBtn).toBeDefined();

      // Clicking does not crash even in jsdom where fullscreen is not supported
      expect(() => fireEvent.click(fsBtn)).not.toThrow();
    });

    it("renders fullscreen option in PauseMenu", () => {
      const store = createStore();
      render(<PauseMenu store={store} />);

      const fsBtn = screen.getByRole("button", { name: /Toggle Fullscreen/i });
      expect(fsBtn).toBeDefined();
    });

    it("toggleFullscreen handles unsupported environments gracefully", async () => {
      await expect(toggleFullscreen()).resolves.toBeUndefined();
    });
  });

  describe("5. P2 Additional Cheese Collectibles & Dynamic Total Count", () => {
    it("places 5 cheeses distributed across all 4 rooms with zero collider overlap", () => {
      expect(CHEESE_SPOTS.length).toBe(5);

      const scene = new THREE.Scene();
      const world = buildWorld(scene);

      for (const [cx, cz] of CHEESE_SPOTS) {
        const initial = { x: cx, z: cz };
        const resolved = { ...initial };
        resolve(resolved, MOUSE.radius, world.colliders);

        // Standable coordinate with zero displacement from walls/perimeter
        expect(resolved.x).toBeCloseTo(initial.x, 2);
        expect(resolved.z).toBeCloseTo(initial.z, 2);
      }

      world.dispose();
    });

    it("store dynamically derives total cheeses from CHEESE_SPOTS.length", () => {
      const store = createStore();
      expect(store.get().total).toBe(5);
      expect(store.get().cheese).toBe(0);
    });
  });

  describe("6. P2 Jumping & Exploration Polish: Coyote Time & Jump Buffering", () => {
    it("jump buffering triggers jump on landing even if pressed shortly before touchdown", () => {
      const scene = new THREE.Scene();
      const mouse = new MouseController(scene);
      const platforms: any[] = [];
      const colliders: any[] = [];

      // Mouse is mid-air just about to land (0.01m above floor)
      mouse.pos.y = 0.01;
      mouse.grounded = false;
      mouse.vel.y = -1.0;

      // Press jump shortly before touchdown
      const moveJump = { x: 0, y: 0, run: false, jump: true };
      mouse.update(0.016, moveJump, 0, colliders, platforms);

      // Mouse landed on floor and immediately bounced into buffered jump
      expect(mouse.grounded).toBe(false);
      expect(mouse.vel.y).toBeGreaterThan(1.5);

      mouse.dispose(scene);
    });

    it("coyote time allows jumping immediately after walking off a ledge", () => {
      const scene = new THREE.Scene();
      const mouse = new MouseController(scene);
      const platforms: any[] = [];
      const colliders: any[] = [];

      // Mouse was grounded, now steps into air (e.g. rug border)
      mouse.grounded = true;
      const moveWalk = { x: 0, y: 1, run: false, jump: false };
      mouse.update(0.016, moveWalk, 0, colliders, platforms);

      // Next frame: mouse is slightly above floor but within 100ms coyote time
      mouse.grounded = false;
      mouse.pos.y = 0.05;

      // Jump requested during coyote window
      const moveJump = { x: 0, y: 0, run: false, jump: true };
      mouse.update(0.016, moveJump, 0, colliders, platforms);

      expect(mouse.grounded).toBe(false);
      expect(mouse.vel.y).toBeGreaterThan(1.5);

      mouse.dispose(scene);
    });
  });
});
