import { createClient } from '@supabase/supabase-js';
import type { CodeRow, SettingsPayload, StockRecord, MemberRecord, Role } from './types';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://xaeffreqwtozsgqajzpc.supabase.co';
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_TB0SB3SNFP1ygpRvMoeSGg_s8o0mHeO';

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
});

export async function fetchAllCodes(): Promise<CodeRow[]> {
  const result: CodeRow[] = [];
  for (let offset = 0; ; offset += 1000) {
    const { data, error } = await supabase
      .from('ibta_codes')
      .select('*')
      .order('code')
      .range(offset, offset + 999);
    if (error) throw error;
    if (data) result.push(...data);
    if (!data || data.length < 1000) break;
  }
  return result;
}

export async function fetchInitialData() {
  const [settingsRes, codes, stockRes] = await Promise.all([
    supabase.from('ibta_settings').select('*').eq('id', 1).single(),
    fetchAllCodes(),
    supabase.from('ibta_supervisor_stock').select('*'),
  ]);

  if (settingsRes.error) throw settingsRes.error;
  if (stockRes.error) throw stockRes.error;

  const settings = settingsRes.data;
  const stock: StockRecord[] = stockRes.data || [];

  return { settings, codes, stock };
}

export async function claimCode(targetCode: string, expectedVersion: number, useDate: string) {
  const { data, error } = await supabase.rpc('ibta_claim_code', {
    target_code: targetCode,
    expected_version: expectedVersion,
    use_date: useDate,
  });
  if (error) throw error;
  return data;
}

export async function applyChanges(changes: any[], settingsPayload: any, settingsVersion: number) {
  const { data, error } = await supabase.rpc('ibta_apply_changes', {
    changes,
    settings_payload: settingsPayload,
    settings_version: settingsVersion,
  });
  if (error) throw error;
  return data;
}

export async function changeSupervisorStock(targetCategory: string, mode: 'opening' | 'replenishment' | 'correction', quantity: number) {
  const { data, error } = await supabase.rpc('ibta_change_supervisor_stock', {
    target_category: targetCategory,
    mode,
    quantity,
  });
  if (error) throw error;
  return data;
}

export async function importCodesToCategory(targetCategory: string, newCodes: string[]) {
  const { data, error } = await supabase.rpc('ibta_import_codes', {
    target_category: targetCategory,
    new_codes: newCodes,
  });
  if (error) throw error;
  return data;
}

export async function editCodeRow(
  oldCode: string,
  newCode: string,
  category: string,
  usedOn: string | null,
  notes: string,
  version: number,
  settingsVersion: number
) {
  const { data, error } = await supabase.rpc('ibta_apply_changes', {
    changes: [
      {
        op: 'replace',
        code: oldCode,
        version,
        new_code: newCode,
        new_category: category,
        used_on: usedOn || null,
        notes: notes || '',
      },
    ],
    settings_payload: null,
    settings_version: settingsVersion,
  });
  if (error) throw error;
  return data;
}

export async function deleteCodes(
  codes: { code: string; version: number }[],
  settingsVersion: number
) {
  const changes = codes.map((c) => ({
    op: 'delete',
    code: c.code,
    version: c.version,
  }));
  const { data, error } = await supabase.rpc('ibta_apply_changes', {
    changes,
    settings_payload: null,
    settings_version: settingsVersion,
  });
  if (error) throw error;
  return data;
}

export async function readTrainees(ownerId: string) {
  const { data, error } = await supabase
    .from('ibta_trainee_sheets')
    .select('cells,version,format')
    .eq('owner_id', ownerId)
    .maybeSingle();
  if (error) throw error;
  return data || { cells: [], version: 0, format: {} };
}

export async function saveTraineeSheet(targetOwner: string, newCells: string[][], expectedVersion: number, newFormat?: any) {
  const { data, error } = await supabase.rpc('ibta_save_trainee_sheet_formatted', {
    target_owner: targetOwner,
    new_cells: newCells,
    expected_version: expectedVersion,
    new_format: newFormat || {},
  });
  if (error) throw error;
  return data;
}

export async function assignCodes(targetOwner: string, items: { code: string; version: number }[]) {
  const { data, error } = await supabase.rpc('ibta_assign_codes', {
    target_owner: targetOwner,
    items,
  });
  if (error) throw error;
  return data;
}

export async function listMembers(): Promise<MemberRecord[]> {
  const { data, error } = await supabase
    .from('ibta_members')
    .select('id,email,role,active,user_id,created_at')
    .order('email');
  if (error) throw error;
  return data || [];
}

export async function updateMember(email: string, role: Role, active: boolean) {
  const { data, error } = await supabase
    .from('ibta_members')
    .update({ role, active })
    .eq('email', email);
  if (error) throw error;
  return data;
}

export async function addMember(email: string, role: Role) {
  const { data, error } = await supabase
    .from('ibta_members')
    .insert({ email: email.toLowerCase().trim(), role, active: true });
  if (error) throw error;
  return data;
}

export async function getAuditEvents() {
  const { data, error } = await supabase
    .from('ibta_audit')
    .select('id,actor,action,entity,record_key,happened_at')
    .order('happened_at', { ascending: false })
    .limit(100);
  if (error) throw error;
  return data || [];
}

export async function restoreBackupData(backup: any, expectedVersion: number) {
  const { data, error } = await supabase.rpc('ibta_restore_backup', {
    backup,
    expected_version: expectedVersion,
  });
  if (error) throw error;
  return data;
}
