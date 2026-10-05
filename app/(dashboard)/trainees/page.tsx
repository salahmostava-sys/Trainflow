'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useToast } from '@/components/Toast';
import { readTrainees, saveTraineeSheet, fetchAllCodes, claimCode } from '@/lib/supabase';
import { getTodayStr } from '@/lib/session';
import { TRANSLATIONS } from '@/lib/translations';
import type { Role, CodeRow } from '@/lib/types';

const COLUMN_DEFS = [
  { id: 0, ar: 'الكود', en: 'Code', width: 'w-44' },
  { id: 1, ar: 'البريد الإلكتروني', en: 'Email', width: 'w-52' },
  { id: 2, ar: 'الاسم بالعربي', en: 'Arabic Name', width: 'w-48' },
  { id: 3, ar: 'الاسم بالإنجليزي', en: 'English Name', width: 'w-48' },
  { id: 4, ar: 'رقم الهوية / الإقامة', en: 'National ID', width: 'w-36' },
  { id: 5, ar: 'الجوال', en: 'Phone', width: 'w-32' },
  { id: 6, ar: 'الجهة', en: 'Organization', width: 'w-36' },
  { id: 7, ar: 'الاختبار', en: 'Exam', width: 'w-48' },
  { id: 8, ar: 'تاريخ الاختبار', en: 'Exam Date', width: 'w-32' },
  { id: 9, ar: 'اسم المستخدم', en: 'Username', width: 'w-36' },
  { id: 10, ar: 'كلمة المرور', en: 'Password', width: 'w-36' },
  { id: 11, ar: 'النتيجة', en: 'Result', width: 'w-28' },
  { id: 12, ar: 'AnyDesk ID', en: 'AnyDesk ID', width: 'w-32' },
];

