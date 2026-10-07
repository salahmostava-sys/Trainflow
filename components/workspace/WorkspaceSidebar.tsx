export function WorkspaceSidebar() {
  return (
    <aside id="workspace-sidebar" aria-label="الصفحات">
    <div className="sidebar-heading"><span className="brand-mark" aria-hidden="true">TF</span><strong>TrainFlow</strong><div className="sidebar-controls" id="sidebar-controls"><button className="icon-pill-btn square" id="sidebar-compact" type="button" aria-controls="workspace-sidebar" aria-expanded="true" aria-label="تصغير القائمة الجانبية"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9 6 6 6-6 6"></path></svg></button><button className="icon-pill-btn square" id="sidebar-toggle" type="button" aria-controls="workspace-sidebar" aria-expanded="true" aria-label="إغلاق القائمة الجانبية"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 6h16M4 12h16M4 18h16"></path></svg></button></div></div>
  <nav className="tabs" aria-label="الصفحات">
    <a href="/trainees" data-tab="trainees" id="trainees-tab" className="active" aria-current="page"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="9" cy="8" r="3"></circle><path d="M3 20v-2a6 6 0 0 1 12 0v2m2-15a3 3 0 0 1 0 6m1 3a5 5 0 0 1 3 4v2"></path></svg><span id="sidebar-trainees-label">المتدربون</span></a>
    <a href="/keycodes" data-tab="keycodes"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="8" cy="8" r="4"></circle><path d="m11 11 9 9m-4-4 3-3m-6 0 3-3"></path></svg><span data-i18n="tabKeycodes">Keycodes</span></a>
    <a href="/prometric" data-tab="prometric"><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="4" width="18" height="13" rx="2"></rect><path d="M8 21h8m-4-4v4m-5-10 3 3 7-7"></path></svg><span data-i18n="tabPrometric">Prometric</span></a>
    <a href="/vouchers" data-tab="codes"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 7h18v4a2 2 0 0 0 0 4v3H3v-3a2 2 0 0 0 0-4Z"></path><path d="M15 7v2m0 3v2m0 2v2"></path></svg><span data-i18n="tabCodes">VOUCHERS</span></a>
    <a href="/inventory" data-tab="inventory"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m3 7 9-4 9 4v10l-9 4-9-4Zm0 0 9 4 9-4m-9 4v10M7 5l9 4"></path></svg><span data-i18n="tabInventory">Inventory</span></a>
    <a href="/settings" data-tab="settings"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3v3m0 12v3M3 12h3m12 0h3M5.6 5.6l2.1 2.1m8.6 8.6 2.1 2.1M5.6 18.4l2.1-2.1m8.6-8.6 2.1-2.1"></path><circle cx="12" cy="12" r="6"></circle><circle cx="12" cy="12" r="2"></circle></svg><span data-i18n="settingsTitle">الإعدادات</span></a>
  </nav>
  <div className="sidebar-footer">
    <div className="account-menu" id="account-menu">
      <button className="icon-pill-btn account-trigger" id="account-menu-btn" type="button" aria-haspopup="true" aria-expanded="false" aria-controls="account-menu-popover"><span className="account-avatar" id="account-avatar" aria-hidden="true">TF</span></button>
      <div className="account-popover" id="account-menu-popover" hidden>
        <div className="account-summary"><strong id="account-menu-name" data-i18n="currentAccount">الحساب الحالي</strong><span id="account-menu-email" dir="ltr"></span></div>
        <button className="account-option" id="settings-btn" type="button"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z"></path><path d="M19.4 15a1.8 1.8 0 0 0 .36 1.98l.07.07-1.78 1.78-.07-.07A1.8 1.8 0 0 0 16 18.4a1.8 1.8 0 0 0-1 1.66V20h-2v-.06a1.8 1.8 0 0 0-1-1.66 1.8 1.8 0 0 0-1.98.36l-.07.07-1.78-1.78.07-.07A1.8 1.8 0 0 0 8.6 15a1.8 1.8 0 0 0-1.66-1H7v-2h-.06A1.8 1.8 0 0 0 8.6 11a1.8 1.8 0 0 0-.36-1.98l-.07-.07 1.78-1.78.07.07A1.8 1.8 0 0 0 12 7.6a1.8 1.8 0 0 0 1-1.66V6h2v.06a1.8 1.8 0 0 0 1 1.66 1.8 1.8 0 0 0 1.98-.36l.07-.07 1.78 1.78-.07.07A1.8 1.8 0 0 0 19.4 11a1.8 1.8 0 0 0 1.66 1H21v2h.06A1.8 1.8 0 0 0 19.4 15Z"></path></svg><span data-i18n="settingsTitle">الإعدادات</span></button>
        <button className="account-option" id="sign-out" type="button" hidden><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M10 4H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h4M14 7l5 5-5 5M9 12h10"></path></svg><span data-i18n="signOut">تسجيل الخروج</span></button>
      </div>
    </div>
    <button className="icon-pill-btn" id="lang-btn">AR</button>
  </div>
  </aside>
  );
}
