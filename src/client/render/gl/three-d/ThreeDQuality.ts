export type ThreeDQualityTier = "high" | "medium" | "low";

export interface ThreeDQualitySettings {
  terrainLodBias: number;
  distantModelDetail: number;
  particleScale: number;
  labels: true;
  paths: true;
  ranges: true;
  fogVisibility: true;
}

const SETTINGS: Record<ThreeDQualityTier, ThreeDQualitySettings> = {
  high: {
    terrainLodBias: 0,
    distantModelDetail: 1,
    particleScale: 1,
    labels: true,
    paths: true,
    ranges: true,
    fogVisibility: true,
  },
  medium: {
    terrainLodBias: 1,
    distantModelDetail: 0.72,
    particleScale: 0.7,
    labels: true,
    paths: true,
    ranges: true,
    fogVisibility: true,
  },
  low: {
    terrainLodBias: 2,
    distantModelDetail: 0.48,
    particleScale: 0.45,
    labels: true,
    paths: true,
    ranges: true,
    fogVisibility: true,
  },
};

interface Sample {
  at: number;
  frameMs: number;
}

export class ThreeDQualityController {
  tier: ThreeDQualityTier;
  private samples: Sample[] = [];
  private goodSince: number | null = null;
  private lastTierChange = Number.NEGATIVE_INFINITY;

  constructor(initial: ThreeDQualityTier = "high") {
    this.tier = initial;
  }

  get settings(): ThreeDQualitySettings {
    return SETTINGS[this.tier];
  }

  sample(frameMs: number, now = performance.now()): ThreeDQualityTier {
    if (!Number.isFinite(frameMs) || !Number.isFinite(now) || frameMs < 0) {
      return this.tier;
    }
    this.samples.push({ at: now, frameMs });
    const cutoff = now - 2000;
    while (this.samples.length > 0 && this.samples[0].at < cutoff)
      this.samples.shift();
    const average =
      this.samples.reduce((sum, sample) => sum + sample.frameMs, 0) /
      Math.max(1, this.samples.length);
    const hasFullWindow =
      this.samples.length > 1 && this.samples[0].at <= cutoff + 50;

    if (hasFullWindow && average > 23 && now - this.lastTierChange >= 1800) {
      this.tier = this.tier === "high" ? "medium" : "low";
      this.lastTierChange = now;
      this.goodSince = null;
      return this.tier;
    }

    if (average < 15) {
      this.goodSince ??= now;
      if (now - this.goodSince >= 5000 && this.tier !== "high") {
        this.tier = this.tier === "low" ? "medium" : "high";
        this.lastTierChange = now;
        this.goodSince = now;
      }
    } else {
      this.goodSince = null;
    }
    return this.tier;
  }
}
