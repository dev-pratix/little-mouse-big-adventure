import { useState, useEffect } from "react";
import { soundFX } from "@/game/audio";
import type { GameState, Store } from "@/game/state";

const Cheese = () => <span aria-hidden className="cheese-icon" />;

/** Helper to detect whether the user is on a touch-first mobile/tablet device vs desktop */
export function checkIsTouchDevice(): boolean {
  if (typeof window === "undefined") return false;
  const hasTouchCapability =
    "ontouchstart" in window ||
    (typeof navigator !== "undefined" && navigator.maxTouchPoints > 0);
  if (!hasTouchCapability) return false;

  // Narrow desktop browser windows or laptops with touchscreens:
  // If the device has fine pointer (mouse/trackpad) and hover capability, and does not have coarse pointer,
  // treat as desktop.
  if (typeof window.matchMedia === "function") {
    const isFinePointer = window.matchMedia("(pointer: fine) and (hover: hover)").matches;
    const isCoarsePointer = window.matchMedia("(pointer: coarse)").matches;
    if (isFinePointer && !isCoarsePointer) {
      return false;
    }
  }

  return true;
}

/** Helper to detect portrait orientation */
export function checkIsPortrait(): boolean {
  if (typeof window === "undefined") return false;

  // 1. screen.orientation API if available
  if (typeof screen !== "undefined" && screen.orientation && typeof screen.orientation.type === "string") {
    return screen.orientation.type.startsWith("portrait");
  }

  // 2. CSS media query if available
  if (typeof window.matchMedia === "function") {
    const mql = window.matchMedia("(orientation: portrait)");
    if (mql && typeof mql.matches === "boolean") {
      return mql.matches;
    }
  }

  // 3. Viewport dimensions fallback
  return window.innerHeight > window.innerWidth;
}

/** Capability detection hook for mobile touch and viewport orientation */
export function useDeviceCapabilities() {
  const [isTouch, setIsTouch] = useState(checkIsTouchDevice);
  const [isPortrait, setIsPortrait] = useState(checkIsPortrait);

  useEffect(() => {
    const update = () => {
      setIsTouch(checkIsTouchDevice());
      setIsPortrait(checkIsPortrait());
    };

    update();

    window.addEventListener("resize", update);
    window.addEventListener("orientationchange", update);

    if (typeof screen !== "undefined" && screen.orientation && "addEventListener" in screen.orientation) {
      screen.orientation.addEventListener("change", update);
    }

    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("orientationchange", update);
      if (typeof screen !== "undefined" && screen.orientation && "removeEventListener" in screen.orientation) {
        screen.orientation.removeEventListener("change", update);
      }
    };
  }, []);

  return { isTouch, isPortrait };
}

/** Attempts landscape orientation locking if permitted by the browser */
export async function requestLandscape() {
  if (typeof window === "undefined") return;
  try {
    if (typeof screen !== "undefined" && screen.orientation && "lock" in screen.orientation) {
      await (screen.orientation as unknown as { lock: (mode: string) => Promise<void> }).lock("landscape");
    }
  } catch {
    // Graceful fallback: some browsers require full-screen before locking orientation
  }
}

/** Attempts to toggle document fullscreen mode with user gesture fallback */
export async function toggleFullscreen(element?: HTMLElement) {
  if (typeof document === "undefined") return;
  const target = element || document.documentElement;
  try {
    const isFs =
      document.fullscreenElement ||
      (document as unknown as { webkitFullscreenElement?: Element }).webkitFullscreenElement;
    if (!isFs) {
      if (target.requestFullscreen) {
        await target.requestFullscreen();
      } else if ((target as unknown as { webkitRequestFullscreen?: () => Promise<void> }).webkitRequestFullscreen) {
        await (target as unknown as { webkitRequestFullscreen: () => Promise<void> }).webkitRequestFullscreen();
      }
    } else {
      if (document.exitFullscreen) {
        await document.exitFullscreen();
      } else if ((document as unknown as { webkitExitFullscreen?: () => Promise<void> }).webkitExitFullscreen) {
        await (document as unknown as { webkitExitFullscreen: () => Promise<void> }).webkitExitFullscreen();
      }
    }
  } catch {
    // Graceful fallback: fullscreen may be unsupported or rejected by browser policy
  }
}

