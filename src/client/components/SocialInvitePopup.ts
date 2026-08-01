import { html, LitElement } from "lit";
import { customElement, state } from "lit/decorators.js";
import { getLastUserMe } from "../Api";
import { socialAttention } from "../SocialAttention";
import { socialClient, type PendingSocialInvite } from "../SocialClient";
import { translateText } from "../Utils";

@customElement("social-invite-popup")
export class SocialInvitePopup extends LitElement {
  @state() private invite: PendingSocialInvite | null = null;
  private hiddenIds = new Set<string>();
  private timer: number | null = null;
  private readonly listener = (event: Event) => {
    const me = getLastUserMe();
    const myId = me ? me.player.publicId : undefined;
    const incoming = (
      (event as CustomEvent<PendingSocialInvite[]>).detail ?? []
    ).filter((item) => item.to === myId && !this.hiddenIds.has(item.id));
    socialAttention.syncInvites(
      (event as CustomEvent<PendingSocialInvite[]>).detail ?? [],
    );
    if (this.invite && incoming.some((item) => item.id === this.invite!.id))
      return;
    this.show(incoming[0] ?? null);
  };

  createRenderRoot() {
    return this;
  }
  connectedCallback(): void {
    super.connectedCallback();
    document.addEventListener("social-invites-changed", this.listener);
  }
  disconnectedCallback(): void {
    document.removeEventListener("social-invites-changed", this.listener);
    if (this.timer !== null) window.clearTimeout(this.timer);
    super.disconnectedCallback();
  }
  private show(invite: PendingSocialInvite | null): void {
    if (this.timer !== null) window.clearTimeout(this.timer);
    this.invite = invite;
    if (!invite) return;
    this.timer = window.setTimeout(() => {
      this.hiddenIds.add(invite.id);
      this.invite = null;
      socialAttention.deferInvite(invite.id);
    }, 5000);
  }
  private label(invite: PendingSocialInvite): string {
    return translateText(
      invite.payload.kind === "party"
        ? "friends.party_invite_received"
        : invite.payload.kind === "lobby"
          ? "friends.lobby_invite_received"
          : "friends.ranked_invite_received",
      { player: invite.fromName },
    );
  }
  render() {
    if (!this.invite) return html``;
    const invite = this.invite;
    return html`<aside
      class="fixed right-4 top-4 z-[11000] w-[min(420px,calc(100vw-2rem))] rounded-xl border border-malibu-blue/40 bg-[#071426] p-4 shadow-2xl"
    >
      <div class="mb-3 text-sm font-bold text-white">${this.label(invite)}</div>
      <div class="grid grid-cols-2 gap-3">
        <button
          class="h-10 rounded-lg bg-malibu-blue text-xs font-black uppercase text-white hover:bg-aquarius"
          @click=${() => {
            socialClient.acceptInvite(invite);
            this.show(null);
          }}
        >
          ${translateText("friends.accept")}
        </button>
        <button
          class="h-10 rounded-lg bg-red-600 text-xs font-black uppercase text-white hover:bg-red-500"
          @click=${() => {
            socialClient.respondToInvite(invite.id, false);
            this.show(null);
          }}
        >
          ${translateText("friends.deny")}
        </button>
      </div>
    </aside>`;
  }
}
