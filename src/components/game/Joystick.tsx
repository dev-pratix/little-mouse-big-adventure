import { useRef, useState } from "react";
import type { Engine } from "@/game/engine";

export function Joystick({ engine }: { engine: Engine | null }) {
  const base = useRef<HTMLDivElement>(null);
  const [knob, setKnob] = useState({ x: 0, y: 0 });
  const id = useRef<number | null>(null);

  const update = (cx: number, cy: number) => {
    const r = base.current!.getBoundingClientRect();
    const R = r.width / 2;
    let dx = (cx - (r.left + R)) / R, dy = (cy - (r.top + R)) / R;
    const l = Math.hypot(dx, dy);
    if (l > 1) { dx /= l; dy /= l; }
    setKnob({ x: dx, y: dy });
    if (engine) engine.input.joy = { x: dx, y: -dy };
  };
  const end = () => {
    id.current = null;
    setKnob({ x: 0, y: 0 });
    if (engine) engine.input.joy = { x: 0, y: 0 };
  };

  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-0 flex items-end justify-between p-6 md:hidden">
      <div
        ref={base}
        className="joystick-base pointer-events-auto relative h-32 w-32 touch-none rounded-full"
        onPointerDown={(e) => { id.current = e.pointerId; e.currentTarget.setPointerCapture(e.pointerId); update(e.clientX, e.clientY); }}
        onPointerMove={(e) => id.current === e.pointerId && update(e.clientX, e.clientY)}
        onPointerUp={end}
        onPointerCancel={end}
      >
        <div
          className="joystick-knob absolute left-1/2 top-1/2 h-14 w-14 rounded-full"
          style={{ transform: `translate(calc(-50% + ${knob.x * 40}px), calc(-50% + ${knob.y * 40}px))` }}
        />
      </div>
      <button
        className="btn-cozy pointer-events-auto h-20 w-20 touch-none rounded-full text-sm"
        onPointerDown={() => engine && (engine.input.sprint = true)}
        onPointerUp={() => engine && (engine.input.sprint = false)}
        onPointerLeave={() => engine && (engine.input.sprint = false)}
      >
        Scurry
      </button>
    </div>
  );
}
