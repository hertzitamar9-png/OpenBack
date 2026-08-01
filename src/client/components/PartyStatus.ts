import { html, LitElement } from "lit";
import { customElement, state } from "lit/decorators.js";
import { socialClient, type GlobalPartyState } from "../SocialClient";
import { translateText } from "../Utils";

@customElement("party-status")
export class PartyStatus extends LitElement {
  @state() private party: GlobalPartyState | null = socialClient.getParty();
  private readonly listener = (event: Event) => {
    this.party = (event as CustomEvent<GlobalPartyState | null>).detail;
  };

  createRenderRoot() {
    return this;
  }
  connectedCallback(): void {
    super.connectedCallback();
    document.addEventListener("social-party-changed", this.listener);
  }
  disconnectedCallback(): void {
    document.removeEventListener("social-party-changed", this.listener);
    super.disconnectedCallback();
  }
  render() {
    if (!this.party || this.party.members.length < 2) return html``;
    return html`<div
      class="flex max-w-64 items-center gap-2 rounded-full border border-cyan-400/25 bg-cyan-400/10 px-3 py-2 text-[10px] text-white/75"
    >
      <span class="font-black uppercase tracking-wider text-cyan-300"
        >${translateText("friends.active_party")}</span
      >
      <span class="truncate"
        >${this.party.members
          .map((member) => member.displayName)
          .join(", ")}</span
      >
      <button
        class="ml-auto font-black text-red-300 hover:text-red-200"
        @click=${() => socialClient.leaveParty()}
        aria-label=${translateText("friends.leave_party")}
      >
        ×
      </button>
    </div>`;
  }
}
