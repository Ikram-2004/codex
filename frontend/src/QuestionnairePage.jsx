import { useState } from 'react';

// ── colour tokens ──────────────────────────────────────────────
const ACCENT = '#6c5ce7';
const PINK   = '#e84393';
const GREEN  = '#00b894';

// ── Professional SVG icons for each option ─────────────────────
const icons = {
  // Project type
  Globe: () => (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/>
      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
    </svg>
  ),
  Mobile: () => (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="5" y="2" width="14" height="20" rx="2" ry="2"/><line x1="12" y1="18" x2="12.01" y2="18"/>
    </svg>
  ),
  Cpu: () => (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="4" y="4" width="16" height="16" rx="2"/><rect x="9" y="9" width="6" height="6"/>
      <line x1="9" y1="1" x2="9" y2="4"/><line x1="15" y1="1" x2="15" y2="4"/>
      <line x1="9" y1="20" x2="9" y2="23"/><line x1="15" y1="20" x2="15" y2="23"/>
      <line x1="20" y1="9" x2="23" y2="9"/><line x1="20" y1="14" x2="23" y2="14"/>
      <line x1="1" y1="9" x2="4" y2="9"/><line x1="1" y1="14" x2="4" y2="14"/>
    </svg>
  ),
  Layers: () => (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/>
    </svg>
  ),
  // Security concern
  AlertTriangle: () => (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
      <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
    </svg>
  ),
  Fingerprint: () => (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 12C2 6.5 6.5 2 12 2a10 10 0 0 1 8 4"/>
      <path d="M5 19.5C5.5 18 6 15 6 12c0-1.7.7-3.3 1.8-4.5"/>
      <path d="M17 19.8c-.4-2-.8-3.3-1.4-4.8M12 12c0 3-1 5.5-3 7.5"/>
      <path d="M12 8a4 4 0 1 1 0 8"/>
    </svg>
  ),
  Server: () => (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="2" width="20" height="8" rx="2"/><rect x="2" y="14" width="20" height="8" rx="2"/>
      <line x1="6" y1="6" x2="6.01" y2="6"/><line x1="6" y1="18" x2="6.01" y2="18"/>
    </svg>
  ),
  BarChart: () => (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/>
      <line x1="2" y1="20" x2="22" y2="20"/>
    </svg>
  ),
  // Experience
  Seedling: () => (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M7 20h10"/><path d="M10 20c5.5-2.5.8-6.4 3-10"/>
      <path d="M9.5 9.4c1.1.8 1.8 2.2 2.3 3.7-2 .4-3.5.4-4.8-.3-1.2-.6-2.3-1.9-3-4.2 2.8-.5 4.4 0 5.5.8z"/>
      <path d="M14.1 6a7 7 0 0 1 1.6 5.3C14 12 12.5 12.2 11 11.5c0-3.2 1.5-5 3.1-5.5z"/>
    </svg>
  ),
  BookOpen: () => (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>
    </svg>
  ),
  Target: () => (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/>
    </svg>
  ),
  Trophy: () => (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="8 21 12 17 16 21"/><line x1="12" y1="17" x2="12" y2="11"/>
      <path d="M7 4H4a2 2 0 0 0-2 2v1a5 5 0 0 0 5 5h10a5 5 0 0 0 5-5V6a2 2 0 0 0-2-2h-3"/>
      <rect x="7" y="2" width="10" height="9" rx="2"/>
    </svg>
  ),
  // Detail
  Lightbulb: () => (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <line x1="9" y1="18" x2="15" y2="18"/><line x1="10" y1="22" x2="14" y2="22"/>
      <path d="M15.09 14c.18-.98.65-1.74 1.41-2.5A4.65 4.65 0 0 0 18 8 6 6 0 0 0 6 8c0 1 .23 2.23 1.5 3.5A4.61 4.61 0 0 1 8.91 14"/>
    </svg>
  ),
  Microscope: () => (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 18h8"/><path d="M3 22h18"/><path d="M14 22a7 7 0 1 0 0-14h-1"/>
      <path d="M9 14h2"/><path d="M9 12a2 2 0 0 1-2-2V6h6v4a2 2 0 0 1-2 2z"/>
      <path d="M12 6V3a1 1 0 0 0-1-1H9a1 1 0 0 0-1 1v3"/>
    </svg>
  ),
  FileText: () => (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
      <polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>
    </svg>
  ),
  // Deployment
  Cloud: () => (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z"/>
    </svg>
  ),
  Building: () => (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="2"/><path d="M9 22V12h6v10"/><path d="M9 7h.01"/><path d="M12 7h.01"/><path d="M15 7h.01"/>
    </svg>
  ),
  RefreshCw: () => (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/>
      <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
    </svg>
  ),
  HelpCircle: () => (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/>
    </svg>
  ),
  // Nav
  Shield: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
    </svg>
  ),
  Bell: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/>
    </svg>
  ),
  User: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
    </svg>
  ),
  Question: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/>
    </svg>
  ),
  Lock: () => (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
    </svg>
  ),
  Check: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12"/>
    </svg>
  ),
  ArrowLeft: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/>
    </svg>
  ),
  ArrowRight: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
    </svg>
  ),
  CheckCircle: () => (
    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke={GREEN} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>
    </svg>
  ),
};