/** Early Access Development Welcome Screen */
export function TitleScreen({
  store,
  isBlockedByOrientation,
}: {
  store: Store;
  isBlockedByOrientation?: boolean;
}) {
  const handleStart = () => {
    requestLandscape();
    if (isBlockedByOrientation) {
      return;
    }
    store.play();
  };

  return (
    <div className="overlay-scrim absolute inset-0 flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
      <div className="panel-cozy max-w-lg w-full p-6 sm:p-8 text-center my-auto animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center justify-center gap-2 mb-2">
          <span className="scale-110"><Cheese /></span>
          <p className="eyebrow tracking-widest text-xs">An Early Access Experience</p>
          <span className="scale-110"><Cheese /></span>
        </div>

        <h1 className="title-logo text-3xl sm:text-4xl md:text-5xl tracking-tight leading-none mt-1">
          Little Mouse, Big Adventure
        </h1>

        <div className="mt-4 px-2 py-3 rounded-xl bg-black/5 dark:bg-white/5 border border-amber-900/10 dark:border-white/10 text-xs sm:text-sm text-foreground/80 leading-relaxed text-left sm:text-center">
          You're playing an early development build! The game is still being improved, so you may encounter bugs,
          unfinished details, or performance issues. Thanks for being part of the journey.
        </div>

        <div className="mt-6 flex flex-col items-center gap-3">
          <button
            className="btn-cozy w-full sm:w-auto px-10 py-3.5 text-lg font-bold shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
            onClick={handleStart}
            disabled={isBlockedByOrientation}
            aria-disabled={isBlockedByOrientation}
            autoFocus={!isBlockedByOrientation}
          >
            {isBlockedByOrientation ? "Rotate Phone to Play" : "Play Game"}
          </button>

          <div className="flex items-center gap-2 mt-1 text-[0.7rem] text-muted-foreground font-medium">
            <span className="inline-block w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
            <span>Work in Progress · Early Development Build</span>
          </div>
        </div>
      </div>
    </div>
  );
}

/** Portrait Orientation Blocker for touch devices */
export function RotateDevicePrompt() {
  return (
    <div
      className="overlay-scrim fixed inset-0 z-[100] flex flex-col items-center justify-center p-6 text-center select-none touch-none backdrop-blur-md"
      role="alertdialog"
      aria-modal="true"
      aria-label="Rotate Your Device"
    >
      <div className="panel-cozy max-w-xs w-full p-6 flex flex-col items-center shadow-2xl animate-in fade-in duration-200">
        <div className="relative mb-5 flex items-center justify-center w-20 h-20 rounded-2xl bg-amber-500/15 border-2 border-amber-400/30">
          <svg
            className="w-12 h-12 text-amber-500 rotate-device-anim"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <rect width="14" height="20" x="5" y="2" rx="2" ry="2" />
            <path d="M12 18h.01" />
          </svg>
        </div>

        <h2 className="font-display text-2xl font-bold text-foreground">Rotate Your Device</h2>
        <p className="mt-2 text-sm text-muted-foreground leading-snug">
          This little adventure is best played in landscape mode.
        </p>

        <button
          className="btn-soft mt-5 px-6 py-2 text-xs font-semibold"
          onClick={async () => {
            await toggleFullscreen();
            await requestLandscape();
          }}
        >
          Try Rotate Screen
        </button>
      </div>
    </div>
  );
}

/** Small key hint badge */
function Key({ label }: { label: string }) {
  return (
    <kbd
      style={{
        display: "inline-block",
        padding: "1px 6px",
        background: "rgba(255,255,255,0.15)",
        border: "1px solid rgba(255,255,255,0.3)",
        borderRadius: "4px",
        fontFamily: "inherit",
        fontSize: "0.7rem",
        lineHeight: "1.4",
        letterSpacing: "0.02em",
      }}
    >
      {label}
    </kbd>
  );
}

