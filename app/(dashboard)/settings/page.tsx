'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useToast } from '@/components/Toast';
import {
  supabase,
  fetchInitialData,
  applyChanges,
  listMembers,
  updateMember,
  addMember,
  getAuditEvents,
  restoreBackupData,
} from '@/lib/supabase';
import { TRANSLATIONS } from '@/lib/translations';
import type { SettingsPayload, Role, MemberRecord, AuditRecord } from '@/lib/types';

export default function SettingsPage() {
  const { showToast } = useToast();
  const [lang, setLang] = useState<'ar' | 'en'>('ar');
  const [role, setRole] = useState<Role>('operator');

  const [activeTab, setActiveTab] = useState<'profile' | 'categories' | 'team' | 'backup' | 'extensions'>('profile');
  const [loading, setLoading] = useState(true);

  // Profile Form
  const [profileName, setProfileName] = useState('');
  const [profileEmail, setProfileEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  // Settings & Categories
  const [settingsPayload, setSettingsPayload] = useState<SettingsPayload | null>(null);
  const [settingsVersion, setSettingsVersion] = useState<number>(1);
  const [categories, setCategories] = useState<string[]>([]);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [lowStockThreshold, setLowStockThreshold] = useState<number>(10);

  // Team Members
  const [members, setMembers] = useState<MemberRecord[]>([]);
  const [newMemberEmail, setNewMemberEmail] = useState('');
  const [newMemberRole, setNewMemberRole] = useState<Role>('operator');
  const [isAddingMember, setIsAddingMember] = useState(false);

  // Audit Events
  const [auditLogs, setAuditLogs] = useState<AuditRecord[]>([]);

  // Backup & Restore
  const backupFileRef = useRef<HTMLInputElement | null>(null);
  const [isRestoring, setIsRestoring] = useState(false);

  const t = TRANSLATIONS[lang];

  useEffect(() => {
    const storedLang = (localStorage.getItem('tf_lang') as 'ar' | 'en') || 'ar';
    setLang(storedLang);

    const storedUser = localStorage.getItem('tf_user');
    if (storedUser) {
      try {
        const u = JSON.parse(storedUser);
        setRole(u.role || 'operator');
        setProfileName(u.fullName || '');
        setProfileEmail(u.email || '');
      } catch {}
    }

    loadInitial();
  }, []);

  async function loadInitial() {
    try {
      setLoading(true);
      const data = await fetchInitialData();
      const p = data.settings.payload || {};
      setSettingsPayload(p);
      setSettingsVersion(data.settings.version);
      setLowStockThreshold(p.lowStockThreshold || 10);

      const cats =
        p.categoryOrder && p.categoryOrder.length > 0
          ? p.categoryOrder
          : ['Foundation', 'Master', 'BIS', 'Corporate', 'CYBP'];
      setCategories(cats);

      // Load members & audit if admin
      try {
        const [memList, audit] = await Promise.all([listMembers(), getAuditEvents()]);
        setMembers(memList);
        setAuditLogs(audit);
      } catch {}
    } catch (err: any) {
      showToast(err.message || 'Error loading settings', 'error');
    } finally {
      setLoading(false);
    }
  }

  // Profile Save
  async function handleProfileSave(e: React.FormEvent) {
    e.preventDefault();
    setIsSavingProfile(true);
    try {
      if (profileName.trim()) {
        const { error } = await supabase.auth.updateUser({
          data: { full_name: profileName.trim() },
        });
        if (error) throw error;
      }

      if (newPassword) {
        if (newPassword.length < 8) {
          throw new Error(lang === 'ar' ? 'كلمة المرور يجب أن لا تقل عن 8 أحرف' : 'Password must be at least 8 characters');
        }
        if (newPassword !== confirmPassword) {
          throw new Error(lang === 'ar' ? 'كلمتا المرور غير متطابقتين' : 'Passwords do not match');
        }
        const { error } = await supabase.auth.updateUser({ password: newPassword });
        if (error) throw error;
        setNewPassword('');
        setConfirmPassword('');
      }

      // Update local storage
      const stored = localStorage.getItem('tf_user');
      if (stored) {
        const u = JSON.parse(stored);
        u.fullName = profileName.trim();
        localStorage.setItem('tf_user', JSON.stringify(u));
      }

      showToast(lang === 'ar' ? 'تم تحديث الملف الشخصي بنجاح' : 'Profile updated successfully', 'success');
    } catch (err: any) {
      showToast(err.message || 'Failed to update profile', 'error');
    } finally {
      setIsSavingProfile(false);
    }
  }

  // Add Category
  async function handleAddCategory(e: React.FormEvent) {
    e.preventDefault();
    const clean = newCategoryName.trim();
    if (!clean || !settingsPayload) return;

    if (categories.includes(clean)) {
      showToast(lang === 'ar' ? 'هذه الفئة موجودة بالفعل' : 'Category already exists', 'error');
      return;
    }

    const updatedCategories = [...categories, clean];
    try {
      const nextPayload: SettingsPayload = {
        ...settingsPayload,
        categoryOrder: updatedCategories,
        codeCategories: Array.from(new Set([...(settingsPayload.codeCategories || []), clean])),
      };

      await applyChanges([], nextPayload, settingsVersion);
      setCategories(updatedCategories);
      setNewCategoryName('');
      showToast(lang === 'ar' ? `تمت إضافة فئة [${clean}]` : `Added category [${clean}]`, 'success');
      await loadInitial();
    } catch (err: any) {
      showToast(err.message || 'Failed to add category', 'error');
    }
  }

  // Delete Category
  async function handleDeleteCategory(cat: string) {
    if (!settingsPayload) return;
    const confirmDelete = window.confirm(
      lang === 'ar' ? `هل أنت متأكد من حذف الفئة [${cat}]؟` : `Are you sure you want to remove [${cat}]?`
    );
    if (!confirmDelete) return;

    const updatedCategories = categories.filter((c) => c !== cat);
    try {
      const nextPayload: SettingsPayload = {
        ...settingsPayload,
        categoryOrder: updatedCategories,
      };

      await applyChanges([], nextPayload, settingsVersion);
      setCategories(updatedCategories);
      showToast(lang === 'ar' ? `تم حذف فئة [${cat}]` : `Removed category [${cat}]`, 'success');
      await loadInitial();
    } catch (err: any) {
      showToast(err.message || 'Failed to delete category', 'error');
    }
  }

  // Save Low Stock Threshold
  async function handleSaveThreshold() {
    if (!settingsPayload) return;
    try {
      const nextPayload: SettingsPayload = {
        ...settingsPayload,
        lowStockThreshold,
      };
      await applyChanges([], nextPayload, settingsVersion);
      showToast(lang === 'ar' ? 'تم حفظ حد التنبيه' : 'Threshold saved', 'success');
      await loadInitial();
    } catch (err: any) {
      showToast(err.message || 'Failed to save threshold', 'error');
    }
  }

  // Add Member
  async function handleAddMember(e: React.FormEvent) {
    e.preventDefault();
    if (!newMemberEmail.trim()) return;

    setIsAddingMember(true);
    try {
      await addMember(newMemberEmail.trim(), newMemberRole);
      showToast(
        lang === 'ar' ? `تمت إضافة العضو [${newMemberEmail}] بنجاح` : `Member added [${newMemberEmail}]`,
        'success'
      );
      setNewMemberEmail('');
      const updated = await listMembers();
      setMembers(updated);
    } catch (err: any) {
      showToast(err.message || 'Failed to add member', 'error');
    } finally {
      setIsAddingMember(false);
    }
  }

  // Toggle Member Active
  async function handleToggleMember(member: MemberRecord) {
    try {
      await updateMember(member.email, member.role, !member.active);
      setMembers((prev) =>
        prev.map((m) => (m.email === member.email ? { ...m, active: !m.active } : m))
      );
      showToast(lang === 'ar' ? 'تم تحديث حالة العضو' : 'Member status updated', 'success');
    } catch (err: any) {
      showToast(err.message || 'Failed to update member', 'error');
    }
  }

  // Export Full Backup
  async function handleExportBackup() {
    try {
      const data = await fetchInitialData();
      const backup = {
        format: 'trainflow-backup',
        version: 4,
        exportedAt: new Date().toISOString(),
        settings: data.settings.payload,
        codes: data.codes,
        supervisorStock: data.stock,
      };

      const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `trainflow-backup-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      showToast(lang === 'ar' ? 'تم تحميل النسخة الاحتياطية بنجاح' : 'Backup downloaded', 'success');
    } catch (err: any) {
      showToast(err.message || 'Failed to export backup', 'error');
    }
  }

  // Restore Backup
  async function handleRestoreFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const confirmRestore = window.confirm(
      lang === 'ar'
        ? 'تحذير: استعادة النسخة الاحتياطية ستقوم باستبدال البيانات الحالية. هل تود المتابعة؟'
        : 'Warning: Restoring backup will overwrite current data. Continue?'
    );
    if (!confirmRestore) return;

    setIsRestoring(true);
    try {
      const text = await file.text();
      const backup = JSON.parse(text);

      await restoreBackupData(backup, settingsVersion);
      showToast(lang === 'ar' ? 'تمت استعادة البيانات بنجاح!' : 'Data restored successfully!', 'success');
      await loadInitial();
    } catch (err: any) {
      showToast(err.message || 'Invalid backup file', 'error');
    } finally {
      setIsRestoring(false);
      if (backupFileRef.current) backupFileRef.current.value = '';
    }
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Title */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
          <span>⚙️</span>
          <span>{lang === 'ar' ? 'إعدادات المنصة وإدارة البيانات' : 'Platform & Data Settings'}</span>
        </h1>
        <p className="text-sm text-slate-400 mt-1">
          {lang === 'ar'
            ? 'تخصيص الحساب الشخصي، إدارة الفئات، أعضاء الفريق، والنسخ الاحتياطي السحابي'
            : 'Personal profile settings, category management, team access control, and cloud backups.'}
        </p>
      </div>

      {/* Tabs Bar */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-2 overflow-x-auto scrollbar-none">
        <button
          onClick={() => setActiveTab('profile')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
            activeTab === 'profile'
              ? 'bg-teal-500/20 text-teal-300 border border-teal-500/40 shadow-sm'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
          }`}
        >
          <span>👤</span>
          <span>{lang === 'ar' ? 'الملف الشخصي والحساب' : 'Profile & Account'}</span>
        </button>

        {role === 'admin' && (
          <>
            <button
              onClick={() => setActiveTab('categories')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                activeTab === 'categories'
                  ? 'bg-teal-500/20 text-teal-300 border border-teal-500/40 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
              }`}
            >
              <span>🏷️</span>
              <span>{lang === 'ar' ? 'فئات النظام والأكواد' : 'Categories'}</span>
            </button>

            <button
              onClick={() => setActiveTab('team')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                activeTab === 'team'
                  ? 'bg-teal-500/20 text-teal-300 border border-teal-500/40 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
              }`}
            >
              <span>👥</span>
              <span>{lang === 'ar' ? 'فريق العمل والصلاحيات' : 'Team & Roles'}</span>
            </button>

            <button
              onClick={() => setActiveTab('backup')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                activeTab === 'backup'
                  ? 'bg-teal-500/20 text-teal-300 border border-teal-500/40 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
              }`}
            >
              <span>💾</span>
              <span>{lang === 'ar' ? 'النسخ الاحتياطي والأرشيف' : 'Data & Backup'}</span>
            </button>
          </>
        )}

        <button
          onClick={() => setActiveTab('extensions')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
            activeTab === 'extensions'
              ? 'bg-teal-500/20 text-teal-300 border border-teal-500/40 shadow-sm'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
          }`}
        >
          <span>🧩</span>
          <span>{lang === 'ar' ? 'إضافات Chrome' : 'Chrome Extensions'}</span>
        </button>
      </div>

      {/* Tab: Profile */}
      {activeTab === 'profile' && (
        <div className="bg-slate-900/60 backdrop-blur-md border border-slate-800/80 rounded-2xl p-6 shadow-xl space-y-6">
          <div className="border-b border-slate-800 pb-3">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <span>👤</span>
              <span>{lang === 'ar' ? 'بيانات الحساب الشخصي' : 'Account Profile'}</span>
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              {lang === 'ar' ? 'تعديل الاسم الظاهر وكلمة المرور الخاصة بك' : 'Update your display name and sign-in password.'}
            </p>
          </div>

          <form onSubmit={handleProfileSave} className="space-y-4 max-w-lg">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                {lang === 'ar' ? 'الاسم بالكامل' : 'Full Name'}
              </label>
              <input
                type="text"
                value={profileName}
                onChange={(e) => setProfileName(e.target.value)}
                placeholder="Admin User"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-teal-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                {lang === 'ar' ? 'البريد الإلكتروني' : 'Email Address'}
              </label>
              <input
                type="email"
                value={profileEmail}
                disabled
                className="w-full bg-slate-950/60 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-400 cursor-not-allowed"
              />
            </div>

            <div className="pt-2 border-t border-slate-800/60 space-y-4">
              <h3 className="text-xs font-bold text-slate-300">
                {lang === 'ar' ? 'تغيير كلمة المرور (اختياري)' : 'Change Password (Optional)'}
              </h3>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5">
                  {lang === 'ar' ? 'كلمة المرور الجديدة' : 'New Password'}
                </label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-teal-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5">
                  {lang === 'ar' ? 'تأكيد كلمة المرور الجديدة' : 'Confirm New Password'}
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-teal-500"
                />
              </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={isSavingProfile}
                className="px-5 py-2.5 text-xs font-bold rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 transition-all disabled:opacity-50 shadow-md shadow-teal-500/20"
              >
                {isSavingProfile ? (lang === 'ar' ? 'جارٍ الحفظ…' : 'Saving…') : lang === 'ar' ? 'حفظ التعديلات' : 'Save Changes'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Tab: Categories */}
      {activeTab === 'categories' && role === 'admin' && (
        <div className="bg-slate-900/60 backdrop-blur-md border border-slate-800/80 rounded-2xl p-6 shadow-xl space-y-6">
          <div className="border-b border-slate-800 pb-3">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <span>🏷️</span>
              <span>{lang === 'ar' ? 'إدارة فئات الأكواد والاختبارات' : 'Category Management'}</span>
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              {lang === 'ar' ? 'إضافة أو حذف فئات الأكواد وترتيب ظهورها في النظام' : 'Manage code categories and low stock alerts.'}
            </p>
          </div>

          {/* Add Category Form */}
          <form onSubmit={handleAddCategory} className="flex gap-2 max-w-md">
            <input
              type="text"
              value={newCategoryName}
              onChange={(e) => setNewCategoryName(e.target.value)}
              placeholder={lang === 'ar' ? 'اسم الفئة الجديدة…' : 'New category name…'}
              className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-teal-500"
              required
            />
            <button
              type="submit"
              className="px-4 py-2 text-xs font-bold rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 transition-all shadow-md shadow-teal-500/20"
            >
              <span>➕ {lang === 'ar' ? 'إضافة فئة' : 'Add'}</span>
            </button>
          </form>

          {/* Categories List */}
          <div className="space-y-2">
            <h3 className="text-xs font-bold text-slate-300">
              {lang === 'ar' ? 'الفئات الحالية المعتمدة' : 'Active Categories'}
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {categories.map((cat, idx) => (
                <div
                  key={cat}
                  className="flex items-center justify-between p-3 rounded-xl bg-slate-950/70 border border-slate-800"
                >
                  <div className="flex items-center gap-2.5">
                    <span className="text-xs font-mono text-slate-500">#{idx + 1}</span>
                    <span className="text-sm font-bold text-white">{cat}</span>
                  </div>
                  <button
                    onClick={() => handleDeleteCategory(cat)}
                    className="p-1.5 text-slate-400 hover:text-rose-400 rounded-lg hover:bg-slate-800 transition-colors text-xs"
                    title={lang === 'ar' ? 'حذف الفئة' : 'Delete'}
                  >
                    🗑️
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Low Stock Threshold */}
          <div className="pt-4 border-t border-slate-800 max-w-sm space-y-3">
            <label className="block text-xs font-semibold text-slate-300">
              {lang === 'ar' ? 'حد التنبيه لانخفاض المخزون (Low Stock Alert)' : 'Low Stock Alert Threshold'}
            </label>
            <div className="flex gap-2">
              <input
                type="number"
                min={1}
                value={lowStockThreshold}
                onChange={(e) => setLowStockThreshold(parseInt(e.target.value, 10) || 10)}
                className="w-28 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-teal-500"
              />
              <button
                type="button"
                onClick={handleSaveThreshold}
                className="px-4 py-2 text-xs font-bold rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200"
              >
                {lang === 'ar' ? 'حفظ الحد' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tab: Team & Members */}
      {activeTab === 'team' && role === 'admin' && (
        <div className="bg-slate-900/60 backdrop-blur-md border border-slate-800/80 rounded-2xl p-6 shadow-xl space-y-6">
          <div className="border-b border-slate-800 pb-3">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <span>👥</span>
              <span>{lang === 'ar' ? 'أعضاء مساحة العمل والصلاحيات' : 'Workspace Members & Roles'}</span>
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              {lang === 'ar'
                ? 'إدارة حسابات الفريق وتعيين الصلاحيات (Admin, Operator, Copy-Only)'
                : 'Manage team access, roles, and authorization states.'}
            </p>
          </div>

          {/* Add Member Form */}
          <form onSubmit={handleAddMember} className="grid grid-cols-1 sm:grid-cols-3 gap-3 max-w-2xl">
            <div className="sm:col-span-2">
              <input
                type="email"
                value={newMemberEmail}
                onChange={(e) => setNewMemberEmail(e.target.value)}
                placeholder="colleague@domain.com"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-teal-500"
                required
              />
            </div>
            <div className="flex gap-2">
              <select
                value={newMemberRole}
                onChange={(e) => setNewMemberRole(e.target.value as any)}
                className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-teal-500"
              >
                <option value="operator">{lang === 'ar' ? 'مشغّل (Operator)' : 'Operator'}</option>
                <option value="copy_only">{lang === 'ar' ? 'نسخ فقط (Copy-Only)' : 'Copy-Only'}</option>
                <option value="admin">{lang === 'ar' ? 'مسؤول (Admin)' : 'Admin'}</option>
              </select>
              <button
                type="submit"
                disabled={isAddingMember}
                className="px-4 py-2 text-xs font-bold rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 transition-all shadow-md shadow-teal-500/20 whitespace-nowrap"
              >
                <span>➕ {lang === 'ar' ? 'إضافة' : 'Add'}</span>
              </button>
            </div>
          </form>

          {/* Members Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-start text-xs">
              <thead className="bg-slate-950/70 border-b border-slate-800 text-slate-400 uppercase font-semibold">
                <tr>
                  <th className="p-3 text-start">{lang === 'ar' ? 'البريد الإلكتروني' : 'Email'}</th>
                  <th className="p-3 text-start">{lang === 'ar' ? 'الدور / الصلاحية' : 'Role'}</th>
                  <th className="p-3 text-start">{lang === 'ar' ? 'الحالة' : 'Status'}</th>
                  <th className="p-3 text-end">{lang === 'ar' ? 'إجراء' : 'Action'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50">
                {members.map((m) => (
                  <tr key={m.email} className="hover:bg-slate-800/30">
                    <td className="p-3 font-mono font-medium text-white">{m.email}</td>
                    <td className="p-3">
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-800 text-teal-400 border border-slate-700">
                        {m.role}
                      </span>
                    </td>
                    <td className="p-3">
                      {m.active ? (
                        <span className="text-emerald-400 font-semibold flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                          <span>{lang === 'ar' ? 'مفعّل' : 'Active'}</span>
                        </span>
                      ) : (
                        <span className="text-rose-400 font-semibold flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-rose-400"></span>
                          <span>{lang === 'ar' ? 'معطّل' : 'Inactive'}</span>
                        </span>
                      )}
                    </td>
                    <td className="p-3 text-end">
                      <button
                        onClick={() => handleToggleMember(m)}
                        className="px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
                      >
                        {m.active ? (lang === 'ar' ? 'تعطيل' : 'Disable') : lang === 'ar' ? 'تفعيل' : 'Enable'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab: Data & Backup */}
      {activeTab === 'backup' && role === 'admin' && (
        <div className="bg-slate-900/60 backdrop-blur-md border border-slate-800/80 rounded-2xl p-6 shadow-xl space-y-6">
          <div className="border-b border-slate-800 pb-3">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <span>💾</span>
              <span>{lang === 'ar' ? 'النسخ الاحتياطي وإدارة البيانات السحابية' : 'Cloud Backup & Data Management'}</span>
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              {lang === 'ar'
                ? 'تصدير نسخة كاملة من النظام أو استعادة نسخة احتياطية سابقة بسلامة كاملة'
                : 'Export complete system snapshot or restore verified backups.'}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Export Card */}
            <div className="p-5 rounded-2xl bg-slate-950/70 border border-slate-800 flex flex-col justify-between">
              <div>
                <h3 className="text-sm font-bold text-white mb-1 flex items-center gap-2">
                  <span>📥</span>
                  <span>{lang === 'ar' ? 'تصدير نسخة احتياطية كاملة' : 'Export Full System Backup'}</span>
                </h3>
                <p className="text-xs text-slate-400">
                  {lang === 'ar'
                    ? 'تحميل ملف JSON كامل يحتوي على جميع الأكواد، المخزون، الإعدادات، والشيتات.'
                    : 'Download complete JSON snapshot containing all vouchers, stock, settings, and sheets.'}
                </p>
              </div>

              <div className="pt-4 mt-4 border-t border-slate-800">
                <button
                  onClick={handleExportBackup}
                  className="px-4 py-2 text-xs font-bold rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 transition-all shadow-md shadow-teal-500/20"
                >
                  {lang === 'ar' ? 'تحميل النسخة الاحتياطية (JSON)' : 'Download Backup (JSON)'}
                </button>
              </div>
            </div>

            {/* Restore Card */}
            <div className="p-5 rounded-2xl bg-slate-950/70 border border-slate-800 flex flex-col justify-between">
              <div>
                <h3 className="text-sm font-bold text-white mb-1 flex items-center gap-2">
                  <span>📤</span>
                  <span>{lang === 'ar' ? 'استعادة نسخة احتياطية' : 'Restore System Backup'}</span>
                </h3>
                <p className="text-xs text-slate-400">
                  {lang === 'ar'
                    ? 'رفع ملف نسخة احتياطية مع التحقق التلقائي من صحة الملف قبل التطبيق.'
                    : 'Upload backup file with automatic schema validation and zero data loss.'}
                </p>
              </div>

              <div className="pt-4 mt-4 border-t border-slate-800">
                <input
                  type="file"
                  accept=".json"
                  ref={backupFileRef}
                  onChange={handleRestoreFile}
                  className="hidden"
                />
                <button
                  type="button"
                  disabled={isRestoring}
                  onClick={() => backupFileRef.current?.click()}
                  className="px-4 py-2 text-xs font-bold rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 transition-all"
                >
                  {isRestoring ? (lang === 'ar' ? 'جارٍ الاستعادة…' : 'Restoring…') : lang === 'ar' ? 'اختيار ملف الاستعادة' : 'Choose Backup File'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab: Chrome Extensions */}
      {activeTab === 'extensions' && (
        <div className="bg-slate-900/60 backdrop-blur-md border border-slate-800/80 rounded-2xl p-6 shadow-xl space-y-6">
          <div className="border-b border-slate-800 pb-3">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <span>🧩</span>
              <span>{lang === 'ar' ? 'إضافات Chrome الخاصة بالنظام' : 'Official Chrome Extensions'}</span>
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              {lang === 'ar'
                ? 'إضافات المتصفح المخصصة لأتمتة إنشاء حسابات المتدربين على Prometric'
                : 'Dedicated extensions for automating Prometric trainee registrations.'}
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-teal-400">
                {lang === 'ar' ? 'إضافة Prometric Account Generator' : 'Prometric Account Generator Extension'}
              </h3>
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-teal-500/10 text-teal-400 border border-teal-500/20">
                v1.0 Ready
              </span>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              {lang === 'ar'
                ? 'تتيح تسجيل المتدربين دفعة واحدة على موقع Prometric تلقائياً وسحب اليوزر والباسورد وحقنهما مباشرة في شيت المتدربين.'
                : 'Automates batch trainee registrations on Prometric portal, returning generated credentials directly to your live trainee sheet.'}
            </p>
            <div className="pt-2">
              <a
                href="/extensions/prometric-extension.zip"
                download
                className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 transition-all shadow-md shadow-teal-500/20"
              >
                <span>📦</span>
                <span>{lang === 'ar' ? 'تحميل حزمة الإضافة (.zip)' : 'Download Extension (.zip)'}</span>
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
