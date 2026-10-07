import type { Panel } from "@/lib/workspace-types";
import { LoginScreen } from "./LoginScreen";
import { WorkspaceSidebar } from "./WorkspaceSidebar";
import { WorkspaceControls } from "./WorkspaceControls";
import { WorkspaceDialogs } from "./WorkspaceDialogs";
import { KeycodesScreen } from "./KeycodesScreen";
import { PrometricScreen } from "./PrometricScreen";
import { VouchersScreen } from "./VouchersScreen";
import { InventoryScreen } from "./InventoryScreen";
import { TraineesScreen } from "./TraineesScreen";
import { SettingsScreen } from "./SettingsScreen";

// These retained hosts preserve the tested engine's DOM and extension contract.
// Page routes select the initial screen; the engine owns cells inside its host.
export function WorkspaceShell({
  initialPanel = "trainees",
}: {
  initialPanel?: Panel;
}) {
  return (
    <>
      <section
        id="startup-screen"
        role="status"
        aria-live="polite"
        aria-busy="true"
      >
        <span className="startup-spinner" aria-hidden="true" />
        <span id="startup-message">جارٍ تحميل مساحة العمل…</span>
      </section>
      <noscript>يلزم تفعيل JavaScript لفتح البرنامج.</noscript>
      <LoginScreen />
      <div
        className={initialPanel === "trainees" ? "wrap sheet-wide" : "wrap"}
        id="app"
        hidden
      >
        <WorkspaceControls />
        <WorkspaceSidebar activePanel={initialPanel} />
        <main id="workspace-main" tabIndex={-1} aria-label="المحتوى الرئيسي">
          <KeycodesScreen active={initialPanel === "keycodes"} />
          <PrometricScreen active={initialPanel === "prometric"} />
          <VouchersScreen active={initialPanel === "codes"} />
          <InventoryScreen active={initialPanel === "inventory"} />
          <TraineesScreen active={initialPanel === "trainees"} />
          <SettingsScreen active={initialPanel === "settings"} />
        </main>
      </div>
      <WorkspaceDialogs />
    </>
  );
}
