import type {
  User,
  Session,
  SupabaseClient,
  UserAttributes,
} from "@supabase/supabase-js";
import type {
  Worksheet,
  Panel,
  Language,
  MemberRole,
  CodeRow,
  Member,
  Keycode,
  SheetData,
  SheetCells,
  WorkspaceSettings,
  TraineeEngine,
  Json,
  SheetAction,
  SheetActionOptions,
} from "@/lib/workspace-types";

declare global {
  var WorkspaceLive: { connect(options: { client: CloudClient; owner: string; onRefresh(scope: string): Promise<boolean>; onStatus(status: string): void }): { close(): void; wake(): void } };
  function resetPendingImports(): void;
  var TraineeReports: { translate(): void };
  type WorkspacePanel = Panel;
  type CloudUser = User;
  type CloudSession = Session;
  type CloudClient = SupabaseClient;
  type CloudUserAttributes = UserAttributes & { current_password?: string };
  type CloudCode = CodeRow;
  type CloudMember = Member;
  type CloudRole = MemberRole;
  type CloudSheet = SheetData;
  type CloudWorksheet = Worksheet;
  type CloudCells = SheetCells;
  type CloudSettings = WorkspaceSettings;
  type CloudJson = Json;
  type CloudSheetAction = SheetAction;
  type CloudSheetOptions = SheetActionOptions;
  var AppDialog: {
    close(): void;
    confirm(options: {
      title?: string;
      message: string;
      confirmText?: string;
      altText?: string;
      cancelText?: string;
      danger?: boolean;
      icon?: string;
    }): Promise<boolean | string>;
  };
  var SessionPolicy: {
    expiresAt(token: string): number;
    expired(token: string, now?: number): boolean;
  };
  var currentLang: Language;
  var DEFAULT_KEYCODES: Keycode[];
  var PROMETRIC_ACCOUNT: string,
    PROMETRIC_PASSWORD: string,
    PROMETRIC_LOGIN_URL: string,
    ZOOM_URL: string;
  var activeCategory: string;
  var selectedCodes: Set<string>;
  var state: {
    usedCodes: Record<string, string>;
    codeUseTimes: Record<string, string>;
    codesByCategory: Record<string, string[]>;
    codeNotes: Record<string, string>;
    categoryLabels: Record<string, string>;
    keycodeOverrides: Record<string, string>;
    keycodeOrder: Record<string, string[]>;
    categoryOrder: string[];
    dateColors: Record<string, string>;
    settings: Record<string, string>;
    lowStockThreshold: number;
    uiLang: Language;
    voucherNames?: Record<string, string>;
  };
  var Trainees: TraineeEngine;
  function t(key: "duplicateCode"): (code: string) => string;
  function t(key: string): string;
  function showToast(text: string): void;
  function copyText(text: string): Promise<boolean>;
  function todayStr(): string;
  function applyLanguage(): void;
  function renderInventory(): void;
  function renderMemberList(): Promise<void>;
  function restoreWorkspaceView(): Promise<void>;
  function validBackup(value: unknown): boolean;
  function sortCategories(values: string[]): string[];
  function activateSettingsTab(tab: string): void;
  function showPanel(panel: Panel): Promise<void> | void;
  function renderCodeTabs(): void;
  function renderCodeGrid(): void;
  function setSidebarOpen(open: boolean, persist?: boolean): void;
  function confirmDelete(text: string): Promise<boolean>;
  interface Window {
    TRAINFLOW_REQUEST_PANEL?: (panel: Panel) => boolean;
    supabase?: {
      createClient: typeof import("@supabase/supabase-js").createClient;
    };
    sortCategories?: typeof sortCategories;
    TRAINFLOW_ENGINE?: TraineeEngine;
    TRAINFLOW_BOOT_WORKSPACE?: () => Promise<void>;
    TRAINFLOW_ROUTE_VIEW?: () => { panel: Panel; settingsTab?: string } | null;
    TRAINFLOW_PANEL_CHANGED?: () => void;
  }
}
