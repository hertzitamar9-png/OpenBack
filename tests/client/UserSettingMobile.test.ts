import { render } from "lit";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const matchMedia = vi.fn();
vi.stubGlobal("matchMedia", matchMedia);

import { UserSettingModal } from "../../src/client/UserSettingModal";

function setInput(queries: string[]) {
  matchMedia.mockImplementation((query: string) => ({
    matches: queries.includes(query),
  }));
}

function languageFixture() {
  const language = document.createElement("lang-selector") as HTMLElement & {
    currentLang: string;
    translations: Record<string, string>;
    defaultTranslations: Record<string, string>;
  };
  language.currentLang = "en";
  language.translations = {
    "user_setting.tab_basic": "Basic Settings",
    "user_setting.tab_keybinds": "Keybinds",
    "user_setting.tap_menu_label": "Tap to Open Menu",
    "user_setting.tap_menu_desc": "Tap your territory to open its actions.",
    "user_setting.mobile_controls_title": "Mobile Controls",
    "user_setting.mobile_controls_desc":
      "Drag to move. Pinch to zoom. Two fingers rotate 3D.",
    "user_setting.build_bar_descriptions_label": "Build unit descriptions",
    "user_setting.build_bar_descriptions_desc":
      "Show selected unit information above the build bar.",
  };
  language.defaultTranslations = language.translations;
  document.body.appendChild(language);
}

describe("mobile settings presentation", () => {
  beforeEach(() => {
    matchMedia.mockReset();
    languageFixture();
  });
  afterEach(() => document.body.replaceChildren());

  it("shows touch wording and hides keybinds on a touch-only phone", () => {
    setInput(["(pointer: coarse)"]);
    const modal = new UserSettingModal();
    const config = (
      modal as unknown as { modalConfig(): { tabs: { key: string }[] } }
    ).modalConfig();
    const host = document.createElement("div");
    render(
      (
        modal as unknown as { renderBasicSettings(): ReturnType<typeof render> }
      ).renderBasicSettings(),
      host,
    );

    expect(config.tabs.map((tab) => tab.key)).toEqual(["basic"]);
    expect(
      host.querySelector("#left-click-toggle")?.getAttribute("label"),
    ).toBe("Tap to Open Menu");
    expect(host.textContent).toContain("Mobile Controls");
    expect(
      host
        .querySelector("#build-bar-descriptions-toggle")
        ?.getAttribute("label"),
    ).toBe("Build unit descriptions");
  });

  it("retains keybinds on a hybrid touch device", () => {
    setInput(["(pointer: coarse)", "(any-pointer: fine)"]);
    const modal = new UserSettingModal();
    const config = (
      modal as unknown as { modalConfig(): { tabs: { key: string }[] } }
    ).modalConfig();

    expect(config.tabs.map((tab) => tab.key)).toEqual(["basic", "keybinds"]);
  });
});
