import { html } from "lit";
import { customElement, state } from "lit/decorators.js";
import { UserMeResponse } from "../../core/ApiSchemas";
import type { ExperienceMode } from "../../core/Schemas";
import { getUserMe, hasLinkedAccount } from "../Api";
import { appRouter } from "../AppRouter";
import { userAuth } from "../Auth";
import { crazyGamesSDK } from "../CrazyGamesSDK";
import { requireLifetimeAccess } from "../LifetimeAccess";
import { socialClient, type GlobalPartyState } from "../SocialClient";
import { translateText } from "../Utils";
import { BaseModal } from "./BaseModal";
import "./baseComponents/Button";
import { modalHeader } from "./ui/ModalHeader";

@customElement("ranked-modal")
export class RankedModal extends BaseModal {
  protected routerName = "ranked";

  @state() private elo: number | string = "...";
  @state() private userMeResponse: UserMeResponse | false = false;
  @state() private errorMessage: string | null = null;
  // CrazyGames players authenticate through the SDK, not a linked
  // Discord/Google/email account, so track that separately for ranked.
  @state() private crazyGamesSignedIn = false;
  @state() private party: GlobalPartyState | null = socialClient.getParty();
  private experienceMode: ExperienceMode = "2d";
  private readonly partyListener = (event: Event) => {
    this.party = (event as CustomEvent<GlobalPartyState | null>).detail;
  };

  // Eligible to see/play ranked: a linked account or a signed-in CrazyGames one.
  private isRankedEligible(): boolean {
    return hasLinkedAccount(this.userMeResponse) || this.crazyGamesSignedIn;
  }

  constructor() {
    super();
    this.id = "page-ranked";
  }

  connectedCallback() {
    super.connectedCallback();
    document.addEventListener(
      "userMeResponse",
      this.handleUserMeResponse as EventListener,
    );
    document.addEventListener("social-party-changed", this.partyListener);
  }

  disconnectedCallback() {
    document.removeEventListener(
      "userMeResponse",
      this.handleUserMeResponse as EventListener,
    );
    document.removeEventListener("social-party-changed", this.partyListener);
    super.disconnectedCallback();
  }

  private handleUserMeResponse = (
    event: CustomEvent<UserMeResponse | false>,
  ) => {
    this.errorMessage = null;
    this.userMeResponse = event.detail;
    this.updateElo();
  };

  private updateElo() {
    if (this.errorMessage) {
      this.elo = translateText("map_component.error");
      return;
    }

    if (this.isRankedEligible()) {
      this.elo =
        this.userMeResponse &&
        this.userMeResponse.player.leaderboard?.experiences?.[
          this.experienceMode
        ]?.["1v1"]?.elo
          ? this.userMeResponse.player.leaderboard.experiences[
              this.experienceMode
            ]!["1v1"]!.elo
          : translateText("matchmaking_modal.no_elo");
    }
  }

  protected override async onOpen(
    args?: Record<string, unknown>,
  ): Promise<void> {
    this.experienceMode = args?.experienceMode === "3d" ? "3d" : "2d";
    this.elo = "...";
    this.errorMessage = null;

    try {
      const userMe = await getUserMe();
      this.userMeResponse = userMe;
      if (!(await requireLifetimeAccess("ranked"))) {
        this.close();
        return;
      }
      this.crazyGamesSignedIn =
        crazyGamesSDK.isOnCrazyGames() &&
        (await crazyGamesSDK.getUserProfile()) !== null;
    } catch (error) {
      console.error("Failed to fetch user profile for ranked modal", error);
      this.userMeResponse = false;
      this.errorMessage = translateText("map_component.error");
      this.elo = translateText("map_component.error");
    } finally {
      this.updateElo();
    }
  }

  createRenderRoot() {
    return this;
  }

  protected renderHeaderSlot() {
    return modalHeader({
      title: translateText("mode_selector.ranked_title"),
      onBack: () => this.close(),
      ariaLabel: translateText("common.back"),
    });
  }

  protected renderBody() {
    return html`
      <div class="custom-scrollbar p-4 sm:p-6">
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          ${this.renderCard(
            translateText("mode_selector.ranked_1v1_title"),
            this.errorMessage ??
              (this.isRankedEligible()
                ? translateText("matchmaking_modal.elo", { elo: this.elo })
                : translateText("mode_selector.ranked_title")),
            () => this.handleRanked(),
          )}
          ${this.renderTeamCard(
            translateText("mode_selector.ranked_2v2_title"),
            2,
          )}
          ${this.renderTeamCard(
            translateText("matchmaking_modal.ranked_3v3_title"),
            3,
          )}
          ${this.renderTeamCard(
            translateText("matchmaking_modal.ranked_4v4_title"),
            4,
          )}
        </div>
        <p class="mt-6 text-xs text-white/60 leading-relaxed text-center">
          ${translateText("mode_selector.ranked_pairing_note")}
        </p>
      </div>
    `;
  }

