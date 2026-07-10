import { afterEach, describe, expect, it, vi } from "vitest";
import { sendCodeEmail } from "../../src/server/auth/AuthServer";

describe("auth email delivery", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    delete process.env.BREVO_API_KEY;
    delete process.env.BREVO_SENDER_EMAIL;
    delete process.env.BREVO_SENDER_NAME;
  });

  it("sends login codes through Brevo's HTTPS API", async () => {
    process.env.BREVO_API_KEY = "test-api-key";
    process.env.BREVO_SENDER_EMAIL = "login@example.com";
    process.env.BREVO_SENDER_NAME = "OpenBack";
    const fetchMock = vi
      .fn()
      .mockResolvedValue(new Response(null, { status: 201 }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      sendCodeEmail("player@example.net", "123456"),
    ).resolves.toBeNull();

    expect(fetchMock).toHaveBeenCalledOnce();
    const [url, options] = fetchMock.mock.calls[0];
    expect(url).toBe("https://api.brevo.com/v3/smtp/email");
    expect(options.headers["api-key"]).toBe("test-api-key");
    expect(JSON.parse(options.body)).toMatchObject({
      sender: { email: "login@example.com", name: "OpenBack" },
      to: [{ email: "player@example.net" }],
      textContent: expect.stringContaining("123456"),
    });
  });

  it("rejects failed provider responses", async () => {
    process.env.BREVO_API_KEY = "test-api-key";
    process.env.BREVO_SENDER_EMAIL = "login@example.com";
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response(null, { status: 401 })),
    );

    await expect(sendCodeEmail("player@example.net", "123456")).rejects.toThrow(
      "Brevo email API returned 401",
    );
  });
});
