type NavigationPanel = 'keycodes' | 'prometric' | 'codes' | 'inventory' | 'trainees' | 'settings';
const workspacePaths: Record<NavigationPanel, string> = {
  keycodes: '/keycodes', prometric: '/prometric', codes: '/vouchers', inventory: '/inventory', trainees: '/trainees', settings: '/settings',
};

function connectWorkspaceNavigation() {
  let booting = true, navigating = false;
  const routeView = () => {
    const panel = (Object.keys(workspacePaths) as NavigationPanel[]).find(id => workspacePaths[id] === location.pathname.replace(/\/$/, ''));
    return panel ? { panel, settingsTab: new URLSearchParams(location.search).get('tab') || 'profile' } : null;
  };
  window.TRAINFLOW_ROUTE_VIEW = routeView;
  const navigate = async (href: string) => {
    if (navigating || href === location.pathname + location.search) return;
    navigating = true;
    try {
      if (!await window.TRAINFLOW_ENGINE?.flush()) return;
      window.TRAINFLOW_ENGINE.savePosition();
      location.assign(href);
    } finally { navigating = false; }
  };
  const changed = () => {
    if (booting || document.getElementById('app').hidden) return;
    queueMicrotask(() => {
      const panel = document.querySelector('section.panel.active')?.id.slice(6) as NavigationPanel;
      if (!workspacePaths[panel]) return;
      const query = panel === 'settings' ? new URLSearchParams({ tab: document.querySelector('#settings-tabs [aria-selected="true"]').id.replace('settings-tab-', '') }) : new URLSearchParams();
      if (panel === 'codes') query.set('category', activeCategory);
      const href = workspacePaths[panel] + (query.size ? '?' + query : '');
      if (routeView()?.panel === panel) { if (href !== location.pathname + location.search) history.pushState(null, '', href); }
      else void navigate(href);
    });
  };
  window.TRAINFLOW_PANEL_CHANGED = changed;
  const click = (event: MouseEvent) => {
    const anchor = (event.target as Element).closest<HTMLAnchorElement>('nav.tabs a[href]');
    if (!anchor || event.defaultPrevented || event.button || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
    event.preventDefault(); event.stopPropagation();
    void navigate(anchor.pathname + anchor.search);
  };
  const popstate = () => {
    if (routeView()?.panel === 'settings') activateSettingsTab(routeView().settingsTab);
  };
  document.addEventListener('click', click, true); window.addEventListener('popstate', popstate);
  return { ready() { booting = false; }, dispose() { document.removeEventListener('click', click, true); window.removeEventListener('popstate', popstate); } };
}
