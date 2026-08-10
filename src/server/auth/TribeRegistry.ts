import crypto from "node:crypto";
import { profanityMatcher } from "../Censor";

const DAY_MS = 86_400_000;
const WINDOW_DAYS = 30;

export type StoredTribeStatus = "pending" | "live" | "rejected" | "revoked";

export interface StoredTribeBoost {
  id: string;
  idempotencyKey: string;
  createdAt: string;
  expiresAt: string;
  pricePaid: string;
}

export interface StoredTribeAppearance {
  gameId: string;
  occurredAt: string;
  playerReach: number;
}

export interface StoredTribeName {
  id: string;
  displayName: string;
  normalizedName: string;
  ownerPublicId: string;
  status: StoredTribeStatus;
  reviewReason: string | null;
  createdAt: string;
  pricePaid: string;
  boosts: StoredTribeBoost[];
  appearances: StoredTribeAppearance[];
}

export interface TribeOwner {
  publicId: string;
  username: string | null;
}

function normalizeDisplayName(value: string): string {
  return value.normalize("NFKC").trim().replace(/\s+/g, " ");
}

function normalizedKey(value: string): string {
  return normalizeDisplayName(value).toLocaleLowerCase("en-US");
}

function active(tribe: StoredTribeName): boolean {
  return tribe.status === "pending" || tribe.status === "live";
}

function dateOnly(timestamp: number): string {
  return new Date(timestamp).toISOString().slice(0, 10);
}

function activeBoosts(tribe: StoredTribeName, now: number): StoredTribeBoost[] {
  return tribe.boosts.filter(
    (boost) => new Date(boost.expiresAt).getTime() > now,
  );
}

function figures(appearances: StoredTribeAppearance[]) {
  return {
    gamesAppeared: appearances.length,
    playerReach: appearances.reduce(
      (total, appearance) => total + appearance.playerReach,
      0,
    ),
  };
}

/** Persistent authoritative registry behind every visible Tribe surface. */
export class TribeRegistry {
  private readonly tribes: StoredTribeName[];

  constructor(stored: StoredTribeName[] = []) {
    this.tribes = structuredClone(stored);
  }

  serialize(): StoredTribeName[] {
    return structuredClone(this.tribes);
  }

