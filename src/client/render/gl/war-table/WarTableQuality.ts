export interface WarTableQuality {
  secondaryAnimationRate: number;
  particleScale: number;
  shadowSamples: number;
  mobile: boolean;
}

const TIERS = [
  {
    secondaryAnimationRate: 1,
    particleScale: 1,
    shadowSamples: 2,
  },
  {
    secondaryAnimationRate: 0.75,
    particleScale: 0.72,
    shadowSamples: 1,
  },
  {
    secondaryAnimationRate: 0.5,
    particleScale: 0.48,
    shadowSamples: 0,
  },
] as const;

export class WarTableQualityController {
  private samples: Array<{ frameMs: number; nowMs: number }> = [];
  private tier: number;
  private lastTransitionMs = -Infinity;

  constructor(private readonly mobile: boolean) {
    this.tier = mobile ? 1 : 0;
  }

  current(): WarTableQuality {
    return { ...TIERS[this.tier], mobile: this.mobile };
  }

  sample(frameMs: number, nowMs: number): WarTableQuality {
    if (!Number.isFinite(frameMs) || !Number.isFinite(nowMs))
      return this.current();
    this.samples.push({ frameMs: Math.max(0, frameMs), nowMs });
    while (this.samples.length > 0 && nowMs - this.samples[0].nowMs > 8_500)
      this.samples.shift();
    if (nowMs - this.lastTransitionMs < 5_000) return this.current();

    const slow = this.samples.filter((sample) => nowMs - sample.nowMs <= 1_500);
    if (
      slow.length >= 45 &&
      slow.filter((sample) => sample.frameMs >= 21).length / slow.length >=
        0.75 &&
      this.tier < TIERS.length - 1
    ) {
      this.tier++;
      this.lastTransitionMs = nowMs;
      return this.current();
    }

    const stable = this.samples.filter(
      (sample) => nowMs - sample.nowMs <= 8_000,
    );
    if (
      stable.length >= 450 &&
      stable.every((sample) => sample.frameMs <= 14) &&
      this.tier > (this.mobile ? 1 : 0)
    ) {
      this.tier--;
      this.lastTransitionMs = nowMs;
    }
    return this.current();
  }
}
