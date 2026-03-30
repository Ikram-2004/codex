import { useState, useEffect, useRef } from 'react';
import { runScan } from './api';

// ── colour tokens ──────────────────────────────────────────────
const C = {
  bg: '#0f1117',
  bgCard: '#161b27',
  bgCardHover: '#1a2033',
  sidebar: '#11151e',
  border: '#1e2535',
  borderLight: '#252d40',
  accent: '#6c5ce7',
  accentHover: '#7d6ff0',
  accentSoft: 'rgba(108,92,231,0.15)',
  pink: '#e84393',
  pinkSoft: 'rgba(232,67,147,0.12)',
  cyan: '#00cec9',
  cyanSoft: 'rgba(0,206,201,0.12)',
  green: '#00b894',
  greenSoft: 'rgba(0,184,148,0.12)',
  amber: '#fdcb6e',
  amberSoft: 'rgba(253,203,110,0.12)',
  red: '#d63031',
  redSoft: 'rgba(214,48,49,0.12)',
  textPrimary: '#f0f1f5',
  textSecondary: '#8892a4',
  textMuted: '#4a5568',
};

const severityConfig = {
  CRITICAL: { color: '#ff4757', bg: 'rgba(255,71,87,0.12)', border: 'rgba(255,71,87,0.25)', label: 'CRITICAL' },
  HIGH:     { color: '#ffa502', bg: 'rgba(255,165,2,0.12)',  border: 'rgba(255,165,2,0.25)',  label: 'HIGH'     },
  MEDIUM:   { color: '#1e90ff', bg: 'rgba(30,144,255,0.12)',border: 'rgba(30,144,255,0.25)', label: 'MEDIUM'   },
  INFO:     { color: '#a29bfe', bg: 'rgba(162,155,254,0.1)',border: 'rgba(162,155,254,0.2)', label: 'INFO'     },
  PASS:     { color: '#00b894', bg: 'rgba(0,184,148,0.1)',  border: 'rgba(0,184,148,0.2)',   label: 'PASS'     },
};

const gradeConfig = {
  A: { color: '#00b894', glow: 'rgba(0,184,148,0.3)' },
  B: { color: '#00cec9', glow: 'rgba(0,206,201,0.3)' },
  C: { color: '#fdcb6e', glow: 'rgba(253,203,110,0.3)' },
  D: { color: '#e17055', glow: 'rgba(225,112,85,0.3)' },
  F: { color: '#d63031', glow: 'rgba(214,48,49,0.3)' },
};

// ── tiny helpers ───────────────────────────────────────────────
const px = v => typeof v === 'number' ? `${v}px` : v;
const flex = (dir='row', align='center', justify='flex-start', gap=0) => ({
  display:'flex', flexDirection:dir, alignItems:align, justifyContent:justify,
  ...(gap ? {gap:px(gap)} : {}),
});

// ── icons ──────────────────────────────────────────────────────
const Icon = {
  Shield: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
    </svg>
  ),
  Dashboard: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>
    </svg>
  ),
  Scan: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/><path d="M11 8v6M8 11h6"/>
    </svg>
  ),
  Log: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/>
    </svg>
  ),
  Support: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/>
    </svg>
  ),
  Settings: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
    </svg>
  ),
  Globe: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
    </svg>
  ),
  Lock: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
    </svg>
  ),
  Code: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/>
    </svg>
  ),
  Check: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12"/>
    </svg>
  ),
  Alert: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
    </svg>
  ),
  Bot: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="11" width="18" height="10" rx="2"/><circle cx="12" cy="5" r="2"/><path d="M12 7v4"/><line x1="8" y1="15" x2="8" y2="15"/><line x1="16" y1="15" x2="16" y2="15"/>
    </svg>
  ),
  Send: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
    </svg>
  ),
  ChevronRight: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="9 18 15 12 9 6"/>
    </svg>
  ),
  Download: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
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
  Ticket: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 9a3 3 0 1 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 1 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v2z"/>
    </svg>
  ),
  Search: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
    </svg>
  ),
};

// ── Sidebar ────────────────────────────────────────────────────
function Sidebar({ activePage, setPage, results }) {
  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: 'Dashboard' },
    { id: 'scans',     label: 'Security Scans', icon: 'Scan' },
    { id: 'logs',      label: 'Threat Logs', icon: 'Log' },
    { id: 'settings',  label: 'Settings', icon: 'Settings' },
  ];

  return (
    <aside style={{
      width: 220, flexShrink: 0,
      background: C.sidebar,
      borderRight: `1px solid ${C.border}`,
      display: 'flex', flexDirection: 'column',
      height: '100vh', position: 'sticky', top: 0,
    }}>
      {/* Logo */}
      <div style={{ padding: '20px 20px 16px', borderBottom: `1px solid ${C.border}` }}>
        <div style={{ ...flex('row','center','flex-start',8) }}>
          <div style={{
            width: 32, height: 32, borderRadius: 8,
            background: `linear-gradient(135deg, ${C.accent}, ${C.pink})`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#fff', fontSize: 14,
          }}>
            <Icon.Shield />
          </div>
          <span style={{ color: C.textPrimary, fontWeight: 700, fontSize: 15, letterSpacing: '-0.3px' }}>
            SecurePulse
          </span>
        </div>
      </div>

      {/* User badge */}
      <div style={{ padding: '12px 16px', borderBottom: `1px solid ${C.border}` }}>
        <div style={{
          ...flex('row','center','flex-start',10),
          background: C.bgCard, borderRadius: 8, padding: '8px 10px',
        }}>
          <div style={{
            width: 28, height: 28, borderRadius: '50%',
            background: `linear-gradient(135deg, ${C.accent}, ${C.pink})`,
            display:'flex', alignItems:'center', justifyContent:'center',
            color:'#fff', fontSize: 11,
          }}>
            <Icon.User />
          </div>
          <div>
            <div style={{ color: C.textPrimary, fontSize: 12, fontWeight: 600 }}>Security Admin</div>
            <div style={{ color: C.textSecondary, fontSize: 10 }}>Level 4 Access</div>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, padding: '12px 10px', display:'flex', flexDirection:'column', gap: 2 }}>
        {navItems.map(item => {
          const active = activePage === item.id;
          const IconComp = Icon[item.icon];
          return (
            <button key={item.id} onClick={() => setPage(item.id)} style={{
              ...flex('row','center','flex-start',10),
              padding: '9px 12px', borderRadius: 8,
              background: active ? C.accentSoft : 'transparent',
              color: active ? C.accent : C.textSecondary,
              border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: active ? 600 : 400,
              transition: 'all 0.15s',
              textAlign: 'left', width: '100%',
            }}>
              <IconComp />
              {item.label}
            </button>
          );
        })}
      </nav>

      {/* Bottom links */}
      <div style={{ padding: '12px 10px', borderTop: `1px solid ${C.border}`, display:'flex', flexDirection:'column', gap:2 }}>
        <button onClick={() => setPage('support')} style={{
          ...flex('row','center','flex-start',10),
          padding: '9px 12px', borderRadius: 8,
          background: activePage === 'support' ? C.accentSoft : 'transparent',
          color: activePage === 'support' ? C.accent : C.textSecondary,
          border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 400,
          textAlign: 'left', width: '100%',
        }}>
          <Icon.Support />
          Help Center
        </button>
        <button onClick={() => setPage('settings')} style={{
          ...flex('row','center','flex-start',10),
          padding: '9px 12px', borderRadius: 8,
          background: activePage === 'settings' ? C.accentSoft : 'transparent',
          color: activePage === 'settings' ? C.accent : C.textSecondary,
          border: 'none', cursor: 'pointer', fontSize: 13,
          textAlign: 'left', width: '100%',
        }}>
          <Icon.Settings />
          Settings
        </button>
      </div>
    </aside>
  );
}

