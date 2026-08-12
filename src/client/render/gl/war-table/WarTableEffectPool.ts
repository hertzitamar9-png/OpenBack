export type WarTableEffectFamily =
  | "assembly"
  | "reload"
  | "ship-wake"
  | "train-smoke"
  | "aircraft-smoke"
  | "tank-dust"
  | "impact"
  | "tank-destruction"
  | "aircraft-crash"
  | "building-collapse"
  | "ship-sinking"
  | "debris";

export interface WarTableEffectSpawn {
  family: WarTableEffectFamily;
  x: number;
  y: number;
  startMs: number;
  lifetimeMs: number;
  radius?: number;
  color?: number;
  decorative?: boolean;
  fxType?: number;
  fadeIn?: number;
  fadeOut?: number;
}

export interface WarTableEffectInstance extends WarTableEffectSpawn {
  age: number;
}

function isFiniteEffect(effect: WarTableEffectSpawn): boolean {
  return (
    Number.isFinite(effect.x) &&
    Number.isFinite(effect.y) &&
    Number.isFinite(effect.startMs) &&
    Number.isFinite(effect.lifetimeMs) &&
    effect.lifetimeMs > 0 &&
    (effect.radius === undefined || Number.isFinite(effect.radius)) &&
    (effect.color === undefined || Number.isFinite(effect.color))
  );
}

/**
 * Fixed-capacity lifecycle store for optional war-table decoration. Tactical
 * warnings deliberately remain in their established passes and never enter
 * this replaceable pool.
 */
export class WarTableEffectPool {
  private readonly effects: Array<WarTableEffectInstance | undefined>;

  constructor(
    capacity: number,
    private readonly reducedMotion = false,
  ) {
    this.effects = new Array(Math.max(1, Math.floor(capacity)));
  }

  get activeCount(): number {
    let count = 0;
    for (const effect of this.effects) if (effect !== undefined) count++;
    return count;
  }

  spawn(effect: WarTableEffectSpawn): boolean {
    if (!isFiniteEffect(effect)) return false;
    if (this.reducedMotion && effect.decorative) return false;

    let slot = this.effects.findIndex((candidate) => candidate === undefined);
    if (slot === -1) {
      slot = 0;
      for (let i = 1; i < this.effects.length; i++) {
        if (this.effects[i]!.startMs < this.effects[slot]!.startMs) slot = i;
      }
    }
    this.effects[slot] = { ...effect, age: 0 };
    return true;
  }

  update(nowMs: number): void {
    if (!Number.isFinite(nowMs)) return;
    for (let i = 0; i < this.effects.length; i++) {
      const effect = this.effects[i];
      if (effect === undefined) continue;
      const ageMs = Math.max(0, nowMs - effect.startMs);
      if (ageMs >= effect.lifetimeMs) {
        this.effects[i] = undefined;
      } else {
        effect.age = Math.min(1, ageMs / effect.lifetimeMs);
      }
    }
  }

  snapshot(): WarTableEffectInstance[] {
    return this.effects.filter(
      (effect): effect is WarTableEffectInstance => effect !== undefined,
    );
  }

  clear(): void {
    this.effects.fill(undefined);
  }
}
