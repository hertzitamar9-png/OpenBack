import { afterEach, describe, expect, test } from "vitest";
import { OwnerAnalyticsModal } from "../../src/client/OwnerAnalyticsModal";
import type { OwnerAnalyticsResponse } from "../../src/core/ApiSchemas";

const breakdown = [
  { key: "Free For All", games: 2, playSeconds: 900, players: 1 },
];

function analyticsFixture(): OwnerAnalyticsResponse {
  return {
    measuredAt: new Date().toISOString(),
    totals: {
      onlinePlayers: 1,
      registeredPlayers: 1,
      completedMatches: 2,
      playerGameSessions: 2,
      playersWithGames: 1,
      totalPlaySeconds: 900,
      returningPlayers: 1,
    },
    activePlayers: { day: 1, week: 1, month: 1 },
    registrations: { day: 0, week: 1, month: 1 },
    gameTypes: breakdown,
    gameModes: breakdown,
    experiences: [{ key: "2D", games: 2, playSeconds: 900, players: 1 }],
    players: [
      {
        publicId: "Player123",
        username: "Commander",
        createdAt: new Date().toISOString(),
        lastSeenAt: new Date().toISOString(),
        online: true,
        gamesPlayed: 2,
        playSeconds: 900,
        wins: 1,
        favoriteMode: "Free For All",
        email: "commander@example.com",
        selectedFlag: "/flags/test.svg",
        approximateCountry: "IL",
        selectedCosmetic: "pattern:test",
        clans: [{ tag: "OB", name: "OpenBack" }],
        hasProfilePicture: true,
        losses: 1,
        incompleteGames: 0,
        averageGameSeconds: 450,
        firstGameAt: new Date().toISOString(),
        lastGameAt: new Date().toISOString(),
        modeBreakdown: breakdown,
        typeBreakdown: breakdown,
        experienceBreakdown: breakdown,
        mapBreakdown: [
          { key: "World", games: 2, playSeconds: 900, players: 1 },
        ],
      },
    ],
  } as OwnerAnalyticsResponse;
}

describe("OwnerAnalyticsModal", () => {
  afterEach(() => document.body.replaceChildren());

  test("expands a player into private identity and usage details", async () => {
    const modal = new OwnerAnalyticsModal();
    modal.inline = true;
    Object.assign(modal as unknown as Record<string, unknown>, {
      analytics: analyticsFixture(),
      loading: false,
      failed: false,
    });
    document.body.appendChild(modal);
    await modal.updateComplete;

    const row = modal.querySelector<HTMLElement>(
      '[data-analytics-player="Player123"]',
    );
    expect(row).not.toBeNull();
    row!.click();
    await modal.updateComplete;

    const detail = modal.querySelector<HTMLElement>(
      '[data-analytics-detail="Player123"]',
    );
    expect(detail?.textContent).toContain("commander@example.com");
    expect(detail?.textContent).toContain("IL");
    expect(detail?.textContent).toContain("/flags/test.svg");
    expect(detail?.textContent).toContain("OpenBack");
    expect(detail?.textContent).toContain("World");
  });
});
