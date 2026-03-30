import { useState, useEffect } from 'react';

// ── colour tokens (mirrored from App.jsx) ──────────────────────
const C = {
  bg: '#0f1117',
  bgCard: '#161b27',
  border: '#1e2535',
  borderLight: '#252d40',
  accent: '#6c5ce7',
  accentHover: '#7d6ff0',
  accentSoft: 'rgba(108,92,231,0.15)',
  pink: '#e84393',
  green: '#00b894',
  red: '#d63031',
  amber: '#fdcb6e',
  textPrimary: '#f0f1f5',
  textSecondary: '#8892a4',
  textMuted: '#4a5568',
};

// ── tiny icons ─────────────────────────────────────────────────
const ShieldIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
  </svg>
);
const EyeIcon = ({ off }) => off ? (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/>
  </svg>
) : (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
  </svg>
);
const UserIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
  </svg>
);
const MailIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/>
  </svg>
);
const LockIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
  </svg>
);
const CheckIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12"/>
  </svg>
);
const ArrowIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
  </svg>
);

// ── animated grid background ───────────────────────────────────
function GridBackground() {
  return (
    <div style={{ position: 'fixed', inset: 0, overflow: 'hidden', pointerEvents: 'none', zIndex: 0 }}>
      {/* Grid lines */}
      <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0.04 }}>
        <defs>
          <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
            <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#6c5ce7" strokeWidth="1"/>
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#grid)" />
      </svg>

      {/* Radial glow — top left */}
      <div style={{
        position: 'absolute', top: -200, left: -200,
        width: 600, height: 600, borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(108,92,231,0.12) 0%, transparent 70%)',
      }}/>

      {/* Radial glow — bottom right */}
      <div style={{
        position: 'absolute', bottom: -200, right: -100,
        width: 500, height: 500, borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(232,67,147,0.08) 0%, transparent 70%)',
      }}/>

      {/* Scan line animation */}
      <div style={{
        position: 'absolute', left: 0, right: 0, height: 1,
        background: 'linear-gradient(90deg, transparent, rgba(108,92,231,0.4), transparent)',
        animation: 'scanline 6s linear infinite',
      }}/>

      <style>{`
        @keyframes scanline {
          0%   { top: -2px; opacity: 0; }
          5%   { opacity: 1; }
          95%  { opacity: 1; }
          100% { top: 100vh; opacity: 0; }
        }
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(16px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes pulse-ring {
          0%, 100% { box-shadow: 0 0 0 0 rgba(108,92,231,0.3); }
          50%       { box-shadow: 0 0 0 8px rgba(108,92,231,0); }
        }
        @keyframes shimmer {
          0%   { background-position: -200% center; }
          100% { background-position: 200% center; }
        }
      `}</style>
    </div>
  );
}

// ── password strength meter ────────────────────────────────────
function PasswordStrength({ password }) {
  const checks = [
    { label: 'At least 8 characters', ok: password.length >= 8 },
    { label: 'Uppercase letter',       ok: /[A-Z]/.test(password) },
    { label: 'Number',                 ok: /\d/.test(password) },
    { label: 'Special character',      ok: /[^A-Za-z0-9]/.test(password) },
  ];
  const score = checks.filter(c => c.ok).length;
  const colors = ['#d63031', '#d63031', '#fdcb6e', '#00cec9', '#00b894'];
  const labels = ['', 'Weak', 'Weak', 'Fair', 'Strong'];

  if (!password) return null;

  return (
    <div style={{ marginTop: 8 }}>
      {/* Bar */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 6 }}>
        {[1,2,3,4].map(i => (
          <div key={i} style={{
            flex: 1, height: 3, borderRadius: 2,
            background: i <= score ? colors[score] : C.border,
            transition: 'background 0.3s ease',
          }}/>
        ))}
      </div>
      {/* Label */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 12px' }}>
          {checks.map((c, i) => (
            <span key={i} style={{
              fontSize: 10, color: c.ok ? C.green : C.textMuted,
              display: 'flex', alignItems: 'center', gap: 3,
              transition: 'color 0.2s',
            }}>
              {c.ok ? <CheckIcon /> : <span style={{ width: 12, height: 12, display: 'inline-block' }}>·</span>}
              {c.label}
            </span>
          ))}
        </div>
        {score > 0 && (
          <span style={{ fontSize: 10, fontWeight: 700, color: colors[score], flexShrink: 0 }}>
            {labels[score]}
          </span>
        )}
      </div>
    </div>
  );
}