// ── Questions config ────────────────────────────────────────────
const QUESTIONS = [
  {
    key: 'project_type',
    title: 'What type of project are you securing?',
    subtitle: 'Select your primary asset to configure your sentinel scan profile.',
    accentWord: null,
    layout: '2x2',
    options: [
      { value: 'Website',      icon: 'Globe',  tag: 'WEB PERIMETER',  desc: 'Public-facing websites, landing pages, and web portals' },
      { value: 'Mobile App',   icon: 'Mobile', tag: 'MOBILE VECTOR',  desc: 'iOS/Android applications and mobile-first platforms' },
      { value: 'API / Backend',icon: 'Cpu',    tag: 'BACKEND LAYER',  desc: 'REST APIs, GraphQL services, and microarchitectures' },
      { value: 'Full-stack',   icon: 'Layers', tag: 'FULL COVERAGE',  desc: 'End-to-end stack including frontend, API, and database' },
    ],
  },
  {
    key: 'security_concern',
    title: "What keeps you up at",
    accentWord: 'night?',
    subtitle: 'Select your primary security concern to help our Sentinel customize your protection profile and scan depth.',
    layout: '2x2',
    options: [
      { value: 'Data Breaches & Leaks',     icon: 'AlertTriangle', recommended: false, desc: 'Preventing unauthorized sensitive data exfiltration and protecting customer PII from dark web exposure.' },
      { value: 'Authentication & Access',   icon: 'Fingerprint',   recommended: true,  desc: 'Securing user login flows, MFA integrity, and preventing credential stuffing or broken access control.' },
      { value: 'API Security',              icon: 'Server',        recommended: false, desc: "Hardening REST/GraphQL endpoints against injection attacks and ensuring robust token-based authorization." },
      { value: 'General Assessment',        icon: 'BarChart',      recommended: false, desc: 'A holistic overview of your digital perimeter, identifying low-hanging vulnerabilities and compliance gaps.' },
    ],
  },
  {
    key: 'experience_level',
    title: 'How experienced are you with security?',
    accentWord: null,
    subtitle: "We'll tailor your sentinel dashboard and scan recommendations based on your technical depth.",
    layout: '1x4',
    options: [
      { value: 'Beginner',     icon: 'Seedling', tag: null, desc: 'Just starting out. Looking for basic protection and guided setups.' },
      { value: 'Intermediate', icon: 'BookOpen', tag: null, desc: 'Familiar with protocols. Need automated scans with detailed reports.' },
      { value: 'Advanced',     icon: 'Target',   tag: null, desc: 'Active practitioner. Require custom scripts and deep penetration tools.' },
      { value: 'Expert',       icon: 'Trophy',   tag: null, desc: 'Security architect. Need raw data, API access, and zero-day monitoring.' },
    ],
  },
  {
    key: 'detail_level',
    title: 'What level of detail do you prefer?',
    accentWord: null,
    subtitle: 'Select how SecurePulse should communicate risk assessments and security protocols to your dashboard.',
    layout: '1x3',
    options: [
      { value: 'Simple Explanations', icon: 'Lightbulb',   tag: 'BEGINNER FRIENDLY', desc: 'Plain language alerts focused on immediate impact and basic remediation steps.' },
      { value: 'Technical Details',   icon: 'Microscope',  tag: 'SELECTED',          desc: 'Full stack trace, CVE references, and raw telemetry for deep-dive investigations.' },
      { value: 'Executive Summary',   icon: 'FileText',    tag: 'MANAGEMENT VIEW',   desc: 'High-level risk scores, compliance status, and business continuity projections.' },
    ],
  },
  {
    key: 'deployment_env',
    title: "What's your deployment environment?",
    accentWord: null,
    subtitle: 'Select the infrastructure where SecurePulse will deploy its sentinel nodes to ensure maximum coverage.',
    layout: '2x2',
    options: [
      { value: 'Cloud (AWS/GCP/Azure)', icon: 'Cloud',      tags: ['SCALABLE', 'GLOBAL'], desc: 'Multi-region scalable deployment for modern cloud-native infrastructures.' },
      { value: 'On-premise',           icon: 'Building',   tags: [],                    desc: 'Secure internal deployment for air-gapped or high-compliance local data centers.' },
      { value: 'Hybrid',               icon: 'RefreshCw',  tags: [],                    desc: 'Cohesive security across both local hardware and public cloud instances.' },
      { value: 'Not Sure',             icon: 'HelpCircle', tags: [],                    desc: 'Our wizard will help you analyze your current stack and recommend the optimal setup.' },
    ],
  },
];

