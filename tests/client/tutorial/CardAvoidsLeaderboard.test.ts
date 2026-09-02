import { describe, expect, it } from "vitest";
import {
  Bounds,
  cardTopAvoiding,
} from "../../../src/client/hud/layers/TutorialGuide";

/**
 * The tutorial card sits centred at the top of the screen, which on a phone is
 * exactly where the leaderboard is, so the two were drawn over each other.
 *
 * The card moves rather than the leaderboard: the leaderboard is the player's
 * own readout and they chose to open it, while the card is something the game
 * is saying.
 */
const rect = (over: Partial<Bounds>): Bounds => ({
  top: 0,
  bottom: 0,
  left: 0,
  right: 0,
  height: 0,
  ...over,
});

// The card as the stylesheet places it on a 412px phone.
const card = rect({ top: 72, bottom: 258, left: 12, right: 400, height: 186 });

describe("keeping the tutorial card clear of the leaderboard", () => {
  it("leaves the card alone when the leaderboard is closed", () => {
    expect(cardTopAvoiding(card, undefined)).toBeNull();
    expect(cardTopAvoiding(card, rect({ height: 0 }))).toBeNull();
  });

  it("drops the card below a leaderboard sitting on top of it", () => {
    // The reported case: leaderboard top-left, card centred, both at the top.
    const board = rect({
      top: 8,
      bottom: 200,
      left: 8,
      right: 300,
      height: 192,
    });
    expect(cardTopAvoiding(card, board)).toBe(208);
  });

  it("leaves the card alone when the leaderboard is beside it, not over it", () => {
    // A wide desktop: the leaderboard is off to the left of a narrower card.
    const wideCard = rect({
      top: 72,
      bottom: 258,
      left: 600,
      right: 1000,
      height: 186,
    });
    const board = rect({
      top: 8,
      bottom: 400,
      left: 8,
      right: 380,
      height: 392,
    });
    expect(cardTopAvoiding(wideCard, board)).toBeNull();
  });

  it("leaves the card alone when the leaderboard ends above it", () => {
    const board = rect({ top: 0, bottom: 60, left: 8, right: 300, height: 60 });
    expect(cardTopAvoiding(card, board)).toBeNull();
  });

  it("follows the leaderboard as it grows with the players in it", () => {
    const short = rect({
      top: 8,
      bottom: 150,
      left: 8,
      right: 300,
      height: 142,
    });
    const tall = rect({
      top: 8,
      bottom: 430,
      left: 8,
      right: 300,
      height: 422,
    });
    expect(cardTopAvoiding(card, short)).toBe(158);
    expect(cardTopAvoiding(card, tall)).toBe(438);
  });

  it("returns a whole number of pixels", () => {
    const board = rect({
      top: 8,
      bottom: 200.4,
      left: 8,
      right: 300,
      height: 192.4,
    });
    const top = cardTopAvoiding(card, board);
    expect(top).not.toBeNull();
    expect(Number.isInteger(top)).toBe(true);
  });
});
