import { useState } from 'react';

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
  pinkSoft: 'rgba(232,67,147,0.12)',
  cyan: '#00cec9',
  green: '#00b894',
  greenSoft: 'rgba(0,184,148,0.12)',
  amber: '#fdcb6e',
  red: '#d63031',
  textPrimary: '#f0f1f5',
  textSecondary: '#8892a4',
  textMuted: '#4a5568',
};

// ── Questions config ───────────────────────────────────────────
const QUESTIONS = [
  {
    key: 'project_type',
    title: 'What type of project are you securing?',
    subtitle: 'This helps us focus the scan on relevant attack surfaces.',
    options: [
      { value: 'Website', icon: '🌐', desc: 'Public-facing website or web app' },
      { value: 'Mobile App', icon: '📱', desc: 'iOS / Android mobile application' },
      { value: 'API / Backend', icon: '⚙️', desc: 'REST API, GraphQL, or microservice' },
      { value: 'Full-stack', icon: '🏗️', desc: 'Frontend + backend + database' },
    ],
  },
  {
    key: 'security_concern',
    title: 'What is your primary security concern?',
    subtitle: 'We\'ll prioritize vulnerabilities related to this area.',
    options: [
      { value: 'Data Breaches & Leaks', icon: '🔓', desc: 'Sensitive data exposure and leakage' },
      { value: 'Authentication & Access', icon: '🔑', desc: 'Login, session, and privilege issues' },
      { value: 'API Security', icon: '🛡️', desc: 'Endpoint hardening and rate limiting' },
      { value: 'General Assessment', icon: '📊', desc: 'Broad vulnerability overview' },
    ],
  },
  {
    key: 'experience_level',
    title: 'How experienced are you with security?',
    subtitle: 'We\'ll tailor explanations to your skill level.',
    options: [
      { value: 'Beginner', icon: '🌱', desc: 'New to security concepts' },
      { value: 'Intermediate', icon: '📚', desc: 'Familiar with common vulnerabilities' },
      { value: 'Advanced', icon: '🎯', desc: 'Regular security auditing experience' },
      { value: 'Expert', icon: '🏆', desc: 'Professional security engineer' },
    ],
  },
  {
    key: 'detail_level',
    title: 'What level of detail do you prefer?',
    subtitle: 'Controls the depth of scan reports and AI explanations.',
    options: [
      { value: 'Simple Explanations', icon: '💡', desc: 'Plain language, easy to understand' },
      { value: 'Technical Details', icon: '🔬', desc: 'Full technical breakdown with code' },
      { value: 'Executive Summary', icon: '📋', desc: 'High-level impact and business risk' },
    ],
  },
  {
    key: 'deployment_env',
    title: 'What\'s your deployment environment?',
    subtitle: 'Helps us provide environment-specific remediation advice.',
    options: [
      { value: 'Cloud (AWS/GCP/Azure)', icon: '☁️', desc: 'Major cloud provider infrastructure' },
      { value: 'On-premise', icon: '🏢', desc: 'Self-hosted servers and data center' },
      { value: 'Hybrid', icon: '🔄', desc: 'Mix of cloud and on-premise' },
      { value: 'Not Sure', icon: '🤷', desc: 'Haven\'t decided or don\'t know yet' },
    ],
  },
];

// ── Shield icon ────────────────────────────────────────────────
const ShieldIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
  </svg>
);

const ArrowRight = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
  </svg>
);

const CheckCircle = () => (
  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke={C.green} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>
  </svg>
);