// ── Option card for 2×2 / 1×4 layouts ──────────────────────────
function OptionCard({ opt, selected, onClick, layout, accentColor }) {
  const [hovered, setHovered] = useState(false);
  const IconComp = icons[opt.icon];
  const isActive = selected || hovered;

  const iconBg = selected
    ? `linear-gradient(135deg, ${accentColor}, ${PINK})`
    : 'rgba(255,255,255,0.05)';
  const iconColor = selected ? '#fff' : accentColor;

  if (layout === '1x4') {
    // Horizontal card with left accent border
    return (
      <button
        onClick={onClick}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{
          display: 'flex', flexDirection: 'column', alignItems: 'flex-start',
          padding: '24px 20px', borderRadius: 12, cursor: 'pointer',
          background: selected ? 'rgba(108,92,231,0.08)' : '#111520',
          border: `1px solid ${selected ? accentColor : isActive ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.07)'}`,
          borderLeft: `3px solid ${selected ? accentColor : PINK}`,
          transition: 'all 0.2s', textAlign: 'left', position: 'relative',
          transform: hovered && !selected ? 'translateY(-2px)' : 'none',
        }}
      >
        {selected && (
          <div style={{
            position: 'absolute', top: 10, right: 10,
            width: 18, height: 18, borderRadius: '50%',
            background: accentColor,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <icons.Check />
          </div>
        )}
        <div style={{
          width: 44, height: 44, borderRadius: 10, marginBottom: 14,
          background: iconBg,
          border: selected ? 'none' : '1px solid rgba(255,255,255,0.08)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: iconColor, flexShrink: 0,
        }}>
          <IconComp />
        </div>
        <div style={{ fontSize: 15, fontWeight: 700, color: selected ? '#fff' : '#e8eaf0', marginBottom: 6 }}>
          {opt.value}
        </div>
        <div style={{ fontSize: 12, color: '#6b7891', lineHeight: 1.5 }}>
          {opt.desc}
        </div>
      </button>
    );
  }

  if (layout === '1x3') {
    // Vertical card, centered
    return (
      <button
        onClick={onClick}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          padding: '32px 20px', borderRadius: 12, cursor: 'pointer',
          background: selected ? 'rgba(108,92,231,0.08)' : '#111520',
          border: `1px solid ${selected ? accentColor : isActive ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.07)'}`,
          transition: 'all 0.2s', textAlign: 'center', position: 'relative',
          transform: hovered && !selected ? 'translateY(-2px)' : 'none',
        }}
      >
        <div style={{
          width: 52, height: 52, borderRadius: 12, marginBottom: 16,
          background: selected ? `linear-gradient(135deg, ${accentColor}, ${PINK})` : 'rgba(255,255,255,0.05)',
          border: selected ? 'none' : '1px solid rgba(255,255,255,0.08)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: selected ? '#fff' : accentColor,
        }}>
          <IconComp />
        </div>
        <div style={{ fontSize: 14, fontWeight: 700, color: selected ? '#fff' : '#e8eaf0', marginBottom: 8 }}>
          {opt.value}
        </div>
        <div style={{ fontSize: 11, color: '#6b7891', lineHeight: 1.5, marginBottom: 14 }}>
          {opt.desc}
        </div>
        {opt.tag && (
          <div style={{
            fontSize: 9, fontWeight: 700, letterSpacing: '0.08em',
            background: selected ? `rgba(108,92,231,0.2)` : 'rgba(255,255,255,0.05)',
            color: selected ? accentColor : '#4a5568',
            padding: '3px 10px', borderRadius: 20,
            border: `1px solid ${selected ? 'rgba(108,92,231,0.3)' : 'transparent'}`,
          }}>
            {selected ? 'SELECTED' : opt.tag}
          </div>
        )}
      </button>
    );
  }

  // 2×2 layout
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'flex', flexDirection: 'column', alignItems: 'flex-start',
        padding: '24px 20px', borderRadius: 12, cursor: 'pointer',
        background: selected ? 'rgba(108,92,231,0.08)' : '#111520',
        border: `1px solid ${selected ? accentColor : isActive ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.07)'}`,
        borderLeft: `3px solid ${selected ? accentColor : PINK}`,
        transition: 'all 0.2s', textAlign: 'left', position: 'relative',
        transform: hovered && !selected ? 'translateY(-2px)' : 'none',
      }}
    >
      {opt.recommended && (
        <div style={{
          position: 'absolute', top: 10, right: 10,
          fontSize: 9, fontWeight: 700, letterSpacing: '0.06em',
          background: 'rgba(108,92,231,0.15)', color: accentColor,
          padding: '2px 8px', borderRadius: 4, border: `1px solid rgba(108,92,231,0.3)`,
        }}>RECOMMENDED</div>
      )}
      {selected && (
        <div style={{
          position: 'absolute', top: 10, right: opt.recommended ? 'auto' : 10,
          width: 18, height: 18, borderRadius: '50%',
          background: accentColor,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <icons.Check />
        </div>
      )}
      <div style={{
        width: 44, height: 44, borderRadius: 10, marginBottom: 14,
        background: selected ? `linear-gradient(135deg, ${accentColor}, ${PINK})` : 'rgba(255,255,255,0.05)',
        border: selected ? 'none' : '1px solid rgba(255,255,255,0.08)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: selected ? '#fff' : accentColor,
      }}>
        <IconComp />
      </div>
      <div style={{ fontSize: 15, fontWeight: 700, color: selected ? '#fff' : '#e8eaf0', marginBottom: 6 }}>
        {opt.value}
      </div>
      <div style={{ fontSize: 12, color: '#6b7891', lineHeight: 1.5 }}>
        {opt.desc}
      </div>
      {(opt.tags && opt.tags.length > 0) && (
        <div style={{ display: 'flex', gap: 6, marginTop: 12 }}>
          {opt.tags.map(t => (
            <span key={t} style={{
              fontSize: 9, fontWeight: 700, letterSpacing: '0.06em',
              background: 'rgba(255,255,255,0.06)', color: '#4a5568',
              padding: '2px 8px', borderRadius: 4,
            }}>{t}</span>
          ))}
        </div>
      )}
    </button>
  );
}

