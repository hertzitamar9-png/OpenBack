import { describe, expect, it } from "vitest";
import { ThreeDQualityController } from "../../../src/client/render/gl/three-d/ThreeDQuality";

describe("ThreeDQualityController", () => {
  it("does not change quality for one slow frame", () => {
    const quality = new ThreeDQualityController("high");
    quality.sample(80, 0);
    expect(quality.tier).toBe("high");
  });

  it("reduces presentation cost only after a sustained slow window", () => {
    const quality = new ThreeDQualityController("high");
    for (let time = 0; time <= 2400; time += 20) quality.sample(28, time);
    expect(quality.tier).toBe("medium");
    expect(quality.settings.labels).toBe(true);
    expect(quality.settings.paths).toBe(true);
  });

  it("requires five stable seconds before recovering", () => {
    const quality = new ThreeDQualityController("medium");
    for (let time = 0; time < 4900; time += 16) quality.sample(12, time);
    expect(quality.tier).toBe("medium");
    quality.sample(12, 5100);
    expect(quality.tier).toBe("high");
  });
});
