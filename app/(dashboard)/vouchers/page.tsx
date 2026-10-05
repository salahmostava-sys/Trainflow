'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useToast } from '@/components/Toast';
import {
  fetchInitialData,
  claimCode,
  importCodesToCategory,
  editCodeRow,
  deleteCodes,
} from '@/lib/supabase';
import { getTodayStr } from '@/lib/session';
import { TRANSLATIONS } from '@/lib/translations';
import type { CodeRow, SettingsPayload, Role } from '@/lib/types';

export default function VouchersPage() {
  const { showToast } = useToast();
  const [lang, setLang] = useState<'ar' | 'en'>('ar');
  const [role, setRole] = useState<Role>('operator');
  const [userId, setUserId] = useState<string>('');

  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState<string[]>([]);
  const [activeCategory, setActiveCategory] = useState<string>('');
  const [codes, setCodes] = useState<CodeRow[]>([]);
  const [settingsVersion, setSettingsVersion] = useState<number>(1);
  const [settings, setSettings] = useState<SettingsPayload | null>(null);

  // Search & Filter
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'available' | 'used'>('all');
  const [density, setDensity] = useState<'compact' | 'comfortable'>('comfortable');

  // Modals & Panels
  const [showAddModal, setShowAddModal] = useState(false);
  const [newCodesText, setNewCodesText] = useState('');
  const [addCategoryTarget, setAddCategoryTarget] = useState('');
  const [isSubmittingCodes, setIsSubmittingCodes] = useState(false);

  const [showDailyModal, setShowDailyModal] = useState(false);
  const [selectedCodes, setSelectedCodes] = useState<Set<string>>(new Set());

  // Edit modal
  const [editingCode, setEditingCode] = useState<CodeRow | null>(null);
  const [editNewCode, setEditNewCode] = useState('');
  const [editNotes, setEditNotes] = useState('');

  const t = TRANSLATIONS[lang];

  useEffect(() => {
    // Read session & preferences
    const storedLang = (localStorage.getItem('tf_lang') as 'ar' | 'en') || 'ar';
    setLang(storedLang);

    const storedUser = localStorage.getItem('tf_user');
    if (storedUser) {
      try {
        const u = JSON.parse(storedUser);
        setRole(u.role || 'operator');
        setUserId(u.id || '');
      } catch {}
    }

    loadData();
  }, []);

  async function loadData() {
    try {
      setLoading(true);
      const data = await fetchInitialData();
      setSettings(data.settings.payload);
      setSettingsVersion(data.settings.version);
      setCodes(data.codes);

      const cats: string[] =
        data.settings.payload?.categoryOrder && data.settings.payload.categoryOrder.length > 0
          ? data.settings.payload.categoryOrder
          : ['Foundation', 'Master', 'BIS', 'Corporate', 'CYBP'];

      setCategories(cats);
      setActiveCategory((prev) => (cats.includes(prev) ? prev : cats[0] || ''));
      setAddCategoryTarget((prev) => (cats.includes(prev) ? prev : cats[0] || ''));
    } catch (err: any) {
      showToast(err.message || 'Error loading voucher data', 'error');
    } finally {
      setLoading(false);
    }
  }

  // Filtered Codes
  const filteredCodes = useMemo(() => {
    return codes.filter((c) => {
      if (c.category !== activeCategory) return false;

      // Status filter
      if (statusFilter === 'available' && c.used_on) return false;
      if (statusFilter === 'used' && !c.used_on) return false;

      // Search filter
      if (search.trim()) {
        const q = search.toLowerCase().trim();
        const matchesCode = c.code.toLowerCase().includes(q);
        const matchesNotes = (c.notes || '').toLowerCase().includes(q);
        const matchesDate = (c.used_on || '').toLowerCase().includes(q);
        if (!matchesCode && !matchesNotes && !matchesDate) return false;
      }

      return true;
    });
  }, [codes, activeCategory, statusFilter, search]);

  // Statistics for active category
  const stats = useMemo(() => {
    const catCodes = codes.filter((c) => c.category === activeCategory);
    const today = getTodayStr();
    const available = catCodes.filter((c) => !c.used_on).length;
    const used = catCodes.filter((c) => c.used_on).length;
    const usedToday = catCodes.filter((c) => c.used_on === today).length;
    return { total: catCodes.length, available, used, usedToday };
  }, [codes, activeCategory]);

  // Codes used today across whole system
  const todayCodes = useMemo(() => {
    const today = getTodayStr();
    return codes.filter((c) => c.used_on === today);
  }, [codes]);

  // Handle Code Click (Claim & Copy)
  async function handleClaimCode(c: CodeRow) {
    if (c.used_on) {
      const confirmCopy = window.confirm(
        lang === 'ar'
          ? `هذا الكود مستخدم بالفعل بتاريخ ${c.used_on}. هل ترغب في نسخه مرة أخرى؟`
          : `This code was already used on ${c.used_on}. Do you still want to copy it?`
      );
      if (!confirmCopy) return;

      try {
        await navigator.clipboard.writeText(c.code);
        showToast(lang === 'ar' ? 'تم نسخ الكود المستخدم' : 'Used code copied to clipboard', 'info');
      } catch {
        showToast(t.copyFailed, 'error');
      }
      return;
    }

    try {
      const today = getTodayStr();
      await claimCode(c.code, c.version, today);
      await navigator.clipboard.writeText(c.code);

      // Optimistic update
      setCodes((prev) =>
        prev.map((item) =>
          item.code === c.code
            ? {
                ...item,
                used_on: today,
                used_at: new Date().toISOString(),
                used_by: userId,
                version: item.version + 1,
              }
            : item
        )
      );

      showToast(
        lang === 'ar'
          ? `تم نسخ الكود [${c.code}] وتسجيله كمستخدم`
          : `Code [${c.code}] claimed & copied!`,
        'success'
      );
    } catch (err: any) {
      showToast(err.message || 'Failed to claim code', 'error');
      loadData();
    }
  }

  // Handle Note Save
  async function handleSaveNote(code: string, newNote: string, row: CodeRow) {
    if (newNote === row.notes) return;
    try {
      await editCodeRow(
        row.code,
        row.code,
        row.category,
        row.used_on,
        newNote,
        row.version,
        settingsVersion
      );
      setCodes((prev) =>
        prev.map((item) =>
          item.code === code ? { ...item, notes: newNote, version: item.version + 1 } : item
        )
      );
      showToast(lang === 'ar' ? 'تم حفظ الملاحظة' : 'Note saved', 'info');
    } catch (err: any) {
      showToast(err.message || 'Error updating note', 'error');
    }
  }

  // Handle Import Multiple Codes
  async function handleAddCodesSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!newCodesText.trim()) return;

    const rawList = newCodesText
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line.length > 0);

    const uniqueNewCodes = Array.from(new Set(rawList));

    if (uniqueNewCodes.length === 0) return;

    setIsSubmittingCodes(true);
    try {
      await importCodesToCategory(addCategoryTarget, uniqueNewCodes);
      showToast(
        lang === 'ar'
          ? `تمت إضافة ${uniqueNewCodes.length} كود إلى فئة ${addCategoryTarget} بنجاح`
          : `Added ${uniqueNewCodes.length} codes to ${addCategoryTarget}`,
        'success'
      );
      setNewCodesText('');
      setShowAddModal(false);
      await loadData();
    } catch (err: any) {
      showToast(err.message || 'Error adding codes', 'error');
    } finally {
      setIsSubmittingCodes(false);
    }
  }

  // Handle Bulk Delete
  async function handleBulkDelete() {
    if (selectedCodes.size === 0) return;
    const confirmDelete = window.confirm(
      lang === 'ar'
        ? `هل أنت متأكد من حذف ${selectedCodes.size} كود نهائياً؟`
        : `Are you sure you want to permanently delete ${selectedCodes.size} codes?`
    );
    if (!confirmDelete) return;

    try {
      const toDelete = codes.filter((c) => selectedCodes.has(c.code));
      await deleteCodes(toDelete, settingsVersion);
      showToast(
        lang === 'ar' ? `تم حذف ${selectedCodes.size} كود بنجاح` : `Deleted ${selectedCodes.size} codes`,
        'success'
      );
      setSelectedCodes(new Set());
      await loadData();
    } catch (err: any) {
      showToast(err.message || 'Failed to delete codes', 'error');
    }
  }

  // Copy All Today Codes
  async function handleCopyAllToday() {
    if (todayCodes.length === 0) return;
    const text = todayCodes.map((c) => c.code).join('\n');
    try {
      await navigator.clipboard.writeText(text);
      showToast(
        lang === 'ar'
          ? `تم نسخ جميع أكواد اليوم (${todayCodes.length} كود)`
          : `Copied ${todayCodes.length} codes for today`,
        'success'
      );
    } catch {
      showToast(t.copyFailed, 'error');
    }
  }

  return (
    <div className="space-y-6">
      {/* Top Header & Metrics */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            <span>🎟️</span>
            <span>{lang === 'ar' ? 'إدارة أكواد القسائم (Vouchers)' : 'Voucher Codes Hub'}</span>
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            {lang === 'ar'
              ? 'اضغط على الكود لنسخه وتحديده كمستخدم تلقائياً وحفظه فوراً في قاعدة البيانات'
              : 'Click any voucher code to copy and mark it claimed instantly with real-time sync.'}
          </p>
        </div>

        {/* Global Action Buttons */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={() => setShowDailyModal(true)}
            className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-xl bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700/60 text-slate-200 transition-all shadow-sm"
          >
            <span>📅</span>
            <span>{lang === 'ar' ? `أكواد اليوم (${todayCodes.length})` : `Today's (${todayCodes.length})`}</span>
          </button>

          {role === 'admin' && (
            <button
              onClick={() => setShowAddModal(true)}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-xl bg-gradient-to-r from-teal-500 to-emerald-600 text-white shadow-lg shadow-teal-500/20 hover:brightness-110 active:scale-95 transition-all"
            >
              <span>➕</span>
              <span>{lang === 'ar' ? 'إضافة أكواد جديدة' : 'Add New Codes'}</span>
            </button>
          )}

          {role === 'admin' && selectedCodes.size > 0 && (
            <button
              onClick={handleBulkDelete}
              className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-xl bg-rose-900/60 hover:bg-rose-800/70 border border-rose-700/50 text-rose-200 transition-all"
            >
              <span>🗑️</span>
              <span>{lang === 'ar' ? `حذف المحدد (${selectedCodes.size})` : `Delete (${selectedCodes.size})`}</span>
            </button>
          )}
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-slate-900/60 backdrop-blur-md border border-slate-800/70 rounded-2xl p-4 flex flex-col justify-between">
          <span className="text-xs text-slate-400 font-medium">{lang === 'ar' ? 'إجمالي فئة' : 'Category Total'}</span>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-bold text-white">{stats.total}</span>
            <span className="text-xs text-teal-400 font-medium px-2 py-0.5 rounded-full bg-teal-500/10">
              {activeCategory}
            </span>
          </div>
        </div>

        <div className="bg-slate-900/60 backdrop-blur-md border border-slate-800/70 rounded-2xl p-4 flex flex-col justify-between">
          <span className="text-xs text-emerald-400 font-medium">{lang === 'ar' ? 'متاح للنسخ' : 'Available'}</span>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-bold text-emerald-400">{stats.available}</span>
            <span className="text-xs text-slate-500 font-medium">
              {stats.total > 0 ? Math.round((stats.available / stats.total) * 100) : 0}%
            </span>
          </div>
        </div>

        <div className="bg-slate-900/60 backdrop-blur-md border border-slate-800/70 rounded-2xl p-4 flex flex-col justify-between">
          <span className="text-xs text-slate-400 font-medium">{lang === 'ar' ? 'مستخدم مسبقاً' : 'Used'}</span>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-bold text-slate-300">{stats.used}</span>
            <span className="text-xs text-slate-500 font-medium">
              {stats.total > 0 ? Math.round((stats.used / stats.total) * 100) : 0}%
            </span>
          </div>
        </div>

        <div className="bg-slate-900/60 backdrop-blur-md border border-slate-800/70 rounded-2xl p-4 flex flex-col justify-between">
          <span className="text-xs text-amber-400 font-medium">{lang === 'ar' ? 'مستخدم اليوم' : 'Used Today'}</span>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-bold text-amber-400">{stats.usedToday}</span>
            <span className="text-xs text-amber-500/80 font-mono">📅 {getTodayStr()}</span>
          </div>
        </div>
      </div>

      {/* Categories Bar */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none border-b border-slate-800/80">
        {categories.map((cat) => {
          const catCodes = codes.filter((c) => c.category === cat);
          const avail = catCodes.filter((c) => !c.used_on).length;
          const isActive = activeCategory === cat;

          return (
            <button
              key={cat}
              onClick={() => {
                setActiveCategory(cat);
                setSelectedCodes(new Set());
              }}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium text-xs whitespace-nowrap transition-all ${
                isActive
                  ? 'bg-teal-500/20 text-teal-300 border border-teal-500/40 shadow-sm'
                  : 'bg-slate-900/50 text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 border border-slate-800/50'
              }`}
            >
              <span>{cat}</span>
              <span
                className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                  isActive ? 'bg-teal-500 text-slate-950' : 'bg-slate-800 text-slate-400'
                }`}
              >
                {avail}
              </span>
            </button>
          );
        })}
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-slate-900/50 backdrop-blur-md border border-slate-800/70 rounded-2xl p-3.5 flex flex-col sm:flex-row items-center justify-between gap-3">
        {/* Search Input */}
        <div className="relative w-full sm:w-80">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={lang === 'ar' ? 'بحث بالكود أو الملاحظات أو التاريخ…' : 'Search code, notes, date…'}
            className="w-full bg-slate-950/70 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-teal-500/60 transition-colors"
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

        {/* Filters */}
        <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
          {/* Status Segmented Control */}
          <div className="inline-flex bg-slate-950/80 p-1 rounded-xl border border-slate-800 text-xs">
            <button
              onClick={() => setStatusFilter('all')}
              className={`px-3 py-1.5 rounded-lg transition-colors ${
                statusFilter === 'all' ? 'bg-slate-800 text-white font-medium' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {lang === 'ar' ? 'الكل' : 'All'}
            </button>
            <button
              onClick={() => setStatusFilter('available')}
              className={`px-3 py-1.5 rounded-lg transition-colors ${
                statusFilter === 'available'
                  ? 'bg-emerald-500/20 text-emerald-300 font-medium'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {lang === 'ar' ? 'متاح فقط' : 'Available'}
            </button>
            <button
              onClick={() => setStatusFilter('used')}
              className={`px-3 py-1.5 rounded-lg transition-colors ${
                statusFilter === 'used'
                  ? 'bg-slate-800 text-slate-300 font-medium'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {lang === 'ar' ? 'مستخدم فقط' : 'Used'}
            </button>
          </div>

          {/* Density Toggle */}
          <button
            onClick={() => setDensity(density === 'compact' ? 'comfortable' : 'compact')}
            className="p-2 rounded-xl bg-slate-950/80 border border-slate-800 text-slate-400 hover:text-slate-200 text-xs"
            title={density === 'compact' ? t.codeDensityComfortable : t.codeDensityCompact}
          >
            {density === 'compact' ? '📐 مريح' : '📏 مدمج'}
          </button>
        </div>
      </div>

      {/* Voucher Codes Table / List */}
      <div className="bg-slate-900/60 backdrop-blur-md border border-slate-800/80 rounded-2xl overflow-hidden shadow-xl">
        {loading ? (
          <div className="p-12 text-center text-slate-400">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-teal-500 mb-3"></div>
            <p className="text-sm font-medium">{lang === 'ar' ? 'جارٍ تحميل الأكواد…' : 'Loading voucher codes…'}</p>
          </div>
        ) : filteredCodes.length === 0 ? (
          <div className="p-12 text-center text-slate-400">
            <div className="text-4xl mb-3">📭</div>
            <p className="text-sm font-medium">
              {lang === 'ar' ? 'لا توجد أكواد تطابق معايير البحث أو التصفية' : 'No codes found for this criteria'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-start text-xs">
              <thead className="bg-slate-950/70 border-b border-slate-800/80 text-slate-400 uppercase tracking-wider font-semibold">
                <tr>
                  {role === 'admin' && (
                    <th className="p-3 w-10 text-center">
                      <input
                        type="checkbox"
                        checked={
                          filteredCodes.length > 0 &&
                          filteredCodes.every((c) => selectedCodes.has(c.code))
                        }
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedCodes(new Set(filteredCodes.map((c) => c.code)));
                          } else {
                            setSelectedCodes(new Set());
                          }
                        }}
                        className="rounded border-slate-700 text-teal-600 focus:ring-teal-500 bg-slate-900 cursor-pointer"
                      />
                    </th>
                  )}
                  <th className="p-3 text-start w-16">#</th>
                  <th className="p-3 text-start">{lang === 'ar' ? 'رمز الكود' : 'Voucher Code'}</th>
                  <th className="p-3 text-start">{lang === 'ar' ? 'الحالة' : 'Status'}</th>
                  <th className="p-3 text-start">{lang === 'ar' ? 'تاريخ الاستخدام' : 'Used Date'}</th>
                  <th className="p-3 text-start">{lang === 'ar' ? 'الملاحظات' : 'Notes'}</th>
                  <th className="p-3 text-end w-24">{lang === 'ar' ? 'إجراء' : 'Action'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50">
                {filteredCodes.map((row, idx) => {
                  const isUsed = !!row.used_on;
                  const isSelected = selectedCodes.has(row.code);

                  return (
                    <tr
                      key={row.code}
                      className={`group transition-colors ${
                        isSelected
                          ? 'bg-teal-500/10'
                          : isUsed
                          ? 'bg-slate-950/40 text-slate-400 hover:bg-slate-900/60'
                          : 'hover:bg-slate-800/40 text-slate-200'
                      }`}
                    >
                      {role === 'admin' && (
                        <td className="p-3 text-center">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={(e) => {
                              const next = new Set(selectedCodes);
                              if (e.target.checked) next.add(row.code);
                              else next.delete(row.code);
                              setSelectedCodes(next);
                            }}
                            className="rounded border-slate-700 text-teal-600 focus:ring-teal-500 bg-slate-900 cursor-pointer"
                          />
                        </td>
                      )}
                      <td className="p-3 font-mono text-slate-500">{idx + 1}</td>
                      <td className="p-3">
                        <button
                          onClick={() => handleClaimCode(row)}
                          className={`font-mono text-start tracking-wider font-bold transition-all flex items-center gap-2 group-hover:scale-[1.01] ${
                            isUsed
                              ? 'line-through text-slate-400 hover:text-slate-200'
                              : 'text-teal-400 hover:text-teal-300'
                          } ${density === 'compact' ? 'text-xs' : 'text-sm'}`}
                        >
                          <span>{row.code}</span>
                          <span className="text-slate-500 opacity-0 group-hover:opacity-100 transition-opacity text-xs font-normal">
                            📋 {t.copyBtn}
                          </span>
                        </button>
                      </td>
                      <td className="p-3">
                        {isUsed ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-slate-800 text-slate-300 border border-slate-700/60">
                            <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span>
                            <span>{lang === 'ar' ? 'مستخدم' : 'Used'}</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                            <span>{lang === 'ar' ? 'جاهز للاستخدام' : 'Available'}</span>
                          </span>
                        )}
                      </td>
                      <td className="p-3 font-mono text-slate-400">
                        {row.used_on ? (
                          <div className="flex flex-col">
                            <span>{row.used_on}</span>
                            {row.used_at && (
                              <span className="text-[10px] text-slate-500">
                                {new Date(row.used_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-600">—</span>
                        )}
                      </td>
                      <td className="p-3">
                        <input
                          type="text"
                          defaultValue={row.notes || ''}
                          disabled={role === 'copy_only'}
                          onBlur={(e) => handleSaveNote(row.code, e.target.value.trim(), row)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              (e.target as HTMLInputElement).blur();
                            }
                          }}
                          placeholder={role !== 'copy_only' ? (lang === 'ar' ? 'ملاحظة…' : 'Add note…') : ''}
                          className="w-full bg-transparent border border-transparent hover:border-slate-800 focus:border-teal-500/60 focus:bg-slate-950/70 rounded-lg px-2.5 py-1 text-slate-300 placeholder-slate-600 text-xs transition-colors"
                        />
                      </td>
                      <td className="p-3 text-end">
                        <div className="inline-flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => handleClaimCode(row)}
                            title={t.copyBtn}
                            className="p-1.5 rounded-lg bg-slate-800/60 hover:bg-teal-500 hover:text-slate-950 text-slate-300 transition-colors"
                          >
                            📋
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal: Add New Codes */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-lg p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <span>➕</span>
                <span>{lang === 'ar' ? 'إضافة أكواد جديدة' : 'Add New Voucher Codes'}</span>
              </h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-slate-200 text-lg"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddCodesSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  {lang === 'ar' ? 'الفئة المستهدفة' : 'Target Category'}
                </label>
                <select
                  value={addCategoryTarget}
                  onChange={(e) => setAddCategoryTarget(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-teal-500"
                >
                  {categories.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  {lang === 'ar' ? 'قائمة الأكواد (كود في كل سطر)' : 'Codes List (one code per line)'}
                </label>
                <textarea
                  rows={8}
                  value={newCodesText}
                  onChange={(e) => setNewCodesText(e.target.value)}
                  placeholder={`VOUCHER-001\nVOUCHER-002\nVOUCHER-003`}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 font-mono text-xs text-white placeholder-slate-600 focus:outline-none focus:border-teal-500"
                  required
                />
                <span className="text-[11px] text-slate-400">
                  {lang === 'ar'
                    ? 'سيتم حذف الأسطر الفارغة وإزالة التكرارات تلقائياً.'
                    : 'Blank lines and duplicates will be automatically removed.'}
                </span>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 text-xs font-semibold rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300"
                >
                  {lang === 'ar' ? 'إلغاء' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingCodes}
                  className="px-5 py-2 text-xs font-semibold rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold transition-all disabled:opacity-50"
                >
                  {isSubmittingCodes
                    ? lang === 'ar'
                      ? 'جارٍ الحفظ…'
                      : 'Saving…'
                    : lang === 'ar'
                    ? 'حفظ الأكواد في النظام'
                    : 'Save Codes to System'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Today's Used Codes */}
      {showDailyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-lg p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <span>📅</span>
                  <span>{lang === 'ar' ? 'الأكواد المستخدمة اليوم' : "Today's Used Codes"}</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  {getTodayStr()} — {todayCodes.length} {lang === 'ar' ? 'كود مستخدم' : 'codes used'}
                </p>
              </div>
              <button
                onClick={() => setShowDailyModal(false)}
                className="text-slate-400 hover:text-slate-200 text-lg"
              >
                ✕
              </button>
            </div>

            {todayCodes.length === 0 ? (
              <div className="py-8 text-center text-slate-400 text-sm">
                {lang === 'ar' ? 'لم يتم استخدام أي كود اليوم بعد.' : 'No codes have been used today yet.'}
              </div>
            ) : (
              <div className="space-y-3">
                <div className="max-h-64 overflow-y-auto space-y-2 pe-1">
                  {todayCodes.map((c) => (
                    <div
                      key={c.code}
                      className="flex items-center justify-between p-2.5 rounded-xl bg-slate-950/60 border border-slate-800/80 text-xs font-mono"
                    >
                      <span className="text-teal-400 font-bold">{c.code}</span>
                      <span className="text-slate-400 px-2 py-0.5 rounded-md bg-slate-800 text-[10px]">
                        {c.category}
                      </span>
                    </div>
                  ))}
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-slate-800">
                  <span className="text-xs text-slate-400 font-medium">
                    {lang === 'ar' ? `المجموع: ${todayCodes.length}` : `Total: ${todayCodes.length}`}
                  </span>
                  <button
                    onClick={handleCopyAllToday}
                    className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 transition-all shadow-md shadow-teal-500/20"
                  >
                    <span>📋</span>
                    <span>{lang === 'ar' ? 'نسخ جميع أكواد اليوم' : 'Copy All Codes'}</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
