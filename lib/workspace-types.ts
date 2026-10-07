export type Panel = 'trainees' | 'keycodes' | 'prometric' | 'codes' | 'inventory' | 'settings';
export type Language = 'ar' | 'en';
export type MemberRole = 'admin' | 'operator' | 'copy_only';
export type Json = string | number | boolean | null | Json[] | { [key: string]: Json };
export type SheetCells = string[][];
export interface SheetData { cells: SheetCells; version: number; format?: Record<string, Json> }
export interface CodeRow {
  code: string; category: string; notes: string; version: number;
  used_on: string | null; used_by: string | null; used_at?: string | null; owner_id?: string | null;
}
export interface Member { email: string; user_id: string | null; active: boolean; role: MemberRole }
export interface Keycode { code: string; title: string; lang: string; category: string }
export interface WorkspaceSettings {
  keycodes: Keycode[]; categoryOrder: string[]; codeCategories: string[];
  categoryLabels?: Record<string, string>; keycodeOrder?: Record<string, string[]>; keycodeOverrides?: Record<string, string>;
  dateColors?: Record<string, string>; lowStockThreshold?: number;
  credentials?: { account: string; password: string }; links?: { zoom?: string; prometric?: string };
  inventorySupervisorName?: string; inventoryMessageLanguage?: Language;
}
export interface TraineeEngine {
  open(): Promise<void>; translate(): void; flush(keepEditing?: boolean): Promise<boolean>;
  hasDraft(): boolean; reset(): void; suspend(): void; savePosition(): void;
}
export interface WorkspaceRuntimeWindow extends Window {
  TRAINFLOW_BOOT_WORKSPACE?: () => Promise<void>;
  TRAINFLOW_ROUTE_VIEW?: () => { panel: Panel; settingsTab?: string } | null;
  TRAINFLOW_PANEL_CHANGED?: () => void;
  TRAINFLOW_ENGINE?: TraineeEngine;
  connectWorkspaceNavigation?: () => { ready(): void; dispose(): void };
}