// ── input field ────────────────────────────────────────────────
function Field({ label, type = 'text', value, onChange, placeholder, icon, error, autoFocus, children }) {
  const [focused, setFocused] = useState(false);

  return (
    <div style={{ marginBottom: 16 }}>
      <label style={{ display: 'block', color: C.textSecondary, fontSize: 11, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 7 }}>
        {label}
      </label>
      <div style={{
        display: 'flex', alignItems: 'center',
        background: 'rgba(255,255,255,0.03)',
        border: `1px solid ${error ? C.red : focused ? C.accent : C.border}`,
        borderRadius: 8,
        transition: 'border-color 0.2s, box-shadow 0.2s',
        boxShadow: focused && !error ? `0 0 0 3px rgba(108,92,231,0.12)` : error ? `0 0 0 3px rgba(214,48,49,0.1)` : 'none',
      }}>
        <span style={{ padding: '0 12px', color: error ? C.red : focused ? C.accent : C.textMuted, flexShrink: 0, transition: 'color 0.2s' }}>
          {icon}
        </span>
        <input
          type={type}
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          autoFocus={autoFocus}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          style={{
            flex: 1, background: 'transparent', border: 'none', outline: 'none',
            color: C.textPrimary, fontSize: 13, padding: '11px 0',
            fontFamily: 'inherit',
          }}
        />
        {children && <span style={{ padding: '0 12px' }}>{children}</span>}
      </div>
      {error && (
        <div style={{ color: C.red, fontSize: 11, marginTop: 5, display: 'flex', alignItems: 'center', gap: 4 }}>
          ⚠ {error}
        </div>
      )}
    </div>
  );
}

