export type MobileGestureMode =
  | "idle"
  | "pending"
  | "hold"
  | "drag"
  | "multitouch"
  | "consumed"
  | "cancelled";

export type MobileGestureDecision =
  | { kind: "pending" | "consumed" | "cancelled" | "multitouch" }
  | { kind: "tap" | "hold" | "drag-start" | "drag"; x: number; y: number };

export interface MobileGestureSnapshot {
  mode: MobileGestureMode;
  activePointers: number;
  primaryPointerId: number | null;
}

export class MobileGestureArbiter {
  private mode: MobileGestureMode = "idle";
  private primary: { id: number; x: number; y: number; at: number } | null =
    null;
  private readonly pointers = new Set<number>();

  constructor(private readonly options: { holdMs: number; slopPx: number }) {}

  pointerDown(
    id: number,
    x: number,
    y: number,
    at: number,
  ): MobileGestureDecision {
    this.pointers.add(id);
    if (this.pointers.size > 1) {
      this.mode = "multitouch";
      return { kind: "multitouch" };
    }
    this.primary = { id, x, y, at };
    this.mode = "pending";
    return { kind: "pending" };
  }

  pointerMove(
    id: number,
    x: number,
    y: number,
    _at: number,
  ): MobileGestureDecision | null {
    if (!this.primary || id !== this.primary.id || this.mode === "multitouch") {
      return null;
    }
    const moved = Math.hypot(x - this.primary.x, y - this.primary.y);
    if (this.mode === "pending" && moved >= this.options.slopPx) {
      this.mode = "drag";
      return { kind: "drag-start", x, y };
    }
    return this.mode === "drag" ? { kind: "drag", x, y } : null;
  }

  holdDeadline(at: number): MobileGestureDecision | null {
    if (
      !this.primary ||
      this.mode !== "pending" ||
      at - this.primary.at < this.options.holdMs
    ) {
      return null;
    }
    this.mode = "hold";
    return { kind: "hold", x: this.primary.x, y: this.primary.y };
  }

  consume(): void {
    if (this.mode !== "idle") this.mode = "consumed";
  }

  pointerUp(
    id: number,
    x: number,
    y: number,
    at: number,
  ): MobileGestureDecision {
    const previous = this.mode;
    const heldFor = this.primary ? at - this.primary.at : 0;
    this.pointers.delete(id);
    if (this.pointers.size > 0) return { kind: "consumed" };
    this.reset();
    if (previous !== "pending") return { kind: "consumed" };
    // The hold timer runs on the main thread, so a busy frame can delay it
    // past the release -- the press was then still "pending" and a deliberate
    // hold turned into a tap, which on the battlefield is an attack. Judge by
    // the clock instead of by whether the timer got its turn.
    if (heldFor >= this.options.holdMs) return { kind: "hold", x, y };
    return { kind: "tap", x, y };
  }

  cancel(): MobileGestureDecision {
    this.mode = "cancelled";
    this.reset();
    return { kind: "cancelled" };
  }

  snapshot(): MobileGestureSnapshot {
    return {
      mode: this.mode,
      activePointers: this.pointers.size,
      primaryPointerId: this.primary?.id ?? null,
    };
  }

  private reset(): void {
    this.mode = "idle";
    this.primary = null;
    this.pointers.clear();
  }
}
