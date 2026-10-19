import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { GameViewport } from "@/components/game/GameViewport";
import { Joystick } from "@/components/game/Joystick";
import {
  CompleteScreen,
  HUD,
  PauseMenu,
  RotateDevicePrompt,
  TitleScreen,
  useDeviceCapabilities,
} from "@/components/game/Overlays";
import type { Engine } from "@/game/engine";
import { createStore } from "@/game/state";

export const Route = createFileRoute("/")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Little Mouse, Big Adventure — Cozy 3D Mouse Game" },
      { name: "description", content: "A cozy, third-person 3D mouse exploration game set inside a miniature house." },
      { property: "og:title", content: "Little Mouse, Big Adventure — Cozy 3D Mouse Game" },
      { property: "og:description", content: "A cozy, third-person 3D mouse exploration game set inside a miniature house." },
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
  const { isTouch, isPortrait } = useDeviceCapabilities();
  const isOrientationBlocked = isTouch && isPortrait;
  const wasPlayingBeforeOrientationBlock = useRef(false);

  // If a touch device enters portrait during active gameplay, pause and clear input.
  // When rotating back to landscape, safely resume if gameplay was active before the block.
  useEffect(() => {
    if (isOrientationBlocked) {
      if (s.phase === "playing") {
        wasPlayingBeforeOrientationBlock.current = true;
        engine?.input.resetTouch();
        store.pause();
      }
    } else {
      if (wasPlayingBeforeOrientationBlock.current) {
        wasPlayingBeforeOrientationBlock.current = false;
        engine?.input.resetTouch();
        if (s.phase === "paused") {
          store.resume();
        }
      }
    }
  }, [isOrientationBlocked, s.phase, engine, store]);

  return (
    <main className="fixed inset-0 overflow-hidden bg-background select-none touch-none">
      <GameViewport store={store} onEngine={setEngine} />
      {s.phase === "title" && (
        <TitleScreen store={store} isBlockedByOrientation={isOrientationBlocked} />
      )}
      {(s.phase === "playing" || (s.phase === "paused" && !isOrientationBlocked)) && (
        <HUD s={s} store={store} isTouch={isTouch} />
      )}
      {s.phase === "playing" && isTouch && !isOrientationBlocked && (
        <Joystick engine={engine} />
      )}
      {s.phase === "paused" && !isOrientationBlocked && (
        <PauseMenu store={store} onResetCamera={() => engine?.resetCamera()} />
      )}
      {s.phase === "complete" && <CompleteScreen store={store} />}
      {isOrientationBlocked && <RotateDevicePrompt />}
    </main>
  );
}
