export type Role = 'admin' | 'operator' | 'copy_only';

export interface CodeRow {
  code: string;
  category: string;
  notes: string;
  used_on: string | null;
  used_at?: string | null;
  used_by?: string | null;
  owner_id?: string | null;
  version: number;
}

export interface KeycodeItem {
  title: string;
  lang: 'Arabic' | 'English' | string;
  code: string;
  category: string;
}

export interface SettingsPayload {
  keycodes: KeycodeItem[];
  categoryOrder: string[];
  codeCategories: string[];
  categoryLabels?: Record<string, string>;
  keycodeOverrides: Record<string, any>;
  keycodeOrder: Record<string, string[]>;
  dateColors: Record<string, string>;
  lowStockThreshold?: number;
  credentials?: {
    account?: string;
    password?: string;
  };
  links?: {
    zoom?: string;
    prometric?: string;
  };
  inventorySupervisorName?: string;
  inventoryMessageLanguage?: 'ar' | 'en';
}

export interface MemberRecord {
  email: string;
  role: Role;
  active: boolean;
  user_id: string | null;
}

export interface StockRecord {
  category: string;
  remaining: number;
}

export interface TraineeSheetRecord {
  owner_id: string;
  cells: string[][];
  version: number;
  format?: {
    styles?: Record<string, any>;
    cols?: Record<string, number>;
  };
}

export interface AuditRecord {
  id: number;
  actor: string;
  action: 'INSERT' | 'UPDATE' | 'DELETE' | string;
  entity: string;
  record_key: string | null;
  happened_at: string;
}

export interface UserSession {
  id: string;
  email: string;
  fullName?: string;
  role: Role;
}
