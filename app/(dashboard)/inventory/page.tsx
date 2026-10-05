'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useToast } from '@/components/Toast';
import { fetchInitialData, changeSupervisorStock } from '@/lib/supabase';
import { getTodayStr } from '@/lib/session';
import { TRANSLATIONS } from '@/lib/translations';
import type { StockRecord, CodeRow, SettingsPayload, Role } from '@/lib/types';

export default function InventoryPage() {
  const { showToast } = useToast();
  const [lang, setLang] = useState<'ar' | 'en'>('ar');
  const [role, setRole] = useState<Role>('operator');

  const [loading, setLoading] = useState(true);
  const [codes, setCodes] = useState<CodeRow[]>([]);
  const [stockMap, setStockMap] = useState<Record<string, number>>({});
  const [categories, setCategories] = useState<string[]>([]);
  const [settingsPayload, setSettingsPayload] = useState<SettingsPayload | null>(null);

  // Report settings
  const [reportLang, setReportLang] = useState<'ar' | 'en'>('ar');
  const [supervisorName, setSupervisorName] = useState<string>('');

  // Stock edit form
  const [targetCategory, setTargetCategory] = useState<string>('');
  const [editMode, setEditMode] = useState<'opening' | 'replenishment' | 'correction'>('correction');
  const [quantityInput, setQuantityInput] = useState<string>('');
  const [isUpdating, setIsUpdating] = useState(false);

  const t = TRANSLATIONS[lang];

  useEffect(() => {
    const storedLang = (localStorage.getItem('tf_lang') as 'ar' | 'en') || 'ar';
    setLang(storedLang);
    setReportLang(storedLang);

    const storedUser = localStorage.getItem('tf_user');
    if (storedUser) {
      try {
        const u = JSON.parse(storedUser);
        setRole(u.role || 'operator');
      } catch {}
    }

    loadData();
  }, []);

  async function loadData() {
    try {
      setLoading(true);
      const data = await fetchInitialData();
      setCodes(data.codes);

      const sm: Record<string, number> = {};
      data.stock.forEach((s) => {
        sm[s.category] = s.remaining;
      });
      setStockMap(sm);

      const p = data.settings.payload || {};
      setSettingsPayload(p);
      setSupervisorName(p.inventorySupervisorName || (lang === 'ar' ? 'المشرف' : 'Supervisor'));
      setReportLang(p.inventoryMessageLanguage || lang);

      const cats =
        p.categoryOrder && p.categoryOrder.length > 0
          ? p.categoryOrder
          : ['Foundation', 'Master', 'BIS', 'Corporate', 'CYBP'];

      setCategories(cats);
      if (cats.length > 0 && !targetCategory) {
        setTargetCategory(cats[0]);
      }
    } catch (err: any) {
      showToast(err.message || 'Error loading inventory', 'error');
    } finally {
      setLoading(false);
    }
  }

  // Available codes by category (with me)
  const availableByCategory = useMemo(() => {
    const map: Record<string, number> = {};
    for (const cat of categories) {
      map[cat] = 0;
    }
    for (const row of codes) {
      if (!row.used_on) {
        map[row.category] = (map[row.category] || 0) + 1;
      }
    }
    return map;
  }, [codes, categories]);

  // Total metrics
  const totals = useMemo(() => {
    let mine = 0;
    let theirs = 0;
    for (const cat of categories) {
      mine += availableByCategory[cat] || 0;
      if (Object.hasOwn(stockMap, cat)) {
        theirs += stockMap[cat];
      }
    }
    return { mine, theirs, total: mine + theirs };
  }, [availableByCategory, stockMap, categories]);

  // Formatted report string
  const formattedReport = useMemo(() => {
    const dateStr = getTodayStr();
    const dict = TRANSLATIONS[reportLang];
    const sName = supervisorName.trim() || (reportLang === 'ar' ? 'المشرف' : 'Supervisor');

    const lines: string[] = [];
    lines.push(reportLang === 'ar' ? `التاريخ: ${dateStr}` : `Date: ${dateStr}`);
    lines.push('');

    // Mine section
    lines.push(reportLang === 'ar' ? 'الأكواد معايا:' : 'Codes with me:');
    for (const cat of categories) {
      lines.push(`${cat}: ${availableByCategory[cat] || 0}`);
    }
    lines.push('');

    // Supervisor section
    lines.push(reportLang === 'ar' ? `الأكواد مع ${sName}:` : `Codes with ${sName}:`);
    for (const cat of categories) {
      const val = Object.hasOwn(stockMap, cat) ? stockMap[cat] : (reportLang === 'ar' ? 'لم يُحدد' : 'Not set');
      lines.push(`${cat}: ${val}`);
    }
    lines.push('');

    // Combined section
    lines.push(reportLang === 'ar' ? 'إجمالي الأكواد:' : 'Total Codes:');
    for (const cat of categories) {
      const val = Object.hasOwn(stockMap, cat)
        ? (availableByCategory[cat] || 0) + stockMap[cat]
        : (reportLang === 'ar' ? 'لم يُحدد' : 'Not set');
      lines.push(`${cat}: ${val}`);
    }
    lines.push('');

    const overall = categories.every((cat) => Object.hasOwn(stockMap, cat))
      ? totals.total
      : (reportLang === 'ar' ? 'لم يُحدد' : 'Not set');

    lines.push(reportLang === 'ar' ? `الإجمالي الكلي: ${overall}` : `Overall Total: ${overall}`);

    return lines.join('\n');
  }, [categories, availableByCategory, stockMap, reportLang, supervisorName, totals]);

  // Handle Copy Report
  async function handleCopyReport() {
    try {
      await navigator.clipboard.writeText(formattedReport);
      showToast(
        lang === 'ar' ? 'تم نسخ تقرير المخزون بنجاح' : 'Inventory report copied to clipboard!',
        'success'
      );
    } catch {
      showToast(t.copyFailed, 'error');
    }
  }

  // Handle Stock Update
  async function handleStockSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!targetCategory) return;
    const qty = parseInt(quantityInput, 10);
    if (isNaN(qty) || qty < 0) {
      showToast(lang === 'ar' ? 'الرجاء إدخال رقم صحيح غير سالب' : 'Please enter a valid non-negative number', 'error');
      return;
    }

    setIsUpdating(true);
    try {
      await changeSupervisorStock(targetCategory, editMode, qty);

      // Optimistic local update
      setStockMap((prev) => {
        const next = { ...prev };
        if (editMode === 'opening' || editMode === 'correction') {
          next[targetCategory] = qty;
        } else if (editMode === 'replenishment') {
          next[targetCategory] = (next[targetCategory] || 0) + qty;
        }
        return next;
      });

      showToast(
        lang === 'ar'
          ? `تم تحديث رصيد المشرف لفئة [${targetCategory}] بنجاح`
          : `Supervisor stock updated for [${targetCategory}]`,
        'success'
      );
      setQuantityInput('');
    } catch (err: any) {
      showToast(err.message || 'Error updating stock', 'error');
    } finally {
      setIsUpdating(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Page Title */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            <span>📦</span>
            <span>{lang === 'ar' ? 'إدارة المخزون والأرصدة' : 'Stock & Inventory Hub'}</span>
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            {lang === 'ar'
              ? 'متابعة حية للأكواد المتاحة في النظام مقابل أرصدة المشرف، وتوليد تقارير المخزون الموحدة'
              : 'Real-time tracking of active database vouchers vs supervisor stock balances with one-click report generation.'}
          </p>
        </div>

        <button
          onClick={handleCopyReport}
          className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-bold rounded-xl bg-gradient-to-r from-teal-500 to-emerald-600 text-white shadow-lg shadow-teal-500/20 hover:brightness-110 active:scale-95 transition-all self-start md:self-auto"
        >
          <span>📋</span>
          <span>{lang === 'ar' ? 'نسخ تقرير المخزون' : 'Copy Inventory Report'}</span>
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-slate-900/60 backdrop-blur-md border border-slate-800/80 rounded-2xl p-4.5 flex flex-col justify-between shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400 font-medium">{lang === 'ar' ? 'الأكواد معايا (في النظام)' : 'With Me (Available in DB)'}</span>
            <span className="text-lg">💻</span>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-3xl font-extrabold text-teal-400">{totals.mine}</span>
            <span className="text-xs text-slate-500">{lang === 'ar' ? 'كود متاح' : 'available codes'}</span>
          </div>
        </div>

        <div className="bg-slate-900/60 backdrop-blur-md border border-slate-800/80 rounded-2xl p-4.5 flex flex-col justify-between shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400 font-medium">
              {lang === 'ar' ? `الأكواد مع ${supervisorName || 'المشرف'}` : `With ${supervisorName || 'Supervisor'}`}
            </span>
            <span className="text-lg">👔</span>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-3xl font-extrabold text-indigo-400">{totals.theirs}</span>
            <span className="text-xs text-slate-500">{lang === 'ar' ? 'رصيد المشرف' : 'supervisor stock'}</span>
          </div>
        </div>

        <div className="bg-slate-900/60 backdrop-blur-md border border-slate-800/80 rounded-2xl p-4.5 flex flex-col justify-between shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400 font-medium">{lang === 'ar' ? 'الإجمالي الكلي المتاح' : 'Overall Combined Stock'}</span>
            <span className="text-lg">🌐</span>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-3xl font-extrabold text-white">{totals.total}</span>
            <span className="text-xs text-emerald-400 font-medium">{categories.length} {lang === 'ar' ? 'فئات' : 'categories'}</span>
          </div>
        </div>
      </div>

      {/* Main Grid: Breakdown Table & Live Report */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Inventory Breakdown Table (7 Cols) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="bg-slate-900/60 backdrop-blur-md border border-slate-800/80 rounded-2xl overflow-hidden shadow-xl">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between">
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                <span>📊</span>
                <span>{lang === 'ar' ? 'تفصيل الأرصدة حسب الفئة' : 'Stock Breakdown by Category'}</span>
              </h2>
              <span className="text-xs text-slate-400">
                {categories.length} {lang === 'ar' ? 'فئات مسجلة' : 'Categories'}
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-start text-xs">
                <thead className="bg-slate-950/70 border-b border-slate-800/80 text-slate-400 uppercase tracking-wider font-semibold">
                  <tr>
                    <th className="p-3.5 text-start">{lang === 'ar' ? 'الفئة' : 'Category'}</th>
                    <th className="p-3.5 text-center text-teal-400">{lang === 'ar' ? 'معايا' : 'With Me'}</th>
                    <th className="p-3.5 text-center text-indigo-400">{lang === 'ar' ? 'مع المشرف' : 'Supervisor'}</th>
                    <th className="p-3.5 text-center text-white">{lang === 'ar' ? 'المجموع' : 'Total'}</th>
                    <th className="p-3.5 text-end">{lang === 'ar' ? 'الحالة' : 'Status'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/50">
                  {categories.map((cat) => {
                    const mine = availableByCategory[cat] || 0;
                    const configured = Object.hasOwn(stockMap, cat);
                    const sup = configured ? stockMap[cat] : null;
                    const combined = sup !== null ? mine + sup : null;

                    return (
                      <tr key={cat} className="hover:bg-slate-800/30 transition-colors">
                        <td className="p-3.5 font-bold text-white flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-teal-500"></span>
                          <span>{cat}</span>
                        </td>
                        <td className="p-3.5 text-center font-mono font-bold text-teal-400 text-sm">
                          {mine}
                        </td>
                        <td className="p-3.5 text-center font-mono font-bold text-indigo-400 text-sm">
                          {sup !== null ? sup : <span className="text-slate-500 text-xs font-normal">{lang === 'ar' ? 'لم يُحدد' : 'Not set'}</span>}
                        </td>
                        <td className="p-3.5 text-center font-mono font-bold text-white text-sm">
                          {combined !== null ? combined : <span className="text-slate-500 text-xs font-normal">—</span>}
                        </td>
                        <td className="p-3.5 text-end">
                          {combined !== null && combined > 10 ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                              {lang === 'ar' ? 'متوفر' : 'Healthy'}
                            </span>
                          ) : combined !== null ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                              {lang === 'ar' ? 'منخفض' : 'Low'}
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-800 text-slate-400 border border-slate-700">
                              {lang === 'ar' ? 'غير مكتمل' : 'Incomplete'}
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Admin Stock Management */}
          {role === 'admin' && (
            <div className="bg-slate-900/60 backdrop-blur-md border border-slate-800/80 rounded-2xl p-5 shadow-xl space-y-4">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <span>⚙️</span>
                <span>{lang === 'ar' ? 'تحديث رصيد المشرف (صلاحيات المسؤول)' : 'Adjust Supervisor Stock'}</span>
              </h3>

              <form onSubmit={handleStockSubmit} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                      {lang === 'ar' ? 'الفئة' : 'Category'}
                    </label>
                    <select
                      value={targetCategory}
                      onChange={(e) => setTargetCategory(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-teal-500"
                    >
                      {categories.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                      {lang === 'ar' ? 'نوع التعديل' : 'Operation Type'}
                    </label>
                    <select
                      value={editMode}
                      onChange={(e) => setEditMode(e.target.value as any)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-teal-500"
                    >
                      <option value="correction">{lang === 'ar' ? 'تصحيح الرصيد (تعيين القيمة)' : 'Correction (Set balance)'}</option>
                      <option value="replenishment">{lang === 'ar' ? 'إضافة أكواد جديدة مشتراة' : 'Replenish (Add codes)'}</option>
                      <option value="opening">{lang === 'ar' ? 'تحديد الرصيد المبدئي' : 'Opening balance'}</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                      {lang === 'ar' ? 'الكمية' : 'Quantity'}
                    </label>
                    <input
                      type="number"
                      min={0}
                      value={quantityInput}
                      onChange={(e) => setQuantityInput(e.target.value)}
                      placeholder="0"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 font-mono text-xs text-white focus:outline-none focus:border-teal-500"
                      required
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <span className="text-xs text-slate-400">
                    {lang === 'ar'
                      ? `الرصيد الحالي لفئة [${targetCategory}]: ${
                          Object.hasOwn(stockMap, targetCategory) ? stockMap[targetCategory] : 'لم يُحدد'
                        }`
                      : `Current balance for [${targetCategory}]: ${
                          Object.hasOwn(stockMap, targetCategory) ? stockMap[targetCategory] : 'Not set'
                        }`}
                  </span>
                  <button
                    type="submit"
                    disabled={isUpdating}
                    className="px-4 py-2 text-xs font-bold rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 transition-all disabled:opacity-50 shadow-md shadow-teal-500/20"
                  >
                    {isUpdating ? (lang === 'ar' ? 'جارٍ التحديث…' : 'Updating…') : lang === 'ar' ? 'حفظ الرصيد' : 'Save Balance'}
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>

        {/* Live Formatted Report Box (5 Cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-slate-900/60 backdrop-blur-md border border-slate-800/80 rounded-2xl p-5 shadow-xl flex flex-col justify-between h-full">
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <span>📝</span>
                  <span>{lang === 'ar' ? 'معاينة رسالة المخزون' : 'Formatted Report Preview'}</span>
                </h3>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setReportLang(reportLang === 'ar' ? 'en' : 'ar')}
                    className="px-2.5 py-1 rounded-lg bg-slate-800 text-slate-300 text-[11px] font-bold hover:bg-slate-700"
                  >
                    {reportLang === 'ar' ? 'عربي' : 'English'}
                  </button>
                </div>
              </div>

              {/* Report Preview Pre */}
              <div
                dir={reportLang === 'ar' ? 'rtl' : 'ltr'}
                className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 font-mono text-xs text-teal-300 whitespace-pre-wrap leading-relaxed max-h-[380px] overflow-y-auto select-all"
              >
                {formattedReport}
              </div>
            </div>

            <div className="pt-4 border-t border-slate-800 mt-4 flex items-center justify-between">
              <span className="text-[11px] text-slate-500">
                {lang === 'ar' ? 'جاهز للمشاركة الفورية مع الإدارة والمشرفين' : 'Ready to paste & share with management'}
              </span>
              <button
                onClick={handleCopyReport}
                className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 transition-all shadow-md shadow-teal-500/20"
              >
                <span>📋</span>
                <span>{lang === 'ar' ? 'نسخ الرسالة' : 'Copy Message'}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