// ── main AuthPage component ────────────────────────────────────
export default function AuthPage({ onAuth }) {
  const [mode, setMode] = useState('login'); // 'login' | 'signup'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [name, setName] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // Trigger entrance animation
    const t = setTimeout(() => setMounted(true), 50);
    return () => clearTimeout(t);
  }, []);

  // Reset form when switching mode
  useEffect(() => {
    setErrors({});
    setPassword('');
    setConfirmPassword('');
  }, [mode]);

  function validate() {
    const e = {};
    if (!email.trim()) e.email = 'Email is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) e.email = 'Enter a valid email address';
    if (!password) e.password = 'Password is required';
    else if (mode === 'signup' && password.length < 8) e.password = 'Password must be at least 8 characters';
    if (mode === 'signup') {
      if (!name.trim()) e.name = 'Full name is required';
      if (password !== confirmPassword) e.confirmPassword = 'Passwords do not match';
    }
    return e;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setErrors({});
    setLoading(true);

    // Simulate auth — replace with real API call
    await new Promise(r => setTimeout(r, 1200));
    setLoading(false);
    onAuth({ email, name: name || email.split('@')[0] });
  }

  const isLogin = mode === 'login';

  return (
    <div style={{
      minHeight: '100vh', background: C.bg,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 20, position: 'relative',
      fontFamily: "'SF Pro Display', -apple-system, 'Segoe UI', sans-serif",
    }}>
      <GridBackground />

      {/* Card */}
      <div style={{
        width: '100%', maxWidth: 420,
        position: 'relative', zIndex: 1,
        opacity: mounted ? 1 : 0,
        transform: mounted ? 'translateY(0)' : 'translateY(20px)',
        transition: 'opacity 0.5s ease, transform 0.5s ease',
      }}>

        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            width: 52, height: 52, borderRadius: 14,
            background: `linear-gradient(135deg, ${C.accent}, ${C.pink})`,
            color: '#fff', marginBottom: 14,
            animation: 'pulse-ring 3s ease-in-out infinite',
            boxShadow: `0 8px 32px rgba(108,92,231,0.35)`,
          }}>
            <ShieldIcon />
          </div>
          <div style={{ color: C.textPrimary, fontSize: 22, fontWeight: 800, letterSpacing: '-0.4px' }}>
            SecurePulse
          </div>
          <div style={{ color: C.textMuted, fontSize: 12, marginTop: 4, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
            Security Intelligence Platform
          </div>
        </div>

        {/* Main card */}
        <div style={{
          background: C.bgCard,
          border: `1px solid ${C.border}`,
          borderRadius: 16,
          padding: 32,
          boxShadow: '0 24px 64px rgba(0,0,0,0.4)',
        }}>

          {/* Mode toggle tabs */}
          <div style={{
            display: 'flex', marginBottom: 28,
            background: C.bg, borderRadius: 10, padding: 4,
            border: `1px solid ${C.border}`,
          }}>
            {['login', 'signup'].map(m => (
              <button key={m} onClick={() => setMode(m)} style={{
                flex: 1, padding: '8px 0', borderRadius: 7,
                background: mode === m ? C.bgCard : 'transparent',
                border: mode === m ? `1px solid ${C.border}` : '1px solid transparent',
                color: mode === m ? C.textPrimary : C.textMuted,
                fontSize: 13, fontWeight: mode === m ? 600 : 400,
                cursor: 'pointer', transition: 'all 0.2s',
                boxShadow: mode === m ? '0 2px 8px rgba(0,0,0,0.2)' : 'none',
              }}>
                {m === 'login' ? 'Sign In' : 'Create Account'}
              </button>
            ))}
          </div>

          {/* Heading */}
          <div style={{ marginBottom: 24 }}>
            <h2 style={{ margin: '0 0 4px', color: C.textPrimary, fontSize: 18, fontWeight: 700 }}>
              {isLogin ? 'Welcome back, Sentinel' : 'Join SecurePulse'}
            </h2>
            <p style={{ margin: 0, color: C.textSecondary, fontSize: 13 }}>
              {isLogin
                ? 'Sign in to your security operations center.'
                : 'Create your account to start scanning.'}
            </p>
          </div>

          <form onSubmit={handleSubmit}>
            {/* Name field — signup only */}
            {!isLogin && (
              <div style={{
                opacity: !isLogin ? 1 : 0,
                transform: !isLogin ? 'translateY(0)' : 'translateY(-8px)',
                transition: 'all 0.25s ease',
              }}>
                <Field
                  label="Full Name"
                  value={name}
                  onChange={setName}
                  placeholder="John Smith"
                  icon={<UserIcon />}
                  error={errors.name}
                  autoFocus={!isLogin}
                />
              </div>
            )}

            {/* Email */}
            <Field
              label="Email Address"
              type="email"
              value={email}
              onChange={setEmail}
              placeholder="you@company.com"
              icon={<MailIcon />}
              error={errors.email}
              autoFocus={isLogin}
            />

            {/* Password */}
            <Field
              label="Password"
              type={showPass ? 'text' : 'password'}
              value={password}
              onChange={setPassword}
              placeholder={isLogin ? '••••••••' : 'Min. 8 characters'}
              icon={<LockIcon />}
              error={errors.password}
            >
              <button
                type="button"
                onClick={() => setShowPass(v => !v)}
                style={{ background: 'none', border: 'none', color: C.textMuted, cursor: 'pointer', padding: 0, display: 'flex' }}
              >
                <EyeIcon off={showPass} />
              </button>
            </Field>

            {/* Password strength — signup only */}
            {!isLogin && <PasswordStrength password={password} />}

            {/* Confirm password — signup only */}
            {!isLogin && (
              <div style={{ marginTop: 16 }}>
                <Field
                  label="Confirm Password"
                  type={showConfirm ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={setConfirmPassword}
                  placeholder="••••••••"
                  icon={<LockIcon />}
                  error={errors.confirmPassword}
                >
                  <button
                    type="button"
                    onClick={() => setShowConfirm(v => !v)}
                    style={{ background: 'none', border: 'none', color: C.textMuted, cursor: 'pointer', padding: 0, display: 'flex' }}
                  >
                    <EyeIcon off={showConfirm} />
                  </button>
                </Field>
              </div>
            )}

            {/* Forgot password */}
            {isLogin && (
              <div style={{ textAlign: 'right', marginTop: -8, marginBottom: 20 }}>
                <button type="button" style={{
                  background: 'none', border: 'none', color: C.accent,
                  fontSize: 12, cursor: 'pointer', padding: 0,
                }}>
                  Forgot password?
                </button>
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%', padding: '12px',
                marginTop: isLogin ? 0 : 20,
                borderRadius: 9, border: 'none',
                background: loading
                  ? C.textMuted
                  : `linear-gradient(135deg, ${C.accent} 0%, #8b7cf8 50%, ${C.pink} 100%)`,
                backgroundSize: loading ? 'auto' : '200% auto',
                color: '#fff', fontSize: 14, fontWeight: 700,
                cursor: loading ? 'not-allowed' : 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                boxShadow: loading ? 'none' : `0 4px 24px rgba(108,92,231,0.4)`,
                transition: 'all 0.2s',
                animation: loading ? 'none' : 'shimmer 3s linear infinite',
              }}
            >
              {loading ? (
                <>
                  <span style={{ animation: 'spin 0.8s linear infinite', display: 'inline-block', fontSize: 16 }}>⟳</span>
                  {isLogin ? 'Authenticating...' : 'Creating account...'}
                </>
              ) : (
                <>
                  {isLogin ? 'Access Dashboard' : 'Create Account'}
                  <ArrowIcon />
                </>
              )}
            </button>
          </form>

          {/* Divider */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 12,
            margin: '20px 0',
          }}>
            <div style={{ flex: 1, height: 1, background: C.border }}/>
            <span style={{ color: C.textMuted, fontSize: 11 }}>OR</span>
            <div style={{ flex: 1, height: 1, background: C.border }}/>
          </div>

          {/* SSO button */}
          <button style={{
            width: '100%', padding: '11px',
            borderRadius: 9, border: `1px solid ${C.border}`,
            background: 'rgba(255,255,255,0.03)',
            color: C.textSecondary, fontSize: 13, fontWeight: 500,
            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
            transition: 'all 0.2s',
          }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = C.borderLight; e.currentTarget.style.color = C.textPrimary; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.color = C.textSecondary; }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            Continue with Google
          </button>
        </div>

        {/* Security notice */}
        <div style={{
          marginTop: 20, textAlign: 'center',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
          color: C.textMuted, fontSize: 11,
        }}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
          </svg>
          256-bit encrypted · SOC 2 certified · Zero-knowledge auth
        </div>
      </div>

      <style>{`
        * { box-sizing: border-box; }
        body { margin: 0; }
        input::placeholder { color: ${C.textMuted}; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes shimmer {
          0%   { background-position: 0% center; }
          100% { background-position: 200% center; }
        }
      `}</style>
    </div>
  );
}
