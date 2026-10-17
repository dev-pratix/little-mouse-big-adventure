import { useEffect, useRef } from "react";
import { Engine } from "@/game/engine";
import type { Store } from "@/game/state";

export function GameViewport({ store, onEngine }: { store: Store; onEngine: (e: Engine | null) => void }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const engine = new Engine(ref.current!, store);
    onEngine(engine);
    (window as unknown as { __mousechief?: Engine }).__mousechief = engine;
    return () => {
      onEngine(null);
      engine.dispose();
    };
  }, [store, onEngine]);
  return <div ref={ref} className="absolute inset-0" />;
}