// ── Top Nav Bar ────────────────────────────────────────────────
function TopNav({ activePage, setPage, results }) {
  const tabs = [
    { id: 'dashboard', label: 'Dashboard' },
    { id: 'scans',     label: 'Scans' },
    { id: 'support',   label: 'Support' },
  ];
  return (
    <header style={{
      height: 52, borderBottom: `1px solid ${C.border}`,
      ...flex('row','center','space-between',0),
      padding: '0 24px', flexShrink: 0,
      background: C.bg,
      position: 'sticky', top: 0, zIndex: 50,
    }}>
      <div style={{ ...flex('row','center','flex-start',0), gap: 0 }}>
        {tabs.map(t => (
          <button key={t.id} onClick={() => setPage(t.id)} style={{
            padding: '0 16px', height: 52,
            background: 'transparent', border: 'none', cursor: 'pointer',
            color: activePage === t.id ? C.textPrimary : C.textSecondary,
            fontSize: 13, fontWeight: activePage === t.id ? 600 : 400,
            borderBottom: activePage === t.id ? `2px solid ${C.accent}` : '2px solid transparent',
            transition: 'all 0.15s',
          }}>
            {t.label}
          </button>
        ))}
      </div>
      <div style={{ ...flex('row','center','flex-end',12) }}>
        <div style={{
          ...flex('row','center','flex-start',8),
          background: C.bgCard, border: `1px solid ${C.border}`,
          borderRadius: 8, padding: '6px 12px',
          color: C.textSecondary, fontSize: 12,
        }}>
          <Icon.Search />
          <span>Global search...</span>
        </div>
        <button style={{ background:'none', border:'none', color: C.textSecondary, cursor:'pointer', padding:4 }}>
          <Icon.Bell />
        </button>
        <div style={{
          width: 28, height: 28, borderRadius: '50%',
          background: `linear-gradient(135deg, ${C.accent}, ${C.pink})`,
          display:'flex', alignItems:'center', justifyContent:'center',
          color:'#fff',
        }}>
          <Icon.User />
        </div>
      </div>
    </header>
  );
}

// ── Threat Gauge ───────────────────────────────────────────────
function ThreatGauge({ pct = 74 }) {
  const r = 52, sw = 8;
  const circ = 2 * Math.PI * r;
  // half-circle: start at 180deg (bottom-left), go to 0 (bottom-right)
  const half = Math.PI * r;
  const filled = (pct / 100) * half;

  return (
    <div style={{ position:'relative', width:130, height:72, flexShrink:0 }}>
      <svg width="130" height="80" viewBox="0 0 130 80" style={{ overflow:'visible' }}>
        {/* Track */}
        <path
          d={`M ${sw/2},65 A ${r},${r} 0 0 1 ${130-sw/2},65`}
          fill="none" stroke={C.border} strokeWidth={sw} strokeLinecap="round"
        />
        {/* Fill */}
        <path
          d={`M ${sw/2},65 A ${r},${r} 0 0 1 ${130-sw/2},65`}
          fill="none"
          stroke={pct > 70 ? C.green : pct > 40 ? C.amber : C.red}
          strokeWidth={sw} strokeLinecap="round"
          strokeDasharray={`${filled} ${half}`}
        />
      </svg>
      <div style={{ position:'absolute', bottom:4, left:0, right:0, textAlign:'center' }}>
        <div style={{ fontSize: 26, fontWeight: 800, color: C.textPrimary, lineHeight:1 }}>{pct}%</div>
        <div style={{ fontSize: 10, color: C.green, fontWeight:600, letterSpacing:'0.05em', textTransform:'uppercase' }}>SECURE</div>
      </div>
    </div>
  );
}

