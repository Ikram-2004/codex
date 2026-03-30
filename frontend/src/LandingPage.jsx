import { useState, useEffect } from 'react';

const ACCENT = '#6c5ce7';
const PINK   = '#e84393';

// ── SVG Icons ──────────────────────────────────────────────────
const ShieldIcon = ({ size = 18, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
  </svg>
);
const ZapIcon = ({ size = 18, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
  </svg>
);
const TrendIcon = ({ size = 18, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/>
  </svg>
);
const LockIcon = ({ size = 18, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
  </svg>
);
const ArrowRightIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
  </svg>
);

// ── Animated counter ───────────────────────────────────────────
function Counter({ target, suffix = '', duration = 1800 }) {
  const [val, setVal] = useState(0);
  useEffect(() => {
    let start = null;
    const step = (ts) => {
      if (!start) start = ts;
      const prog = Math.min((ts - start) / duration, 1);
      setVal(Math.floor(prog * target));
      if (prog < 1) requestAnimationFrame(step);
    };
    const raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);
  return <>{val}{suffix}</>;
}

export default function LandingPage({ onGetStarted }) {
  const [hovered, setHovered] = useState(null);

  const features = [
    {
      icon: <ShieldIcon size={22} color={ACCENT} />,
      title: 'Bulletproof Assets',
      desc: 'Continuous automated scanning across your entire digital surface area.',
    },
    {
      icon: <ZapIcon size={22} color={PINK} />,
      title: 'Instant Remediation',
      desc: "Don't just find vulnerabilities — fix them automatically with AI-generated patches.",
    },
    {
      icon: <TrendIcon size={22} color='#00cec9' />,
      title: 'Kinetic Intelligence',
      desc: 'Behavioral analysis that anticipates threats before they manifest.',
    },
  ];

  const stats = [
    { val: 99, suffix: '.9%', label: 'Uptime SLA' },
    { val: 10, suffix: 'K+', label: 'Threats Blocked Daily' },
    { val: 500, suffix: '+', label: 'Enterprise Clients' },
  ];

  const trust = [
    { icon: <ShieldIcon size={16} color='#8892a4' />, label: 'SOC2 COMPLIANT' },
    { icon: <LockIcon size={16} color='#8892a4' />,   label: 'AES-256 BIT' },
    { icon: <ShieldIcon size={16} color='#8892a4' />, label: 'ISO 27001' },
  ];

  return (
    <div style={{
      minHeight: '100vh', background: '#0a0d14',
      fontFamily: "'SF Pro Display', -apple-system, 'Segoe UI', sans-serif",
      display: 'flex', flexDirection: 'column',
      color: '#f0f1f5',
    }}>
      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: #0a0d14; }
        @keyframes fadeUp { from { opacity:0; transform:translateY(24px); } to { opacity:1; transform:translateY(0); } }
        @keyframes float { 0%,100%{transform:translateY(0px)} 50%{transform:translateY(-8px)} }
        @keyframes glow { 0%,100%{opacity:0.4} 50%{opacity:0.8} }
        .hero-anim { animation: fadeUp 0.7s ease forwards; }
        .hero-anim-2 { animation: fadeUp 0.7s 0.15s ease forwards; opacity: 0; }
        .hero-anim-3 { animation: fadeUp 0.7s 0.3s ease forwards; opacity: 0; }
        .feature-card:hover { transform: translateY(-4px) !important; border-color: ${ACCENT} !important; }
        .cta-btn:hover { transform: translateY(-2px); box-shadow: 0 8px 32px rgba(108,92,231,0.5) !important; }
      `}</style>

      {/* ── Nav ─────────────────────────────────────────────── */}
      <nav style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '18px 48px', borderBottom: '1px solid rgba(255,255,255,0.06)',
        position: 'sticky', top: 0, zIndex: 100, background: 'rgba(10,13,20,0.9)',
        backdropFilter: 'blur(12px)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 32, height: 32, borderRadius: 8,
            background: `linear-gradient(135deg, ${ACCENT}, ${PINK})`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <ShieldIcon size={16} color="#fff" />
          </div>
          <span style={{ fontSize: 16, fontWeight: 700, letterSpacing: '-0.3px' }}>SecurePulse</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button onClick={onGetStarted} style={{
            padding: '8px 20px', borderRadius: 8, fontSize: 13, fontWeight: 600,
            background: 'transparent', border: '1px solid rgba(108,92,231,0.4)',
            color: ACCENT, cursor: 'pointer', transition: 'all 0.2s',
          }}
            onMouseOver={e => e.currentTarget.style.background = 'rgba(108,92,231,0.1)'}
            onMouseOut={e => e.currentTarget.style.background = 'transparent'}
          >
            Sign In
          </button>
          <button onClick={onGetStarted} className="cta-btn" style={{
            padding: '8px 20px', borderRadius: 8, fontSize: 13, fontWeight: 600,
            background: `linear-gradient(135deg, ${ACCENT}, #8b7cf8)`,
            border: 'none', color: '#fff', cursor: 'pointer',
            boxShadow: '0 4px 16px rgba(108,92,231,0.35)',
            transition: 'all 0.2s',
          }}>
            Get Started
          </button>
        </div>
      </nav>

      {/* ── Hero ─────────────────────────────────────────────── */}
      <div style={{
        flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center',
        justifyContent: 'center', padding: '80px 24px 60px', textAlign: 'center',
        position: 'relative', overflow: 'hidden',
      }}>
        {/* Background glow */}
        <div style={{
          position: 'absolute', top: '20%', left: '50%', transform: 'translateX(-50%)',
          width: 600, height: 300, borderRadius: '50%',
          background: `radial-gradient(ellipse, rgba(108,92,231,0.12) 0%, transparent 70%)`,
          pointerEvents: 'none', animation: 'glow 4s ease infinite',
        }} />

        {/* Status pill */}
        <div className="hero-anim" style={{
          display: 'inline-flex', alignItems: 'center', gap: 8,
          padding: '6px 16px', borderRadius: 20, marginBottom: 32,
          background: 'rgba(0,184,148,0.08)', border: '1px solid rgba(0,184,148,0.2)',
        }}>
          <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#00b894', display: 'inline-block' }} />
          <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.1em', color: '#00b894', textTransform: 'uppercase' }}>
            Network Status: Optimized
          </span>
        </div>

        {/* Headline */}
        <h1 className="hero-anim-2" style={{
          fontSize: 'clamp(36px, 6vw, 72px)', fontWeight: 800,
          lineHeight: 1.08, letterSpacing: '-1.5px', maxWidth: 820,
          marginBottom: 24,
        }}>
          Secure Your Digital{' '}
          <span style={{
            fontStyle: 'italic',
            background: `linear-gradient(135deg, ${ACCENT}, ${PINK})`,
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
          }}>Perimeter</span>
          {' '}with Kinetic Depth Intelligence.
        </h1>

        <p className="hero-anim-3" style={{
          fontSize: 17, color: '#8892a4', maxWidth: 540, lineHeight: 1.65, marginBottom: 40,
        }}>
          The ultimate sentinel for your websites, apps, and codebases. Real-time threat detection meets AI-powered remediation.
        </p>

        {/* CTA */}
        <div className="hero-anim-3" style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <button onClick={onGetStarted} className="cta-btn" style={{
            padding: '14px 36px', borderRadius: 10, fontSize: 15, fontWeight: 700,
            background: `linear-gradient(135deg, ${ACCENT}, #8b7cf8)`,
            border: 'none', color: '#fff', cursor: 'pointer',
            boxShadow: '0 6px 28px rgba(108,92,231,0.45)',
            transition: 'all 0.25s',
            display: 'flex', alignItems: 'center', gap: 8,
          }}>
            Get Started Now <ArrowRightIcon />
          </button>
        </div>

        {/* Stats */}
        <div style={{
          display: 'flex', gap: 48, marginTop: 56, paddingTop: 48,
          borderTop: '1px solid rgba(255,255,255,0.06)',
        }}>
          {stats.map(({ val, suffix, label }, i) => (
            <div key={i} style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 28, fontWeight: 800, color: '#f0f1f5', letterSpacing: '-0.5px' }}>
                <Counter target={val} suffix={suffix} />
              </div>
              <div style={{ fontSize: 11, color: '#4a5568', textTransform: 'uppercase', letterSpacing: '0.08em', marginTop: 4 }}>
                {label}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Features ──────────────────────────────────────────── */}
      <div style={{ padding: '0 48px 80px', maxWidth: 1100, margin: '0 auto', width: '100%' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20 }}>
          {features.map((f, i) => (
            <div
              key={i}
              className="feature-card"
              onMouseEnter={() => setHovered(i)}
              onMouseLeave={() => setHovered(null)}
              style={{
                background: '#111520',
                border: `1px solid ${hovered === i ? ACCENT : 'rgba(255,255,255,0.06)'}`,
                borderRadius: 14, padding: 28,
                transition: 'all 0.25s',
                cursor: 'default',
              }}
            >
              <div style={{
                width: 44, height: 44, borderRadius: 10,
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.08)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                marginBottom: 16,
              }}>
                {f.icon}
              </div>
              <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 8, color: '#f0f1f5' }}>{f.title}</div>
              <div style={{ fontSize: 13, color: '#6b7891', lineHeight: 1.6 }}>{f.desc}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Trust Bar ─────────────────────────────────────────── */}
      <div style={{
        borderTop: '1px solid rgba(255,255,255,0.05)',
        padding: '40px 48px',
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 24,
      }}>
        <div style={{ fontSize: 11, color: '#3a4560', letterSpacing: '0.14em', textTransform: 'uppercase', fontWeight: 600 }}>
          Trusted by Global Enterprises &amp; Security Professionals
        </div>
        <div style={{ display: 'flex', gap: 48, alignItems: 'center' }}>
          {trust.map(({ icon, label }, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {icon}
              <span style={{ fontSize: 12, fontWeight: 600, color: '#4a5568', letterSpacing: '0.06em' }}>{label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Footer ────────────────────────────────────────────── */}
      <footer style={{
        borderTop: '1px solid rgba(255,255,255,0.05)',
        padding: '24px 48px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{
            width: 24, height: 24, borderRadius: 6,
            background: `linear-gradient(135deg, ${ACCENT}, ${PINK})`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <ShieldIcon size={12} color="#fff" />
          </div>
          <span style={{ fontSize: 13, fontWeight: 700, color: '#f0f1f5' }}>SecurePulse</span>
        </div>
        <div style={{ display: 'flex', gap: 24 }}>
          {['Privacy Policy', 'Terms of Service', 'Status'].map(l => (
            <a key={l} href="#" style={{ fontSize: 12, color: '#4a5568', textDecoration: 'none', transition: 'color 0.15s' }}
              onMouseOver={e => e.currentTarget.style.color = '#8892a4'}
              onMouseOut={e => e.currentTarget.style.color = '#4a5568'}
            >{l}</a>
          ))}
        </div>
        <div style={{ fontSize: 12, color: '#3a4560' }}>© 2025 SecurePulse. Kinetic Depth Security.</div>
      </footer>
    </div>
  );
}
