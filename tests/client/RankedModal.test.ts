import { afterEach, describe, expect, it } from "vitest";
import { RankedModal } from "../../src/client/components/RankedModal";

afterEach(() => {
  document.body.replaceChildren();
});

describe("RankedModal", () => {
  it("allows a guest profile to play ranked without linking an account", () => {
    const modal = new RankedModal();
    Reflect.set(modal, "userMeResponse", {
      user: {},
      player: { publicId: "guest" },
    });
    expect(Reflect.get(modal, "isRankedEligible").call(modal)).toBe(true);
    Reflect.set(modal, "userMeResponse", false);
    expect(Reflect.get(modal, "isRankedEligible").call(modal)).toBe(false);
  });
  it("presents OpenBack-styled teammate and friend-party choices", async () => {
    const modal = new RankedModal();
    Object.assign(modal, {
      isModalOpen: true,
      userMeResponse: false,
      elo: 0,
    });
    document.body.append(modal);
    await modal.updateComplete;

    const choiceButtons = modal.querySelectorAll<HTMLButtonElement>(
      "button[data-ranked-choice]",
    );
    expect(choiceButtons).toHaveLength(6);
    expect(
      [...choiceButtons].every(
        (button) =>
          button.classList.contains("h-14") &&
          button.classList.contains("rounded-lg") &&
          button.classList.contains("text-sm"),
      ),
    ).toBe(true);
    expect(modal.textContent).toContain("matchmaking_modal.ranked_solo");
    expect(modal.textContent).toContain(
      "matchmaking_modal.ranked_with_friends",
    );
    expect(modal.textContent).toContain(
      "matchmaking_modal.team_choice_description",
    );
  });
});
