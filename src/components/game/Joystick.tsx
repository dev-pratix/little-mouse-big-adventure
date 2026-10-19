import { useRef, useState, useEffect, useCallback } from "react";
import { TOUCH_CAMERA_SENSITIVITY } from "@/game/camera";
import type { Engine } from "@/game/engine";

export function Joystick({ engine }: { engine: Engine | null }) {
  const baseRef = useRef<HTMLDivElement>(null);
  const knobRef = useRef<HTMLDivElement>(null);

  const [isSprinting, setIsSprinting] = useState(false);
  const [isJumping, setIsJumping] = useState(false);

  const joyPointerId = useRef<number | null>(null);
  const camPointerId = useRef<number | null>(null);
  const sprintPointerId = useRef<number | null>(null);
  const jumpPointerId = useRef<number | null>(null);
  const camLastPos = useRef({ x: 0, y: 0 });

  // Reset all touch inputs on unmount or when engine changes
  const clearAllTouch = useCallback(() => {
    joyPointerId.current = null;
    camPointerId.current = null;
    sprintPointerId.current = null;
    jumpPointerId.current = null;
    setIsSprinting(false);
    setIsJumping(false);
    if (knobRef.current) {
      knobRef.current.style.transform = "translate(-50%, -50%)";
    }
    if (engine) {
      engine.input.resetTouch();
    }
  }, [engine]);

  useEffect(() => {
    window.addEventListener("blur", clearAllTouch);
    return () => {
      window.removeEventListener("blur", clearAllTouch);
      clearAllTouch();
    };
  }, [clearAllTouch]);

  // ── 1. Virtual Movement Joystick ──────────────────────────────────
  const updateJoystick = (clientX: number, clientY: number) => {
    if (!baseRef.current || !knobRef.current) return;
    const rect = baseRef.current.getBoundingClientRect();
    const radius = rect.width / 2;
    let dx = (clientX - (rect.left + radius)) / radius;
    let dy = (clientY - (rect.top + radius)) / radius;
    const mag = Math.hypot(dx, dy);

    // Clamp visually to base perimeter
    const clampedMag = Math.min(1, mag);
    const unitX = mag > 0.001 ? dx / mag : 0;
    const unitY = mag > 0.001 ? dy / mag : 0;

    const visualX = unitX * clampedMag * 44;
    const visualY = unitY * clampedMag * 44;
    knobRef.current.style.transform = `translate(calc(-50% + ${visualX}px), calc(-50% + ${visualY}px))`;

    // Dead zone for clean idle & smooth non-linear response
    const DEADZONE = 0.12;
    if (clampedMag < DEADZONE) {
      if (engine) engine.input.joy = { x: 0, y: 0 };
    } else {
      // Smooth non-linear curve: fine precision when sneaking, brisk running at edge
      const normalizedMag = (clampedMag - DEADZONE) / (1 - DEADZONE);
      const smoothMag = normalizedMag * 0.7 + normalizedMag * normalizedMag * 0.3;
      const nx = unitX * smoothMag;
      const ny = unitY * smoothMag;
      if (engine) engine.input.joy = { x: nx, y: -ny };
    }
  };

  const endJoystick = (e?: React.PointerEvent) => {
    if (e) e.stopPropagation();
    if (e && joyPointerId.current !== null && e.pointerId !== joyPointerId.current) return;
    joyPointerId.current = null;
    if (knobRef.current) {
      knobRef.current.style.transform = "translate(-50%, -50%)";
    }
    if (engine) engine.input.joy = { x: 0, y: 0 };
  };

  // ── 2. Touch Camera Drag Handler ──────────────────────────────────
  const handleCamStart = (e: React.PointerEvent) => {
    if (camPointerId.current !== null) return;
    camPointerId.current = e.pointerId;
    camLastPos.current = { x: e.clientX, y: e.clientY };
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // Ignored if capture unsupported
    }
  };

  const handleCamMove = (e: React.PointerEvent) => {
    if (camPointerId.current !== e.pointerId || !engine) return;
    const deltaX = e.clientX - camLastPos.current.x;
    const deltaY = e.clientY - camLastPos.current.y;
    camLastPos.current = { x: e.clientX, y: e.clientY };

    // Rotate camera smoothly around mouse
    engine.addCameraLook(-deltaX * TOUCH_CAMERA_SENSITIVITY, -deltaY * TOUCH_CAMERA_SENSITIVITY);
  };

  const handleCamEnd = (e: React.PointerEvent) => {
    if (camPointerId.current === e.pointerId) {
      camPointerId.current = null;
    }
  };

  return (
    <div
      className="pointer-events-none absolute inset-0 select-none overflow-hidden touch-none"
      style={{ zIndex: 30 }}
    >
      {/* Right side touch drag surface for camera orbit (z-10, lower than buttons) */}
      <div
        className="pointer-events-auto absolute inset-y-0 right-0 w-1/2 touch-none"
        style={{ zIndex: 10 }}
        aria-label="camera look surface"
        onPointerDown={handleCamStart}
        onPointerMove={handleCamMove}
        onPointerUp={handleCamEnd}
        onPointerCancel={handleCamEnd}
        onLostPointerCapture={handleCamEnd}
      />

      {/* Left side: Analog movement joystick with ergonomic thumb base */}
      <div
        style={{
          position: "absolute",
          left: "max(1.5rem, env(safe-area-inset-left, 0px))",
          bottom: "max(1.5rem, env(safe-area-inset-bottom, 0px))",
          zIndex: 20,
        }}
        className="pointer-events-auto select-none touch-none"
      >
        <div
          ref={baseRef}
          className="joystick-base relative h-32 w-32 touch-none rounded-full flex items-center justify-center shadow-2xl"
          onPointerDown={(e) => {
            e.stopPropagation();
            joyPointerId.current = e.pointerId;
            try {
              e.currentTarget.setPointerCapture(e.pointerId);
            } catch {
              // Ignore
            }
            updateJoystick(e.clientX, e.clientY);
          }}
          onPointerMove={(e) => {
            if (joyPointerId.current === e.pointerId) {
              e.stopPropagation();
              updateJoystick(e.clientX, e.clientY);
            }
          }}
          onPointerUp={endJoystick}
          onPointerCancel={endJoystick}
          onLostPointerCapture={endJoystick}
        >
          {/* Subtle directional crosshair indicator */}
          <div className="absolute inset-3 rounded-full border border-white/10 pointer-events-none" />

          {/* Thumb Knob */}
          <div
            ref={knobRef}
            className="joystick-knob absolute left-1/2 top-1/2 h-14 w-14 rounded-full pointer-events-none"
            style={{
              transform: "translate(-50%, -50%)",
              transition: "transform 0.05s linear",
            }}
          />
        </div>
      </div>

      {/* Right side: Ergonomic Action Buttons (Jump & Sprint in natural thumb arc) */}
      <div
        style={{
          position: "absolute",
          right: "max(1.5rem, env(safe-area-inset-right, 0px))",
          bottom: "max(1.5rem, env(safe-area-inset-bottom, 0px))",
          zIndex: 25,
        }}
        className="pointer-events-auto flex items-end gap-3.5 select-none touch-none"
      >
        {/* Hold-to-Sprint Button (Upper-Left of Jump in thumb arc) */}
        <button
          className={`btn-touch-action h-16 w-16 text-xs transition-all ${
            isSprinting
              ? "bg-amber-400 text-stone-900 shadow-md ring-4 ring-amber-300/80 scale-95"
              : "bg-stone-900/80 text-amber-200/90 border-2 border-amber-300/40 shadow-xl backdrop-blur-md"
          }`}
          aria-label="Hold to sprint"
          onPointerDown={(e) => {
            e.stopPropagation();
            sprintPointerId.current = e.pointerId;
            try {
              e.currentTarget.setPointerCapture(e.pointerId);
            } catch {
              // Ignore
            }
            setIsSprinting(true);
            if (engine) engine.input.sprint = true;
          }}
          onPointerUp={(e) => {
            e.stopPropagation();
            if (sprintPointerId.current === e.pointerId) {
              sprintPointerId.current = null;
              setIsSprinting(false);
              if (engine) engine.input.sprint = false;
            }
          }}
          onPointerCancel={(e) => {
            if (sprintPointerId.current === e.pointerId) {
              sprintPointerId.current = null;
              setIsSprinting(false);
              if (engine) engine.input.sprint = false;
            }
          }}
          onLostPointerCapture={(e) => {
            if (sprintPointerId.current === e.pointerId) {
              sprintPointerId.current = null;
              setIsSprinting(false);
              if (engine) engine.input.sprint = false;
            }
          }}
        >
          <span className="text-lg leading-none">⚡</span>
          <span className="mt-0.5 font-bold tracking-wide text-[0.7rem]">Sprint</span>
        </button>

        {/* Jump Button (Primary thumb button, large and immediate feedback) */}
        <button
          className={`btn-touch-action h-20 w-20 border-2 text-stone-900 transition-all ${
            isJumping
              ? "bg-amber-400 border-amber-200 scale-95 shadow-inner"
              : "bg-amber-500 border-amber-300 shadow-2xl"
          }`}
          style={{
            boxShadow: isJumping
              ? "none"
              : "0 5px 0 oklch(0.7 0.15 70), 0 8px 18px rgba(0,0,0,0.35)",
          }}
          aria-label="Jump"
          onPointerDown={(e) => {
            e.stopPropagation();
            jumpPointerId.current = e.pointerId;
            try {
              e.currentTarget.setPointerCapture(e.pointerId);
            } catch {
              // Ignore
            }
            setIsJumping(true);
            if (engine) engine.input.triggerJump();
          }}
          onPointerUp={(e) => {
            e.stopPropagation();
            setIsJumping(false);
            jumpPointerId.current = null;
          }}
          onPointerCancel={() => {
            setIsJumping(false);
            jumpPointerId.current = null;
          }}
          onLostPointerCapture={() => {
            setIsJumping(false);
            jumpPointerId.current = null;
          }}
        >
          <span className="text-2xl leading-none">🐾</span>
          <span className="mt-0.5 text-sm font-bold tracking-wide">Jump</span>
        </button>
      </div>
    </div>
  );
}
