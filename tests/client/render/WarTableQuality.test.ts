import { describe, expect, it } from "vitest";
import { WarTableQualityController } from "../../../src/client/render/gl/war-table/WarTableQuality";

describe("Living War Table adaptive quality", () => {
  it("requires sustained load and a transition cooldown", () => {
    const controller = new WarTableQualityController(false);
    controller.sample(40, 0);
    expect(controller.current().particleScale).toBe(1);
    for (let i = 1; i <= 120; i++) controller.sample(24, i * 16);
    expect(controller.current().particleScale).toBeLessThan(1);
    const dropped = controller.current().particleScale;
    controller.sample(8, 2_000);
    expect(controller.current().particleScale).toBe(dropped);
  });

  it("recovers only after a long stable window", () => {
    const controller = new WarTableQualityController(true);
    for (let i = 0; i <= 130; i++) controller.sample(28, i * 16);
    const low = controller.current().particleScale;
    for (let i = 0; i < 400; i++) controller.sample(8, 6_000 + i * 16);
    expect(controller.current().particleScale).toBe(low);
    for (let i = 400; i < 560; i++) controller.sample(8, 6_000 + i * 16);
    expect(controller.current().particleScale).toBeGreaterThanOrEqual(low);
  });
});
