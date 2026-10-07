type NavigationPanel = WorkspacePanel;
const workspacePaths: Record<NavigationPanel, string> = {
  keycodes: "/keycodes",
  prometric: "/prometric",
  codes: "/vouchers",
  inventory: "/inventory",
  trainees: "/trainees",
  settings: "/settings",
};

function connectWorkspaceNavigation() {
  let booting = true,
    navigating = false,
    applyingRoute = false;
  let currentHref = location.pathname + location.search;
  let currentIndex = history.state?.trainflowIndex ?? 0;
  const routeView = () => {
    const panel = (Object.keys(workspacePaths) as NavigationPanel[]).find(
      (id) => workspacePaths[id] === location.pathname.replace(/\/$/, ""),
    );
    return panel
      ? {
          panel,
          settingsTab:
            new URLSearchParams(location.search).get("tab") || "profile",
          category:
            new URLSearchParams(location.search).get("category") ||
            history.state?.trainflowCategory,
        }
      : null;
  };
  window.TRAINFLOW_ROUTE_VIEW = routeView;
  const dismissMobileSidebar = () => {
    if (
      matchMedia("(max-width: 760px)").matches &&
      document.documentElement.dataset.sidebarSize !== "compact"
    )
      setSidebarOpen(false, true);
  };
  const pushLocation = (href: string) => {
    history.pushState(
      {
        ...history.state,
        trainflowIndex: ++currentIndex,
        trainflowCategory: activeCategory,
      },
      "",
      href,
    );
    currentHref = href;
  };
  const applyRoute = async () => {
    const view = routeView();
    if (!view) return;
    applyingRoute = true;
    try {
      if (
        view.panel === "codes" &&
        view.category &&
        Object.hasOwn(state.codesByCategory, view.category)
      ) {
        activeCategory = view.category;
        if (
          document.getElementById("code-grid").dataset.category !==
          view.category
        ) {
          selectedCodes.clear();
          renderCodeTabs();
          renderCodeGrid();
        }
      }
      const opening = showPanel(view.panel);
      if (view.panel === "settings") activateSettingsTab(view.settingsTab);
      await opening;
    } finally {
      applyingRoute = false;
    }
    if (view.panel === "codes" || view.panel === "inventory")
      void Cloud.refresh();
  };
  const navigate = async ({
    href,
    historyIndex,
  }: {
    href: string;
    historyIndex?: number;
  }) => {
    const restoreLocation = () => {
      if (historyIndex !== undefined && historyIndex !== currentIndex)
        history.go(currentIndex - historyIndex);
    };
    if (href === currentHref) {
      if (historyIndex !== undefined) currentIndex = historyIndex;
      dismissMobileSidebar();
      return;
    }
    if (navigating) {
      restoreLocation();
      return;
    }
    navigating = true;
    try {
      const engine = window.TRAINFLOW_ENGINE;
      if (engine && !(await engine.flush())) {
        restoreLocation();
        return;
      }
      engine?.savePosition();
      dismissMobileSidebar();
      if (historyIndex === undefined) pushLocation(href);
      else {
        currentIndex = historyIndex;
        currentHref = href;
      }
      await applyRoute();
    } finally {
      navigating = false;
    }
  };
  const changed = () => {
    if (booting || applyingRoute || document.getElementById("app").hidden)
      return;
    queueMicrotask(() => {
      const panel = document
        .querySelector("section.panel.active")
        ?.id.slice(6) as NavigationPanel;
      if (!workspacePaths[panel]) return;
      const query =
        panel === "settings"
          ? new URLSearchParams(
              document.querySelector('#settings-tabs [aria-selected="true"]')
                .id === "settings-tab-profile"
                ? {}
                : {
                    tab: document
                      .querySelector('#settings-tabs [aria-selected="true"]')
                      .id.replace("settings-tab-", ""),
                  },
            )
          : new URLSearchParams();
      if (panel === "codes") query.set("category", activeCategory);
      const href = workspacePaths[panel] + (query.size ? "?" + query : "");
      if (routeView()?.panel === panel) {
        if (href !== location.pathname + location.search) pushLocation(href);
      } else void navigate({ href });
    });
  };
  window.TRAINFLOW_PANEL_CHANGED = changed;
  window.TRAINFLOW_REQUEST_PANEL = (panel: NavigationPanel) => {
    if (booting || applyingRoute || routeView()?.panel === panel) return false;
    const query =
      panel === "codes"
        ? "?" + new URLSearchParams({ category: activeCategory })
        : "";
    void navigate({ href: workspacePaths[panel] + query });
    return true;
  };
  const click = (event: MouseEvent) => {
    const anchor = (event.target as Element).closest<HTMLAnchorElement>(
      "nav.tabs a[href]",
    );
    if (
      !anchor ||
      event.defaultPrevented ||
      event.button ||
      event.ctrlKey ||
      event.metaKey ||
      event.shiftKey ||
      event.altKey
    )
      return;
    event.preventDefault();
    event.stopPropagation();
    void navigate({ href: anchor.pathname + anchor.search });
  };
  const popstate = (event: PopStateEvent) => {
    if (booting || !routeView()) return;
    void navigate({
      href: location.pathname + location.search,
      historyIndex: event.state?.trainflowIndex ?? 0,
    });
  };
  document.addEventListener("click", click, true);
  window.addEventListener("popstate", popstate);
  return {
    ready() {
      history.replaceState(
        {
          ...history.state,
          trainflowIndex: currentIndex,
          trainflowCategory: activeCategory,
        },
        "",
        currentHref,
      );
      booting = false;
    },
    dispose() {
      document.removeEventListener("click", click, true);
      window.removeEventListener("popstate", popstate);
    },
  };
}
