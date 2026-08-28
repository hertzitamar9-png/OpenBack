export function setMobileSidebarOpen(open: boolean): void {
  const sidebar = document.getElementById("sidebar-menu");
  const backdrop = document.getElementById("mobile-menu-backdrop");
  if (!sidebar || !backdrop) return;

  sidebar.classList.toggle("open", open);
  backdrop.classList.toggle("open", open);
  document.documentElement.classList.toggle("overflow-hidden", open);
  sidebar.setAttribute("aria-hidden", open ? "false" : "true");
  backdrop.setAttribute("aria-hidden", open ? "false" : "true");
  if (open) sidebar.setAttribute("aria-modal", "true");
  else sidebar.removeAttribute("aria-modal");
  document
    .getElementById("hamburger-btn")
    ?.setAttribute("aria-expanded", String(open));
}

export function toggleMobileSidebar(): void {
  const sidebar = document.getElementById("sidebar-menu");
  if (!sidebar) return;
  setMobileSidebarOpen(!sidebar.classList.contains("open"));
}

export function closeMobileSidebar(): void {
  setMobileSidebarOpen(false);
}

function restoreEmbeddedPage(target: HTMLElement): void {
  if (!(target instanceof HTMLIFrameElement)) return;

  const configuredSource = target.dataset.pageSrc;
  if (!configuredSource) return;

  let needsRestore = target.getAttribute("src") !== configuredSource;
  try {
    const expected = new URL(configuredSource, window.location.href);
    const current = target.contentWindow?.location;
    if (
      current &&
      (current.origin !== expected.origin ||
        current.pathname !== expected.pathname)
    ) {
      needsRestore = true;
    }
  } catch {
    // A cross-origin page was opened inside the frame. Restore our own page.
    needsRestore = true;
  }

  if (needsRestore) target.setAttribute("src", configuredSource);
}

export function showPage(pageId: string, args?: Record<string, unknown>) {
  window.currentPageId = pageId;
  document.body.classList.toggle(
    "openback-subpage-open",
    pageId !== "page-play",
  );
  document.body.classList.toggle("page-open", pageId !== "page-play");

  // Close mobile sidebar if a nav item was clicked
  closeMobileSidebar();

  // Close the currently visible modal properly
  const visibleModal = document.querySelector(".page-content:not(.hidden)");
  if (visibleModal) {
    // If it's an open modal component, call close() for proper cleanup (onClose callback, etc.)
    if (
      typeof (visibleModal as any).isOpen === "function" &&
      (visibleModal as any).isOpen() &&
      typeof (visibleModal as any).close === "function"
    ) {
      (visibleModal as any).close();
    } else {
      visibleModal.classList.add("hidden");
      visibleModal.classList.remove("block");
    }
  }

  // Handle page-play separately (it's not a page-content element)
  const pagePlayEl = document.getElementById("page-play");
  if (pageId === "page-play") {
    pagePlayEl?.classList.remove("hidden");
  } else {
    pagePlayEl?.classList.add("hidden");
  }

  // Show the target page if it's a modal
  if (pageId !== "page-play") {
    const target = document.getElementById(pageId);
    if (target) {
      restoreEmbeddedPage(target);
      target.classList.remove("hidden");
      // Modals need block display explicitly
      if (target.classList.contains("page-content")) {
        target.classList.add("block");
      }

      // If the target itself is a modal component with inline attribute, open it
      if (
        target.hasAttribute("inline") &&
        typeof (target as any).open === "function"
      ) {
        (target as any).open(args);
      }
    }
  }

  // Update active state on menu items
  document.querySelectorAll(".nav-menu-item").forEach((item) => {
    if ((item as HTMLElement).dataset.page === pageId) {
      item.classList.add("active");
    } else {
      item.classList.remove("active");
    }
  });

  // Dispatch CustomEvent to notify listeners of page change
  window.dispatchEvent(new CustomEvent("showPage", { detail: pageId }));
}

export function initNavigation() {
  window.showPage = showPage;

  // Use event delegation for navigation items (they may be inside Lit components)
  document.addEventListener("click", (e) => {
    const target = (e.target as HTMLElement).closest(
      ".nav-menu-item[data-page]",
    );
    if (target) {
      const pageId = (target as HTMLElement).dataset.page;
      if (pageId) void appRouter.navigatePage(pageId as AppPageId);
    }
  });

  // Ensure Play is the default visible/active page on load.
  showPage("page-play");
}
import { appRouter } from "./AppRouter";
import { AppPageId } from "./AppRoutes";
