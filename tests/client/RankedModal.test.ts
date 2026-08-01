import { afterEach, describe, expect, it } from "vitest";
import { RankedModal } from "../../src/client/components/RankedModal";

afterEach(() => {
  document.body.replaceChildren();
});

describe("RankedModal", () => {
  it("presents OpenBack-styled teammate and friend-party choices", async () => {
    const modal = new RankedModal();
    Object.assign(modal, {
      isModalOpen: true,
      userMeResponse: false,
      elo: 0,
    });
    document.body.append(modal);
    await modal.updateComplete;

    const buttons = modal.querySelectorAll("o-button");
    expect(buttons).toHaveLength(7);
    expect(modal.textContent).toContain("matchmaking_modal.ranked_solo");
    expect(modal.textContent).toContain(
      "matchmaking_modal.ranked_with_friends",
    );
    expect(modal.textContent).toContain(
      "matchmaking_modal.team_choice_description",
    );
  });
});
