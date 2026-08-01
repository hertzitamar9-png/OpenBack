import type { PendingSocialInvite } from "./SocialClient";

export type SocialAttentionStage = "none" | "profile" | "friends";

export class SocialAttention {
  private deferredInviteIds = new Set<string>();
  private stage: SocialAttentionStage = "none";

  getStage(): SocialAttentionStage {
    return this.stage;
  }

  deferInvite(inviteId: string): void {
    this.deferredInviteIds.add(inviteId);
    this.setStage(
      window.currentPageId === "page-account" ? "friends" : "profile",
    );
  }

  syncInvites(invites: PendingSocialInvite[]): void {
    const activeIds = new Set(invites.map((invite) => invite.id));
    for (const id of this.deferredInviteIds) {
      if (!activeIds.has(id)) this.deferredInviteIds.delete(id);
    }
    if (this.deferredInviteIds.size === 0) this.setStage("none");
  }

  profileOpened(): void {
    if (this.deferredInviteIds.size > 0) this.setStage("friends");
  }

  friendsOpened(): void {
    this.deferredInviteIds.clear();
    this.setStage("none");
  }

  private setStage(stage: SocialAttentionStage): void {
    if (this.stage === stage) return;
    this.stage = stage;
    document.dispatchEvent(
      new CustomEvent<SocialAttentionStage>("social-attention-changed", {
        detail: stage,
      }),
    );
  }
}

export const socialAttention = new SocialAttention();
