import { describe, expect, it } from "vitest";

import {
  THREE_D_WATER_HEIGHT,
  ThreeDSurfaceSampler,
} from "../../../src/client/render/gl/three-d/ThreeDSurfaceSampler";
import { threeDHeightForTerrainByte } from "../../../src/client/render/gl/three-d/ThreeDWorldMath";

describe("ThreeDSurfaceSampler", () => {
  it("uses the canonical terrain height at integer and interpolated positions", () => {
    const flat = new ThreeDSurfaceSampler(4, 4, () => 0x80 | 10);

    expect(flat.heightAt(0, 0)).toBeCloseTo(
      threeDHeightForTerrainByte(0x80 | 10),
      5,
    );
    const sampler = new ThreeDSurfaceSampler(
      4,
      4,
      (x, z) => 0x80 | (x + z === 2 ? 20 : 10),
    );
    expect(sampler.heightAt(1.5, 0.5)).toBeGreaterThan(
      threeDHeightForTerrainByte(0x80 | 10),
    );
  });

  it("uses the same fixed nine-tap surface at every terrain LOD", () => {
    const low = 0x80 | 4;
    const peak = 0x80 | 31;
    const sampler = new ThreeDSurfaceSampler(9, 9, (x, z) =>
      x === 4 && z === 4 ? peak : low,
    );

    const smoothedPeak = sampler.heightAt(4.5, 4.5);
    expect(smoothedPeak).toBeGreaterThan(threeDHeightForTerrainByte(low));
    expect(smoothedPeak).toBeLessThan(threeDHeightForTerrainByte(peak));
    expect(sampler.heightAt(4.5, 4.5)).toBe(smoothedPeak);
  });

  it("returns stable footprint support and a finite normalized surface normal", () => {
    const sampler = new ThreeDSurfaceSampler(
      8,
      8,
      (x, z) => 0x80 | Math.min(30, x + z),
    );
    const support = sampler.supportAt([
      { x: 2, z: 2 },
      { x: 4, z: 2 },
      { x: 2, z: 4 },
      { x: 4, z: 4 },
    ]);

    expect(Number.isFinite(support.height)).toBe(true);
    expect(
      Math.hypot(support.normal.x, support.normal.y, support.normal.z),
    ).toBeCloseTo(1, 5);
  });

  it("uses explicit water and flight altitude modes", () => {
    const sampler = new ThreeDSurfaceSampler(4, 4, () => 0x80 | 10);
    const ground = sampler.heightAt(1, 1);

    expect(sampler.altitudeFor("water", 1, 1, 0)).toBe(THREE_D_WATER_HEIGHT);
    expect(sampler.altitudeFor("ground", 1, 1, 0.2)).toBeCloseTo(ground + 0.2);
    expect(sampler.altitudeFor("flight", 1, 1, 12)).toBeCloseTo(ground + 12);
    expect(sampler.altitudeFor("trajectory", 1, 1, 18)).toBe(18);
  });
});