export function HUD({ s, store, isTouch }: { s: GameState; store: Store; isTouch?: boolean }) {
  const [muted, setMuted] = useState(soundFX.isMuted);

  useEffect(() => {
    return soundFX.subscribe(() => setMuted(soundFX.isMuted));
  }, []);

  const done = s.cheese >= s.total;
  return (
    <>
      <div
        className="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between gap-3 p-3.5 sm:p-4"
        style={{
          paddingTop: "max(0.75rem, env(safe-area-inset-top, 0px))",
          paddingLeft: "max(1rem, env(safe-area-inset-left, 0px))",
          paddingRight: "max(1rem, env(safe-area-inset-right, 0px))",
        }}
      >
        <div className="flex flex-col gap-1.5">
          <div className="panel-cozy max-w-[13.5rem] sm:max-w-[16rem] px-3 py-2 sm:px-4 sm:py-2.5">
            <p className="eyebrow text-[0.65rem] sm:text-xs">Mission</p>
            <p className="font-display text-sm sm:text-base leading-tight">A Mouse's First Heist</p>
            <p className="mt-0.5 text-xs text-muted-foreground leading-snug">
              {done
                ? "✨ All cheese collected! Scurry back to your mouse burrow!"
                : `Steal ${s.total} pieces of cheese. Look for golden beacons!`}
            </p>
          </div>
          {s.isHiding && (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-950/85 backdrop-blur-md text-[0.7rem] sm:text-xs font-medium text-emerald-300 border border-emerald-400/40 shadow-md w-fit">
              <span>🐾</span> Hidden · {s.hidingZone || "Under furniture"}
            </div>
          )}
        </div>
        <div className="flex flex-col items-end gap-2">
          <div className="flex items-center gap-2">
            <div className="panel-cozy flex items-center gap-2 px-3 py-1.5 sm:px-4 sm:py-2 font-display text-lg sm:text-xl" aria-label="cheese counter">
              <Cheese /> {s.cheese}/{s.total}
            </div>
            <button
              className="btn-soft pointer-events-auto h-10 w-10 sm:h-11 sm:w-11 rounded-full text-sm sm:text-base flex items-center justify-center shadow"
              aria-label="Toggle Fullscreen"
              title="Toggle Fullscreen"
              onClick={() => toggleFullscreen()}
            >
              ⛶
            </button>
            <button
              className="btn-soft pointer-events-auto h-10 w-10 sm:h-11 sm:w-11 rounded-full text-sm sm:text-base flex items-center justify-center shadow"
              aria-label={muted ? "Unmute sound" : "Mute sound"}
              onClick={() => soundFX.toggleMute()}
            >
              {muted ? "🔇" : "🔊"}
            </button>
            <button
              className="btn-cozy pointer-events-auto h-10 w-10 sm:h-11 sm:w-11 rounded-full text-sm sm:text-base font-bold flex items-center justify-center shadow"
              aria-label="Pause"
              onClick={store.pause}
            >
              II
            </button>
          </div>
        </div>
      </div>

      {/* Device-aware Controls hint — bottom-centre */}
      <div
        className="pointer-events-none absolute inset-x-0 bottom-3.5 flex justify-center"
        style={{
          paddingBottom: "max(0.5rem, env(safe-area-inset-bottom, 0px))",
        }}
        aria-label="controls hint"
      >
        <div
          style={{
            display: "flex",
            gap: "10px",
            alignItems: "center",
            background: "rgba(0,0,0,0.42)",
            backdropFilter: "blur(8px)",
            borderRadius: "999px",
            padding: "5px 14px",
            color: "rgba(255,255,255,0.85)",
            fontSize: "0.72rem",
            fontFamily: "inherit",
            flexWrap: "wrap",
            justifyContent: "center",
            boxShadow: "0 2px 8px rgba(0,0,0,0.3)",
          }}
        >
          {isTouch ? (
            <>
              <span>Move: left joystick</span>
              <span style={{ opacity: 0.35 }}>·</span>
              <span>Look: drag right side</span>
              <span style={{ opacity: 0.35 }}>·</span>
              <span>Jump: jump button</span>
              <span style={{ opacity: 0.35 }}>·</span>
              <span>Sprint: hold sprint</span>
            </>
          ) : (
            <>
              <span><Key label="WASD" /> Move</span>
              <span style={{ opacity: 0.35 }}>·</span>
              <span><Key label="Shift" /> Sprint</span>
              <span style={{ opacity: 0.35 }}>·</span>
              <span><Key label="Space" /> Jump</span>
              <span style={{ opacity: 0.35 }}>·</span>
              <span><Key label="R" /> Reset Cam</span>
              <span style={{ opacity: 0.35 }}>·</span>
              <span><Key label="Esc" /> Pause</span>
            </>
          )}
        </div>
      </div>
    </>
  );
}

export function PauseMenu({ store, onResetCamera }: { store: Store; onResetCamera?: () => void }) {
  return (
    <div className="overlay-scrim absolute inset-0 flex items-center justify-center p-6">
      <div className="panel-cozy w-72 p-7 text-center">
        <h2 className="font-display text-3xl">Paused</h2>
        <p className="mt-1 text-sm text-muted-foreground">Catching your breath…</p>
        <div className="mt-6 flex flex-col gap-3">
          <button className="btn-cozy py-2.5" onClick={store.resume} autoFocus>Resume</button>
          <button className="btn-soft py-2.5" onClick={() => toggleFullscreen()}>
            Toggle Fullscreen
          </button>
          {onResetCamera && (
            <button
              className="btn-soft py-2.5"
              onClick={() => {
                onResetCamera();
                store.resume();
              }}
            >
              Reset Camera
            </button>
          )}
          <button className="btn-soft py-2.5" onClick={store.restart}>Restart</button>
        </div>
      </div>
    </div>
  );
}

export function CompleteScreen({ store }: { store: Store }) {
  const s = store.get();
  return (
    <div className="overlay-scrim absolute inset-0 flex items-center justify-center p-6">
      <div className="panel-cozy max-w-sm p-8 text-center animate-in fade-in zoom-in-95 duration-300">
        <p className="eyebrow">Mission Complete</p>
        <h2 className="title-logo mt-2 text-4xl">Heist Pulled Off!</h2>
        <p className="mt-3 text-muted-foreground">
          All {s.total} cheeses are safely stashed away in your burrow. The humans suspect nothing. Probably.
        </p>
        <div className="mt-5 flex justify-center gap-2.5 flex-wrap">
          {Array.from({ length: s.total }).map((_, i) => (
            <span key={i} className="scale-125"><Cheese /></span>
          ))}
        </div>
        <div className="mt-4 py-2 px-3 rounded-lg bg-white/5 border border-white/10 text-xs text-amber-200/90">
          🏆 Master Infiltrator · {s.cheese} / {s.total} Cheeses Secured
        </div>
        <button className="btn-cozy mt-6 px-8 py-3 text-base font-semibold" onClick={store.restart} autoFocus>
          Play Again
        </button>
      </div>
    </div>
  );
}