// ── Main component ─────────────────────────────────────────────
export default function QuestionnairePage({ userName, onComplete }) {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState({});
  const [finishing, setFinishing] = useState(false);

  const totalSteps = QUESTIONS.length;
  const current = QUESTIONS[step];
  const progress = ((step) / totalSteps) * 100;
  const isLastStep = step === totalSteps - 1;

  function selectOption(value) {
    const newAnswers = { ...answers, [current.key]: value };
    setAnswers(newAnswers);

    if (isLastStep) {
      // Finish with a brief animation
      setFinishing(true);
      setTimeout(() => {
        onComplete(newAnswers);
      }, 1200);
    } else {
      // Auto-advance after short delay
      setTimeout(() => setStep(s => s + 1), 300);
    }
  }

  function goBack() {
    if (step > 0) setStep(s => s - 1);
  }

  // ── Finishing screen ────────────────────────────────────────
  if (finishing) {
    return (
      <div style={{
        minHeight: '100vh', background: C.bg,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontFamily: "'SF Pro Display', -apple-system, 'Segoe UI', sans-serif",
      }}>
        <div style={{
          textAlign: 'center',
          animation: 'qFadeUp 0.6s ease forwards',
        }}>
          <div style={{ marginBottom: 20 }}><CheckCircle /></div>
          <h2 style={{ margin: '0 0 8px', color: C.textPrimary, fontSize: 24, fontWeight: 700 }}>
            Profile Complete!
          </h2>
          <p style={{ margin: 0, color: C.textSecondary, fontSize: 14 }}>
            Personalizing your SecurePulse experience...
          </p>
          <div style={{
            marginTop: 24, width: 200, height: 3, borderRadius: 2,
            background: C.border, margin: '24px auto 0',
            overflow: 'hidden',
          }}>
            <div style={{
              height: '100%', borderRadius: 2,
              background: `linear-gradient(90deg, ${C.accent}, ${C.pink})`,
              animation: 'qLoadBar 1s ease forwards',
            }}/>
          </div>
        </div>
        <style>{`
          @keyframes qFadeUp { from { opacity:0; transform:translateY(20px); } to { opacity:1; transform:translateY(0); } }
          @keyframes qLoadBar { from { width:0%; } to { width:100%; } }
        `}</style>
      </div>
    );
  }

  // ── Main questionnaire ──────────────────────────────────────
  return (
    <div style={{
      minHeight: '100vh', background: C.bg,
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      padding: '40px 20px',
      fontFamily: "'SF Pro Display', -apple-system, 'Segoe UI', sans-serif",
    }}>
      {/* Top bar */}
      <div style={{
        width: '100%', maxWidth: 640,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        marginBottom: 40,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 36, height: 36, borderRadius: 10,
            background: `linear-gradient(135deg, ${C.accent}, ${C.pink})`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#fff',
          }}>
            <ShieldIcon />
          </div>
          <div>
            <div style={{ color: C.textPrimary, fontSize: 14, fontWeight: 700 }}>SecurePulse</div>
            <div style={{ color: C.textMuted, fontSize: 10, letterSpacing: '0.06em', textTransform: 'uppercase' }}>Onboarding</div>
          </div>
        </div>
        <div style={{ color: C.textSecondary, fontSize: 12 }}>
          Welcome, <span style={{ color: C.accent, fontWeight: 600 }}>{userName}</span>
        </div>
      </div>

      {/* Progress bar */}
      <div style={{ width: '100%', maxWidth: 640, marginBottom: 40 }}>
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          marginBottom: 8,
        }}>
          <span style={{ color: C.textMuted, fontSize: 11, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
            Question {step + 1} of {totalSteps}
          </span>
          <span style={{ color: C.textSecondary, fontSize: 11 }}>
            {Math.round(progress)}% complete
          </span>
        </div>
        <div style={{ height: 4, background: C.border, borderRadius: 2, overflow: 'hidden' }}>
          <div style={{
            height: '100%', borderRadius: 2,
            width: `${progress}%`,
            background: `linear-gradient(90deg, ${C.accent}, ${C.pink})`,
            transition: 'width 0.5s cubic-bezier(0.4, 0, 0.2, 1)',
          }}/>
        </div>
        {/* Step dots */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 16 }}>
          {QUESTIONS.map((_, i) => (
            <div
              key={i}
              style={{
                width: i === step ? 24 : 8,
                height: 8,
                borderRadius: 4,
                background: i < step ? C.green : i === step ? C.accent : C.border,
                transition: 'all 0.3s ease',
                cursor: i < step ? 'pointer' : 'default',
              }}
              onClick={() => i < step && setStep(i)}
            />
          ))}
        </div>
      </div>

      {/* Question card */}
      <div
        key={step}
        style={{
          width: '100%', maxWidth: 640,
          animation: 'qSlideIn 0.35s ease forwards',
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <h2 style={{
            margin: '0 0 8px', color: C.textPrimary,
            fontSize: 22, fontWeight: 700, letterSpacing: '-0.3px',
          }}>
            {current.title}
          </h2>
          <p style={{ margin: 0, color: C.textSecondary, fontSize: 13 }}>
            {current.subtitle}
          </p>
        </div>

        {/* Options grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: current.options.length === 3 ? 'repeat(3, 1fr)' : 'repeat(2, 1fr)',
          gap: 12,
        }}>
          {current.options.map((opt) => {
            const selected = answers[current.key] === opt.value;
            return (
              <button
                key={opt.value}
                onClick={() => selectOption(opt.value)}
                style={{
                  background: selected
                    ? `linear-gradient(135deg, rgba(108,92,231,0.15), rgba(232,67,147,0.08))`
                    : C.bgCard,
                  border: `1.5px solid ${selected ? C.accent : C.border}`,
                  borderRadius: 14,
                  padding: '24px 16px',
                  cursor: 'pointer',
                  display: 'flex', flexDirection: 'column',
                  alignItems: 'center', gap: 10,
                  transition: 'all 0.2s ease',
                  position: 'relative',
                  overflow: 'hidden',
                }}
                onMouseEnter={e => {
                  if (!selected) {
                    e.currentTarget.style.borderColor = C.borderLight;
                    e.currentTarget.style.transform = 'translateY(-2px)';
                    e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.3)';
                  }
                }}
                onMouseLeave={e => {
                  if (!selected) {
                    e.currentTarget.style.borderColor = C.border;
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = 'none';
                  }
                }}
              >
                {selected && (
                  <div style={{
                    position: 'absolute', top: 8, right: 8,
                    width: 20, height: 20, borderRadius: '50%',
                    background: C.accent,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12"/>
                    </svg>
                  </div>
                )}
                <span style={{ fontSize: 28 }}>{opt.icon}</span>
                <span style={{
                  color: selected ? C.accent : C.textPrimary,
                  fontSize: 14, fontWeight: 600,
                }}>{opt.value}</span>
                <span style={{
                  color: C.textSecondary, fontSize: 11,
                  lineHeight: 1.4, textAlign: 'center',
                }}>{opt.desc}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Navigation */}
      <div style={{
        width: '100%', maxWidth: 640,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        marginTop: 32,
      }}>
        <button
          onClick={goBack}
          disabled={step === 0}
          style={{
            padding: '10px 20px', borderRadius: 8,
            background: 'transparent',
            border: `1px solid ${step === 0 ? 'transparent' : C.border}`,
            color: step === 0 ? 'transparent' : C.textSecondary,
            fontSize: 13, cursor: step === 0 ? 'default' : 'pointer',
            transition: 'all 0.2s',
          }}
        >
          ← Back
        </button>

        {answers[current.key] && !isLastStep && (
          <button
            onClick={() => setStep(s => s + 1)}
            style={{
              padding: '10px 20px', borderRadius: 8,
              background: C.accent,
              border: 'none',
              color: '#fff', fontSize: 13, fontWeight: 600,
              cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: 6,
              boxShadow: `0 4px 16px rgba(108,92,231,0.3)`,
              transition: 'all 0.2s',
            }}
          >
            Next <ArrowRight />
          </button>
        )}
      </div>

      {/* Security footer */}
      <div style={{
        marginTop: 'auto', paddingTop: 40,
        display: 'flex', alignItems: 'center', gap: 6,
        color: C.textMuted, fontSize: 11,
      }}>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
        </svg>
        Your responses are stored locally and never leave your session
      </div>

      <style>{`
        * { box-sizing: border-box; }
        body { margin: 0; }
        @keyframes qSlideIn {
          from { opacity: 0; transform: translateX(30px); }
          to   { opacity: 1; transform: translateX(0); }
        }
      `}</style>
    </div>
  );
}
