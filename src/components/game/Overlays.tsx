import type { GameState, Store } from "@/game/state";

const Cheese = () => <span aria-hidden className="cheese-icon" />;

export function TitleScreen({ store }: { store: Store }) {
  return (
    <div className="overlay-scrim absolute inset-0 flex items-center justify-center p-6">
      <div className="panel-cozy max-w-md p-8 text-center">
        <p className="eyebrow">A tiny adventure</p>
        <h1 className="title-logo mt-2">MOUSECHIEF</h1>
        <p className="mt-3 text-muted-foreground">Tiny mouse. Giant world. Questionable morals.</p>
        <button className="btn-cozy mt-7 px-10 py-3 text-lg" onClick={store.play} autoFocus>Play</button>
        <p className="mt-5 text-xs text-muted-foreground">WASD / arrows to move · Shift to scurry · Esc to pause</p>
      </div>
    </div>
  );
}

/** Small key hint badge */
function Key({ label }: { label: string }) {
  return (
    <kbd style={{
      display: "inline-block",
      padding: "1px 6px",
      background: "rgba(255,255,255,0.15)",
      border: "1px solid rgba(255,255,255,0.3)",
      borderRadius: "4px",
      fontFamily: "inherit",
      fontSize: "0.7rem",
      lineHeight: "1.4",
      letterSpacing: "0.02em",
    }}>{label}</kbd>
  );
}

export function HUD({ s, store }: { s: GameState; store: Store }) {
  const done = s.cheese >= s.total;
  return (
    <>
      <div className="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between gap-3 p-4">
        <div className="panel-cozy max-w-[16rem] px-4 py-3">
          <p className="eyebrow">Mission</p>
          <p className="font-display text-base leading-tight">A Mouse's First Heist</p>
          <p className="mt-1 text-sm text-muted-foreground">{done ? "Scurry back to your mouse hole!" : "Steal three pieces of cheese."}</p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <div className="flex items-center gap-2">
            <div className="panel-cozy flex items-center gap-2 px-4 py-2 font-display text-xl" aria-label="cheese counter">
              <Cheese /> {s.cheese}/{s.total}
            </div>
            <button className="btn-cozy pointer-events-auto h-11 w-11 rounded-full" aria-label="Pause" onClick={store.pause}>II</button>
          </div>
          <div className="hidden portrait:flex sm:hidden items-center gap-1.5 px-3 py-1 rounded-full bg-black/45 backdrop-blur-md text-[0.68rem] text-amber-200/90 border border-amber-300/20 shadow">
            <span>🔄</span> Rotate for wide view
          </div>
        </div>
      </div>
      {/* Controls hint — desktop only, bottom-centre, unobtrusive */}
      <div
        className="pointer-events-none absolute inset-x-0 bottom-4 hidden md:flex justify-center"
        aria-label="controls hint"
      >
        <div style={{
          display: "flex",
          gap: "12px",
          alignItems: "center",
          background: "rgba(0,0,0,0.38)",
          backdropFilter: "blur(6px)",
          borderRadius: "999px",
          padding: "5px 14px",
          color: "rgba(255,255,255,0.8)",
          fontSize: "0.72rem",
          fontFamily: "inherit",
          flexWrap: "wrap",
          justifyContent: "center",
        }}>
          <span><Key label="WASD" /> Move</span>
          <span style={{ opacity: 0.35 }}>·</span>
          <span><Key label="Shift" /> Sprint</span>
          <span style={{ opacity: 0.35 }}>·</span>
          <span><Key label="Space" /> Jump</span>
          <span style={{ opacity: 0.35 }}>·</span>
          <span><Key label="R" /> Reset Cam</span>
          <span style={{ opacity: 0.35 }}>·</span>
          <span><Key label="Esc" /> Pause</span>
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
  return (
    <div className="overlay-scrim absolute inset-0 flex items-center justify-center p-6">
      <div className="panel-cozy max-w-sm p-8 text-center">
        <p className="eyebrow">Mission complete</p>
        <h2 className="title-logo mt-2 text-4xl">Heist pulled off!</h2>
        <p className="mt-3 text-muted-foreground">Three cheeses, safely stashed. The humans suspect nothing. Probably.</p>
        <div className="mt-4 flex justify-center gap-2"><Cheese /><Cheese /><Cheese /></div>
        <button className="btn-cozy mt-7 px-8 py-3" onClick={store.restart} autoFocus>Play again</button>
      </div>
    </div>
  );
}
