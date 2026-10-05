'use client';

import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { getSaudiSessionDeadline, formatTimeRemaining, isSessionExpired } from '@/lib/session';

interface HeaderProps {
  lang: 'ar' | 'en';
  onToggleLang: () => void;
  userEmail: string;
  userRole: string;
  onSignOut: () => void;
}

export function Header({ lang, onToggleLang, userEmail, userRole, onSignOut }: HeaderProps) {
  const [timeLeft, setTimeLeft] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const deadline = getSaudiSessionDeadline();
    const update = () => {
      if (isSessionExpired(deadline)) {
        setTimeLeft('00:00:00');
      } else {
        setTimeLeft(formatTimeRemaining(deadline - Date.now()));
      }
    };
    update();
    const timer = setInterval(update, 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <header
      style={{
        height: '68px',
        padding: '0 24px',
        background: 'var(--bg-card)',
        borderBottom: '1px solid var(--border-light)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        position: 'sticky',
        top: 0,
        zIndex: 50,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              background: 'linear-gradient(135deg, #0070F3, #0051C7)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#FFF',
              fontWeight: 800,
              fontSize: '15px',
            }}
          >
            TF
          </div>
          <span style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-main)' }}>TrainFlow</span>
        </div>

        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            padding: '4px 10px',
            borderRadius: '999px',
            background: 'var(--success-bg)',
            border: '1px solid #A7F3D0',
            fontSize: '12px',
            fontWeight: 600,
            color: '#065F46',
          }}
        >
          <span className="pulse-active" />
          <span>{lang === 'ar' ? 'متصل بقاعدة البيانات' : 'Connected to DB'}</span>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        {timeLeft && (
          <div
            title={lang === 'ar' ? 'الوقت المتبقي حتى نهاية الجلسة اليومية (5:00 مساءً بتوقيت مكة)' : 'Daily session cutoff countdown (5:00 PM AST)'}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 12px',
              borderRadius: '8px',
              background: 'var(--bg-subtle)',
              border: '1px solid var(--border-light)',
              fontSize: '12.5px',
              fontWeight: 700,
              color: 'var(--text-muted)',
            }}
          >
            <span>⏱️ {timeLeft}</span>
          </div>
        )}

        <button
          type="button"
          onClick={onToggleLang}
          style={{
            padding: '6px 14px',
            borderRadius: '8px',
            border: '1px solid var(--border-light)',
            background: 'var(--bg-card)',
            fontSize: '13px',
            fontWeight: 700,
            cursor: 'pointer',
            color: 'var(--text-main)',
          }}
        >
          {lang === 'ar' ? 'English' : 'العربية'}
        </button>

        {/* User Account Popover */}
        <div style={{ position: 'relative' }}>
          <button
            type="button"
            onClick={() => setMenuOpen(!menuOpen)}
            style={{
              width: '38px',
              height: '38px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #2563EB, #1D4ED8)',
              color: '#FFF',
              border: 'none',
              fontWeight: 700,
              fontSize: '15px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 2px 6px rgba(37,99,235,0.25)',
            }}
          >
            {userEmail ? userEmail.slice(0, 1).toUpperCase() : 'U'}
          </button>

          {menuOpen && (
            <div
              style={{
                position: 'absolute',
                top: '46px',
                left: lang === 'ar' ? 0 : 'auto',
                right: lang === 'ar' ? 'auto' : 0,
                width: '230px',
                background: 'var(--bg-card)',
                border: '1px solid var(--border-light)',
                borderRadius: '12px',
                boxShadow: 'var(--shadow-lg)',
                padding: '12px',
                zIndex: 100,
              }}
            >
              <div style={{ paddingBottom: '10px', borderBottom: '1px solid var(--border-light)', marginBottom: '8px' }}>
                <p style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-main)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {userEmail}
                </p>
                <p style={{ fontSize: '11px', fontWeight: 600, color: 'var(--primary)', marginTop: '2px' }}>
                  {userRole.toUpperCase()}
                </p>
              </div>

              <button
                type="button"
                onClick={onSignOut}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  borderRadius: '6px',
                  border: 'none',
                  background: 'var(--danger-bg)',
                  color: 'var(--danger)',
                  fontSize: '13px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  textAlign: lang === 'ar' ? 'right' : 'left',
                }}
              >
                {lang === 'ar' ? 'تسجيل الخروج' : 'Sign out'}
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