// ── Main Component ──────────────────────────────────────────────
export default function QuestionnairePage({ userName, onComplete }) {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState({});
  const [finishing, setFinishing] = useState(false);

  const totalSteps = QUESTIONS.length;
  const current = QUESTIONS[step];
  const selectedVal = answers[current.key];
  const progressPct = (step / totalSteps) * 100;
  const isLastStep = step === totalSteps - 1;

  function selectOption(val) {
    setAnswers(prev => ({ ...prev, [current.key]: val }));
  }

  function handleContinue() {
    if (!selectedVal) return;
    if (isLastStep) {
      setFinishing(true);
      setTimeout(() => onComplete(answers), 1400);
    } else {
      setStep(s => s + 1);
    }
  }

  // ── Finishing screen ─────────────────────────────────────────
  if (finishing) {
    return (
      <div style={{
        minHeight: '100vh', background: '#0a0d14',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontFamily: "'SF Pro Display', -apple-system, 'Segoe UI', sans-serif",
      }}>
        <div style={{ textAlign: 'center', animation: 'qFadeUp 0.5s ease forwards' }}>
          <div style={{ marginBottom: 20, display: 'flex', justifyContent: 'center' }}>
            <icons.CheckCircle />
          </div>
          <h2 style={{ margin: '0 0 8px', color: '#f0f1f5', fontSize: 22, fontWeight: 700 }}>Profile Complete!</h2>
          <p style={{ margin: '0 0 28px', color: '#6b7891', fontSize: 13 }}>
            Personalizing your SecurePulse experience...
          </p>
          <div style={{ width: 220, height: 3, borderRadius: 2, background: '#1e2535', margin: '0 auto', overflow: 'hidden' }}>
            <div style={{
              height: '100%', borderRadius: 2,
              background: `linear-gradient(90deg, ${ACCENT}, ${PINK})`,
              animation: 'qLoadBar 1.2s ease forwards',
            }} />
          </div>
        </div>
        <style>{`
          @keyframes qFadeUp { from{opacity:0;transform:translateY(20px)} to{opacity:1;transform:translateY(0)} }
          @keyframes qLoadBar { from{width:0%} to{width:100%} }
        `}</style>
      </div>
    );
  }

  const gridCols = {
    '2x2': 'repeat(2, 1fr)',
    '1x4': 'repeat(4, 1fr)',
    '1x3': 'repeat(3, 1fr)',
  };

  return (
    <div style={{
      minHeight: '100vh', background: '#0a0d14',
      fontFamily: "'SF Pro Display', -apple-system, 'Segoe UI', sans-serif",
      color: '#f0f1f5', display: 'flex', flexDirection: 'column',
    }}>
      <style>{`
        * { box-sizing: border-box; }
        body { margin:0; background:#0a0d14; }
        @keyframes qSlide { from{opacity:0;transform:translateX(20px)} to{opacity:1;transform:translateX(0)} }
        @keyframes qFadeUp { from{opacity:0;transform:translateY(20px)} to{opacity:1;transform:translateY(0)} }
        @keyframes qLoadBar { from{width:0%} to{width:100%} }
      `}</style>

      {/* ── Top Nav ───────────────────────────────────────────── */}
      <nav style={{
        height: 56, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 32px', borderBottom: '1px solid rgba(255,255,255,0.06)',
        background: 'rgba(10,13,20,0.95)', backdropFilter: 'blur(10px)',
        position: 'sticky', top: 0, zIndex: 100,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{
            width: 28, height: 28, borderRadius: 7,
            background: `linear-gradient(135deg, ${ACCENT}, ${PINK})`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <icons.Shield />
          </div>
          <span style={{ fontSize: 14, fontWeight: 800, letterSpacing: '0.04em', textTransform: 'uppercase' }}>SecurePulse</span>
          <span style={{
            marginLeft: 8, fontSize: 9, fontWeight: 700, letterSpacing: '0.1em',
            background: `rgba(108,92,231,0.15)`, color: ACCENT,
            padding: '2px 8px', borderRadius: 4, border: `1px solid rgba(108,92,231,0.3)`,
            textTransform: 'uppercase',
          }}>Sentinel Grade</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{
            fontSize: 11, fontWeight: 700, color: '#4a5568', letterSpacing: '0.06em', textTransform: 'uppercase',
          }}>
            Step {step + 1} of {totalSteps}
          </div>
          <button style={{
            background: 'none', border: 'none', cursor: 'pointer',
            color: '#4a5568', display: 'flex', alignItems: 'center', justifyContent: 'center',
            width: 30, height: 30,
          }}>
            <icons.Question />
          </button>
          <button style={{
            background: 'none', border: 'none', cursor: 'pointer',
            color: '#4a5568', display: 'flex', alignItems: 'center', justifyContent: 'center',
            width: 30, height: 30,
          }}>
            <icons.Bell />
          </button>
          <div style={{
            width: 30, height: 30, borderRadius: '50%',
            background: `linear-gradient(135deg, ${ACCENT}, ${PINK})`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <icons.User />
          </div>
        </div>
      </nav>

      {/* ── Progress bar ──────────────────────────────────────── */}
      <div style={{ padding: '0 32px' }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 20, paddingTop: 20, paddingBottom: 4,
        }}>
          {step > 0 && (
            <button onClick={() => setStep(s => s - 1)} style={{
              background: 'none', border: 'none', cursor: 'pointer',
              color: '#6b7891', fontSize: 12, fontWeight: 600,
              display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0,
              padding: '4px 0',
            }}>
              <icons.ArrowLeft /> Back
            </button>
          )}
          <div style={{ flex: 1, display: 'flex', gap: 6 }}>
            {QUESTIONS.map((_, i) => (
              <div key={i} style={{
                flex: 1, height: 3, borderRadius: 2,
                background: i <= step ? `linear-gradient(90deg, ${ACCENT}, ${PINK})` : 'rgba(255,255,255,0.08)',
                transition: 'all 0.4s ease',
              }} />
            ))}
          </div>
          <div style={{
            fontSize: 11, fontWeight: 700, color: i => i <= step ? ACCENT : '#4a5568',
            letterSpacing: '0.06em', flexShrink: 0, textAlign: 'right',
            color: '#4a5568',
          }}>
            {Math.round(progressPct + (1 / totalSteps) * 100)}% Complete
          </div>
        </div>
      </div>

      {/* ── Question area ─────────────────────────────────────── */}
      <div
        key={step}
        style={{
          flex: 1, display: 'flex', flexDirection: 'column',
          alignItems: 'center', padding: '48px 32px 32px',
          animation: 'qSlide 0.35s ease forwards',
          maxWidth: 920, margin: '0 auto', width: '100%',
        }}
      >
        {/* Journey label */}
        <div style={{
          fontSize: 10, fontWeight: 700, letterSpacing: '0.14em',
          color: '#3a4560', textTransform: 'uppercase', marginBottom: 10, alignSelf: 'flex-start',
        }}>
          Onboarding Journey
        </div>

        {/* Question title */}
        <h1 style={{
          fontSize: 'clamp(24px, 4vw, 40px)', fontWeight: 800,
          lineHeight: 1.12, letterSpacing: '-0.5px',
          margin: '0 0 14px', textAlign: 'left', alignSelf: 'flex-start',
          color: '#f0f1f5',
        }}>
          {current.title}{' '}
          {current.accentWord && (
            <span style={{
              fontStyle: 'italic',
              background: `linear-gradient(135deg, ${ACCENT}, ${PINK})`,
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
            }}>
              {current.accentWord}
            </span>
          )}
        </h1>

        <p style={{
          fontSize: 14, color: '#6b7891', maxWidth: 560,
          lineHeight: 1.6, marginBottom: 36, alignSelf: 'flex-start', margin: '0 0 36px',
        }}>
          {current.subtitle}
        </p>

        {/* Options */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: gridCols[current.layout],
          gap: 14, width: '100%',
        }}>
          {current.options.map((opt) => (
            <OptionCard
              key={opt.value}
              opt={opt}
              selected={selectedVal === opt.value}
              onClick={() => selectOption(opt.value)}
              layout={current.layout}
              accentColor={ACCENT}
            />
          ))}
        </div>
      </div>

      {/* ── Bottom bar ────────────────────────────────────────── */}
      <div style={{
        borderTop: '1px solid rgba(255,255,255,0.06)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '20px 48px',
        background: 'rgba(10,13,20,0.95)',
      }}>
        {/* Left: back */}
        <button
          onClick={() => step > 0 && setStep(s => s - 1)}
          style={{
            background: 'none', border: 'none', cursor: step > 0 ? 'pointer' : 'default',
            color: step > 0 ? '#6b7891' : 'transparent',
            fontSize: 13, fontWeight: 600,
            display: 'flex', alignItems: 'center', gap: 8,
            transition: 'color 0.2s',
          }}
        >
          <icons.ArrowLeft /> Back
        </button>

        {/* Center: hint */}
        <div style={{ fontSize: 12, color: '#3a4560', display: 'flex', alignItems: 'center', gap: 6 }}>
          <icons.Lock />
          Your selection is used to optimize your private environment.
        </div>

        {/* Right: continue */}
        <button
          onClick={handleContinue}
          disabled={!selectedVal}
          style={{
            padding: '12px 28px', borderRadius: 10, fontSize: 14, fontWeight: 700,
            background: selectedVal ? `linear-gradient(135deg, ${ACCENT}, #8b7cf8)` : 'rgba(255,255,255,0.05)',
            border: 'none', color: selectedVal ? '#fff' : '#3a4560',
            cursor: selectedVal ? 'pointer' : 'not-allowed',
            display: 'flex', alignItems: 'center', gap: 8,
            boxShadow: selectedVal ? '0 4px 20px rgba(108,92,231,0.4)' : 'none',
            transition: 'all 0.2s',
          }}
        >
          {isLastStep ? 'Complete Setup' : `Continue to Step ${step + 2}`}
          {!isLastStep && <icons.ArrowRight />}
        </button>
      </div>

      {/* ── Bottom trust bar (step 5 only) ────────────────────── */}
      {isLastStep && (
        <div style={{
          padding: '12px 48px 20px',
          display: 'flex', justifyContent: 'center', gap: 32,
          background: '#0a0d14',
        }}>
          {['SOC2 CERTIFIED', 'AES-256 ENCRYPTED'].map(t => (
            <div key={t} style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#3a4560', fontSize: 10, fontWeight: 600, letterSpacing: '0.08em' }}>
              <icons.Lock /> {t}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