  private renderTeamCard(title: string, teamSize: 2 | 3 | 4) {
    const choiceButtonClass =
      "flex h-14 w-full items-center justify-center rounded-lg px-3 " +
      "text-center text-sm font-medium uppercase tracking-wider text-white " +
      "transition-all duration-200 active:scale-[0.98]";
    return html`
      <div
        class="flex min-h-44 flex-col gap-4 rounded-2xl border border-white/10 bg-surface p-5 shadow-lg"
      >
        <div class="text-center">
          <h3
            class="text-lg sm:text-xl font-bold text-white uppercase tracking-widest leading-tight"
          >
            ${title}
          </h3>
          <p class="mt-1 text-xs leading-relaxed text-white/55">
            ${translateText("matchmaking_modal.team_choice_description")}
          </p>
        </div>
        <div class="mt-auto grid w-full grid-cols-2 gap-3">
          <button
            data-ranked-choice="teammates"
            class="${choiceButtonClass} bg-malibu-blue hover:bg-aquarius"
            @click=${() => this.handleRanked(teamSize, false)}
          >
            ${translateText("matchmaking_modal.ranked_solo")}
          </button>
          <button
            data-ranked-choice="friends"
            class="${choiceButtonClass} bg-gray-700 hover:bg-gray-600 hover:shadow-[var(--shadow-action-card-hover)]"
            @click=${() => this.handleRanked(teamSize, true)}
          >
            ${translateText("matchmaking_modal.ranked_with_friends")}
          </button>
        </div>
      </div>
    `;
  }

  private renderCard(title: string, subtitle: string, onClick: () => void) {
    return html`
      <div
        class="flex min-h-44 flex-col items-center justify-center gap-4 rounded-2xl border border-white/10 bg-surface p-5 shadow-lg"
      >
        <div class="flex flex-col items-center gap-1 text-center">
          <h3
            class="text-lg sm:text-xl font-bold text-white uppercase tracking-widest leading-tight"
          >
            ${title}
          </h3>
          <p
            class="text-xs text-white/60 uppercase tracking-wider whitespace-pre-line leading-tight"
          >
            ${subtitle}
          </p>
        </div>
        <o-button
          variant="primary"
          size="md"
          width="block"
          .title=${translateText("matchmaking_modal.find_1v1_match")}
          @click=${onClick}
        ></o-button>
      </div>
    `;
  }

  private async handleRanked(teamSize: 1 | 2 | 3 | 4 = 1, withFriends = false) {
    if (!(await requireLifetimeAccess("ranked"))) return;
    if ((await userAuth()) === false) {
      this.close();
      void appRouter.navigate({ pageId: "page-account" });
      return;
    }

    const activeParty = socialClient.getParty();
    if (activeParty && activeParty.members.length > teamSize) {
      this.errorMessage = translateText("matchmaking_modal.party_too_large", {
        count: activeParty.members.length,
        size: teamSize,
      });
      return;
    }
    if (activeParty && teamSize > 1 && !withFriends) {
      this.errorMessage = translateText("matchmaking_modal.use_friend_party");
      return;
    }

    if (withFriends) {
      const party = activeParty;
      if (!party || party.members.length < 2) {
        this.errorMessage = translateText("matchmaking_modal.party_required");
        return;
      }
      if (party.members.length > teamSize) {
        this.errorMessage = translateText("matchmaking_modal.party_too_large", {
          count: party.members.length,
          size: teamSize,
        });
        return;
      }
      const myPublicId =
        this.userMeResponse && this.userMeResponse.player.publicId;
      if (party.leaderPublicId !== myPublicId) {
        this.errorMessage = translateText(
          "matchmaking_modal.party_leader_only",
        );
        return;
      }
    }

    document.dispatchEvent(
      new CustomEvent("open-matchmaking", {
        detail: {
          teamSize,
          experienceMode: this.experienceMode,
          withFriends,
          partyMembers: withFriends
            ? socialClient.getParty()?.members.map((member) => member.publicId)
            : [],
        },
      }),
    );
  }
}
