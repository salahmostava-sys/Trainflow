'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { TRANSLATIONS } from '@/lib/translations';

export default function LoginPage() {
  const router = useRouter();
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [lang, setLang] = useState<'ar' | 'en'>('ar');

  const t = TRANSLATIONS[lang];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');
    setLoading(true);

    try {
      if (!email.trim() || password.length < 8) {
        throw new Error(lang === 'ar' ? 'يرجى إدخال بريد صحيح وكلمة مرور لا تقل عن 8 أحرف.' : 'Please enter a valid email and 8+ character password.');
      }

      if (isSignUp) {
        const { error } = await supabase.auth.signUp({
          email: email.trim().toLowerCase(),
          password,
        });
        if (error) throw error;
        setSuccessMsg(lang === 'ar' ? 'تم تقديم الطلب! يرجى مراجعة بريدك الإلكتروني للتأكيد.' : 'Account requested! Please check your email for confirmation.');
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email: email.trim().toLowerCase(),
          password,
        });
        if (error) throw error;
        router.push('/vouchers');
      }
    } catch (err: any) {
      setErrorMsg(err.message || t.genericError);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'radial-gradient(ellipse at top, #1E293B, #0F172A)',
        padding: '20px',
      }}
    >
      <div
        className="saas-card"
        style={{
          width: '100%',
          maxWidth: '440px',
          padding: '36px',
          background: 'rgba(255, 255, 255, 0.96)',
          backdropFilter: 'blur(16px)',
          borderRadius: '20px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35)',
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <div
            style={{
              width: '52px',
              height: '52px',
              borderRadius: '14px',
              background: 'linear-gradient(135deg, #0070F3, #0051C7)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#FFF',
              fontWeight: 800,
              fontSize: '22px',
              margin: '0 auto 14px',
              boxShadow: '0 4px 14px rgba(0, 112, 243, 0.4)',
            }}
          >
            TF
          </div>
          <h1 style={{ fontSize: '24px', fontWeight: 800, color: '#0F172A', letterSpacing: '-0.5px' }}>
            TrainFlow SaaS
          </h1>
          <p style={{ fontSize: '14px', color: '#64748B', marginTop: '6px' }}>
            {isSignUp ? t.authSignUp : t.authTitle}
          </p>
        </div>

        {errorMsg && (
          <div
            style={{
              padding: '12px 14px',
              borderRadius: '10px',
              background: '#FEF2F2',
              border: '1px solid #FECACA',
              color: '#B91C1C',
              fontSize: '13px',
              fontWeight: 600,
              marginBottom: '20px',
            }}
          >
            {errorMsg}
          </div>
        )}

        {successMsg && (
          <div
            style={{
              padding: '12px 14px',
              borderRadius: '10px',
              background: '#ECFDF5',
              border: '1px solid #A7F3D0',
              color: '#065F46',
              fontSize: '13px',
              fontWeight: 600,
              marginBottom: '20px',
            }}
          >
            {successMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
              {t.authEmail}
            </label>
            <input
              type="email"
              required
              className="saas-input"
              placeholder="user@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
              {t.authPassword}
            </label>
            <input
              type="password"
              required
              className="saas-input"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="saas-btn-primary"
            style={{ width: '100%', minHeight: '46px', marginTop: '8px' }}
          >
            {loading ? '...' : isSignUp ? t.authSignUp : t.authSignIn}
          </button>
        </form>

        <div style={{ marginTop: '22px', textAlign: 'center', borderTop: '1px solid #E2E8F0', paddingTop: '16px' }}>
          <button
            type="button"
            onClick={() => setIsSignUp(!isSignUp)}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--primary)',
              fontSize: '13px',
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            {isSignUp
              ? lang === 'ar' ? 'لديك حساب بالفعل؟ تسجيل الدخول' : 'Already have an account? Sign in'
              : lang === 'ar' ? 'طلب حساب جديد' : 'Request a new account'}
          </button>
        </div>
      </div>
    </div>
  );
}
