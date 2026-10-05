'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Header } from '@/components/Header';
import { Sidebar } from '@/components/Sidebar';
import { ToastProvider } from '@/components/Toast';
import { isSessionExpired, getSaudiSessionDeadline } from '@/lib/session';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [lang, setLang] = useState<'ar' | 'en'>('ar');
  const [user, setUser] = useState<any>(null);
  const [role, setRole] = useState<string>('operator');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check local storage for language preference
    const saved = localStorage.getItem('trainflow_lang');
    if (saved === 'en' || saved === 'ar') setLang(saved);

    // Check Supabase session
    async function checkAuth() {
      const { data } = await supabase.auth.getSession();
      if (!data.session) {
        router.push('/login');
        return;
      }
      setUser(data.session.user);

      // Check role
      const member = await supabase
        .from('ibta_members')
        .select('role, active')
        .eq('user_id', data.session.user.id)
        .maybeSingle();

      if (member.data) {
        setRole(member.data.role);
      }
      setLoading(false);
    }

    checkAuth();

    // Check daily cutoff periodically
    const deadline = getSaudiSessionDeadline();
    const interval = setInterval(() => {
      if (isSessionExpired(deadline)) {
        supabase.auth.signOut();
        router.push('/login?expired=1');
      }
    }, 15000);

    return () => clearInterval(interval);
  }, [router]);

  const toggleLang = () => {
    const next = lang === 'ar' ? 'en' : 'ar';
    setLang(next);
    localStorage.setItem('trainflow_lang', next);
    document.documentElement.dir = next === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = next;
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  if (loading) {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'column',
          gap: '16px',
          background: 'var(--bg-primary)',
        }}
      >
        <div className="pulse-active" style={{ width: '16px', height: '16px' }} />
        <span style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-muted)' }}>
          {lang === 'ar' ? 'جارٍ تحميل مساحة العمل…' : 'Loading workspace…'}
        </span>
      </div>
    );
  }

  return (
    <ToastProvider>
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
        <Header
          lang={lang}
          onToggleLang={toggleLang}
          userEmail={user?.email || ''}
          userRole={role}
          onSignOut={handleSignOut}
        />
        <div style={{ display: 'flex', flex: 1 }}>
          <Sidebar lang={lang} />
          <main style={{ flex: 1, padding: '24px', overflowY: 'auto' }}>
            {children}
          </main>
        </div>
      </div>
    </ToastProvider>
  );
}
