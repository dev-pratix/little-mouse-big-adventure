import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import * as THREE from "three";
import { Input } from "../game/input";
import { FollowCamera, MIN_DISTANCE, MAX_DISTANCE } from "../game/camera";
import { createStore } from "../game/state";
import { TitleScreen, RotateDevicePrompt, HUD } from "../components/game/Overlays";

describe("Phase 9 — Mobile Experience, Landscape Mode & Early Access Welcome", () => {
  describe("Input: Mobile Touch & Joystick Handling", () => {
    it("handles programmatic touch jump and consumes it once", () => {
      const input = new Input();
      const out = { x: 0, y: 0, run: false, jump: false };

      // Before trigger
      input.read(out);
      expect(out.jump).toBe(false);

      // Trigger mobile jump
      input.triggerJump();
      input.read(out);
      expect(out.jump).toBe(true);

      // Consumed on next read
      input.read(out);
      expect(out.jump).toBe(false);

      input.dispose();
    });

    it("integrates virtual joystick input into movement vector", () => {
      const input = new Input();
      const out = { x: 0, y: 0, run: false, jump: false };

      input.joy = { x: 0.75, y: 0.5 };
      input.read(out);

      expect(out.x).toBeCloseTo(0.75, 2);
      expect(out.y).toBeCloseTo(0.5, 2);

      input.dispose();
    });

    it("resets touch state on resetTouch and window blur", () => {
      const input = new Input();
      input.joy = { x: 0.5, y: -0.8 };
      input.sprint = true;
      input.triggerJump();

      input.resetTouch();
      expect(input.joy.x).toBe(0);
      expect(input.joy.y).toBe(0);
      expect(input.sprint).toBe(false);

      // Set state again and test blur
      input.joy = { x: 0.2, y: 0.2 };
      input.sprint = true;
      window.dispatchEvent(new Event("blur"));

      expect(input.joy.x).toBe(0);
      expect(input.joy.y).toBe(0);
      expect(input.sprint).toBe(false);

      input.dispose();
    });
  });

  describe("Camera Touch Look & Zoom Methods", () => {
    it("adjusts yaw and pitch via addYaw and addPitch with limits", () => {
      const cam = new THREE.PerspectiveCamera(60, 1, 0.1, 100);
      const follow = new FollowCamera(cam);

      const initialYaw = follow.yaw;
      const initialPitch = follow.pitch;

      follow.addYaw(0.25);
      expect(follow.yaw).toBeCloseTo(initialYaw + 0.25, 4);

      follow.addPitch(0.15);
      expect(follow.pitch).toBeCloseTo(initialPitch + 0.15, 4);

      // Excessive downward pitch is clamped
      follow.addPitch(-5.0);
      expect(follow.pitch).toBeGreaterThanOrEqual(0.10);

      // Excessive upward pitch is clamped
      follow.addPitch(10.0);
      expect(follow.pitch).toBeLessThanOrEqual(1.30);
    });

    it("clamps zoom distance between MIN_DISTANCE and MAX_DISTANCE", () => {
      const cam = new THREE.PerspectiveCamera(60, 1, 0.1, 100);
      const follow = new FollowCamera(cam);

      follow.addDistance(-10.0);
      expect(follow.distance).toBe(MIN_DISTANCE);

      follow.addDistance(20.0);
      expect(follow.distance).toBe(MAX_DISTANCE);
    });
  });

  describe("Early Access Welcome Screen", () => {
    it("renders early access title, message, and Play Game button", () => {
      const store = createStore();
      render(<TitleScreen store={store} />);

      expect(screen.getByText(/Little Mouse, Big Adventure/i)).toBeDefined();
      expect(screen.getByText(/An Early Access Experience/i)).toBeDefined();
      expect(screen.getByText(/You're playing an early development build/i)).toBeDefined();

      const playBtn = screen.getByRole("button", { name: /Play Game/i });
      expect(playBtn).toBeDefined();

      fireEvent.click(playBtn);
      expect(store.get().phase).toBe("playing");
    });
  });

  describe("Rotate Device Orientation Prompt", () => {
    it("renders phone rotation message", () => {
      render(<RotateDevicePrompt />);
      expect(screen.getByText(/Rotate Your Device/i)).toBeDefined();
      expect(screen.getByText(/This little adventure is best played in landscape mode/i)).toBeDefined();
    });
  });

  describe("Device-Aware HUD Controls Hint", () => {
    it("shows mobile touch instructions when isTouch is true", () => {
      const store = createStore();
      render(<HUD s={store.get()} store={store} isTouch={true} />);

      expect(screen.getByText(/Move: left joystick/i)).toBeDefined();
      expect(screen.getByText(/Look: drag right side/i)).toBeDefined();
      expect(screen.getByText(/Jump: jump button/i)).toBeDefined();
      expect(screen.getByText(/Sprint: hold sprint/i)).toBeDefined();
    });

    it("shows keyboard instructions when isTouch is false", () => {
      const store = createStore();
      render(<HUD s={store.get()} store={store} isTouch={false} />);

      expect(screen.getByText(/WASD/i)).toBeDefined();
      expect(screen.getByText(/Shift/i)).toBeDefined();
      expect(screen.getByText(/Space/i)).toBeDefined();
    });
  });

  describe("Landscape Enforcement & Touch Device Detection", () => {
    it("disables Play Game button and prevents game start when orientation is blocked", () => {
      const store = createStore();
      render(<TitleScreen store={store} isBlockedByOrientation={true} />);

      const playBtn = screen.getByRole("button", { name: /Rotate Phone to Play/i });
      expect(playBtn).toBeDefined();
      expect(playBtn.hasAttribute("disabled")).toBe(true);

      fireEvent.click(playBtn);
      expect(store.get().phase).toBe("title");
    });

    it("exempts desktop with fine pointer from touch device detection even if touch capability exists", async () => {
      const originalMatchMedia = window.matchMedia;
      try {
        // Desktop environment with fine pointer and hover
        window.matchMedia = vi.fn().mockImplementation((query: string) => {
          if (query === "(pointer: fine) and (hover: hover)") {
            return { matches: true, addEventListener: vi.fn(), removeEventListener: vi.fn() };
          }
          if (query === "(pointer: coarse)") {
            return { matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() };
          }
          return { matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() };
        });

        const { checkIsTouchDevice } = await import("../components/game/Overlays");
        // Even if touch points were somehow simulated, fine pointer rules it as desktop
        const isTouch = checkIsTouchDevice();
        expect(isTouch).toBe(false);
      } finally {
        window.matchMedia = originalMatchMedia;
      }
    });
  });
});
