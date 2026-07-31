import { afterEach, describe, expect, it } from "vitest";
import { showPage } from "../../src/client/Navigation";

function createPage(id: string, hidden = true): HTMLElement {
  const page = document.createElement("div");
  page.id = id;
  page.className = `page-content${hidden ? " hidden" : ""}`;
  document.body.appendChild(page);
  return page;
}

function createLegalPage(id: string, source: string): HTMLIFrameElement {
  const page = document.createElement("iframe");
  page.id = id;
  page.className = "page-content hidden";
  page.dataset.pageSrc = source;
  page.setAttribute("src", source);
  document.body.appendChild(page);
  return page;
}

describe("page navigation", () => {
  afterEach(() => {
    document.body.replaceChildren();
    window.currentPageId = undefined;
  });

  it("switches between both legal pages and returns to Play", () => {
    const play = document.createElement("div");
    play.id = "page-play";
    document.body.appendChild(play);
    const privacy = createLegalPage("page-privacy", "/privacy-policy.html");
    const terms = createLegalPage("page-terms", "/terms-of-service.html");

    showPage("page-privacy");
    expect(privacy.classList.contains("hidden")).toBe(false);
    expect(play.classList.contains("hidden")).toBe(true);

    showPage("page-terms");
    expect(privacy.classList.contains("hidden")).toBe(true);
    expect(terms.classList.contains("hidden")).toBe(false);
    expect(window.currentPageId).toBe("page-terms");

    showPage("page-play");
    expect(terms.classList.contains("hidden")).toBe(true);
    expect(play.classList.contains("hidden")).toBe(false);
  });

  it("restores a legal iframe that was navigated to the wrong document", () => {
    const play = document.createElement("div");
    play.id = "page-play";
    document.body.appendChild(play);
    const privacy = createLegalPage("page-privacy", "/privacy-policy.html");
    createPage("page-other");

    privacy.setAttribute("src", "/terms-of-service.html");
    showPage("page-privacy");

    expect(privacy.getAttribute("src")).toBe("/privacy-policy.html");
    expect(privacy.classList.contains("hidden")).toBe(false);
  });
});
