const LOAD_SHEDDING_FRAME_MS = 1000 / 30;

/**
 * Allows the expensive WebGL draw to fall back to 30 FPS under sustained
 * pressure, leaving main-thread time for simulation messages and input work.
 * Hysteresis prevents one slow frame from changing modes.
 */
export class AdaptiveRenderController {
  private lastAnimationFrameMs: number | null = null;
  private lastRenderMs: number | null = null;
  private pressure = 0;
  private loadShedding = false;

  shouldRender(nowMs: number): boolean {
    if (this.lastAnimationFrameMs !== null) {
      const frameGap = nowMs - this.lastAnimationFrameMs;
      // Ignore background-tab gaps. They say nothing about rendering capacity.
      if (frameGap > 0 && frameGap < 250) {
        this.adjustPressure(frameGap >= 24 ? 3 : -1);
      }
    }
    this.lastAnimationFrameMs = nowMs;

    if (!this.loadShedding || this.lastRenderMs === null) {
      this.lastRenderMs = nowMs;
      return true;
    }

    if (nowMs - this.lastRenderMs + 0.5 < LOAD_SHEDDING_FRAME_MS) {
      return false;
    }
    this.lastRenderMs = nowMs;
    return true;
  }

  isLoadShedding(): boolean {
    return this.loadShedding;
  }

  private adjustPressure(delta: number): void {
    this.pressure = Math.max(0, Math.min(60, this.pressure + delta));
    if (!this.loadShedding && this.pressure >= 24) {
      this.loadShedding = true;
    } else if (this.loadShedding && this.pressure === 0) {
      this.loadShedding = false;
    }
  }
}