// ── AI Chat Panel ──────────────────────────────────────────────
function AIAssistant({ results }) {
  const [messages, setMessages] = useState([
    { from: 'bot', text: results
        ? `Good morning, Sentinel. I've analyzed your recent scan. The score is ${results.final.score}/100 with grade ${results.final.grade}. ${results.final.message}.`
        : "Good morning, Sentinel. I'm your AI security advisor. Run a scan to get started and I'll analyze your results." },
  ]);
  const [input, setInput] = useState('');
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  function send() {
    if (!input.trim()) return;
    const q = input.trim();
    setInput('');
    setMessages(m => [...m, { from: 'user', text: q }]);

    // Simulate response
    setTimeout(() => {
      let resp = "I recommend reviewing your security posture regularly. If you've run a scan, I can provide specific advice on the findings.";
      if (q.toLowerCase().includes('patch') || q.toLowerCase().includes('fix'))
        resp = "I recommend immediate container isolation. I can generate a temporary WAF rule for you now. Would you like to proceed?";
      else if (q.toLowerCase().includes('ssl'))
        resp = "Your SSL certificate appears valid. Renew it before the expiry date using Let's Encrypt — it's free and automatic.";
      else if (q.toLowerCase().includes('header'))
        resp = "Missing security headers can expose you to XSS and clickjacking attacks. Add Content-Security-Policy and X-Frame-Options to your server config.";
      else if (results && q.toLowerCase().includes('score'))
        resp = `Your current score is ${results.final.score}/100 (${results.final.grade}). ${results.findings.filter(f=>f.severity!=='PASS').length} issues need attention.`;
      setMessages(m => [...m, { from: 'bot', text: resp }]);
    }, 800);
  }

  const quickActions = ['Patch Log4j', 'Isolate IP', 'Export Logs'];

  return (
    <div style={{
      width: 280, flexShrink: 0,
      background: C.bgCard, border: `1px solid ${C.border}`,
      borderRadius: 12, display:'flex', flexDirection:'column',
      overflow:'hidden',
    }}>
      {/* Header */}
      <div style={{ padding: '14px 16px', borderBottom:`1px solid ${C.border}`, ...flex('row','center','space-between',0) }}>
        <div style={{ ...flex('row','center','flex-start',8) }}>
          <div style={{
            width:28, height:28, borderRadius:8,
            background: `linear-gradient(135deg,${C.accent},${C.pink})`,
            display:'flex',alignItems:'center',justifyContent:'center',color:'#fff',
          }}>
            <Icon.Bot />
          </div>
          <div>
            <div style={{ color:C.textPrimary, fontSize:12, fontWeight:600 }}>PulseAssistant</div>
            <div style={{ ...flex('row','center','flex-start',4) }}>
              <span style={{ width:6,height:6,borderRadius:'50%',background:C.green,display:'inline-block' }}/>
              <span style={{ color:C.textSecondary, fontSize:10, textTransform:'uppercase', letterSpacing:'0.05em' }}>AI Security Advisor</span>
            </div>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div style={{ flex:1, overflowY:'auto', padding:'12px 14px', display:'flex', flexDirection:'column', gap:10, minHeight:0 }}>
        {messages.map((m,i) => (
          <div key={i} style={{ display:'flex', justifyContent: m.from==='user' ? 'flex-end' : 'flex-start' }}>
            {m.from==='bot' && (
              <div style={{
                width:22, height:22, borderRadius:6, flexShrink:0,
                background:`linear-gradient(135deg,${C.accent},${C.pink})`,
                display:'flex',alignItems:'center',justifyContent:'center',
                color:'#fff', fontSize:10, marginRight:8, marginTop:2,
              }}>
                <Icon.Bot />
              </div>
            )}
            <div style={{
              maxWidth:'75%', padding:'8px 10px', borderRadius: m.from==='user' ? '12px 12px 4px 12px' : '4px 12px 12px 12px',
              background: m.from==='user' ? C.accent : C.bg,
              border: m.from==='bot' ? `1px solid ${C.border}` : 'none',
              color: C.textPrimary, fontSize:12, lineHeight:'1.5',
            }}>
              {m.text}
            </div>
          </div>
        ))}
        <div ref={bottomRef}/>
      </div>

      {/* Quick Actions */}
      <div style={{ padding:'8px 14px 0', ...flex('row','center','flex-start',6), flexWrap:'wrap' }}>
        {quickActions.map(a => (
          <button key={a} onClick={() => { setInput(a); }} style={{
            padding:'4px 10px', borderRadius:20,
            background: C.bg, border:`1px solid ${C.border}`,
            color: C.textSecondary, fontSize:10, cursor:'pointer',
            transition:'all 0.15s',
          }}>
            {a}
          </button>
        ))}
      </div>

      {/* Input */}
      <div style={{ padding:'10px 14px', ...flex('row','center','flex-start',8) }}>
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key==='Enter' && send()}
          placeholder="Ask for advice..."
          style={{
            flex:1, background: C.bg, border:`1px solid ${C.border}`,
            borderRadius:8, padding:'8px 10px', color: C.textPrimary,
            fontSize:12, outline:'none',
          }}
        />
        <button onClick={send} style={{
          width:30,height:30,borderRadius:8,flexShrink:0,
          background:C.accent, border:'none', color:'#fff', cursor:'pointer',
          display:'flex',alignItems:'center',justifyContent:'center',
        }}>
          <Icon.Send />
        </button>
      </div>
    </div>
  );
}

