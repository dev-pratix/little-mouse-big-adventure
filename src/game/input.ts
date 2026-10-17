// Keyboard + virtual joystick input. Produces a move vector (x: right, y: forward) in [-1,1].
export class Input {
  private keys = new Set<string>();
  joy = { x: 0, y: 0 };
  sprint = false;
  onPause: (() => void) | null = null;
  /** Consumed once per press so the controller doesn't multi-jump. */
  private jumpPending = false;

  private down = (e: KeyboardEvent) => {
    if (e.code === "Escape" || e.code === "KeyP") this.onPause?.();
    if (e.code === "Space" && !this.keys.has("Space")) this.jumpPending = true;
    this.keys.add(e.code);
    if (e.code.startsWith("Arrow") || e.code === "Space") e.preventDefault();
  };
  private up = (e: KeyboardEvent) => this.keys.delete(e.code);
  private blur = () => this.keys.clear();

  constructor() {
    window.addEventListener("keydown", this.down);
    window.addEventListener("keyup", this.up);
    window.addEventListener("blur", this.blur);
  }

  read(out: { x: number; y: number; run: boolean; jump: boolean }) {
    const k = this.keys;
    let x = (k.has("KeyD") || k.has("ArrowRight") ? 1 : 0) - (k.has("KeyA") || k.has("ArrowLeft") ? 1 : 0);
    let y = (k.has("KeyW") || k.has("ArrowUp") ? 1 : 0) - (k.has("KeyS") || k.has("ArrowDown") ? 1 : 0);
    x += this.joy.x;
    y += this.joy.y;
    const len = Math.hypot(x, y);
    if (len > 1) {
      x /= len;
      y /= len;
    }
    out.x = x;
    out.y = y;
    out.run = k.has("ShiftLeft") || k.has("ShiftRight") || this.sprint;
    // consume jump once per keydown so holding Space doesn't keep jumping
    out.jump = this.jumpPending;
    this.jumpPending = false;
    return out;
  }

  dispose() {
    window.removeEventListener("keydown", this.down);
    window.removeEventListener("keyup", this.up);
    window.removeEventListener("blur", this.blur);
  }
}
