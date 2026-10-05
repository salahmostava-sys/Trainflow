'use client';

import React, { useState, useEffect } from 'react';
import { useToast } from '@/components/Toast';
import { fetchInitialData, applyChanges } from '@/lib/supabase';
import { TRANSLATIONS } from '@/lib/translations';
import type { SettingsPayload, Role } from '@/lib/types';

export default function PrometricPage() {
  const { showToast } = useToast();
  const [lang, setLang] = useState<'ar' | 'en'>('ar');
  const [role, setRole] = useState<Role>('operator');

  const [loading, setLoading] = useState(true);
  const [settingsPayload, setSettingsPayload] = useState<SettingsPayload | null>(null);
  const [settingsVersion, setSettingsVersion] = useState<number>(1);

  // Prometric values
  const [account, setAccount] = useState('');
  const [password, setPassword] = useState('');
  const [zoomUrl, setZoomUrl] = useState('');
  const [prometricUrl, setPrometricUrl] = useState('');

  // UI state
  const [showPassword, setShowPassword] = useState(false);
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

      setAccount(p.credentials?.account || '');
      setPassword(p.credentials?.password || '');
      setZoomUrl(p.links?.zoom || '');
      setPrometricUrl(p.links?.prometric || '');
    } catch (err: any) {
      showToast(err.message || 'Error loading credentials', 'error');
    } finally {
      setLoading(false);
    }
  }

  // Copy helper
  async function copyValue(text: string, label: string) {
    if (!text) {
      showToast(lang === 'ar' ? 'القيمة غير محددة بعد' : 'Value not set', 'error');
      return;
    }
    try {
      await navigator.clipboard.writeText(text);
      showToast(
        lang === 'ar' ? `تم نسخ ${label}` : `Copied ${label}`,
        'success'
      );
    } catch {
      showToast(t.copyFailed, 'error');
    }
  }

  // Copy Both Credentials
  async function copyBothCredentials() {
    if (!account && !password) {
      showToast(lang === 'ar' ? 'لا توجد بيانات دخول مسجلة' : 'No credentials configured', 'error');
      return;
    }
    const combined = `Account: ${account}\nPassword: ${password}`;
    try {
      await navigator.clipboard.writeText(combined);
      showToast(
        lang === 'ar' ? 'تم نسخ بيانات الدخول بالكامل (الحساب وكلمة المرور)' : 'Copied both account & password',
        'success'
      );
    } catch {
      showToast(t.copyFailed, 'error');
    }
  }

  // Save Settings
  async function handleSaveSettings(e: React.FormEvent) {
    e.preventDefault();
    if (!settingsPayload) return;

    setIsSaving(true);
    try {
      const nextPayload: SettingsPayload = {
        ...settingsPayload,
        credentials: {
          account: account.trim(),
          password: password,
        },
        links: {
          zoom: zoomUrl.trim(),
          prometric: prometricUrl.trim(),
        },
      };

      await applyChanges([], nextPayload, settingsVersion);
      showToast(
        lang === 'ar' ? 'تم حفظ بيانات بروميترك والروابط بنجاح' : 'Prometric settings saved',
        'success'
      );
      await loadData();
    } catch (err: any) {
      showToast(err.message || 'Failed to save settings', 'error');
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Page Title */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            <span>🛡️</span>
            <span>{lang === 'ar' ? 'بيانات وروابط Prometric' : 'Prometric Hub'}</span>
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            {lang === 'ar'
              ? 'الوصول السريع لبيانات حساب مركز الاختبارات Prometric ورابط الجلسات وزوم'
              : 'Direct access to official Prometric testing center credentials and exam room links.'}
          </p>
        </div>

        <button
          onClick={copyBothCredentials}
          className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-bold rounded-xl bg-gradient-to-r from-teal-500 to-emerald-600 text-white shadow-lg shadow-teal-500/20 hover:brightness-110 active:scale-95 transition-all self-start md:self-auto"
        >
          <span>📋</span>
          <span>{lang === 'ar' ? 'نسخ بيانات الدخول بالكامل' : 'Copy All Credentials'}</span>
        </button>
      </div>

      {/* Main Grid: Active Credentials & Links */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Prometric Account Card */}
        <div className="bg-slate-900/60 backdrop-blur-md border border-slate-800/80 rounded-2xl p-5 shadow-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                {lang === 'ar' ? 'اسم الحساب (Account / Username)' : 'Account / Username'}
              </span>
              <span className="text-lg">👤</span>
            </div>
            <div className="font-mono text-lg font-bold text-white tracking-wide break-all">
              {account || <span className="text-slate-500 text-sm font-normal">{lang === 'ar' ? 'غير مسجل' : 'Not configured'}</span>}
            </div>
          </div>

          <div className="pt-4 border-t border-slate-800/60 mt-4 flex items-center justify-end">
            <button
              onClick={() => copyValue(account, lang === 'ar' ? 'اسم الحساب' : 'Account')}
              className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-slate-800/80 hover:bg-teal-500 hover:text-slate-950 text-slate-200 text-xs font-semibold transition-all"
            >
              <span>📋</span>
              <span>{lang === 'ar' ? 'نسخ الحساب' : 'Copy Account'}</span>
            </button>
          </div>
        </div>

        {/* Prometric Password Card */}
        <div className="bg-slate-900/60 backdrop-blur-md border border-slate-800/80 rounded-2xl p-5 shadow-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                {lang === 'ar' ? 'كلمة المرور (Password)' : 'Password'}
              </span>
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="text-xs text-slate-400 hover:text-teal-400 transition-colors"
              >
                {showPassword ? (lang === 'ar' ? 'إخفاء 🙈' : 'Hide 🙈') : (lang === 'ar' ? 'إظهار 👁️' : 'Show 👁️')}
              </button>
            </div>
            <div className="font-mono text-lg font-bold text-teal-400 tracking-wider">
              {password ? (
                showPassword ? password : '••••••••••••'
              ) : (
                <span className="text-slate-500 text-sm font-normal">{lang === 'ar' ? 'غير مسجل' : 'Not configured'}</span>
              )}
            </div>
          </div>

          <div className="pt-4 border-t border-slate-800/60 mt-4 flex items-center justify-end">
            <button
              onClick={() => copyValue(password, lang === 'ar' ? 'كلمة المرور' : 'Password')}
              className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-slate-800/80 hover:bg-teal-500 hover:text-slate-950 text-slate-200 text-xs font-semibold transition-all"
            >
              <span>📋</span>
              <span>{lang === 'ar' ? 'نسخ كلمة المرور' : 'Copy Password'}</span>
            </button>
          </div>
        </div>

        {/* Zoom Link Card */}
        <div className="bg-slate-900/60 backdrop-blur-md border border-slate-800/80 rounded-2xl p-5 shadow-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                {lang === 'ar' ? 'رابط زوم المعتمد' : 'Official Zoom Link'}
              </span>
              <span className="text-lg">📹</span>
            </div>
            <p className="font-mono text-xs text-slate-300 truncate">
              {zoomUrl || <span className="text-slate-500">{lang === 'ar' ? 'لم يُحدد' : 'Not configured'}</span>}
            </p>
          </div>

          <div className="pt-4 border-t border-slate-800/60 mt-4 flex items-center justify-between gap-2">
            <button
              onClick={() => copyValue(zoomUrl, 'Zoom Link')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-all"
            >
              <span>📋</span>
              <span>{lang === 'ar' ? 'نسخ الرابط' : 'Copy Link'}</span>
            </button>

            {zoomUrl && (
              <a
                href={zoomUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-teal-500/20 hover:bg-teal-500 hover:text-slate-950 text-teal-300 text-xs font-semibold border border-teal-500/30 transition-all"
              >
                <span>🚀</span>
                <span>{lang === 'ar' ? 'فتح زوم الآن' : 'Launch Zoom'}</span>
              </a>
            )}
          </div>
        </div>

        {/* Prometric Portal Link Card */}
        <div className="bg-slate-900/60 backdrop-blur-md border border-slate-800/80 rounded-2xl p-5 shadow-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                {lang === 'ar' ? 'بوابة دخول Prometric' : 'Prometric Portal Login'}
              </span>
              <span className="text-lg">🌐</span>
            </div>
            <p className="font-mono text-xs text-slate-300 truncate">
              {prometricUrl || <span className="text-slate-500">{lang === 'ar' ? 'لم يُحدد' : 'Not configured'}</span>}
            </p>
          </div>

          <div className="pt-4 border-t border-slate-800/60 mt-4 flex items-center justify-between gap-2">
            <button
              onClick={() => copyValue(prometricUrl, 'Prometric URL')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-all"
            >
              <span>📋</span>
              <span>{lang === 'ar' ? 'نسخ الرابط' : 'Copy Link'}</span>
            </button>

            {prometricUrl && (
              <a
                href={prometricUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-teal-500/20 hover:bg-teal-500 hover:text-slate-950 text-teal-300 text-xs font-semibold border border-teal-500/30 transition-all"
              >
                <span>🚀</span>
                <span>{lang === 'ar' ? 'فتح البوابة' : 'Open Portal'}</span>
              </a>
            )}
          </div>
        </div>
      </div>

      {/* Admin Settings Form */}
      {role === 'admin' && (
        <div className="bg-slate-900/60 backdrop-blur-md border border-slate-800/80 rounded-2xl p-6 shadow-xl space-y-4">
          <div className="border-b border-slate-800 pb-3">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <span>⚙️</span>
              <span>{lang === 'ar' ? 'تعديل بيانات وحسابات Prometric (خاص بالمسؤول)' : 'Prometric Admin Settings'}</span>
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              {lang === 'ar'
                ? 'التعديل هنا يُحدّث الحساب وكلمة المرور فوراً لجميع أعضاء الفريق في مساحة العمل'
                : 'Updates here sync instantly across all team members in the workspace.'}
            </p>
          </div>

          <form onSubmit={handleSaveSettings} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  {lang === 'ar' ? 'اسم الحساب (Account)' : 'Account'}
                </label>
                <input
                  type="text"
                  value={account}
                  onChange={(e) => setAccount(e.target.value)}
                  placeholder="prometric-admin-account"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-teal-500 font-mono"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  {lang === 'ar' ? 'كلمة المرور (Password)' : 'Password'}
                </label>
                <input
                  type="text"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-teal-500 font-mono"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  {lang === 'ar' ? 'رابط زوم (Zoom URL)' : 'Zoom URL'}
                </label>
                <input
                  type="url"
                  value={zoomUrl}
                  onChange={(e) => setZoomUrl(e.target.value)}
                  placeholder="https://us02web.zoom.us/j/..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-teal-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  {lang === 'ar' ? 'رابط دخول بروميترك (Prometric URL)' : 'Prometric URL'}
                </label>
                <input
                  type="url"
                  value={prometricUrl}
                  onChange={(e) => setPrometricUrl(e.target.value)}
                  placeholder="https://tcnet1.prometric.com/..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-teal-500 font-mono"
                />
              </div>
            </div>

            <div className="flex items-center justify-end pt-2">
              <button
                type="submit"
                disabled={isSaving}
                className="px-5 py-2.5 text-xs font-bold rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 transition-all disabled:opacity-50 shadow-md shadow-teal-500/20"
              >
                {isSaving ? (lang === 'ar' ? 'جارٍ الحفظ…' : 'Saving…') : lang === 'ar' ? 'حفظ التغييرات' : 'Save Changes'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