// ── Dashboard Page ─────────────────────────────────────────────
function DashboardPage({ results, setPage }) {
  const recentScans = results ? [
    { name: results.scores.website !== null ? 'Website Scan' : null, status: results.final.grade === 'A' ? 'PASSED' : results.final.grade === 'F' ? 'FAILED' : 'WARNING', critical: results.findings.filter(f=>f.severity==='CRITICAL' && f.surface==='Website').length, warning: results.findings.filter(f=>f.severity==='MEDIUM' && f.surface==='Website').length, ago: 'Just now' },
    { name: results.scores.app !== null ? 'App Scan' : null, status: (results.scores.app||0) >= 70 ? 'PASSED' : (results.scores.app||0) >= 40 ? 'WARNING' : 'FAILED', critical: results.findings.filter(f=>f.severity==='CRITICAL'&&f.surface==='Application').length, warning: results.findings.filter(f=>f.severity==='MEDIUM'&&f.surface==='Application').length, ago: 'Just now' },
    { name: results.scores.codebase !== null ? 'Codebase Scan' : null, status: (results.scores.codebase||0) >= 70 ? 'PASSED' : (results.scores.codebase||0) >= 40 ? 'WARNING' : 'FAILED', critical: results.findings.filter(f=>f.severity==='CRITICAL'&&f.surface==='Codebase').length, warning: results.findings.filter(f=>f.severity==='HIGH'&&f.surface==='Codebase').length, ago: 'Just now' },
  ].filter(s=>s.name) : [
    { name: 'legacy-crm.app.internal', status: 'FAILED',  critical: 4, warning: 12, ago: '14 MINS AGO' },
    { name: 'checkout-gateway.io',     status: 'PASSED',  critical: 0, warning: 2,  ago: '2 HOURS AGO' },
    { name: 'dev-portal.staging.net',  status: 'WARNING', critical: 0, warning: 5,  ago: '6 HOURS AGO' },
  ];

  const statusColors = { PASSED:'#00b894', FAILED:'#ff4757', WARNING:'#fdcb6e' };
  const statusBg     = { PASSED:'rgba(0,184,148,0.1)', FAILED:'rgba(255,71,87,0.1)', WARNING:'rgba(253,203,110,0.1)' };

  return (
    <div style={{ ...flex('row','flex-start','flex-start',16), flex:1, padding:24, minHeight:0 }}>
      {/* Main */}
      <div style={{ flex:1, display:'flex', flexDirection:'column', gap:16, minWidth:0 }}>
        {/* Sentinel Scan hero */}
        <div style={{
          background: C.bgCard, borderRadius:12, border:`1px solid ${C.border}`,
          padding:24,
        }}>
          <h1 style={{ margin:'0 0 6px', color:C.textPrimary, fontSize:22, fontWeight:700 }}>Sentinel Scan</h1>
          <p style={{ margin:'0 0 16px', color:C.textSecondary, fontSize:13 }}>
            Instantly analyze any endpoint for vulnerabilities, malicious injections, or structural weaknesses.
          </p>
          <div style={{ ...flex('row','center','flex-start',10) }}>
            <div style={{
              ...flex('row','center','flex-start',8),
              flex:1, background:C.bg, border:`1px solid ${C.border}`,
              borderRadius:8, padding:'10px 14px',
            }}>
              <span style={{ color:C.textMuted }}><Icon.Globe /></span>
              <input
                placeholder="Enter target URL (e.g. https://api.secure-vault.io)"
                style={{
                  flex:1, background:'transparent', border:'none', outline:'none',
                  color:C.textSecondary, fontSize:13,
                }}
              />
            </div>
            <button onClick={() => setPage('scans')} style={{
              padding:'10px 20px', borderRadius:8, flexShrink:0,
              background:C.accent, border:'none', color:'#fff',
              fontSize:13, fontWeight:600, cursor:'pointer',
              ...flex('row','center','center',6),
            }}>
              <Icon.Scan /> SCAN
            </button>
          </div>
        </div>

        {/* Metrics row */}
        <div style={{ ...flex('row','stretch','flex-start',12) }}>
          {/* Threat Level */}
          <div style={{
            background:C.bgCard, border:`1px solid ${C.border}`,
            borderRadius:12, padding:20, flex:1,
          }}>
            <div style={{ color:C.textSecondary, fontSize:11, fontWeight:600, letterSpacing:'0.08em', textTransform:'uppercase', marginBottom:12 }}>
              Threat Level
            </div>
            <div style={{ ...flex('row','flex-end','space-between',0) }}>
              <ThreatGauge pct={results ? results.final.score : 74} />
              <div style={{ display:'flex', flexDirection:'column', gap:8, fontSize:12 }}>
                {[
                  { dot: C.green, label:'Active Firewall' },
                  { dot: C.red,   label:'2 Open Ports' },
                  { dot: C.amber, label:'Encrypted' },
                ].map(({dot,label},i) => (
                  <div key={i} style={{ ...flex('row','center','flex-start',6), color:C.textSecondary }}>
                    <span style={{ width:8,height:8,borderRadius:'50%',background:dot,display:'inline-block',flexShrink:0 }}/>
                    {label}
                  </div>
                ))}
              </div>
            </div>
            <div style={{ color:C.textMuted, fontSize:10, textTransform:'uppercase', letterSpacing:'0.08em', marginTop:8 }}>
              Global Status
            </div>
          </div>

          {/* SecurePulse Active */}
          <div style={{
            background:C.bgCard, border:`1px solid ${C.border}`,
            borderRadius:12, padding:20, flex:1,
            display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:10,
          }}>
            <div style={{
              width:64, height:64, borderRadius:'50%',
              background:`radial-gradient(circle, ${C.accentSoft} 0%, ${C.bg} 70%)`,
              display:'flex', alignItems:'center', justifyContent:'center',
              border:`1px solid ${C.borderLight}`,
            }}>
              <div style={{ color:C.accent, transform:'scale(1.5)' }}><Icon.Shield /></div>
            </div>
            <div style={{ textAlign:'center' }}>
              <div style={{ color:C.textPrimary, fontSize:14, fontWeight:600 }}>SecurePulse Active</div>
              <div style={{ color:C.textSecondary, fontSize:11 }}>Real-time heuristics monitoring</div>
            </div>
          </div>
        </div>

        {/* Recent Scans */}
        <div style={{ background:C.bgCard, border:`1px solid ${C.border}`, borderRadius:12, padding:20 }}>
          <div style={{ ...flex('row','center','space-between',0), marginBottom:16 }}>
            <div style={{ color:C.textPrimary, fontSize:14, fontWeight:600 }}>Recent Scans</div>
            <button onClick={() => setPage('scans')} style={{
              background:'none', border:'none', color:C.accent,
              fontSize:12, fontWeight:600, cursor:'pointer',
            }}>VIEW ALL</button>
          </div>
          <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
            {recentScans.map((scan,i) => (
              <div key={i} style={{
                ...flex('row','center','space-between',12),
                padding:'10px 14px', borderRadius:8,
                background: C.bg, border:`1px solid ${C.border}`,
              }}>
                <div style={{ ...flex('row','center','flex-start',10) }}>
                  <div style={{
                    width:28, height:28, borderRadius:'50%',
                    background: statusBg[scan.status],
                    display:'flex', alignItems:'center', justifyContent:'center',
                    color: statusColors[scan.status], flexShrink:0,
                  }}>
                    {scan.status==='FAILED' ? <Icon.Alert /> : scan.status==='PASSED' ? <Icon.Check /> : <Icon.Alert />}
                  </div>
                  <div>
                    <div style={{ color:C.textPrimary, fontSize:13, fontWeight:500 }}>{scan.name}</div>
                    <div style={{ color:C.textSecondary, fontSize:11 }}>
                      {scan.critical > 0 ? `${scan.critical} Critical` : '0 Critical'} · {scan.warning} {scan.status==='FAILED'?'Warning':'Low'}
                    </div>
                  </div>
                </div>
                <div style={{ ...flex('row','center','flex-end',10), flexShrink:0 }}>
                  <span style={{ color:C.textMuted, fontSize:10 }}>{scan.ago}</span>
                  <span style={{
                    padding:'2px 8px', borderRadius:4,
                    background:statusBg[scan.status], color:statusColors[scan.status],
                    fontSize:10, fontWeight:700, letterSpacing:'0.05em',
                  }}>{scan.status}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* AI Assistant */}
      <div style={{ flexShrink:0, display:'flex', flexDirection:'column', gap:0 }}>
        <AIAssistant results={results} />
      </div>
    </div>
  );
}

// ── Scan Input Page ────────────────────────────────────────────
function ScanInputPage({ onScan, loading, error }) {
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [appUrl, setAppUrl] = useState('');
  const [repoUrl, setRepoUrl] = useState('');

  function handleScan() {
    onScan(websiteUrl, appUrl, repoUrl);
  }

  return (
    <div style={{
      flex:1, display:'flex', flexDirection:'column',
      alignItems:'center', justifyContent:'center',
      padding: 40, gap:32,
    }}>
      {/* Hero */}
      <div style={{ textAlign:'center' }}>
        <h1 style={{ margin:'0 0 8px', color:C.textPrimary, fontSize:28, fontWeight:700, letterSpacing:'-0.5px' }}>SecurePulse</h1>
        <p style={{ margin:0, color:C.textSecondary, fontSize:14 }}>Free security scanner for websites, apps, and codebases</p>
      </div>

      {/* Card */}
      <div style={{
        width:'100%', maxWidth:560,
        background:'rgba(240,241,245,0.04)', backdropFilter:'blur(10px)',
        border:`1px solid ${C.border}`, borderRadius:16,
        padding:32,
      }}>
        {/* Website URL */}
        <div style={{ marginBottom:20 }}>
          <label style={{ display:'block', color:C.textSecondary, fontSize:12, marginBottom:8 }}>Website URL</label>
          <div style={{
            ...flex('row','center','flex-start',0),
            background: 'rgba(255,255,255,0.04)', border:`1px solid ${C.border}`,
            borderRadius:8,
          }}>
            <span style={{ padding:'0 12px', color:C.textMuted }}><Icon.Globe /></span>
            <input
              value={websiteUrl}
              onChange={e => setWebsiteUrl(e.target.value)}
              placeholder="https://example.com"
              style={{
                flex:1, background:'transparent', border:'none', outline:'none',
                color:C.textPrimary, fontSize:14, padding:'12px 12px 12px 0',
              }}
            />
          </div>
        </div>

        {/* App URL */}
        <div style={{ marginBottom:20 }}>
          <label style={{ display:'block', color:C.textSecondary, fontSize:12, marginBottom:8 }}>
            App URL (same as website URL if it's a web app)
          </label>
          <div style={{
            ...flex('row','center','flex-start',0),
            background: 'rgba(255,255,255,0.04)', border:`1px solid ${C.border}`,
            borderRadius:8,
          }}>
            <span style={{ padding:'0 12px', color:C.textMuted }}><Icon.Lock /></span>
            <input
              value={appUrl}
              onChange={e => setAppUrl(e.target.value)}
              placeholder="https://myapp.com"
              style={{
                flex:1, background:'transparent', border:'none', outline:'none',
                color:C.textPrimary, fontSize:14, padding:'12px 12px 12px 0',
              }}
            />
          </div>
        </div>

        {/* Repo URL */}
        <div style={{ marginBottom:28 }}>
          <label style={{ display:'block', color:C.textSecondary, fontSize:12, marginBottom:8 }}>
            GitHub Repo URL (optional)
          </label>
          <div style={{
            ...flex('row','center','flex-start',0),
            background: 'rgba(255,255,255,0.04)', border:`1px solid ${C.border}`,
            borderRadius:8,
          }}>
            <span style={{ padding:'0 12px', color:C.textMuted }}><Icon.Code /></span>
            <input
              value={repoUrl}
              onChange={e => setRepoUrl(e.target.value)}
              placeholder="https://github.com/username/reponame"
              style={{
                flex:1, background:'transparent', border:'none', outline:'none',
                color:C.textPrimary, fontSize:14, padding:'12px 12px 12px 0',
              }}
            />
          </div>
        </div>

        {error && (
          <div style={{
            marginBottom:16, padding:'10px 14px', borderRadius:8,
            background:'rgba(255,71,87,0.1)', border:'1px solid rgba(255,71,87,0.25)',
            color:'#ff4757', fontSize:13,
          }}>
            {error}
          </div>
        )}

        <button
          onClick={handleScan}
          disabled={loading}
          style={{
            width:'100%', padding:'13px', borderRadius:8,
            background: loading ? C.textMuted : `linear-gradient(135deg, ${C.accent}, #8b7cf8)`,
            border:'none', color:'#fff', fontSize:15, fontWeight:600,
            cursor: loading ? 'not-allowed' : 'pointer',
            transition:'all 0.2s',
            boxShadow: loading ? 'none' : `0 4px 24px rgba(108,92,231,0.35)`,
          }}
        >
          {loading ? (
            <span style={{ ...flex('row','center','center',8) }}>
              <span style={{ animation:'spin 1s linear infinite', display:'inline-block' }}>⟳</span>
              Scanning... (~30 seconds)
            </span>
          ) : 'Run Security Scan'}
        </button>
      </div>
    </div>
  );
}

// ── Scans Results Page ─────────────────────────────────────────
function ScansPage({ results, onNewScan, loading, error }) {
  if (!results) return <ScanInputPage onScan={onNewScan} loading={loading} error={error} />;

  const { final, scores, findings } = results;
  const gc = gradeConfig[final.grade] || gradeConfig.A;
  const issues = findings.filter(f => f.severity !== 'PASS');
  const passes = findings.filter(f => f.severity === 'PASS');

  const surfaceCards = [
    { label:'Website Security',    icon:<Icon.Globe/>,  stat:'OPTIMAL',    desc:'External perimeter and SSL handshake integrity checks.', metric:'Latency', val:'14ms', score: scores.website, color: C.pink },
    { label:'Application Logic',   icon:<Icon.Lock/>,   stat:'HARDENED',   desc:'Authentication flow and privilege escalation vulnerability scan.', metric:'Complexity', val:'High', score: scores.app, color: C.accent },
    { label:'Codebase Integrity',  icon:<Icon.Code/>,   stat:'SANITIZED',  desc:'Static analysis of dependency trees and secret detection.', metric:'Vulnerabilities', val:`${issues.filter(f=>f.surface==='Codebase').length} Detected`, score: scores.codebase, color: C.cyan },
  ];

  return (
    <div style={{ flex:1, overflowY:'auto', padding:24, display:'flex', flexDirection:'column', gap:20 }}>
      {/* Top row */}
      <div style={{ ...flex('row','stretch','flex-start',16) }}>
        {/* Score block */}
        <div style={{
          width:180, flexShrink:0,
          background:C.bgCard, border:`1px solid ${C.border}`, borderRadius:12,
          display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center',
          padding:20, gap:8,
        }}>
          <div style={{ fontSize:11, color:C.textMuted, textTransform:'uppercase', letterSpacing:'0.08em' }}>Security Integrity Score</div>
          <div style={{ fontSize:64, fontWeight:900, color:C.textPrimary, lineHeight:1, position:'relative' }}>
            {final.score}
            <span style={{ fontSize:20, color:gc.color, fontWeight:700, position:'absolute', top:8, right:-28 }}>/100</span>
          </div>
          <div style={{
            ...flex('row','center','center',6),
            padding:'4px 12px', borderRadius:20,
            background:`rgba(108,92,231,0.15)`, border:`1px solid ${C.borderLight}`,
            color:C.accent, fontSize:11, fontWeight:600,
          }}>
            <Icon.Shield /> ELITE STATUS
          </div>
        </div>

        {/* Scan info */}
        <div style={{
          flex:1, background:C.bgCard, border:`1px solid ${C.border}`, borderRadius:12, padding:20,
        }}>
          <div style={{ ...flex('row','flex-start','space-between',0) }}>
            <div>
              <h2 style={{ margin:'0 0 4px', color:C.textPrimary, fontSize:20, fontWeight:700 }}>Internal Mainframe Scan</h2>
              <div style={{ color:C.textSecondary, fontSize:12 }}>
                Target: <code style={{ background:C.bg, padding:'2px 6px', borderRadius:4, color:C.accent, fontSize:11 }}>
                  {results._target || 'api-cluster-04.securepulse.io'}
                </code>
              </div>
            </div>
            <div style={{ textAlign:'right' }}>
              <div style={{ color:C.textMuted, fontSize:10, textTransform:'uppercase', letterSpacing:'0.08em' }}>Last Scan Completed</div>
              <div style={{ color:C.textPrimary, fontSize:13, fontWeight:500 }}>
                {new Date().toLocaleDateString('en-GB', { day:'2-digit', month:'short', year:'numeric' })} — {new Date().toLocaleTimeString('en-GB', { hour:'2-digit', minute:'2-digit', second:'2-digit' })} GMT
              </div>
            </div>
          </div>
          <div style={{ ...flex('row','flex-start','flex-start',0), marginTop:20, gap:32 }}>
            {[
              { label:'TIME ELAPSED', value:'0.42s' },
              { label:'ENDPOINTS', value: findings.length },
              { label:'THREAT LEVEL', value: issues.length === 0 ? 'NULL' : issues.length < 3 ? 'LOW' : 'HIGH', col: issues.length === 0 ? C.green : issues.length < 3 ? C.amber : C.red },
              { label:'STATUS', value: final.grade === 'A' ? 'STABLE' : final.grade === 'F' ? 'CRITICAL' : 'REVIEW', col: final.grade === 'A' ? C.pink : final.grade === 'F' ? C.red : C.amber },
            ].map(({label,value,col},i) => (
              <div key={i}>
                <div style={{ color:C.textMuted, fontSize:10, textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:4 }}>{label}</div>
                <div style={{ color: col || C.textPrimary, fontSize:16, fontWeight:700 }}>{value}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Surface cards */}
      <div style={{ ...flex('row','stretch','flex-start',12) }}>
        {surfaceCards.map(({label,icon,stat,desc,metric,val,score,color},i) => (
          <div key={i} style={{
            flex:1, background:C.bgCard, border:`1px solid ${C.border}`,
            borderLeft: `3px solid ${color}`,
            borderRadius:12, padding:16,
            display:'flex', flexDirection:'column', gap:8,
          }}>
            <div style={{ ...flex('row','center','space-between',0) }}>
              <span style={{ color: color }}>{icon}</span>
              <span style={{ color:color, fontSize:10, fontWeight:700, letterSpacing:'0.05em' }}>{stat}</span>
            </div>
            <div style={{ color:C.textPrimary, fontSize:14, fontWeight:600 }}>{label}</div>
            <div style={{ color:C.textSecondary, fontSize:11, lineHeight:1.5 }}>{desc}</div>
            {score !== null && score !== undefined && (
              <>
                <div style={{ ...flex('row','center','space-between',0), fontSize:10, color:C.textMuted }}>
                  <span>{metric}</span>
                  <span style={{ color:C.textPrimary, fontWeight:600 }}>{val}</span>
                </div>
                <div style={{ height:3, background:C.border, borderRadius:2, overflow:'hidden' }}>
                  <div style={{ height:'100%', width:`${score}%`, background:color, borderRadius:2, transition:'width 1s ease' }}/>
                </div>
              </>
            )}
          </div>
        ))}
      </div>

      {/* Issues + Passing */}
      <div style={{ ...flex('row','flex-start','flex-start',16) }}>
        {/* Issues */}
        <div style={{ flex:1, background:C.bgCard, border:`1px solid ${C.border}`, borderRadius:12, padding:20 }}>
          <div style={{ ...flex('row','center','space-between',0), marginBottom:16 }}>
            <div style={{ color:C.textPrimary, fontSize:14, fontWeight:600 }}>Issues Found ({issues.length})</div>
            {issues.length > 0 && (
              <span style={{ padding:'2px 8px', borderRadius:4, background:'rgba(255,71,87,0.15)', color:'#ff4757', fontSize:10, fontWeight:700 }}>
                CRITICAL PRIORITY
              </span>
            )}
          </div>
          {issues.length === 0 ? (
            <div style={{ textAlign:'center', padding:'32px 0' }}>
              <div style={{
                width:56, height:56, borderRadius:12, margin:'0 auto 12px',
                background:C.accentSoft, display:'flex', alignItems:'center', justifyContent:'center',
                color:C.accent,
              }}>
                <Icon.Shield />
              </div>
              <div style={{ color:C.textPrimary, fontSize:14, fontWeight:500 }}>No Threats Detected</div>
              <div style={{ color:C.textSecondary, fontSize:12, marginTop:4 }}>
                Your system is currently meeting all security parameters. No action required.
              </div>
            </div>
          ) : (
            <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
              {issues.map((f,i) => {
                const sc = severityConfig[f.severity] || severityConfig.INFO;
                return (
                  <div key={i} style={{
                    padding:'12px 14px', borderRadius:8,
                    background:C.bg, border:`1px solid ${C.border}`,
                  }}>
                    <div style={{ ...flex('row','flex-start','flex-start',10) }}>
                      <span style={{
                        padding:'2px 8px', borderRadius:4, flexShrink:0,
                        background:sc.bg, color:sc.color, border:`1px solid ${sc.border}`,
                        fontSize:10, fontWeight:700, letterSpacing:'0.04em', marginTop:1,
                      }}>{sc.label}</span>
                      <div>
                        <div style={{ color:C.textPrimary, fontSize:13, fontWeight:500, marginBottom:4 }}>{f.title}</div>
                        <div style={{ color:C.textSecondary, fontSize:11 }}>
                          <strong>Surface:</strong> {f.surface} &nbsp;·&nbsp; <strong>Fix:</strong> {f.fix}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Passing Checks */}
        <div style={{ flex:1, background:C.bgCard, border:`1px solid ${C.border}`, borderRadius:12, padding:20 }}>
          <div style={{ ...flex('row','center','space-between',0), marginBottom:16 }}>
            <div style={{ color:C.textPrimary, fontSize:14, fontWeight:600 }}>Passing Checks</div>
            <button style={{
              ...flex('row','center','center',4),
              padding:'4px 10px', borderRadius:6,
              background:'transparent', border:`1px solid ${C.border}`,
              color:C.textSecondary, fontSize:11, cursor:'pointer',
            }}>
              <Icon.Download /> Download Report
            </button>
          </div>
          <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
            {passes.length === 0 ? (
              <div style={{ color:C.textSecondary, fontSize:13, textAlign:'center', padding:'24px 0' }}>No passing checks yet.</div>
            ) : passes.map((f,i) => (
              <div key={i} style={{
                ...flex('row','center','space-between',12),
                padding:'12px 14px', borderRadius:8,
                background:C.bg, border:`1px solid ${C.border}`,
              }}>
                <div>
                  <div style={{ color:C.textPrimary, fontSize:13, fontWeight:500 }}>{f.title}</div>
                  {f.fix && <div style={{ color:C.textSecondary, fontSize:11, marginTop:2 }}>{f.fix}</div>}
                </div>
                <div style={{
                  width:22, height:22, borderRadius:'50%', flexShrink:0,
                  background:'rgba(0,184,148,0.15)', border:'1px solid rgba(0,184,148,0.3)',
                  display:'flex', alignItems:'center', justifyContent:'center', color:C.green,
                }}>
                  <Icon.Check />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* New Scan button */}
      <div style={{ textAlign:'center' }}>
        <button onClick={() => onNewScan(null)} style={{
          padding:'10px 28px', borderRadius:8,
          background:'transparent', border:`1px solid ${C.border}`,
          color:C.textSecondary, fontSize:13, cursor:'pointer',
        }}>
          ← Run New Scan
        </button>
      </div>
    </div>
  );
}

// ── Support Page ───────────────────────────────────────────────
function SupportPage() {
  const domains = [
    { icon:'🛡️', color: C.pink,  title:'Account Security',   desc:'Master multi-factor authentication, biometric locks, and session management protocols.', links:['Resetting administrative credentials','Configuring hardware security keys'] },
    { icon:'⊙',  color: C.accent, title:'Scan Config',        desc:'Fine-tune your perimeter scan frequency and threat detection depth.', links:[] },
    { icon:'◈',  color: C.cyan,   title:'API Docs',           desc:"Integrate Sentinel's intelligence into your existing infrastructure.", links:[] },
    { icon:'🪙', color: C.amber,  title:'Billing & Plans',    desc:'Review enterprise tier features and resource allocation.', links:[] },
    { icon:'⚠️', color: C.red,    title:'Incident Response',  desc:'What to do when a Level 5 breach is detected in your network subnet.', links:['View Protocols →'] },
  ];

  return (
    <div style={{ flex:1, overflowY:'auto', padding:32 }}>
      {/* Hero */}
      <div style={{ textAlign:'center', marginBottom:40 }}>
        <h1 style={{ margin:'0 0 8px', color:C.textPrimary, fontSize:28, fontWeight:700 }}>
          How can we help you, Sentinel?
        </h1>
        <p style={{ margin:'0 0 24px', color:C.textSecondary, fontSize:14 }}>
          Access the central intelligence repository for all Security Operations.
        </p>
        <div style={{
          maxWidth:520, margin:'0 auto',
          ...flex('row','center','flex-start',0),
          background:C.bgCard, border:`1px solid ${C.border}`,
          borderRadius:10,
        }}>
          <span style={{ padding:'0 14px', color:C.textMuted }}><Icon.Search /></span>
          <input
            placeholder="Search for documentation, troubleshooting, or API keys..."
            style={{
              flex:1, background:'transparent', border:'none', outline:'none',
              color:C.textSecondary, fontSize:13, padding:'12px 0',
            }}
          />
          <button style={{
            margin:6, padding:'6px 16px', borderRadius:8,
            background:C.accent, border:'none', color:'#fff', fontSize:12, fontWeight:600, cursor:'pointer',
          }}>Analyze</button>
        </div>
      </div>

      {/* Knowledge Domains */}
      <div style={{ marginBottom:40 }}>
        <div style={{ ...flex('row','center','flex-start',8), marginBottom:20 }}>
          <div style={{ width:3, height:18, background:C.pink, borderRadius:2 }}/>
          <h2 style={{ margin:0, color:C.textPrimary, fontSize:16, fontWeight:600 }}>Knowledge Domains</h2>
        </div>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(220px,1fr))', gap:14 }}>
          {domains.map((d,i) => (
            <div key={i} style={{
              background:C.bgCard, border:`1px solid ${C.border}`,
              borderTop:`3px solid ${d.color}`,
              borderRadius:12, padding:20,
              cursor:'pointer', transition:'all 0.2s',
            }}>
              <div style={{ fontSize:20, marginBottom:10 }}>{d.icon}</div>
              <div style={{ color:C.textPrimary, fontSize:14, fontWeight:600, marginBottom:6 }}>{d.title}</div>
              <div style={{ color:C.textSecondary, fontSize:12, lineHeight:1.5, marginBottom:10 }}>{d.desc}</div>
              {d.links.map((l,j) => (
                <div key={j} style={{ ...flex('row','center','flex-start',4), color:d.color, fontSize:12, cursor:'pointer' }}>
                  <Icon.ChevronRight /> {l}
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* Bottom row */}
      <div style={{ ...flex('row','flex-start','flex-start',20) }}>
        {/* Support Channels */}
        <div style={{ flex:1 }}>
          <div style={{ ...flex('row','center','flex-start',8), marginBottom:16 }}>
            <div style={{ width:3, height:18, background:C.accent, borderRadius:2 }}/>
            <h2 style={{ margin:0, color:C.textPrimary, fontSize:16, fontWeight:600 }}>Support Channels</h2>
          </div>
          <div style={{ ...flex('row','stretch','flex-start',12), marginBottom:20 }}>
            {[
              { icon:'🎫', title:'Open a Ticket', desc:'Response time: < 2 hours' },
              { icon:'💬', title:'Live Chat', desc:'Direct encrypted link' },
              { icon:'👥', title:'Community', desc:'Sentinel Global Forum' },
            ].map(({icon,title,desc},i) => (
              <div key={i} style={{
                flex:1, background:C.bgCard, border:`1px solid ${C.border}`,
                borderRadius:10, padding:16, cursor:'pointer',
              }}>
                <div style={{ fontSize:18, marginBottom:8 }}>{icon}</div>
                <div style={{ color:C.textPrimary, fontSize:13, fontWeight:500 }}>{title}</div>
                <div style={{ color:C.textSecondary, fontSize:11, marginTop:4 }}>{desc}</div>
              </div>
            ))}
          </div>
          <div style={{
            background:C.bgCard, border:`1px solid ${C.border}`,
            borderRadius:10, padding:20,
            ...flex('row','center','space-between',16),
          }}>
            <div>
              <div style={{ color:C.textPrimary, fontSize:15, fontWeight:600, marginBottom:4 }}>Still need tactical assistance?</div>
              <div style={{ color:C.textSecondary, fontSize:12 }}>Our high-level security engineers are standing by for live deployment support.</div>
            </div>
            <button style={{
              padding:'10px 20px', borderRadius:8, flexShrink:0,
              background:'transparent', border:`1px solid ${C.border}`,
              color:C.textPrimary, fontSize:13, fontWeight:500, cursor:'pointer',
            }}>Connect with Command</button>
          </div>
        </div>

        {/* System Status */}
        <div style={{ width:260, flexShrink:0 }}>
          <div style={{ ...flex('row','center','flex-start',8), marginBottom:16 }}>
            <div style={{ width:3, height:18, background:C.accent, borderRadius:2 }}/>
            <h2 style={{ margin:0, color:C.textPrimary, fontSize:16, fontWeight:600 }}>System Status</h2>
          </div>
          <div style={{ background:C.bgCard, border:`1px solid ${C.border}`, borderRadius:10, padding:16 }}>
            <div style={{
              ...flex('row','center','space-between',0),
              padding:'8px 12px', borderRadius:8,
              background:C.bg, marginBottom:16,
            }}>
              <div style={{ ...flex('row','center','flex-start',8) }}>
                <span style={{ width:8,height:8,borderRadius:'50%',background:C.green,display:'inline-block' }}/>
                <span style={{ color:C.textPrimary, fontSize:13 }}>Global Nodes</span>
              </div>
              <span style={{ padding:'2px 8px', borderRadius:4, background:'rgba(0,184,148,0.15)', color:C.green, fontSize:10, fontWeight:700 }}>OPERATIONAL</span>
            </div>
            <div style={{ color:C.textMuted, fontSize:10, textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:10 }}>Recent Updates</div>
            {[
              { title:'Vulnerability Database v4.2', time:'2h ago', desc:'New signatures for quantum-resistant encryption bypass attempts have been added.' },
              { title:'Scheduled Maintenance', time:'1d ago', desc:'APAC Regional Nodes will undergo telemetry optimization on Friday.' },
              { title:'Sentinel Core Patch 8.0', time:'3d ago', desc:'Major upgrade to the neural processing engine for predictive threat detection.' },
            ].map(({title,time,desc},i) => (
              <div key={i} style={{ marginBottom:12, paddingBottom:12, borderBottom: i<2 ? `1px solid ${C.border}` : 'none' }}>
                <div style={{ ...flex('row','center','space-between',0), marginBottom:3 }}>
                  <span style={{ color:C.textPrimary, fontSize:12, fontWeight:500 }}>{title}</span>
                  <span style={{ color:C.textMuted, fontSize:10 }}>{time}</span>
                </div>
                <div style={{ color:C.textSecondary, fontSize:11, lineHeight:1.4 }}>{desc}</div>
              </div>
            ))}
            <button style={{
              width:'100%', padding:'8px 0', borderRadius:8, marginTop:4,
              background:'transparent', border:`1px solid ${C.border}`,
              color:C.textSecondary, fontSize:11, fontWeight:600, cursor:'pointer',
              letterSpacing:'0.04em',
            }}>FULL STATUS HISTORY</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Settings Page ──────────────────────────────────────────────
function SettingsPage() {
  return (
    <div style={{ flex:1, padding:32 }}>
      <h1 style={{ margin:'0 0 24px', color:C.textPrimary, fontSize:22, fontWeight:700 }}>Settings</h1>
      <div style={{ background:C.bgCard, border:`1px solid ${C.border}`, borderRadius:12, padding:24, maxWidth:560 }}>
        <div style={{ color:C.textSecondary, fontSize:13 }}>Configure your SecurePulse preferences here.</div>
      </div>
    </div>
  );
}

// ── Logs Page ──────────────────────────────────────────────────
function LogsPage({ results }) {
  const logs = results ? results.findings.map((f,i) => ({
    time: new Date(Date.now() - i * 30000).toLocaleTimeString(),
    level: f.severity,
    msg: f.title,
    surface: f.surface,
  })) : [
    { time:'14:02:09', level:'CRITICAL', msg:'Log4j variant detected in dependency tree', surface:'Application' },
    { time:'14:01:55', level:'HIGH',     msg:'Outdated npm package with known CVE', surface:'Codebase' },
    { time:'13:58:11', level:'PASS',     msg:'SSL certificate valid – 62 days remaining', surface:'Website' },
  ];

  const sc = (sev) => severityConfig[sev] || severityConfig.INFO;

  return (
    <div style={{ flex:1, padding:24, display:'flex', flexDirection:'column', gap:16 }}>
      <h1 style={{ margin:0, color:C.textPrimary, fontSize:22, fontWeight:700 }}>Threat Logs</h1>
      <div style={{ background:C.bgCard, border:`1px solid ${C.border}`, borderRadius:12, overflow:'hidden' }}>
        <table style={{ width:'100%', borderCollapse:'collapse' }}>
          <thead>
            <tr style={{ borderBottom:`1px solid ${C.border}` }}>
              {['Time','Severity','Surface','Message'].map(h => (
                <th key={h} style={{ padding:'10px 16px', textAlign:'left', color:C.textMuted, fontSize:11, fontWeight:600, textTransform:'uppercase', letterSpacing:'0.05em' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {logs.map((l,i) => (
              <tr key={i} style={{ borderBottom:`1px solid ${C.border}` }}>
                <td style={{ padding:'10px 16px', color:C.textMuted, fontSize:12, whiteSpace:'nowrap' }}>{l.time}</td>
                <td style={{ padding:'10px 16px' }}>
                  <span style={{
                    padding:'2px 8px', borderRadius:4,
                    background:sc(l.level).bg, color:sc(l.level).color,
                    fontSize:10, fontWeight:700,
                  }}>{l.level}</span>
                </td>
                <td style={{ padding:'10px 16px', color:C.textSecondary, fontSize:12 }}>{l.surface}</td>
                <td style={{ padding:'10px 16px', color:C.textPrimary, fontSize:12 }}>{l.msg}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Root App ───────────────────────────────────────────────────
export default function App() {
  const [page, setPage] = useState('dashboard');
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleScan(websiteUrl, appUrl, repoUrl) {
    if (websiteUrl === null) { setResults(null); return; }
    if (!websiteUrl && !appUrl && !repoUrl) {
      setError('Please enter at least one URL to scan.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      const data = await runScan(websiteUrl, appUrl, repoUrl);
      data._target = websiteUrl || appUrl;
      setResults(data);
      setPage('scans');
    } catch (e) {
      setError('Scan failed. Make sure the backend is running on port 8000.');
    }
    setLoading(false);
  }

  const renderPage = () => {
    switch(page) {
      case 'dashboard': return <DashboardPage results={results} setPage={setPage} />;
      case 'scans':     return <ScansPage results={results} onNewScan={handleScan} loading={loading} error={error} />;
      case 'logs':      return <LogsPage results={results} />;
      case 'support':   return <SupportPage />;
      case 'settings':  return <SettingsPage />;
      default:          return <DashboardPage results={results} setPage={setPage} />;
    }
  };

  return (
    <>
      <style>{`
        * { box-sizing: border-box; }
        body { margin: 0; background: ${C.bg}; font-family: 'SF Pro Display', -apple-system, 'Segoe UI', sans-serif; }
        #root { min-height: 100vh; }
        ::-webkit-scrollbar { width: 6px; height: 6px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: ${C.border}; border-radius: 3px; }
        input::placeholder { color: ${C.textMuted}; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
      <div style={{ display:'flex', minHeight:'100vh', background: C.bg }}>
        <Sidebar activePage={page} setPage={setPage} results={results} />
        <div style={{ flex:1, display:'flex', flexDirection:'column', minWidth:0, minHeight:'100vh' }}>
          <TopNav activePage={page} setPage={setPage} results={results} />
          <main style={{ flex:1, display:'flex', flexDirection:'column', overflow:'auto' }}>
            {renderPage()}
          </main>
        </div>
      </div>
    </>
  );
}
