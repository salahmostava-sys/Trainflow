type Panel = 'keycodes' | 'prometric' | 'codes' | 'inventory' | 'trainees' | 'settings';
type RouteView = { panel: Panel; settingsTab?: string };
type WorkspaceWindow = Window & {
  TRAINFLOW_ROUTE_VIEW?: () => RouteView | null;
  TRAINFLOW_PANEL_CHANGED?: () => void;
  TRAINFLOW_SHOW_PANEL?: (panel: Panel) => void | Promise<void>;
  TRAINFLOW_ACTIVATE_SETTINGS_TAB?: (tab: string) => void;
};
type Router = {
  push: (href: string, options: { scroll: boolean }) => void;
  replace: (href: string, options: { scroll: boolean }) => void;
};

const paths: Record<Panel, string> = {
  keycodes: '/keycodes', prometric: '/prometric', codes: '/vouchers',
  inventory: '/inventory', trainees: '/trainees', settings: '/settings',
};

// Keep the original workspace mounted while Next updates the URL and history.
export function connectClassicNavigation(router: Router) {
  const runtime = window as WorkspaceWindow;
  let booting = true, restoring = 0, queued = false, disposed = false;
  let pendingUrl: string | null = null;
  const routeView = (): RouteView | null => {
    const pathname = location.pathname.replace(/\/$/, '');
    const panel = (Object.keys(paths) as Panel[]).find(id => paths[id] === pathname);
    if (!panel) return null;
    return { panel, ...(panel === 'settings' ? { settingsTab: new URLSearchParams(location.search).get('tab') || 'profile' } : {}) };
  };
  const activePanel = () => document.querySelector<HTMLElement>('section.panel.active')?.id.slice(6) as Panel | undefined;
  const activeSettingsTab = () => document.querySelector('#settings-tabs button[aria-selected="true"]')?.id.replace('settings-tab-', '') || 'profile';
  const updateUrl = () => {
    if (disposed || restoring || document.getElementById('app')?.hidden) return;
    const panel = activePanel();
    if (!panel || !paths[panel]) return;
    const tab = panel === 'settings' ? activeSettingsTab() : 'profile';
    const href = paths[panel] + (tab !== 'profile' ? '?tab=' + encodeURIComponent(tab) : '');
    if (href === location.pathname + location.search || href === pendingUrl) return;
    pendingUrl = href;
    // Initial restoration replaces / or /login instead of adding a false Back step.
    if (booting || !routeView()) router.replace(href, { scroll: false });
    else router.push(href, { scroll: false });
  };
  const changed = () => {
    if (disposed || restoring || queued) return;
    queued = true;
    queueMicrotask(() => { queued = false; updateUrl(); });
  };
  const restoreUrl = async () => {
    if (disposed || document.getElementById('app')?.hidden) return;
    pendingUrl = null;
    const view = routeView();
    if (!view) return;
    restoring++;
    try {
      if (activePanel() !== view.panel) await runtime.TRAINFLOW_SHOW_PANEL?.(view.panel);
      if (view.panel === 'settings') runtime.TRAINFLOW_ACTIVATE_SETTINGS_TAB?.(view.settingsTab || 'profile');
    } finally { restoring--; }
  };
  const onPopState = () => { void restoreUrl().catch(error => console.error(error)); };
  runtime.TRAINFLOW_ROUTE_VIEW = routeView;
  runtime.TRAINFLOW_PANEL_CHANGED = changed;
  window.addEventListener('popstate', onPopState);
  return {
    ready() { updateUrl(); booting = false; },
    dispose() {
      disposed = true;
      window.removeEventListener('popstate', onPopState);
      if (runtime.TRAINFLOW_ROUTE_VIEW === routeView) delete runtime.TRAINFLOW_ROUTE_VIEW;
      if (runtime.TRAINFLOW_PANEL_CHANGED === changed) delete runtime.TRAINFLOW_PANEL_CHANGED;
    },
  };
}