export default function TraineesPage() {
  const { showToast } = useToast();
  const [lang, setLang] = useState<'ar' | 'en'>('ar');
  const [role, setRole] = useState<Role>('operator');
  const [userId, setUserId] = useState<string>('');

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  const [cells, setCells] = useState<string[][]>([]);
  const [version, setVersion] = useState<number>(0);
  const [search, setSearch] = useState('');
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const t = TRANSLATIONS[lang];

  useEffect(() => {
    const storedLang = (localStorage.getItem('tf_lang') as 'ar' | 'en') || 'ar';
    setLang(storedLang);

    const storedUser = localStorage.getItem('tf_user');
    let uId = '';
    if (storedUser) {
      try {
        const u = JSON.parse(storedUser);
        setRole(u.role || 'operator');
        setUserId(u.id || '');
        uId = u.id || '';
      } catch {}
    }

    if (uId) {
      loadSheet(uId);
    } else {
      setLoading(false);
    }
  }, []);

  async function loadSheet(ownerId: string) {
    try {
      setLoading(true);
      const data = await readTrainees(ownerId);
      let sheetCells: string[][] = data.cells || [];

      // Ensure minimal empty rows if sheet is completely new
      if (!sheetCells.length) {
        sheetCells = Array.from({ length: 10 }, () => Array(COLUMN_DEFS.length).fill(''));
      }

      setCells(sheetCells);
      setVersion(data.version || 0);
      setHasUnsavedChanges(false);
    } catch (err: any) {
      showToast(err.message || 'Error loading trainee sheet', 'error');
    } finally {
      setLoading(false);
    }
  }

  // Update cell value
  function handleCellChange(rowIndex: number, colIndex: number, value: string) {
    setCells((prev) => {
      const next = prev.map((row, rIdx) => {
        if (rIdx !== rowIndex) return row;
        const newRow = [...row];
        newRow[colIndex] = value;
        return newRow;
      });
      return next;
    });
    setHasUnsavedChanges(true);
  }

  // Add row
  function handleAddRow() {
    setCells((prev) => [...prev, Array(COLUMN_DEFS.length).fill('')]);
    setHasUnsavedChanges(true);
  }

  // Remove row
  function handleDeleteRow(rowIndex: number) {
    setCells((prev) => prev.filter((_, idx) => idx !== rowIndex));
    setHasUnsavedChanges(true);
  }

  // Auto assign voucher code to row
  async function handleAssignCodeToRow(rowIndex: number) {
    try {
      setSaving(true);
      const allCodes = await fetchAllCodes();
      const available = allCodes.find((c) => !c.used_on);

      if (!available) {
        showToast(
          lang === 'ar' ? 'لا توجد أكواد متاحة في النظام حالياً' : 'No available voucher codes in system',
          'error'
        );
        return;
      }

      const today = getTodayStr();
      await claimCode(available.code, available.version, today);

      // Put code into row
      handleCellChange(rowIndex, 0, available.code);
      showToast(
        lang === 'ar'
          ? `تم سحب وتعيين الكود [${available.code}] للمتدرب بنجاح`
          : `Allocated code [${available.code}] to trainee`,
        'success'
      );
    } catch (err: any) {
      showToast(err.message || 'Failed to allocate code', 'error');
    } finally {
      setSaving(false);
    }
  }

  // Save Sheet
  async function handleSaveSheet() {
    if (!userId) return;
    setSaving(true);
    try {
      // Filter out trailing blank rows if desired, or keep as is
      await saveTraineeSheet(userId, cells, version);
      setVersion((v) => v + 1);
      setHasUnsavedChanges(false);
      showToast(lang === 'ar' ? 'تم حفظ شيت المتدربين بنجاح' : 'Trainee sheet saved successfully', 'success');
    } catch (err: any) {
      showToast(err.message || 'Error saving trainee sheet', 'error');
    } finally {
      setSaving(false);
    }
  }

  // Export Sheet to CSV
  function handleExportCsv() {
    const headerRow = COLUMN_DEFS.map((c) => (lang === 'ar' ? c.ar : c.en));
    const cleanCells = cells.map((row) =>
      row.map((val) => `"${(val || '').replace(/"/g, '""')}"`).join(',')
    );

    const csvContent =
      '\uFEFF' + [headerRow.map((h) => `"${h}"`).join(','), ...cleanCells].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `trainees-${getTodayStr().replace(/\//g, '-')}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    showToast(lang === 'ar' ? 'تم تصدير الشيت بنجاح' : 'Exported to CSV successfully', 'success');
  }

  // Filtered rows for search
  const visibleRowIndices = useMemo(() => {
    if (!search.trim()) return cells.map((_, i) => i);
    const q = search.toLowerCase().trim();
    return cells
      .map((row, idx) => {
        const matches = row.some((cell) => (cell || '').toLowerCase().includes(q));
        return matches ? idx : -1;
      })
      .filter((idx) => idx !== -1);
  }, [cells, search]);

  return (
    <div className="space-y-6">
      {/* Title & Top Toolbar */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            <span>👥</span>
            <span>{lang === 'ar' ? 'شيت المتدربين المباشر (Trainee Sheet)' : 'Live Trainee Sheet'}</span>
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            {lang === 'ar'
              ? 'جدول بيانات المتدربين مع حفظ سحابي مشفر وسحب فوري للأكواد وتصدير التقارير'
              : 'Encrypted cloud spreadsheet for trainees, instant code allocation, and bulk CSV export.'}
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={handleExportCsv}
            className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-xl bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700/60 text-slate-200 transition-all shadow-sm"
          >
            <span>📥</span>
            <span>{lang === 'ar' ? 'تصدير CSV / Excel' : 'Export CSV'}</span>
          </button>

          <button
            onClick={handleAddRow}
            className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-xl bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700/60 text-slate-200 transition-all shadow-sm"
          >
            <span>➕</span>
            <span>{lang === 'ar' ? 'إضافة صف متدرب' : 'Add Row'}</span>
          </button>

          <button
            onClick={handleSaveSheet}
            disabled={saving || !hasUnsavedChanges}
            className={`inline-flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-xl transition-all shadow-lg ${
              hasUnsavedChanges
                ? 'bg-gradient-to-r from-teal-500 to-emerald-600 text-white shadow-teal-500/20 hover:brightness-110 active:scale-95'
                : 'bg-slate-800 text-slate-400 opacity-60 cursor-not-allowed'
            }`}
          >
            <span>💾</span>
            <span>
              {saving
                ? lang === 'ar'
                  ? 'جارٍ الحفظ…'
                  : 'Saving…'
                : hasUnsavedChanges
                ? lang === 'ar'
                  ? 'حفظ التعديلات ●'
                  : 'Save Changes ●'
                : lang === 'ar'
                ? 'تم الحفظ'
                : 'Saved'}
            </span>
          </button>
        </div>
      </div>

      {/* Filter / Search Bar */}
      <div className="bg-slate-900/50 backdrop-blur-md border border-slate-800/70 rounded-2xl p-3 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={lang === 'ar' ? 'بحث في أسماء المتدربين أو الأكواد أو الهوية…' : 'Search trainee, ID, code…'}
            className="w-full bg-slate-950/70 border border-slate-800 rounded-xl px-3.5 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-teal-500/60 transition-colors"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute end-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 text-xs"
            >
              ✕
            </button>
          )}
        </div>

        <div className="flex items-center gap-3 text-xs text-slate-400">
          <span>
            {lang === 'ar' ? `عدد الصفوف: ${cells.length}` : `Rows: ${cells.length}`}
          </span>
          {hasUnsavedChanges && (
            <span className="text-amber-400 flex items-center gap-1 font-medium">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping"></span>
              {lang === 'ar' ? 'توجد تعديلات غير محفوظة' : 'Unsaved changes'}
            </span>
          )}
        </div>
      </div>

      {/* Trainees Spreadsheet Grid */}
      <div className="bg-slate-900/60 backdrop-blur-md border border-slate-800/80 rounded-2xl overflow-hidden shadow-2xl">
        {loading ? (
          <div className="p-16 text-center text-slate-400">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-teal-500 mb-3"></div>
            <p className="text-sm font-medium">{lang === 'ar' ? 'جارٍ تحميل شيت المتدربين…' : 'Loading trainee spreadsheet…'}</p>
          </div>
        ) : (
          <div className="overflow-x-auto max-h-[680px]">
            <table className="w-full text-start text-xs border-collapse">
              <thead className="bg-slate-950 sticky top-0 z-20 shadow-md">
                <tr>
                  <th className="p-2.5 border-b border-e border-slate-800 text-slate-500 font-mono w-12 text-center">
                    #
                  </th>
                  {COLUMN_DEFS.map((col) => (
                    <th
                      key={col.id}
                      className={`p-2.5 border-b border-e border-slate-800 text-slate-300 font-semibold text-start whitespace-nowrap bg-slate-950/90 ${col.width}`}
                    >
                      {lang === 'ar' ? col.ar : col.en}
                    </th>
                  ))}
                  <th className="p-2.5 border-b border-slate-800 text-slate-400 w-24 text-center">
                    {lang === 'ar' ? 'إجراءات' : 'Actions'}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/40">
                {visibleRowIndices.map((rIdx) => {
                  const row = cells[rIdx] || [];
                  const codeVal = row[0] || '';
                  const resultVal = row[11] || '';

                  return (
                    <tr key={rIdx} className="hover:bg-slate-800/30 transition-colors group">
                      {/* Row Index */}
                      <td className="p-2 border-e border-slate-800/60 text-center font-mono text-slate-500 bg-slate-950/30">
                        {rIdx + 1}
                      </td>

                      {/* Code Cell */}
                      <td className="p-1 border-e border-slate-800/60 min-w-[180px]">
                        <div className="flex items-center gap-1">
                          <input
                            type="text"
                            value={codeVal}
                            onChange={(e) => handleCellChange(rIdx, 0, e.target.value)}
                            placeholder={lang === 'ar' ? 'كود القسيمة' : 'Voucher'}
                            className="w-full bg-transparent px-2 py-1 text-teal-400 font-mono font-bold focus:bg-slate-950 focus:outline-none focus:ring-1 focus:ring-teal-500 rounded"
                          />
                          {!codeVal && (
                            <button
                              type="button"
                              onClick={() => handleAssignCodeToRow(rIdx)}
                              title={lang === 'ar' ? 'سحب كود متاح تلقائياً' : 'Auto-allocate code'}
                              className="px-2 py-1 text-[10px] font-bold rounded bg-teal-500/20 text-teal-300 hover:bg-teal-500 hover:text-slate-950 whitespace-nowrap transition-colors"
                            >
                              ⚡ {lang === 'ar' ? 'سحب' : 'Draw'}
                            </button>
                          )}
                        </div>
                      </td>

                      {/* Other Columns (1 through 12) */}
                      {COLUMN_DEFS.slice(1).map((col) => {
                        const val = row[col.id] || '';
                        const isResult = col.id === 11;

                        if (isResult) {
                          return (
                            <td key={col.id} className="p-1 border-e border-slate-800/60 min-w-[110px]">
                              <select
                                value={val}
                                onChange={(e) => handleCellChange(rIdx, col.id, e.target.value)}
                                className={`w-full bg-slate-950 border border-slate-800/80 rounded px-2 py-1 text-xs font-bold focus:outline-none focus:border-teal-500 ${
                                  val === 'ناجح' || val.toLowerCase() === 'pass'
                                    ? 'text-emerald-400'
                                    : val === 'راسب' || val.toLowerCase() === 'fail'
                                    ? 'text-rose-400'
                                    : 'text-slate-300'
                                }`}
                              >
                                <option value="">—</option>
                                <option value="ناجح">{lang === 'ar' ? 'ناجح' : 'Pass'}</option>
                                <option value="راسب">{lang === 'ar' ? 'راسب' : 'Fail'}</option>
                                <option value="مؤجل">{lang === 'ar' ? 'مؤجل' : 'Pending'}</option>
                              </select>
                            </td>
                          );
                        }

                        return (
                          <td key={col.id} className="p-1 border-e border-slate-800/60">
                            <input
                              type="text"
                              value={val}
                              onChange={(e) => handleCellChange(rIdx, col.id, e.target.value)}
                              className="w-full bg-transparent px-2 py-1 text-slate-200 focus:bg-slate-950 focus:outline-none focus:ring-1 focus:ring-teal-500 rounded text-xs transition-colors"
                            />
                          </td>
                        );
                      })}

                      {/* Row Actions */}
                      <td className="p-1 text-center">
                        <button
                          type="button"
                          onClick={() => handleDeleteRow(rIdx)}
                          title={lang === 'ar' ? 'حذف هذا الصف' : 'Delete row'}
                          className="opacity-0 group-hover:opacity-100 p-1 text-slate-500 hover:text-rose-400 transition-all rounded hover:bg-slate-800"
                        >
                          ✕
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
