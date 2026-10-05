'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useToast } from '@/components/Toast';
import { fetchInitialData, applyChanges } from '@/lib/supabase';
import { TRANSLATIONS } from '@/lib/translations';
import type { KeycodeItem, SettingsPayload, Role } from '@/lib/types';

export default function KeycodesPage() {
  const { showToast } = useToast();
  const [lang, setLang] = useState<'ar' | 'en'>('ar');
  const [role, setRole] = useState<Role>('operator');

  const [loading, setLoading] = useState(true);
  const [keycodes, setKeycodes] = useState<KeycodeItem[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [settingsPayload, setSettingsPayload] = useState<SettingsPayload | null>(null);
  const [settingsVersion, setSettingsVersion] = useState<number>(1);

  // Search & Filters
  const [search, setSearch] = useState('');
  const [langFilter, setLangFilter] = useState<'all' | 'Arabic' | 'English'>('all');

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingItem, setEditingItem] = useState<KeycodeItem | null>(null);
  const [formTitle, setFormTitle] = useState('');
  const [formCode, setFormCode] = useState('');
  const [formLang, setFormLang] = useState<'Arabic' | 'English'>('Arabic');
  const [formCategory, setFormCategory] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const t = TRANSLATIONS[lang];

  useEffect(() => {
    const storedLang = (localStorage.getItem('tf_lang') as 'ar' | 'en') || 'ar';
    setLang(storedLang);

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
      const p = data.settings.payload || {};
      setSettingsPayload(p);
      setSettingsVersion(data.settings.version);

      const kcList: KeycodeItem[] = Array.isArray(p.keycodes) ? p.keycodes : [];
      setKeycodes(kcList);

      const cats =
        p.categoryOrder && p.categoryOrder.length > 0
          ? p.categoryOrder
          : Array.from(new Set(kcList.map((k) => k.category).filter(Boolean)));

      setCategories(cats);
      if (cats.length > 0 && !formCategory) {
        setFormCategory(cats[0]);
      }
    } catch (err: any) {
      showToast(err.message || 'Error loading keycodes', 'error');
    } finally {
      setLoading(false);
    }
  }

  // Filtered keycodes
  const filteredKeycodes = useMemo(() => {
    return keycodes.filter((item) => {
      if (activeCategory !== 'all' && item.category !== activeCategory) return false;
      if (langFilter !== 'all' && item.lang !== langFilter) return false;

      if (search.trim()) {
        const q = search.toLowerCase().trim();
        const matchesTitle = item.title.toLowerCase().includes(q);
        const matchesCode = item.code.toLowerCase().includes(q);
        const matchesCat = item.category.toLowerCase().includes(q);
        if (!matchesTitle && !matchesCode && !matchesCat) return false;
      }

      return true;
    });
  }, [keycodes, activeCategory, langFilter, search]);

  // Copy Keycode
  async function handleCopy(code: string, title: string) {
    try {
      await navigator.clipboard.writeText(code);
      showToast(
        lang === 'ar'
          ? `تم نسخ مفتاح [${title}]: ${code}`
          : `Copied keycode [${title}]: ${code}`,
        'success'
      );
    } catch {
      showToast(t.copyFailed, 'error');
    }
  }

  // Save or Add Keycode
  async function handleSaveKeycode(e: React.FormEvent) {
    e.preventDefault();
    if (!formTitle.trim() || !formCode.trim()) return;

    if (!settingsPayload) return;

    setIsSaving(true);
    try {
      let updatedList = [...keycodes];

      if (editingItem) {
        // Edit existing
        updatedList = updatedList.map((item) =>
          item.code === editingItem.code
            ? {
                title: formTitle.trim(),
                code: formCode.trim(),
                lang: formLang,
                category: formCategory,
              }
            : item
        );
      } else {
        // Check duplicate
        if (updatedList.some((item) => item.code.toLowerCase() === formCode.trim().toLowerCase())) {
          showToast(lang === 'ar' ? 'هذا الرمز موجود مسبقاً!' : 'Keycode already exists!', 'error');
          setIsSaving(false);
          return;
        }

        updatedList.push({
          title: formTitle.trim(),
          code: formCode.trim(),
          lang: formLang,
          category: formCategory,
        });
      }

      const nextPayload: SettingsPayload = {
        ...settingsPayload,
        keycodes: updatedList,
      };

      await applyChanges([], nextPayload, settingsVersion);
      showToast(
        lang === 'ar' ? 'تم حفظ مفاتيح الأكواد بنجاح' : 'Keycodes saved successfully',
        'success'
      );

      setShowAddModal(false);
      setEditingItem(null);
      setFormTitle('');
      setFormCode('');
      await loadData();
    } catch (err: any) {
      showToast(err.message || 'Error saving keycode', 'error');
    } finally {
      setIsSaving(false);
    }
  }

  // Delete Keycode
  async function handleDeleteKeycode(item: KeycodeItem) {
    if (!settingsPayload) return;
    const confirmDelete = window.confirm(
      lang === 'ar'
        ? `هل أنت متأكد من حذف المفتاح [${item.title}] (${item.code})؟`
        : `Delete keycode [${item.title}] (${item.code})?`
    );
    if (!confirmDelete) return;

    try {
      const updatedList = keycodes.filter((k) => k.code !== item.code);
      const nextPayload: SettingsPayload = {
        ...settingsPayload,
        keycodes: updatedList,
      };
      await applyChanges([], nextPayload, settingsVersion);
      showToast(lang === 'ar' ? 'تم حذف المفتاح' : 'Keycode deleted', 'success');
      await loadData();
    } catch (err: any) {
      showToast(err.message || 'Error deleting keycode', 'error');
    }
  }

  function openEdit(item: KeycodeItem) {
    setEditingItem(item);
    setFormTitle(item.title);
    setFormCode(item.code);
    setFormLang(item.lang as any);
    setFormCategory(item.category);
    setShowAddModal(true);
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            <span>🔑</span>
            <span>{lang === 'ar' ? 'مفاتيح الاختبارات (Keycodes)' : 'Exam Keycodes Hub'}</span>
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            {lang === 'ar'
              ? 'مفاتيح الاختبارات الرسمية لتفعيل الاختبارات ومشاركتها مع المتدربين بنقرة واحدة'
              : 'Official exam keycodes library. Click to copy keycodes for quick trainee distribution.'}
          </p>
        </div>

        {role === 'admin' && (
          <button
            onClick={() => {
              setEditingItem(null);
              setFormTitle('');
              setFormCode('');
              setFormLang('Arabic');
              if (categories.length > 0) setFormCategory(categories[0]);
              setShowAddModal(true);
            }}
            className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-semibold rounded-xl bg-gradient-to-r from-teal-500 to-emerald-600 text-white shadow-lg shadow-teal-500/20 hover:brightness-110 active:scale-95 transition-all self-start md:self-auto"
          >
            <span>➕</span>
            <span>{lang === 'ar' ? 'إضافة مفتاح جديد' : 'Add New Keycode'}</span>
          </button>
        )}
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-slate-900/50 backdrop-blur-md border border-slate-800/70 rounded-2xl p-3.5 flex flex-col sm:flex-row items-center justify-between gap-3">
        {/* Search Input */}
        <div className="relative w-full sm:w-80">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={lang === 'ar' ? 'بحث باسم الاختبار أو الرمز…' : 'Search exam title, keycode…'}
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
          {/* Language filter */}
          <div className="inline-flex bg-slate-950/80 p-1 rounded-xl border border-slate-800 text-xs">
            <button
              onClick={() => setLangFilter('all')}
              className={`px-3 py-1 rounded-lg transition-colors ${
                langFilter === 'all' ? 'bg-slate-800 text-white font-medium' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {lang === 'ar' ? 'الكل' : 'All'}
            </button>
            <button
              onClick={() => setLangFilter('Arabic')}
              className={`px-3 py-1 rounded-lg transition-colors ${
                langFilter === 'Arabic' ? 'bg-teal-500/20 text-teal-300 font-medium' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {lang === 'ar' ? 'عربي' : 'Arabic'}
            </button>
            <button
              onClick={() => setLangFilter('English')}
              className={`px-3 py-1 rounded-lg transition-colors ${
                langFilter === 'English' ? 'bg-indigo-500/20 text-indigo-300 font-medium' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {lang === 'ar' ? 'إنجليزي' : 'English'}
            </button>
          </div>
        </div>
      </div>

      {/* Category Pills */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        <button
          onClick={() => setActiveCategory('all')}
          className={`px-3.5 py-1.5 rounded-xl font-medium text-xs whitespace-nowrap transition-all ${
            activeCategory === 'all'
              ? 'bg-teal-500/20 text-teal-300 border border-teal-500/40 shadow-sm'
              : 'bg-slate-900/50 text-slate-400 hover:text-slate-200 border border-slate-800/50'
          }`}
        >
          {lang === 'ar' ? 'جميع الفئات' : 'All Categories'} ({keycodes.length})
        </button>
        {categories.map((cat) => {
          const count = keycodes.filter((k) => k.category === cat).length;
          return (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl font-medium text-xs whitespace-nowrap transition-all ${
                activeCategory === cat
                  ? 'bg-teal-500/20 text-teal-300 border border-teal-500/40 shadow-sm'
                  : 'bg-slate-900/50 text-slate-400 hover:text-slate-200 border border-slate-800/50'
              }`}
            >
              <span>{cat}</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-800 text-slate-400 font-bold">
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Keycodes Grid */}
      {loading ? (
        <div className="p-12 text-center text-slate-400">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-teal-500 mb-3"></div>
          <p className="text-sm font-medium">{lang === 'ar' ? 'جارٍ تحميل المفاتيح…' : 'Loading keycodes…'}</p>
        </div>
      ) : filteredKeycodes.length === 0 ? (
        <div className="p-12 text-center text-slate-400 bg-slate-900/40 rounded-3xl border border-slate-800">
          <div className="text-4xl mb-3">🔍</div>
          <p className="text-sm font-medium">{lang === 'ar' ? 'لا توجد مفاتيح مطابقة' : 'No keycodes match criteria'}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredKeycodes.map((item) => {
            const isAr = item.lang === 'Arabic';

            return (
              <div
                key={item.code}
                className="group bg-slate-900/70 hover:bg-slate-800/60 border border-slate-800/80 hover:border-teal-500/40 rounded-2xl p-4.5 transition-all shadow-lg hover:shadow-teal-500/5 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2.5">
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-slate-800/80 text-teal-400 border border-slate-700/60">
                      {item.category}
                    </span>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        isAr
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          : 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20'
                      }`}
                    >
                      {isAr ? 'عربي' : 'English'}
                    </span>
                  </div>

                  <h3 className="text-sm font-bold text-white mb-2 group-hover:text-teal-200 transition-colors line-clamp-2">
                    {item.title}
                  </h3>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-800/70 flex items-center justify-between gap-2">
                  <button
                    onClick={() => handleCopy(item.code, item.title)}
                    className="flex-1 flex items-center justify-between px-3 py-2 rounded-xl bg-slate-950/80 hover:bg-teal-500 hover:text-slate-950 text-slate-300 border border-slate-800 group/btn transition-all"
                  >
                    <span className="font-mono text-xs font-bold tracking-wider truncate">
                      {item.code}
                    </span>
                    <span className="text-xs ms-1">📋</span>
                  </button>

                  {role === 'admin' && (
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => openEdit(item)}
                        title={lang === 'ar' ? 'تعديل' : 'Edit'}
                        className="p-2 rounded-xl bg-slate-950/60 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors text-xs"
                      >
                        ✏️
                      </button>
                      <button
                        onClick={() => handleDeleteKeycode(item)}
                        title={lang === 'ar' ? 'حذف' : 'Delete'}
                        className="p-2 rounded-xl bg-slate-950/60 hover:bg-rose-900/50 text-slate-400 hover:text-rose-300 transition-colors text-xs"
                      >
                        🗑️
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal: Add/Edit Keycode */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-md p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <span>{editingItem ? '✏️' : '➕'}</span>
                <span>
                  {editingItem
                    ? lang === 'ar'
                      ? 'تعديل مفتاح الاختبار'
                      : 'Edit Keycode'
                    : lang === 'ar'
                    ? 'إضافة مفتاح جديد'
                    : 'Add New Keycode'}
                </span>
              </h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-slate-200 text-lg"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveKeycode} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  {lang === 'ar' ? 'اسم الاختبار' : 'Exam Title'}
                </label>
                <input
                  type="text"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  placeholder="e.g. CBP Leadership"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-teal-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  {lang === 'ar' ? 'رمز المفتاح (Keycode)' : 'Keycode String'}
                </label>
                <input
                  type="text"
                  value={formCode}
                  onChange={(e) => setFormCode(e.target.value)}
                  placeholder="e.g. IBTA-LEAD-AR"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 font-mono text-xs text-white focus:outline-none focus:border-teal-500"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    {lang === 'ar' ? 'لغة الاختبار' : 'Exam Language'}
                  </label>
                  <select
                    value={formLang}
                    onChange={(e) => setFormLang(e.target.value as any)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-teal-500"
                  >
                    <option value="Arabic">{lang === 'ar' ? 'عربي' : 'Arabic'}</option>
                    <option value="English">{lang === 'ar' ? 'إنجليزي' : 'English'}</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    {lang === 'ar' ? 'الفئة' : 'Category'}
                  </label>
                  <select
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-teal-500"
                  >
                    {categories.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 text-xs font-semibold rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300"
                >
                  {lang === 'ar' ? 'إلغاء' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-5 py-2 text-xs font-semibold rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold transition-all disabled:opacity-50"
                >
                  {isSaving ? (lang === 'ar' ? 'جارٍ الحفظ…' : 'Saving…') : lang === 'ar' ? 'حفظ المفتاح' : 'Save Keycode'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
