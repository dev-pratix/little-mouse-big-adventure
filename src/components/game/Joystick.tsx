import { useRef, useState, useEffect } from "react";
import type { Engine } from "@/game/engine";

export function Joystick({ engine }: { engine: Engine | null }) {
  const baseRef = useRef<HTMLDivElement>(null);
  const [knob, setKnob] = useState({ x: 0, y: 0 });
  const [isSprinting, setIsSprinting] = useState(false);
  const joyPointerId = useRef<number | null>(null);
  const camPointerId = useRef<number | null>(null);
  const camLastPos = useRef({ x: 0, y: 0 });

  // Reset touch state on unmount or engine change
  useEffect(() => {
    return () => {
      if (engine) engine.input.resetTouch();
    };
  }, [engine]);

  // ── Joystick Handler ───────────────────────────────────────────────
  const updateJoystick = (clientX: number, clientY: number) => {
    if (!baseRef.current) return;
    const rect = baseRef.current.getBoundingClientRect();
    const radius = rect.width / 2;
    let dx = (clientX - (rect.left + radius)) / radius;
    let dy = (clientY - (rect.top + radius)) / radius;
    const mag = Math.hypot(dx, dy);

    if (mag > 1) {
      dx /= mag;
      dy /= mag;
    }

    setKnob({ x: dx, y: dy });

    // Dead zone for clean idle & smooth response curve
    const DEADZONE = 0.12;
    if (mag < DEADZONE) {
      if (engine) engine.input.joy = { x: 0, y: 0 };
    } else {
      const scaledMag = (mag - DEADZONE) / (1 - DEADZONE);
      const nx = (dx / (mag || 1)) * scaledMag;
      const ny = (dy / (mag || 1)) * scaledMag;
      if (engine) engine.input.joy = { x: nx, y: -ny };
    }
  };

  const endJoystick = (e?: React.PointerEvent) => {
    if (e && joyPointerId.current !== null && e.pointerId !== joyPointerId.current) return;
    joyPointerId.current = null;
    setKnob({ x: 0, y: 0 });
    if (engine) engine.input.joy = { x: 0, y: 0 };
  };

  // ── Touch Camera Drag Handler ──────────────────────────────────────
  const handleCamStart = (e: React.PointerEvent) => {
    if (camPointerId.current !== null) return;
    camPointerId.current = e.pointerId;
    camLastPos.current = { x: e.clientX, y: e.clientY };
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handleCamMove = (e: React.PointerEvent) => {
    if (camPointerId.current !== e.pointerId || !engine) return;
    const deltaX = e.clientX - camLastPos.current.x;
    const deltaY = e.clientY - camLastPos.current.y;
    camLastPos.current = { x: e.clientX, y: e.clientY };

    const SENSITIVITY = 0.0055;
    engine.addCameraLook(-deltaX * SENSITIVITY, -deltaY * SENSITIVITY);
  };

  const handleCamEnd = (e: React.PointerEvent) => {
    if (camPointerId.current === e.pointerId) {
      camPointerId.current = null;
    }
  };

  return (
    <div className="pointer-events-none absolute inset-0 select-none overflow-hidden touch-none md:hidden">
      {/* Right side touch drag surface for camera orbit */}
      <div
        className="pointer-events-auto absolute inset-y-0 right-0 w-1/2 touch-none"
        style={{ zIndex: 5 }}
        onPointerDown={handleCamStart}
        onPointerMove={handleCamMove}
        onPointerUp={handleCamEnd}
        onPointerCancel={handleCamEnd}
      />

      {/* Left side: Analog movement joystick */}
      <div
        style={{
          position: "absolute",
          left: "max(1.5rem, env(safe-area-inset-left, 0px))",
          bottom: "max(1.5rem, env(safe-area-inset-bottom, 0px))",
          zIndex: 10,
        }}
        className="pointer-events-auto"
      >
        <div
          ref={baseRef}
          className="joystick-base relative h-32 w-32 touch-none rounded-full"
          onPointerDown={(e) => {
            joyPointerId.current = e.pointerId;
            e.currentTarget.setPointerCapture(e.pointerId);
            updateJoystick(e.clientX, e.clientY);
          }}
          onPointerMove={(e) => {
            if (joyPointerId.current === e.pointerId) {
              updateJoystick(e.clientX, e.clientY);
            }
          }}
          onPointerUp={endJoystick}
          onPointerCancel={endJoystick}
        >
          <div
            className="joystick-knob absolute left-1/2 top-1/2 h-14 w-14 rounded-full transition-transform duration-75"
            style={{
              transform: `translate(calc(-50% + ${knob.x * 42}px), calc(-50% + ${knob.y * 42}px))`,
            }}
          />
        </div>
      </div>

      {/* Right side: Jump & Sprint Thumb Controls */}
      <div
        style={{
          position: "absolute",
          right: "max(1.5rem, env(safe-area-inset-right, 0px))",
          bottom: "max(1.5rem, env(safe-area-inset-bottom, 0px))",
          zIndex: 10,
        }}
        className="pointer-events-auto flex items-end gap-3.5"
      >
        {/* Sprint Button (Hold to Sprint) */}
        <button
          className={`btn-touch-action h-16 w-16 text-xs transition-colors ${
            isSprinting
              ? "bg-amber-400 text-stone-900 shadow-md ring-2 ring-amber-300 scale-95"
              : "bg-stone-800/80 text-amber-200/90 border border-amber-300/30 shadow-lg backdrop-blur-sm"
          }`}
          aria-label="Hold to sprint"
          onPointerDown={(e) => {
            e.stopPropagation();
            setIsSprinting(true);
            if (engine) engine.input.sprint = true;
          }}
          onPointerUp={(e) => {
            e.stopPropagation();
            setIsSprinting(false);
            if (engine) engine.input.sprint = false;
          }}
          onPointerCancel={() => {
            setIsSprinting(false);
            if (engine) engine.input.sprint = false;
          }}
        >
          <span className="text-base leading-none">⚡</span>
          <span className="mt-0.5 font-bold tracking-wide">Sprint</span>
        </button>

        {/* Jump Button (Tap to Jump) */}
        <button
          className="btn-touch-action h-20 w-20 bg-amber-500 text-stone-900 border-2 border-amber-300 shadow-xl"
          style={{
            boxShadow: "0 4px 0 oklch(0.7 0.15 70), 0 6px 14px rgba(0,0,0,0.3)",
          }}
          aria-label="Jump"
          onPointerDown={(e) => {
            e.stopPropagation();
            if (engine) engine.input.triggerJump();
          }}
        >
          <span className="text-xl leading-none">🐾</span>
          <span className="mt-0.5 text-sm font-bold tracking-wide">Jump</span>
        </button>
      </div>
    </div>
  );
}
