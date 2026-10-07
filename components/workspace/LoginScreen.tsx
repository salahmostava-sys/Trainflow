export function LoginScreen() {
  return (
    <section id="auth-box" dir="rtl" lang="ar" hidden>
      <div className="auth-shell">
        <aside className="auth-story" aria-label="عن البرنامج">
          <div className="auth-brand">
            <span className="auth-logo" aria-hidden="true">
              <svg
                viewBox="0 0 64 64"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <defs>
                  <linearGradient
                    id="tfAuthGrad"
                    x1="0%"
                    y1="0%"
                    x2="100%"
                    y2="100%"
                  >
                    <stop offset="0%" stopColor="#00D2FF"></stop>
                    <stop offset="60%" stopColor="#0070F3"></stop>
                    <stop offset="100%" stopColor="#004BB5"></stop>
                  </linearGradient>
                </defs>
                <rect
                  width="64"
                  height="64"
                  rx="16"
                  fill="url(#tfAuthGrad)"
                ></rect>
                <path
                  d="M16 22H36C38.2 22 40 23.8 40 26C40 28.2 38.2 30 36 30H30V44C30 46.2 28.2 48 26 48C23.8 48 22 46.2 22 44V30H16C13.8 30 12 28.2 12 26C12 23.8 13.8 22 16 22Z"
                  fill="white"
                ></path>
                <path
                  d="M30 34H46C48.2 34 50 35.8 50 38C50 40.2 48.2 42 46 42H34C31.8 42 30 40.2 30 38V34Z"
                  fill="#00D2FF"
                ></path>
              </svg>
            </span>
            <div>
              <strong data-i18n="appTitle">TrainFlow</strong>
              <small data-i18n="authBrandTagline">مساحة عمل فريقك</small>
            </div>
            <button id="auth-lang-btn" className="auth-lang-btn" type="button">
              EN
            </button>
          </div>
          <div className="auth-intro">
            <div className="auth-eyebrow" data-i18n="authEyebrow">
              عمليات التدريب والاختبارات
            </div>
            <h2>
              <span data-i18n="authHeadline1">أكوادك منظّمة.</span>
              <br />
              <span data-i18n="authHeadline2">وفريقك على اتصال.</span>
            </h2>
            <p data-i18n="authIntro">
              مساحة واحدة لإدارة الأكواد ومتابعة استخدامها، أينما كنت.
            </p>
            <div className="auth-features">
              <div className="auth-feature">
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <rect x="4" y="4" width="16" height="16" rx="3"></rect>
                  <path d="m8 12 3 3 5-6"></path>
                </svg>
                <span data-i18n="authFeatureCodes">
                  متابعة واضحة للأكواد المتاحة والمستخدمة
                </span>
              </div>
              <div className="auth-feature">
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <circle cx="9" cy="8" r="3"></circle>
                  <path d="M3 20v-2a6 6 0 0 1 12 0v2M16 5a3 3 0 0 1 0 6m2 3a5 5 0 0 1 3 4v2"></path>
                </svg>
                <span data-i18n="authFeatureTeam">
                  بيانات مشتركة وصلاحيات لكل مستخدم
                </span>
              </div>
              <div className="auth-feature">
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <rect x="3" y="4" width="18" height="13" rx="2"></rect>
                  <path d="M8 21h8m-4-4v4"></path>
                </svg>
                <span data-i18n="authFeatureAccess">
                  وصول من أي جهاز متصل بالإنترنت
                </span>
              </div>
            </div>
          </div>
          <div className="auth-story-footer" data-i18n="authFooter">
            إدارة أبسط. متابعة أوضح.
          </div>
        </aside>
        <main className="auth-main">
          <p className="auth-welcome" data-i18n="authWelcome">
            مرحبًا بعودتك
          </p>
          <h1 data-i18n="authSignIn">تسجيل الدخول</h1>
          <p className="auth-subtitle" data-i18n="authSubtitle">
            ادخل إلى حسابك لمتابعة أعمال فريقك.
          </p>
          <form id="auth-form">
            <label htmlFor="auth-email" data-i18n="authEmail">
              البريد الإلكتروني
            </label>
            <div className="auth-field">
              <input
                id="auth-email"
                type="email"
                autoComplete="username"
                placeholder="name@example.com"
                required
              />
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <rect x="3" y="5" width="18" height="14" rx="3"></rect>
                <path d="m4 7 8 6 8-6"></path>
              </svg>
            </div>
            <label htmlFor="auth-password" data-i18n="authPassword">
              كلمة المرور
            </label>
            <div className="auth-field">
              <input
                id="auth-password"
                type="password"
                autoComplete="current-password"
                placeholder="أدخل كلمة المرور"
                minLength={8}
                required
              />
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <rect x="5" y="10" width="14" height="11" rx="3"></rect>
                <path d="M8 10V7a4 4 0 0 1 8 0v3m-4 4v3"></path>
              </svg>
            </div>
            <div id="auth-actions">
              <button className="auth-submit" type="submit">
                <span data-i18n="authSignIn">تسجيل الدخول</span>
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M19 12H5m6-6-6 6 6 6"></path>
                </svg>
              </button>
              <div className="auth-register">
                <span data-i18n="authNoAccount">ليس لديك حساب؟</span>{" "}
                <button
                  type="button"
                  id="sign-up"
                  data-i18n="authCreateAccount"
                >
                  إنشاء حساب
                </button>
              </div>
            </div>
          </form>
          <p id="auth-message" role="status" aria-live="polite"></p>
        </main>
      </div>
    </section>
  );
}
