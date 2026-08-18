/**
 * "Sign up" and "Log in" have to mean what they say.
 *
 * Every signed-out visitor is handed an anonymous account on page load, so a
 * rule that made an exception for "has a guest session" applied to literally
 * everyone — and Log in accepted addresses that had never registered.
 */
import { describe, expect, it } from "vitest";
import { planAuthCode } from "../src/server/auth/AuthServer";

describe("who may be sent a code", () => {
  it("lets a new address sign up", () => {
    expect(planAuthCode({ mode: "signup", accountExists: false })).toEqual({
      action: "send",
    });
  });

  it("lets a registered address log in", () => {
    expect(planAuthCode({ mode: "login", accountExists: true })).toEqual({
      action: "send",
    });
  });

  it("refuses to log in an address that never signed up", () => {
    expect(planAuthCode({ mode: "login", accountExists: false })).toEqual({
      action: "reject",
      error: "not_registered",
      nextAction: "signup",
    });
  });

  it("refuses to sign up an address that already exists", () => {
    expect(planAuthCode({ mode: "signup", accountExists: true })).toEqual({
      action: "reject",
      error: "account_exists",
      nextAction: "login",
    });
  });

  it("points each refusal at the flow that would work", () => {
    const login = planAuthCode({ mode: "login", accountExists: false });
    const signup = planAuthCode({ mode: "signup", accountExists: true });
    expect(login).toMatchObject({ nextAction: "signup" });
    expect(signup).toMatchObject({ nextAction: "login" });
  });
});
