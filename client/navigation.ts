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
    navigating = false;
  const routeView = () => {
    const panel = (Object.keys(workspacePaths) as NavigationPanel[]).find(
      (id) => workspacePaths[id] === location.pathname.replace(/\/$/, ""),
    );
    return panel
      ? {
          panel,
          settingsTab:
            new URLSearchParams(location.search).get("tab") || "profile",
        }
      : null;
  };
  window.TRAINFLOW_ROUTE_VIEW = routeView;
  const dismissMobileSidebar = () => {
    if (matchMedia('(max-width: 760px)').matches && document.documentElement.dataset.sidebarSize !== 'compact') setSidebarOpen(false, true);
  };
  const navigate = async (href: string) => {
    if (navigating) return;
    if (href === location.pathname + location.search) { dismissMobileSidebar(); return; }
    navigating = true;
    try {
      const engine = window.TRAINFLOW_ENGINE;
      if (engine && !(await engine.flush())) return;
      engine?.savePosition();
      dismissMobileSidebar();
      location.assign(href);
    } finally {
      navigating = false;
    }
  };
  const changed = () => {
    if (booting || document.getElementById("app").hidden) return;
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
        if (href !== location.pathname + location.search)
          history.pushState(null, "", href);
      } else void navigate(href);
    });
  };
  window.TRAINFLOW_PANEL_CHANGED = changed;
  window.TRAINFLOW_REQUEST_PANEL = (panel: NavigationPanel) => {
    if (booting || routeView()?.panel === panel) return false;
    const query =
      panel === "codes"
        ? "?" + new URLSearchParams({ category: activeCategory })
        : "";
    void navigate(workspacePaths[panel] + query);
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
    void navigate(anchor.pathname + anchor.search);
  };
  const popstate = () => {
    if (routeView()?.panel === "settings")
      activateSettingsTab(routeView().settingsTab);
  };
  document.addEventListener("click", click, true);
  window.addEventListener("popstate", popstate);
  return {
    ready() {
      booting = false;
    },
    dispose() {
      document.removeEventListener("click", click, true);
      window.removeEventListener("popstate", popstate);
    },
  };
}
