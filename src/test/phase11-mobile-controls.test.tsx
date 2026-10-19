import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import * as THREE from "three";
import { Input } from "../game/input";
import { FollowCamera, MIN_PITCH, MAX_PITCH, TOUCH_CAMERA_SENSITIVITY } from "../game/camera";
import { createStore } from "../game/state";
import { soundFX } from "../game/audio";
import { Joystick } from "../components/game/Joystick";
import { HUD, RotateDevicePrompt } from "../components/game/Overlays";

describe("Phase 11 — Professional Mobile Gameplay Controls", () => {
  describe("1. Virtual Movement Joystick: Direction, Deadzone & Non-linear Curve", () => {
    it("deadzone ignores micro-displacements and zeroes movement", () => {
      const input = new Input();
      const out = { x: 0, y: 0, run: false, jump: false };

      // Micro-displacement below 0.12 deadzone
      input.joy = { x: 0.05, y: 0.05 };
      input.read(out);
      expect(out.x).toBe(0);
      expect(out.y).toBe(0);

      // Displacement exceeding deadzone
      input.joy = { x: 0.8, y: 0.6 };
      input.read(out);
      expect(out.x).toBeGreaterThan(0.5);
      expect(out.y).toBeGreaterThan(0.4);

      input.dispose();
    });

    it("resets joystick immediately on release, cancel, or resetTouch", () => {
      const input = new Input();
      const out = { x: 0, y: 0, run: false, jump: false };

      input.joy = { x: 1.0, y: -0.5 };
      input.resetTouch();
      input.read(out);

      expect(out.x).toBe(0);
      expect(out.y).toBe(0);
      expect(input.joy.x).toBe(0);
      expect(input.joy.y).toBe(0);

      input.dispose();
    });
  });

  describe("2. Camera Look: Rotation, Sensitivity & Pitch Clamping", () => {
    it("rotates yaw and pitch smoothly with TOUCH_CAMERA_SENSITIVITY", () => {
      const cam = new THREE.PerspectiveCamera(60, 1, 0.1, 100);
      const follow = new FollowCamera(cam);

      const deltaX = 40;
      const deltaY = -20;

      const initialYaw = follow.yaw;
      const initialPitch = follow.pitch;

      follow.addYaw(-deltaX * TOUCH_CAMERA_SENSITIVITY);
      follow.addPitch(-deltaY * TOUCH_CAMERA_SENSITIVITY);

      expect(follow.yaw).toBeCloseTo(initialYaw - 40 * TOUCH_CAMERA_SENSITIVITY, 4);
      expect(follow.pitch).toBeCloseTo(initialPitch + 20 * TOUCH_CAMERA_SENSITIVITY, 4);
    });

    it("strictly clamps pitch limits between MIN_PITCH and MAX_PITCH", () => {
      const cam = new THREE.PerspectiveCamera(60, 1, 0.1, 100);
      const follow = new FollowCamera(cam);

      follow.addPitch(-10.0);
      expect(follow.pitch).toBe(MIN_PITCH);

      follow.addPitch(20.0);
      expect(follow.pitch).toBe(MAX_PITCH);
    });
  });

  describe("3. Multitouch Concurrency: Moving, Looking & Jumping Simultaneously", () => {
    it("simultaneously processes joystick movement, sprint, jump, and camera look", () => {
      const input = new Input();
      const cam = new THREE.PerspectiveCamera(60, 1, 0.1, 100);
      const follow = new FollowCamera(cam);
      const out = { x: 0, y: 0, run: false, jump: false };

      // Left thumb: virtual joystick moving Northeast
      input.joy = { x: 0.707, y: 0.707 };

      // Right thumb: holding sprint + tapping jump
      input.sprint = true;
      input.triggerJump();

      // Right thumb: camera drag
      follow.addYaw(0.12);
      follow.addPitch(0.06);

      // Read combined input state
      input.read(out);

      expect(out.x).toBeGreaterThan(0.5);
      expect(out.y).toBeGreaterThan(0.5);
      expect(out.run).toBe(true);
      expect(out.jump).toBe(true);
      expect(follow.yaw).toBeCloseTo(0.12, 4);

      input.dispose();
    });
  });

  describe("4. Touch Controls Component: Render & Pointer Isolation", () => {
    it("renders joystick base, camera surface, sprint button, and jump button", () => {
      const mockEngine = {
        input: new Input(),
        addCameraLook: vi.fn(),
      } as unknown as any;

      render(<Joystick engine={mockEngine} />);

      expect(screen.getByLabelText(/camera look surface/i)).toBeDefined();
      expect(screen.getByLabelText(/Hold to sprint/i)).toBeDefined();
      expect(screen.getByLabelText(/Jump/i)).toBeDefined();

      mockEngine.input.dispose();
    });

    it("tapping jump button triggers jump and stops event propagation", () => {
      const mockInput = new Input();
      const mockEngine = {
        input: mockInput,
        addCameraLook: vi.fn(),
      } as unknown as any;

      render(<Joystick engine={mockEngine} />);

      const jumpBtn = screen.getByLabelText(/Jump/i);
      const out = { x: 0, y: 0, run: false, jump: false };

      fireEvent.pointerDown(jumpBtn, { pointerId: 2, clientX: 200, clientY: 200 });

      mockInput.read(out);
      expect(out.jump).toBe(true);

      // Camera look was not triggered by jump press
      expect(mockEngine.addCameraLook).not.toHaveBeenCalled();

      mockInput.dispose();
    });

    it("holding sprint button sets sprint active and releasing clears it", () => {
      const mockInput = new Input();
      const mockEngine = {
        input: mockInput,
        addCameraLook: vi.fn(),
      } as unknown as any;

      render(<Joystick engine={mockEngine} />);

      const sprintBtn = screen.getByLabelText(/Hold to sprint/i);
      const out = { x: 0, y: 0, run: false, jump: false };

      // Pointer down on sprint
      fireEvent.pointerDown(sprintBtn, { pointerId: 3, clientX: 150, clientY: 200 });
      mockInput.read(out);
      expect(out.run).toBe(true);

      // Pointer up on sprint
      fireEvent.pointerUp(sprintBtn, { pointerId: 3, clientX: 150, clientY: 200 });
      mockInput.read(out);
      expect(out.run).toBe(false);

      mockInput.dispose();
    });
  });

  describe("5. Interruption & Cleanup Handling", () => {
    it("clears active inputs on window blur event", () => {
      const mockInput = new Input();
      const mockEngine = {
        input: mockInput,
        addCameraLook: vi.fn(),
      } as unknown as any;

      render(<Joystick engine={mockEngine} />);

      mockInput.joy = { x: 0.9, y: 0.9 };
      mockInput.sprint = true;
      mockInput.triggerJump();

      // Dispatch window blur
      window.dispatchEvent(new Event("blur"));

      const out = { x: 0, y: 0, run: false, jump: false };
      mockInput.read(out);

      expect(out.x).toBe(0);
      expect(out.y).toBe(0);
      expect(out.run).toBe(false);

      mockInput.dispose();
    });
  });

  describe("6. Audio Mute Toggle in HUD", () => {
    it("toggles soundFX mute state when clicking sound button", () => {
      const store = createStore();
      const initialMuted = soundFX.isMuted;

      render(<HUD s={store.get()} store={store} isTouch={true} />);

      const soundBtn = screen.getByLabelText(initialMuted ? /Unmute sound/i : /Mute sound/i);
      expect(soundBtn).toBeDefined();

      fireEvent.click(soundBtn);
      expect(soundFX.isMuted).toBe(!initialMuted);

      // Restore initial state
      fireEvent.click(soundBtn);
      expect(soundFX.isMuted).toBe(initialMuted);
    });
  });

  describe("7. Desktop Input Preservation", () => {
    it("keyboard inputs (WASD, Shift, Space) continue working independently of touch", () => {
      const input = new Input();
      const out = { x: 0, y: 0, run: false, jump: false };

      // Simulate 'KeyW' (forward) and 'ShiftLeft' (sprint)
      window.dispatchEvent(new KeyboardEvent("keydown", { code: "KeyW" }));
      window.dispatchEvent(new KeyboardEvent("keydown", { code: "ShiftLeft" }));
      window.dispatchEvent(new KeyboardEvent("keydown", { code: "Space" }));

      input.read(out);

      expect(out.y).toBe(1);
      expect(out.run).toBe(true);
      expect(out.jump).toBe(true);

      // Key releases
      window.dispatchEvent(new KeyboardEvent("keyup", { code: "KeyW" }));
      window.dispatchEvent(new KeyboardEvent("keyup", { code: "ShiftLeft" }));
      window.dispatchEvent(new KeyboardEvent("keyup", { code: "Space" }));

      input.read(out);
      expect(out.y).toBe(0);
      expect(out.run).toBe(false);
      expect(out.jump).toBe(false);

      input.dispose();
    });
  });
});
