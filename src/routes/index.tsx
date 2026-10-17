import { createFileRoute } from "@tanstack/react-router";
import { useState, useSyncExternalStore } from "react";
import { GameViewport } from "@/components/game/GameViewport";
import { Joystick } from "@/components/game/Joystick";
import { CompleteScreen, HUD, PauseMenu, TitleScreen } from "@/components/game/Overlays";
import type { Engine } from "@/game/engine";
import { createStore } from "@/game/state";

export const Route = createFileRoute("/")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "MOUSECHIEF — Cozy 3D Mouse Simulator" },
      { name: "description", content: "Tiny mouse. Giant world. Questionable morals. Steal three cheeses and scurry home." },
      { property: "og:title", content: "MOUSECHIEF — Cozy 3D Mouse Simulator" },
      { property: "og:description", content: "Tiny mouse. Giant world. Questionable morals." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Game,
});

function Game() {
  const [store] = useState(createStore);
  const [engine, setEngine] = useState<Engine | null>(null);
  const s = useSyncExternalStore(store.subscribe, store.get, store.get);
  return (
    <main className="fixed inset-0 overflow-hidden bg-background select-none">
      <GameViewport store={store} onEngine={setEngine} />
      {s.phase === "title" && <TitleScreen store={store} />}
      {(s.phase === "playing" || s.phase === "paused") && <HUD s={s} store={store} />}
      {s.phase === "playing" && <Joystick engine={engine} />}
      {s.phase === "paused" && <PauseMenu store={store} onResetCamera={() => engine?.resetCamera()} />}
      {s.phase === "complete" && <CompleteScreen store={store} />}
    </main>
  );
}
