import { html } from "lit";
import { customElement, state } from "lit/decorators.js";
import { UserMeResponse } from "../../core/ApiSchemas";
import { getUserMe, hasLinkedAccount } from "../Api";
import { userAuth } from "../Auth";
import { crazyGamesSDK } from "../CrazyGamesSDK";
import { translateText } from "../Utils";
import { BaseModal } from "./BaseModal";
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
  }

  disconnectedCallback() {
    document.removeEventListener(
      "userMeResponse",
      this.handleUserMeResponse as EventListener,
    );
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
        this.userMeResponse.player.leaderboard?.oneVone?.elo
          ? this.userMeResponse.player.leaderboard.oneVone.elo
          : translateText("matchmaking_modal.no_elo");
    }
  }

  protected override async onOpen(): Promise<void> {
    this.elo = "...";
    this.errorMessage = null;

    try {
      const userMe = await getUserMe();
      this.userMeResponse = userMe;
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
      <div class="custom-scrollbar p-6">
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
      </div>
    `;
  }

  private renderTeamCard(title: string, teamSize: 2 | 3 | 4) {
    return html`
      <div
        class="flex min-h-32 flex-col items-center justify-center gap-3 rounded-2xl bg-surface p-5"
      >
        <h3
          class="text-lg sm:text-xl font-bold text-white uppercase tracking-widest leading-tight"
        >
          ${title}
        </h3>
        <div class="grid w-full grid-cols-2 gap-2">
          <button
            class="rounded-lg bg-blue-600 px-3 py-2 text-xs font-black uppercase tracking-wider text-white transition-colors hover:bg-blue-500"
            @click=${() => this.handleRanked(teamSize, false)}
          >
            ${translateText("matchmaking_modal.ranked_solo")}
          </button>
          <button
            class="rounded-lg bg-cyan-700 px-3 py-2 text-xs font-black uppercase tracking-wider text-white transition-colors hover:bg-cyan-600"
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
      <button
        @click=${onClick}
        class="flex flex-col w-full h-28 sm:h-32 rounded-2xl bg-surface border-0 transition-transform hover:scale-[1.02] active:scale-[0.98] p-6 items-center justify-center gap-3"
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
      </button>
    `;
  }

  private async handleRanked(teamSize: 1 | 2 | 3 | 4 = 1, withFriends = false) {
    if ((await userAuth()) === false) {
      this.close();
      window.showPage?.("page-account");
      return;
    }

    document.dispatchEvent(
      new CustomEvent("open-matchmaking", {
        detail: { teamSize, withFriends },
      }),
    );
  }
}