  purchase(
    ownerPublicId: string,
    requestedName: string,
    pricePaid: string,
    now = Date.now(),
  ): StoredTribeName {
    const displayName = normalizeDisplayName(requestedName);
    if (displayName.length < 2 || displayName.length > 64) {
      throw new Error("invalid_length");
    }
    if (!/^[\p{L}\p{N}][\p{L}\p{N} ._'’-]*[\p{L}\p{N}]$/u.test(displayName)) {
      throw new Error("invalid_characters");
    }
    if (profanityMatcher.hasMatch(displayName)) {
      throw new Error("inappropriate");
    }
    const key = normalizedKey(displayName);
    if (this.tribes.some((tribe) => tribe.normalizedName === key)) {
      throw new Error("duplicate");
    }
    const tribe: StoredTribeName = {
      id: crypto.randomUUID(),
      displayName,
      normalizedName: key,
      ownerPublicId,
      status: "pending",
      reviewReason: null,
      createdAt: new Date(now).toISOString(),
      pricePaid,
      boosts: [],
      appearances: [],
    };
    this.tribes.push(tribe);
    return structuredClone(tribe);
  }

  listOwned(ownerPublicId: string, now = Date.now()) {
    return this.tribes
      .filter((tribe) => tribe.ownerPublicId === ownerPublicId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .map((tribe) => {
        const boosts = activeBoosts(tribe, now);
        return {
          id: tribe.id,
          displayName: tribe.displayName,
          status: tribe.status,
          reviewReason: tribe.reviewReason,
          activeBoosts: boosts.length,
          boostExpiresAt:
            boosts.length === 0
              ? null
              : boosts
                  .map((boost) => boost.expiresAt)
                  .sort((a, b) => a.localeCompare(b))[0],
        };
      });
  }

  boost(
    tribeId: string,
    idempotencyKey: string,
    pricePaid: string,
    durationDays: number,
    now = Date.now(),
  ): StoredTribeBoost {
    const tribe = this.tribes.find((candidate) => candidate.id === tribeId);
    if (!tribe || !active(tribe)) throw new Error("not_found");
    const existing = tribe.boosts.find(
      (boost) => boost.idempotencyKey === idempotencyKey,
    );
    if (existing) return structuredClone(existing);
    const boost: StoredTribeBoost = {
      id: crypto.randomUUID(),
      idempotencyKey,
      createdAt: new Date(now).toISOString(),
      expiresAt: new Date(now + durationDays * DAY_MS).toISOString(),
      pricePaid,
    };
    tribe.boosts.push(boost);
    return structuredClone(boost);
  }

  isOwnedActive(tribeId: string, ownerPublicId: string): boolean {
    const tribe = this.tribes.find((candidate) => candidate.id === tribeId);
    return Boolean(
      tribe && tribe.ownerPublicId === ownerPublicId && active(tribe),
    );
  }

  boostByIdempotencyKey(
    tribeId: string,
    idempotencyKey: string,
  ): StoredTribeBoost | null {
    const tribe = this.tribes.find((candidate) => candidate.id === tribeId);
    const boost = tribe?.boosts.find(
      (candidate) => candidate.idempotencyKey === idempotencyKey,
    );
    return boost ? structuredClone(boost) : null;
  }

  removeOwner(ownerPublicId: string): void {
    for (let index = this.tribes.length - 1; index >= 0; index--) {
      if (this.tribes[index].ownerPublicId === ownerPublicId) {
        this.tribes.splice(index, 1);
      }
    }
  }

  ownerPublicIdFor(name: string): string | null {
    const tribe = this.tribes.find(
      (candidate) => candidate.normalizedName === normalizedKey(name),
    );
    return tribe && active(tribe) ? tribe.ownerPublicId : null;
  }

  recordGame(
    gameId: string,
    names: string[],
    playerReach: number,
    now = Date.now(),
  ): void {
    const uniqueNames = new Set(names.map(normalizedKey));
    for (const tribe of this.tribes) {
      if (!uniqueNames.has(tribe.normalizedName)) continue;
      if (
        tribe.appearances.some((appearance) => appearance.gameId === gameId)
      ) {
        continue;
      }
      tribe.appearances.push({
        gameId,
        occurredAt: new Date(now).toISOString(),
        playerReach: Math.max(0, Math.trunc(playerReach)),
      });
    }
  }

  stats(name: string, owner: TribeOwner | null, now = Date.now()) {
    const tribe = this.tribes.find(
      (candidate) => candidate.normalizedName === normalizedKey(name),
    );
    if (!tribe || !active(tribe) || !owner) return null;
    const windowStart = now - WINDOW_DAYS * DAY_MS;
    const windowAppearances = tribe.appearances.filter(
      (appearance) => new Date(appearance.occurredAt).getTime() >= windowStart,
    );
    return {
      name: tribe.displayName,
      ownerPublicId: owner.publicId,
      ownerUsername: owner.username,
      activeBoosts: activeBoosts(tribe, now).length,
      lifetime: figures(tribe.appearances),
      window: {
        days: WINDOW_DAYS,
        start: dateOnly(windowStart),
        end: dateOnly(now),
        ...figures(windowAppearances),
      },
    };
  }

  leaderboard(
    ownerFor: (publicId: string) => TribeOwner | null,
    page: number,
    now = Date.now(),
  ) {
    const windowStart = now - WINDOW_DAYS * DAY_MS;
    const ranked = this.tribes
      .filter(active)
      .flatMap((tribe) => {
        const owner = ownerFor(tribe.ownerPublicId);
        if (!owner) return [];
        const recent = tribe.appearances.filter(
          (appearance) =>
            new Date(appearance.occurredAt).getTime() >= windowStart,
        );
        return [{ tribe, owner, recent, totals: figures(recent) }];
      })
      .sort(
        (a, b) =>
          b.totals.playerReach - a.totals.playerReach ||
          b.totals.gamesAppeared - a.totals.gamesAppeared ||
          a.tribe.displayName.localeCompare(b.tribe.displayName),
      );
    const startIndex = (page - 1) * 50;
    return {
      windowDays: WINDOW_DAYS,
      start: dateOnly(windowStart),
      end: dateOnly(now),
      tribes: ranked.slice(startIndex, startIndex + 50).map((entry, index) => ({
        rank: startIndex + index + 1,
        name: entry.tribe.displayName,
        gamesAppeared: entry.totals.gamesAppeared,
        playerReach: entry.totals.playerReach,
        ownerPublicId: entry.owner.publicId,
        ownerUsername: entry.owner.username,
        activeBoosts: activeBoosts(entry.tribe, now).length,
      })),
    };
  }

  pool(ownerPublicIds: string[], now = Date.now()) {
    const ownerSet = new Set(ownerPublicIds);
    const ownerNames = this.tribes.filter(
      (tribe) => active(tribe) && ownerSet.has(tribe.ownerPublicId),
    );
    const globalNames = this.tribes.filter(
      (tribe) => active(tribe) && !ownerSet.has(tribe.ownerPublicId),
    );
    const pick = (source: StoredTribeName[], limit: number) => {
      const remaining = [...source];
      const selected: StoredTribeName[] = [];
      while (remaining.length > 0 && selected.length < limit) {
        const weights = remaining.map(
          (tribe) => 1 + activeBoosts(tribe, now).length,
        );
        const total = weights.reduce((sum, weight) => sum + weight, 0);
        let cursor = Math.random() * total;
        let index = 0;
        for (; index < weights.length - 1; index++) {
          cursor -= weights[index];
          if (cursor < 0) break;
        }
        selected.push(remaining.splice(index, 1)[0]);
      }
      return selected;
    };
    return [...pick(ownerNames, 10), ...pick(globalNames, 10)].map((tribe) => ({
      name: tribe.displayName,
      customTribeNameId: tribe.id,
      ownerPublicId: tribe.ownerPublicId,
    }));
  }
}
