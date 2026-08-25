import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("friends realtime UI", () => {
  const source = readFileSync("src/client/components/FriendsList.ts", "utf8");

  it("uses server display names and mounts persistent chat", () => {
    expect(source).toContain("entry.displayName ?? entry.username");
    expect(source).toMatch(
      /document\.addEventListener\(\s*"social-friends-changed"/,
    );
    expect(source).toContain("<social-chat");
    expect(source).toContain('new CustomEvent("open-friend-chat"');
  });
});
