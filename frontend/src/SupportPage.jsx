import { useState, useEffect, useRef } from 'react';

const BASE_URL = 'http://localhost:8000';

// ── colour tokens (match App.jsx) ──────────────────────────────
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

// ── Icons ──────────────────────────────────────────────────────
const SearchIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
  </svg>
);
const ChevronRight = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="9 18 15 12 9 6"/>
  </svg>
);
const ChevronLeft = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="15 18 9 12 15 6"/>
  </svg>
);
const SendIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
  </svg>
);
const BotIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="11" width="18" height="10" rx="2"/><circle cx="12" cy="5" r="2"/><path d="M12 7v4"/>
  </svg>
);
const XIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
  </svg>
);
const CheckCircle = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>
  </svg>
);
const AlertIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
  </svg>
);
const TicketIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M2 9a3 3 0 1 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 1 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v2z"/>
  </svg>
);
const ChatIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
  </svg>
);
const CommunityIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
  </svg>
);
const CommandIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="4 17 10 11 4 5"/><line x1="12" y1="19" x2="20" y2="19"/>
  </svg>
);
const RefreshIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
  </svg>
);

// ── Markdown renderer (simple) ─────────────────────────────────
function SimpleMarkdown({ content }) {
  const lines = content.split('\n');
  const elements = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    if (line.startsWith('### ')) {
      elements.push(<h3 key={i} style={{ color: C.accent, fontSize: 13, fontWeight: 700, margin: '16px 0 6px', borderBottom: `1px solid ${C.border}`, paddingBottom: 4 }}>{line.slice(4)}</h3>);
    } else if (line.startsWith('## ')) {
      elements.push(<h2 key={i} style={{ color: C.textPrimary, fontSize: 15, fontWeight: 700, margin: '20px 0 8px' }}>{line.slice(3)}</h2>);
    } else if (line.startsWith('# ')) {
      elements.push(<h1 key={i} style={{ color: C.textPrimary, fontSize: 18, fontWeight: 800, margin: '0 0 12px' }}>{line.slice(2)}</h1>);
    } else if (line.startsWith('```')) {
      const lang = line.slice(3);
      const codeLines = [];
      i++;
      while (i < lines.length && !lines[i].startsWith('```')) {
        codeLines.push(lines[i]);
        i++;
      }
      elements.push(
        <div key={i} style={{ background: '#0a0e1a', border: `1px solid ${C.border}`, borderRadius: 8, padding: '12px 14px', margin: '10px 0', overflow: 'auto' }}>
          {lang && <div style={{ color: C.textMuted, fontSize: 10, fontFamily: 'monospace', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{lang}</div>}
          <pre style={{ margin: 0, fontFamily: "'Courier New', monospace", fontSize: 12, color: '#a29bfe', lineHeight: 1.6 }}>{codeLines.join('\n')}</pre>
        </div>
      );
    } else if (line.startsWith('| ')) {
      // Table
      const tableLines = [];
      while (i < lines.length && lines[i].startsWith('|')) {
        tableLines.push(lines[i]);
        i++;
      }
      const rows = tableLines.filter(r => !r.match(/^\|[-\s|]+\|$/));
      elements.push(
        <div key={i} style={{ overflowX: 'auto', margin: '10px 0' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <tbody>
              {rows.map((row, ri) => (
                <tr key={ri} style={{ borderBottom: `1px solid ${C.border}` }}>
                  {row.split('|').filter((_, ci) => ci > 0 && ci < row.split('|').length - 1).map((cell, ci) => (
                    ri === 0
                      ? <th key={ci} style={{ padding: '6px 10px', textAlign: 'left', color: C.textMuted, fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', background: C.bgCard }}>{cell.trim()}</th>
                      : <td key={ci} style={{ padding: '6px 10px', color: C.textPrimary }}>{cell.trim()}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
      continue;
    } else if (line.startsWith('- ') || line.startsWith('* ')) {
      const items = [];
      while (i < lines.length && (lines[i].startsWith('- ') || lines[i].startsWith('* '))) {
        items.push(lines[i].slice(2));
        i++;
      }
      elements.push(
        <ul key={i} style={{ margin: '6px 0', paddingLeft: 20, display: 'flex', flexDirection: 'column', gap: 3 }}>
          {items.map((item, ii) => (
            <li key={ii} style={{ color: C.textSecondary, fontSize: 13, lineHeight: 1.5 }}
              dangerouslySetInnerHTML={{ __html: item.replace(/\*\*(.+?)\*\*/g, `<strong style="color:${C.textPrimary}">$1</strong>`).replace(/`(.+?)`/g, `<code style="background:#0a0e1a;padding:1px 5px;border-radius:3px;font-size:11px;color:#a29bfe;font-family:monospace">$1</code>`) }}
            />
          ))}
        </ul>
      );
      continue;
    } else if (line.match(/^\d+\. /)) {
      const items = [];
      while (i < lines.length && lines[i].match(/^\d+\. /)) {
        items.push(lines[i].replace(/^\d+\. /, ''));
        i++;
      }
      elements.push(
        <ol key={i} style={{ margin: '6px 0', paddingLeft: 20, display: 'flex', flexDirection: 'column', gap: 3 }}>
          {items.map((item, ii) => (
            <li key={ii} style={{ color: C.textSecondary, fontSize: 13, lineHeight: 1.5 }}
              dangerouslySetInnerHTML={{ __html: item.replace(/\*\*(.+?)\*\*/g, `<strong style="color:${C.textPrimary}">$1</strong>`).replace(/`(.+?)`/g, `<code style="background:#0a0e1a;padding:1px 5px;border-radius:3px;font-size:11px;color:#a29bfe;font-family:monospace">$1</code>`) }}
            />
          ))}
        </ol>
      );
      continue;
    } else if (line.startsWith('> ')) {
      elements.push(
        <blockquote key={i} style={{ borderLeft: `3px solid ${C.accent}`, paddingLeft: 12, margin: '8px 0', color: C.textSecondary, fontSize: 12, fontStyle: 'italic' }}>
          {line.slice(2)}
        </blockquote>
      );
    } else if (line.startsWith('---') || line.startsWith('===')) {
      elements.push(<hr key={i} style={{ border: 'none', borderTop: `1px solid ${C.border}`, margin: '12px 0' }} />);
    } else if (line.trim() === '') {
      elements.push(<div key={i} style={{ height: 6 }} />);
    } else {
      const html = line
        .replace(/\*\*(.+?)\*\*/g, `<strong style="color:${C.textPrimary}">$1</strong>`)
        .replace(/`(.+?)`/g, `<code style="background:#0a0e1a;padding:1px 5px;border-radius:3px;font-size:11px;color:#a29bfe;font-family:monospace">$1</code>`);
      elements.push(<p key={i} style={{ color: C.textSecondary, fontSize: 13, lineHeight: 1.6, margin: '2px 0' }} dangerouslySetInnerHTML={{ __html: html }} />);
    }
    i++;
  }
  return <div>{elements}</div>;
}

// ── Article Modal ──────────────────────────────────────────────
function ArticleModal({ article, onClose }) {
  useEffect(() => {
    const handleKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onClose]);

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 24,
    }} onClick={onClose}>
      <div style={{
        background: C.bgCard, border: `1px solid ${C.border}`,
        borderTop: `3px solid ${article.domain_color || C.accent}`,
        borderRadius: 14, width: '100%', maxWidth: 700,
        maxHeight: '80vh', display: 'flex', flexDirection: 'column',
        boxShadow: '0 32px 80px rgba(0,0,0,0.6)',
      }} onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div style={{ padding: '16px 20px', borderBottom: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
          <div>
            <div style={{ color: article.domain_color || C.accent, fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 3 }}>{article.domain}</div>
            <h2 style={{ margin: 0, color: C.textPrimary, fontSize: 16, fontWeight: 700 }}>{article.title}</h2>
          </div>
          <button onClick={onClose} style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 8, padding: 8, cursor: 'pointer', color: C.textSecondary, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <XIcon />
          </button>
        </div>
        {/* Content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: 24 }}>
          {article.content ? <SimpleMarkdown content={article.content} /> : (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 200, color: C.textMuted }}>Loading...</div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Ticket Modal ───────────────────────────────────────────────
function TicketModal({ onClose }) {
  const [form, setForm] = useState({ name: '', email: '', subject: '', priority: 'medium', description: '' });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(null);
  const [error, setError] = useState('');

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  async function submit() {
    if (!form.name || !form.email || !form.subject || !form.description) {
      setError('Please fill in all required fields.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      const res = await fetch(`${BASE_URL}/ticket`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      setSuccess(data);
    } catch (e) {
      setError('Failed to submit ticket. Is the backend running?');
    }
    setLoading(false);
  }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }} onClick={onClose}>
      <div style={{ background: C.bgCard, border: `1px solid ${C.border}`, borderTop: `3px solid ${C.accent}`, borderRadius: 14, width: '100%', maxWidth: 520, boxShadow: '0 32px 80px rgba(0,0,0,0.6)' }} onClick={e => e.stopPropagation()}>
        <div style={{ padding: '16px 20px', borderBottom: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: C.accentSoft, display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.accent }}><TicketIcon /></div>
            <div>
              <h2 style={{ margin: 0, color: C.textPrimary, fontSize: 15, fontWeight: 700 }}>Open a Support Ticket</h2>
              <div style={{ color: C.textSecondary, fontSize: 11 }}>We respond within 2 hours for high/critical priority</div>
            </div>
          </div>
          <button onClick={onClose} style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 8, padding: 8, cursor: 'pointer', color: C.textSecondary, display: 'flex' }}><XIcon /></button>
        </div>

        <div style={{ padding: 24 }}>
          {success ? (
            <div style={{ textAlign: 'center', padding: '20px 0' }}>
              <div style={{ width: 56, height: 56, borderRadius: '50%', background: C.greenSoft, border: `1px solid rgba(0,184,148,0.3)`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.green, margin: '0 auto 16px' }}>
                <CheckCircle />
              </div>
              <div style={{ color: C.textPrimary, fontSize: 16, fontWeight: 700, marginBottom: 8 }}>Ticket Created!</div>
              <div style={{ color: C.accent, fontSize: 13, fontWeight: 700, marginBottom: 8 }}>{success.ticket_id}</div>
              <div style={{ color: C.textSecondary, fontSize: 13, marginBottom: 4 }}>{success.message}</div>
              <div style={{ color: C.textMuted, fontSize: 11, marginBottom: 20 }}>Estimated response: <strong style={{ color: C.amber }}>{success.estimated_response}</strong></div>
              <button onClick={onClose} style={{ padding: '9px 24px', borderRadius: 8, background: C.accent, border: 'none', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Close</button>
            </div>
          ) : (
            <>
              {error && <div style={{ marginBottom: 14, padding: '8px 12px', borderRadius: 8, background: C.redSoft, border: `1px solid rgba(214,48,49,0.3)`, color: C.red, fontSize: 12, display: 'flex', alignItems: 'center', gap: 6 }}><AlertIcon />{error}</div>}

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
                {[{ k: 'name', label: 'Full Name', ph: 'John Smith' }, { k: 'email', label: 'Email', ph: 'you@company.com' }].map(({ k, label, ph }) => (
                  <div key={k}>
                    <label style={{ display: 'block', color: C.textMuted, fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 5 }}>{label} *</label>
                    <input value={form[k]} onChange={e => set(k, e.target.value)} placeholder={ph}
                      style={{ width: '100%', background: C.bg, border: `1px solid ${C.border}`, borderRadius: 7, padding: '9px 11px', color: C.textPrimary, fontSize: 13, outline: 'none', boxSizing: 'border-box' }} />
                  </div>
                ))}
              </div>

              <div style={{ marginBottom: 12 }}>
                <label style={{ display: 'block', color: C.textMuted, fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 5 }}>Subject *</label>
                <input value={form.subject} onChange={e => set('subject', e.target.value)} placeholder="Brief description of your issue"
                  style={{ width: '100%', background: C.bg, border: `1px solid ${C.border}`, borderRadius: 7, padding: '9px 11px', color: C.textPrimary, fontSize: 13, outline: 'none', boxSizing: 'border-box' }} />
              </div>

              <div style={{ marginBottom: 12 }}>
                <label style={{ display: 'block', color: C.textMuted, fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 5 }}>Priority</label>
                <div style={{ display: 'flex', gap: 6 }}>
                  {['low', 'medium', 'high', 'critical'].map(p => {
                    const pColors = { low: C.green, medium: C.cyan, high: C.amber, critical: C.red };
                    const active = form.priority === p;
                    return (
                      <button key={p} onClick={() => set('priority', p)} style={{
                        flex: 1, padding: '7px 0', borderRadius: 6,
                        background: active ? `rgba(${p === 'low' ? '0,184,148' : p === 'medium' ? '0,206,201' : p === 'high' ? '253,203,110' : '214,48,49'},0.15)` : C.bg,
                        border: `1px solid ${active ? pColors[p] : C.border}`,
                        color: active ? pColors[p] : C.textMuted,
                        fontSize: 11, fontWeight: active ? 700 : 400, cursor: 'pointer',
                        textTransform: 'capitalize', transition: 'all 0.15s',
                      }}>{p}</button>
                    );
                  })}
                </div>
              </div>

              <div style={{ marginBottom: 20 }}>
                <label style={{ display: 'block', color: C.textMuted, fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 5 }}>Description *</label>
                <textarea value={form.description} onChange={e => set('description', e.target.value)} rows={4} placeholder="Describe your issue in detail. Include any error messages, scan IDs, or relevant URLs..."
                  style={{ width: '100%', background: C.bg, border: `1px solid ${C.border}`, borderRadius: 7, padding: '9px 11px', color: C.textPrimary, fontSize: 13, outline: 'none', resize: 'vertical', fontFamily: 'inherit', boxSizing: 'border-box' }} />
              </div>

              <button onClick={submit} disabled={loading} style={{
                width: '100%', padding: '11px', borderRadius: 8,
                background: loading ? C.textMuted : `linear-gradient(135deg, ${C.accent}, #8b7cf8)`,
                border: 'none', color: '#fff', fontSize: 14, fontWeight: 700,
                cursor: loading ? 'not-allowed' : 'pointer',
                boxShadow: loading ? 'none' : '0 4px 20px rgba(108,92,231,0.35)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              }}>
                {loading ? <><span style={{ animation: 'spin 0.8s linear infinite', display: 'inline-block' }}>⟳</span> Submitting...</> : <><TicketIcon /> Submit Ticket</>}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Live Chat Modal ────────────────────────────────────────────
function LiveChatModal({ onClose }) {
  const [messages, setMessages] = useState([
    { role: 'assistant', content: "Hi! I'm your SecurePulse support agent. How can I help you today? I can answer questions about scan results, configuration, billing, or security best practices." }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  async function send() {
    if (!input.trim() || loading) return;
    const q = input.trim();
    setInput('');
    const updated = [...messages, { role: 'user', content: q }];
    setMessages(updated);
    setLoading(true);
    try {
      const res = await fetch(`${BASE_URL}/support/livechat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: updated }),
      });
      const data = await res.json();
      setMessages(m => [...m, { role: 'assistant', content: data.success ? data.response : "I'm having trouble connecting right now. Please try again or open a support ticket." }]);
    } catch {
      setMessages(m => [...m, { role: 'assistant', content: "Connection error. Please check that the backend is running on port 8000." }]);
    }
    setLoading(false);
  }

  const quickQ = ['How do I fix HSTS?', 'What does CRITICAL mean?', 'How to set up 2FA?', 'API rate limits?'];

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }} onClick={onClose}>
      <div style={{ background: C.bgCard, border: `1px solid ${C.border}`, borderTop: `3px solid ${C.cyan}`, borderRadius: 14, width: '100%', maxWidth: 480, height: 580, display: 'flex', flexDirection: 'column', boxShadow: '0 32px 80px rgba(0,0,0,0.6)' }} onClick={e => e.stopPropagation()}>
        <div style={{ padding: '14px 18px', borderBottom: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: C.cyanSoft, display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.cyan }}><BotIcon /></div>
            <div>
              <div style={{ color: C.textPrimary, fontSize: 14, fontWeight: 700 }}>Live Support Chat</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: loading ? C.amber : C.green, display: 'inline-block' }} />
                <span style={{ color: C.textMuted, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{loading ? 'Typing...' : 'AI Support Online'}</span>
              </div>
            </div>
          </div>
          <button onClick={onClose} style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 8, padding: 8, cursor: 'pointer', color: C.textSecondary, display: 'flex' }}><XIcon /></button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 10, minHeight: 0 }}>
          {messages.map((m, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start', gap: 8 }}>
              {m.role === 'assistant' && (
                <div style={{ width: 24, height: 24, borderRadius: 6, flexShrink: 0, background: C.cyanSoft, display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.cyan, marginTop: 2 }}><BotIcon /></div>
              )}
              <div style={{
                maxWidth: '78%', padding: '9px 12px',
                borderRadius: m.role === 'user' ? '12px 12px 4px 12px' : '4px 12px 12px 12px',
                background: m.role === 'user' ? C.accent : C.bg,
                border: m.role === 'assistant' ? `1px solid ${C.border}` : 'none',
                color: C.textPrimary, fontSize: 12.5, lineHeight: 1.55,
              }}>{m.content}</div>
            </div>
          ))}
          {loading && (
            <div style={{ display: 'flex', gap: 8 }}>
              <div style={{ width: 24, height: 24, borderRadius: 6, flexShrink: 0, background: C.cyanSoft, display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.cyan }}><BotIcon /></div>
              <div style={{ padding: '9px 12px', borderRadius: '4px 12px 12px 12px', background: C.bg, border: `1px solid ${C.border}`, color: C.textSecondary, fontSize: 12 }}>···</div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        <div style={{ padding: '8px 14px 6px', borderTop: `1px solid ${C.border}`, display: 'flex', flexWrap: 'wrap', gap: 5, flexShrink: 0 }}>
          {quickQ.map(q => (
            <button key={q} onClick={() => setInput(q)} style={{ padding: '3px 9px', borderRadius: 20, background: C.bg, border: `1px solid ${C.border}`, color: C.textMuted, fontSize: 10, cursor: 'pointer' }}>{q}</button>
          ))}
        </div>
        <div style={{ padding: '6px 14px 14px', display: 'flex', gap: 8, flexShrink: 0 }}>
          <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && send()} placeholder="Ask a support question..." disabled={loading}
            style={{ flex: 1, background: C.bg, border: `1px solid ${C.border}`, borderRadius: 8, padding: '9px 11px', color: C.textPrimary, fontSize: 13, outline: 'none', opacity: loading ? 0.6 : 1 }} />
          <button onClick={send} disabled={loading} style={{ width: 36, height: 36, borderRadius: 8, background: loading ? C.textMuted : C.cyan, border: 'none', color: '#fff', cursor: loading ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <SendIcon />
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Community Modal ────────────────────────────────────────────
function CommunityModal({ onClose }) {
  const threads = [
    { id: 1, title: 'Best practices for hardening Next.js app headers', author: 'sentinel_dev', replies: 14, views: 342, tag: 'Headers', tagColor: C.cyan, time: '2h ago', hot: true },
    { id: 2, title: 'False positive on AWS SDK — how to suppress?', author: 'cloud_sec', replies: 7, views: 128, tag: 'Scanning', tagColor: C.accent, time: '5h ago', hot: false },
    { id: 3, title: 'GitHub Actions integration for automated scans', author: 'devops_hawk', replies: 22, views: 891, tag: 'CI/CD', tagColor: C.green, time: '1d ago', hot: true },
    { id: 4, title: 'Understanding the weighted scoring formula', author: 'new_sentinel', replies: 4, views: 67, tag: 'Scoring', tagColor: C.amber, time: '2d ago', hot: false },
    { id: 5, title: 'Stripe key exposed in prod — incident post-mortem', author: 'infosec_pro', replies: 31, views: 1204, tag: 'Incident', tagColor: C.red, time: '3d ago', hot: true },
  ];

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }} onClick={onClose}>
      <div style={{ background: C.bgCard, border: `1px solid ${C.border}`, borderTop: `3px solid ${C.green}`, borderRadius: 14, width: '100%', maxWidth: 640, maxHeight: '80vh', display: 'flex', flexDirection: 'column', boxShadow: '0 32px 80px rgba(0,0,0,0.6)' }} onClick={e => e.stopPropagation()}>
        <div style={{ padding: '14px 20px', borderBottom: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
          <div>
            <h2 style={{ margin: 0, color: C.textPrimary, fontSize: 15, fontWeight: 700 }}>Sentinel Global Forum</h2>
            <div style={{ color: C.textMuted, fontSize: 11, marginTop: 2 }}>1,247 members · 89 online now</div>
          </div>
          <button onClick={onClose} style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 8, padding: 8, cursor: 'pointer', color: C.textSecondary, display: 'flex' }}><XIcon /></button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
          {threads.map(t => (
            <div key={t.id} style={{ padding: '12px 14px', borderRadius: 10, background: C.bg, border: `1px solid ${C.border}`, cursor: 'pointer', transition: 'border-color 0.15s' }}
              onMouseEnter={e => e.currentTarget.style.borderColor = C.borderLight}
              onMouseLeave={e => e.currentTarget.style.borderColor = C.border}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 5 }}>
                    {t.hot && <span style={{ padding: '1px 6px', borderRadius: 3, background: C.redSoft, color: C.red, fontSize: 9, fontWeight: 700 }}>🔥 HOT</span>}
                    <span style={{ padding: '1px 7px', borderRadius: 3, background: `${t.tagColor}18`, color: t.tagColor, fontSize: 9, fontWeight: 700 }}>{t.tag}</span>
                  </div>
                  <div style={{ color: C.textPrimary, fontSize: 13, fontWeight: 600, marginBottom: 4 }}>{t.title}</div>
                  <div style={{ color: C.textMuted, fontSize: 11 }}>by <span style={{ color: C.accent }}>{t.author}</span> · {t.time}</div>
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <div style={{ color: C.textSecondary, fontSize: 11 }}>{t.replies} replies</div>
                  <div style={{ color: C.textMuted, fontSize: 10 }}>{t.views} views</div>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div style={{ padding: '12px 16px', borderTop: `1px solid ${C.border}`, display: 'flex', gap: 10, flexShrink: 0 }}>
          <input placeholder="Start a new discussion..." style={{ flex: 1, background: C.bg, border: `1px solid ${C.border}`, borderRadius: 8, padding: '9px 12px', color: C.textPrimary, fontSize: 13, outline: 'none' }} />
          <button style={{ padding: '9px 18px', borderRadius: 8, background: C.green, border: 'none', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Post</button>
        </div>
      </div>
    </div>
  );
}

// ── Connect with Command Modal ─────────────────────────────────
function CommandModal({ onClose }) {
  const [form, setForm] = useState({ name: '', email: '', company: '', message: '', urgency: 'medium' });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(null);
  const [error, setError] = useState('');

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  async function submit() {
    if (!form.name || !form.email || !form.message) { setError('Please fill in all required fields.'); return; }
    setError('');
    setLoading(true);
    try {
      const res = await fetch(`${BASE_URL}/support/command`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      setSuccess(data);
    } catch {
      setError('Connection error. Is the backend running?');
    }
    setLoading(false);
  }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }} onClick={onClose}>
      <div style={{ background: C.bgCard, border: `1px solid ${C.border}`, borderTop: `3px solid ${C.pink}`, borderRadius: 14, width: '100%', maxWidth: 500, boxShadow: '0 32px 80px rgba(0,0,0,0.6)' }} onClick={e => e.stopPropagation()}>
        <div style={{ padding: '16px 20px', borderBottom: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: C.pinkSoft, border: `1px solid rgba(232,67,147,0.3)`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.pink }}><CommandIcon /></div>
            <div>
              <h2 style={{ margin: 0, color: C.textPrimary, fontSize: 15, fontWeight: 700 }}>Connect with Command</h2>
              <div style={{ color: C.textSecondary, fontSize: 11 }}>Direct line to our senior security engineers</div>
            </div>
          </div>
          <button onClick={onClose} style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 8, padding: 8, cursor: 'pointer', color: C.textSecondary, display: 'flex' }}><XIcon /></button>
        </div>

        <div style={{ padding: 24 }}>
          {success ? (
            <div style={{ textAlign: 'center', padding: '20px 0' }}>
              <div style={{ width: 56, height: 56, borderRadius: '50%', background: C.pinkSoft, border: `1px solid rgba(232,67,147,0.3)`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.pink, margin: '0 auto 16px', fontSize: 24 }}>⚡</div>
              <div style={{ color: C.textPrimary, fontSize: 16, fontWeight: 700, marginBottom: 8 }}>Request Received!</div>
              <div style={{ color: C.pink, fontSize: 13, fontWeight: 700, marginBottom: 8 }}>{success.request_id}</div>
              <div style={{ color: C.textSecondary, fontSize: 13, marginBottom: 4 }}>{success.message}</div>
              <div style={{ color: C.textMuted, fontSize: 11, marginBottom: 20 }}>Response time: <strong style={{ color: C.amber }}>{success.estimated_response}</strong></div>
              <button onClick={onClose} style={{ padding: '9px 24px', borderRadius: 8, background: C.pink, border: 'none', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Close</button>
            </div>
          ) : (
            <>
              {/* Urgency selector */}
              <div style={{ marginBottom: 16, padding: '12px 14px', borderRadius: 10, background: C.pinkSoft, border: `1px solid rgba(232,67,147,0.2)` }}>
                <div style={{ color: C.pink, fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>Urgency Level</div>
                <div style={{ display: 'flex', gap: 6 }}>
                  {[
                    { v: 'low', label: 'Low', sub: '48h' },
                    { v: 'medium', label: 'Medium', sub: '24h' },
                    { v: 'high', label: 'High', sub: '4h' },
                    { v: 'critical', label: 'Critical', sub: '1h' },
                  ].map(({ v, label, sub }) => (
                    <button key={v} onClick={() => set('urgency', v)} style={{
                      flex: 1, padding: '7px 4px', borderRadius: 7,
                      background: form.urgency === v ? C.pink : C.bgCard,
                      border: `1px solid ${form.urgency === v ? C.pink : C.border}`,
                      color: form.urgency === v ? '#fff' : C.textMuted,
                      fontSize: 11, fontWeight: form.urgency === v ? 700 : 400, cursor: 'pointer',
                    }}>
                      <div>{label}</div>
                      <div style={{ fontSize: 9, opacity: 0.7 }}>{sub}</div>
                    </button>
                  ))}
                </div>
              </div>

              {error && <div style={{ marginBottom: 12, padding: '8px 12px', borderRadius: 8, background: C.redSoft, border: `1px solid rgba(214,48,49,0.3)`, color: C.red, fontSize: 12, display: 'flex', alignItems: 'center', gap: 6 }}><AlertIcon />{error}</div>}

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
                {[{ k: 'name', label: 'Name', ph: 'Your name' }, { k: 'email', label: 'Email', ph: 'you@company.com' }].map(({ k, label, ph }) => (
                  <div key={k}>
                    <label style={{ display: 'block', color: C.textMuted, fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 5 }}>{label} *</label>
                    <input value={form[k]} onChange={e => set(k, e.target.value)} placeholder={ph}
                      style={{ width: '100%', background: C.bg, border: `1px solid ${C.border}`, borderRadius: 7, padding: '9px 11px', color: C.textPrimary, fontSize: 13, outline: 'none', boxSizing: 'border-box' }} />
                  </div>
                ))}
              </div>

              <div style={{ marginBottom: 10 }}>
                <label style={{ display: 'block', color: C.textMuted, fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 5 }}>Company (optional)</label>
                <input value={form.company} onChange={e => set('company', e.target.value)} placeholder="Your organization"
                  style={{ width: '100%', background: C.bg, border: `1px solid ${C.border}`, borderRadius: 7, padding: '9px 11px', color: C.textPrimary, fontSize: 13, outline: 'none', boxSizing: 'border-box' }} />
              </div>

              <div style={{ marginBottom: 20 }}>
                <label style={{ display: 'block', color: C.textMuted, fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 5 }}>What do you need help with? *</label>
                <textarea value={form.message} onChange={e => set('message', e.target.value)} rows={4} placeholder="Describe your deployment challenge, security incident, or integration need..."
                  style={{ width: '100%', background: C.bg, border: `1px solid ${C.border}`, borderRadius: 7, padding: '9px 11px', color: C.textPrimary, fontSize: 13, outline: 'none', resize: 'vertical', fontFamily: 'inherit', boxSizing: 'border-box' }} />
              </div>

              <button onClick={submit} disabled={loading} style={{
                width: '100%', padding: '11px', borderRadius: 8,
                background: loading ? C.textMuted : `linear-gradient(135deg, ${C.pink}, #c0392b)`,
                border: 'none', color: '#fff', fontSize: 14, fontWeight: 700,
                cursor: loading ? 'not-allowed' : 'pointer',
                boxShadow: loading ? 'none' : '0 4px 20px rgba(232,67,147,0.35)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              }}>
                {loading ? <><span style={{ animation: 'spin 0.8s linear infinite', display: 'inline-block' }}>⟳</span> Connecting...</> : <><CommandIcon /> Connect with Command</>}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ── System Status Panel ────────────────────────────────────────
function SystemStatus() {
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState(null);

  async function fetchStatus() {
    setLoading(true);
    try {
      const res = await fetch(`${BASE_URL}/status`);
      const data = await res.json();
      setStatus(data);
      setLastRefresh(new Date());
    } catch {
      setStatus(null);
    }
    setLoading(false);
  }

  useEffect(() => { fetchStatus(); }, []);

  const typeColors = { update: C.accent, maintenance: C.amber, patch: C.cyan, incident: C.red };
  const typeIcons = { update: '🔄', maintenance: '🔧', patch: '⚡', incident: '🚨' };

  return (
    <div style={{ width: 280, flexShrink: 0 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
        <div style={{ width: 3, height: 18, background: C.accent, borderRadius: 2 }} />
        <h2 style={{ margin: 0, color: C.textPrimary, fontSize: 15, fontWeight: 700 }}>System Status</h2>
        <button onClick={fetchStatus} disabled={loading} title="Refresh" style={{
          marginLeft: 'auto', background: C.bgCard, border: `1px solid ${C.border}`,
          borderRadius: 6, padding: '4px 7px', cursor: 'pointer', color: C.textMuted,
          display: 'flex', alignItems: 'center', gap: 4, fontSize: 10,
        }}>
          <span style={{ display: 'inline-block', animation: loading ? 'spin 0.8s linear infinite' : 'none' }}><RefreshIcon /></span>
          {lastRefresh && <span>{lastRefresh.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}</span>}
        </button>
      </div>

      <div style={{ background: C.bgCard, border: `1px solid ${C.border}`, borderRadius: 12, overflow: 'hidden' }}>
        {/* Overall status */}
        <div style={{ padding: '12px 16px', background: status ? 'rgba(0,184,148,0.06)' : C.bgCard, borderBottom: `1px solid ${C.border}` }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: loading ? C.amber : (status ? C.green : C.red), display: 'inline-block', animation: 'pulse 1.5s infinite' }} />
              <span style={{ color: C.textPrimary, fontSize: 13, fontWeight: 600 }}>
                {loading ? 'Checking...' : status ? 'All Systems Operational' : 'Backend Offline'}
              </span>
            </div>
            {status && <span style={{ padding: '2px 8px', borderRadius: 4, background: C.greenSoft, border: `1px solid rgba(0,184,148,0.3)`, color: C.green, fontSize: 10, fontWeight: 700 }}>LIVE</span>}
          </div>
        </div>

        {/* Components */}
        {status?.components && (
          <div style={{ padding: '10px 0' }}>
            {status.components.map((comp, i) => (
              <div key={i} style={{ padding: '7px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: comp.status === 'operational' ? C.green : C.red, display: 'inline-block', flexShrink: 0 }} />
                  <span style={{ color: C.textSecondary, fontSize: 12 }}>{comp.name}</span>
                </div>
                <span style={{ color: C.textMuted, fontSize: 10, fontFamily: 'monospace' }}>
                  {comp.latency_ms ? `${comp.latency_ms}ms` : comp.updated ? `Updated ${comp.updated}` : 'OK'}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Updates */}
        {status?.updates && (
          <>
            <div style={{ padding: '8px 16px', borderTop: `1px solid ${C.border}`, borderBottom: `1px solid ${C.border}` }}>
              <div style={{ color: C.textMuted, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 700 }}>Recent Updates</div>
            </div>
            <div style={{ padding: '8px 0' }}>
              {status.updates.map((upd, i) => (
                <div key={i} style={{ padding: '8px 16px', borderBottom: i < status.updates.length - 1 ? `1px solid rgba(30,37,53,0.6)` : 'none' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                    <span style={{ fontSize: 14, lineHeight: 1, marginTop: 1 }}>{typeIcons[upd.type] || '📋'}</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 2 }}>
                        <span style={{ color: C.textPrimary, fontSize: 11, fontWeight: 600 }}>{upd.title}</span>
                        <span style={{ color: C.textMuted, fontSize: 10, flexShrink: 0, marginLeft: 8 }}>{upd.time}</span>
                      </div>
                      <div style={{ color: C.textMuted, fontSize: 10, lineHeight: 1.4 }}>{upd.desc}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {!status && !loading && (
          <div style={{ padding: 16, textAlign: 'center', color: C.textMuted, fontSize: 12 }}>
            Backend offline — start FastAPI on port 8000
          </div>
        )}

        <div style={{ padding: '10px 16px', borderTop: `1px solid ${C.border}` }}>
          <button onClick={fetchStatus} style={{ width: '100%', padding: '7px 0', borderRadius: 8, background: 'transparent', border: `1px solid ${C.border}`, color: C.textSecondary, fontSize: 11, fontWeight: 600, cursor: 'pointer', letterSpacing: '0.04em' }}>
            REFRESH STATUS
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Knowledge Domains ──────────────────────────────────────────
function KnowledgeDomains({ onArticleOpen }) {
  const [domains, setDomains] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${BASE_URL}/support/knowledge`)
      .then(r => r.json())
      .then(d => { setDomains(d.domains || []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  async function openArticle(domainId, articleIndex) {
    const res = await fetch(`${BASE_URL}/support/knowledge/${domainId}/${articleIndex}`);
    const data = await res.json();
    onArticleOpen(data);
  }

  if (loading) return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
      {[...Array(5)].map((_, i) => (
        <div key={i} style={{ background: C.bgCard, border: `1px solid ${C.border}`, borderRadius: 12, padding: 20, height: 140, animation: 'pulse 1.5s infinite' }} />
      ))}
    </div>
  );

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
      {domains.map((d) => (
        <div key={d.id} style={{ background: C.bgCard, border: `1px solid ${C.border}`, borderTop: `3px solid ${d.color}`, borderRadius: 12, padding: 18, cursor: 'default', transition: 'all 0.15s' }}
          onMouseEnter={e => { e.currentTarget.style.background = C.bgCardHover; e.currentTarget.style.transform = 'translateY(-1px)'; }}
          onMouseLeave={e => { e.currentTarget.style.background = C.bgCard; e.currentTarget.style.transform = 'translateY(0)'; }}>
          <div style={{ fontSize: 20, marginBottom: 8 }}>{d.icon}</div>
          <div style={{ color: C.textPrimary, fontSize: 13, fontWeight: 700, marginBottom: 5 }}>{d.title}</div>
          <div style={{ color: C.textSecondary, fontSize: 11, lineHeight: 1.5, marginBottom: 10 }}>{d.desc}</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {d.articles.map((a, ai) => (
              <button key={ai} onClick={() => openArticle(d.id, ai)} style={{
                display: 'flex', alignItems: 'center', gap: 4, background: 'none', border: 'none',
                color: d.color, fontSize: 11, cursor: 'pointer', padding: '2px 0', textAlign: 'left',
                transition: 'opacity 0.15s',
              }}
                onMouseEnter={e => e.currentTarget.style.opacity = '0.75'}
                onMouseLeave={e => e.currentTarget.style.opacity = '1'}>
                <ChevronRight /> {a.title}
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// ── AI Search ──────────────────────────────────────────────────
function AISearch({ onArticleOpen }) {
  const [query, setQuery] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  async function search() {
    if (!query.trim()) return;
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch(`${BASE_URL}/support/search`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query }),
      });
      const data = await res.json();
      setResult(data);
    } catch {
      setResult({ answer: 'Search failed. Is the backend running on port 8000?', articles: [] });
    }
    setLoading(false);
  }

  async function openArticle(domainId, articleTitle) {
    // Find the article index by searching
    try {
      const res = await fetch(`${BASE_URL}/support/knowledge`);
      const data = await res.json();
      for (const domain of data.domains) {
        if (domain.id === domainId) {
          const idx = domain.articles.findIndex(a => a.title === articleTitle);
          if (idx >= 0) {
            const articleRes = await fetch(`${BASE_URL}/support/knowledge/${domainId}/${idx}`);
            const articleData = await articleRes.json();
            onArticleOpen(articleData);
          }
        }
      }
    } catch {}
  }

  return (
    <div style={{ maxWidth: 600, margin: '0 auto 32px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 0, background: C.bgCard, border: `1px solid ${C.border}`, borderRadius: 10, overflow: 'hidden', transition: 'border-color 0.2s', boxShadow: '0 4px 24px rgba(0,0,0,0.2)' }}>
        <span style={{ padding: '0 14px', color: C.textMuted }}><SearchIcon /></span>
        <input
          value={query}
          onChange={e => setQuery(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && search()}
          placeholder="Ask anything — 'How do I fix a missing HSTS header?'"
          style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', color: C.textPrimary, fontSize: 14, padding: '13px 0' }}
        />
        <button onClick={search} disabled={loading || !query.trim()} style={{
          margin: 6, padding: '8px 18px', borderRadius: 8,
          background: loading || !query.trim() ? C.textMuted : C.accent,
          border: 'none', color: '#fff', fontSize: 12, fontWeight: 600,
          cursor: loading || !query.trim() ? 'not-allowed' : 'pointer', flexShrink: 0,
          display: 'flex', alignItems: 'center', gap: 6, transition: 'background 0.15s',
        }}>
          {loading ? <><span style={{ animation: 'spin 0.8s linear infinite', display: 'inline-block' }}>⟳</span> Searching...</> : 'Search'}
        </button>
      </div>

      {result && (
        <div style={{ marginTop: 12, background: C.bgCard, border: `1px solid ${C.border}`, borderLeft: `3px solid ${C.accent}`, borderRadius: 10, padding: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
            <div style={{ width: 20, height: 20, borderRadius: 5, background: C.accentSoft, display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.accent, fontSize: 10 }}><BotIcon /></div>
            <span style={{ color: C.accent, fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>AI Answer</span>
          </div>
          <div style={{ color: C.textSecondary, fontSize: 13, lineHeight: 1.6 }}>
            <SimpleMarkdown content={result.answer} />
          </div>
          {result.articles?.length > 0 && (
            <div style={{ marginTop: 12, paddingTop: 10, borderTop: `1px solid ${C.border}` }}>
              <div style={{ color: C.textMuted, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>Related Articles</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {result.articles.map((a, i) => (
                  <button key={i} onClick={() => openArticle(a.domain_id, a.title)} style={{
                    padding: '4px 10px', borderRadius: 6,
                    background: C.bg, border: `1px solid ${a.color || C.border}`,
                    color: a.color || C.accent, fontSize: 11, cursor: 'pointer',
                    display: 'flex', alignItems: 'center', gap: 4, transition: 'opacity 0.15s',
                  }}>
                    <ChevronRight /> {a.title}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Main SupportPage ───────────────────────────────────────────
export default function SupportPage() {
  const [modal, setModal] = useState(null); // 'ticket' | 'chat' | 'community' | 'command' | {article}
  const [articleData, setArticleData] = useState(null);

  function openArticle(data) { setArticleData(data); setModal('article'); }
  function closeModal() { setModal(null); setArticleData(null); }

  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: 32 }}>
      <style>{`
        @keyframes spin { from{transform:rotate(0deg)}to{transform:rotate(360deg)} }
        @keyframes pulse { 0%,100%{opacity:1}50%{opacity:0.5} }
      `}</style>

      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: 36 }}>
        <h1 style={{ margin: '0 0 8px', color: '#f0f1f5', fontSize: 28, fontWeight: 800, letterSpacing: '-0.5px' }}>How can we help you, Sentinel?</h1>
        <p style={{ margin: '0 0 28px', color: '#8892a4', fontSize: 14 }}>Access the central intelligence repository for all Security Operations.</p>
        <AISearch onArticleOpen={openArticle} />
      </div>

      {/* Knowledge Domains */}
      <div style={{ marginBottom: 36 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
          <div style={{ width: 3, height: 18, background: C.pink, borderRadius: 2 }} />
          <h2 style={{ margin: 0, color: C.textPrimary, fontSize: 16, fontWeight: 700 }}>Knowledge Domains</h2>
        </div>
        <KnowledgeDomains onArticleOpen={openArticle} />
      </div>

      {/* Support Channels + System Status */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 24 }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
            <div style={{ width: 3, height: 18, background: C.accent, borderRadius: 2 }} />
            <h2 style={{ margin: 0, color: C.textPrimary, fontSize: 15, fontWeight: 700 }}>Support Channels</h2>
          </div>

          <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
            {[
              { icon: <TicketIcon />, title: 'Open a Ticket', desc: 'Response time: < 2 hours', color: C.accent, action: () => setModal('ticket') },
              { icon: <ChatIcon />, title: 'Live Chat', desc: 'AI-powered instant support', color: C.cyan, action: () => setModal('chat') },
              { icon: <CommunityIcon />, title: 'Community', desc: 'Sentinel Global Forum', color: C.green, action: () => setModal('community') },
            ].map(({ icon, title, desc, color, action }) => (
              <button key={title} onClick={action} style={{
                flex: 1, background: C.bgCard, border: `1px solid ${C.border}`, borderRadius: 12, padding: 16,
                cursor: 'pointer', textAlign: 'left', transition: 'all 0.15s',
              }}
                onMouseEnter={e => { e.currentTarget.style.background = C.bgCardHover; e.currentTarget.style.borderColor = color; e.currentTarget.style.transform = 'translateY(-1px)'; }}
                onMouseLeave={e => { e.currentTarget.style.background = C.bgCard; e.currentTarget.style.borderColor = C.border; e.currentTarget.style.transform = 'translateY(0)'; }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: `${color}18`, border: `1px solid ${color}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', color, marginBottom: 10 }}>{icon}</div>
                <div style={{ color: C.textPrimary, fontSize: 13, fontWeight: 600, marginBottom: 3 }}>{title}</div>
                <div style={{ color: C.textSecondary, fontSize: 11 }}>{desc}</div>
              </button>
            ))}
          </div>

          {/* Connect with Command */}
          <div style={{
            background: C.bgCard, border: `1px solid ${C.border}`, borderRadius: 12,
            padding: 20, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16,
            backgroundImage: `radial-gradient(ellipse at top right, rgba(232,67,147,0.06) 0%, transparent 60%)`,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{ width: 44, height: 44, borderRadius: 12, background: C.pinkSoft, border: `1px solid rgba(232,67,147,0.3)`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.pink, flexShrink: 0 }}>
                <CommandIcon />
              </div>
              <div>
                <div style={{ color: C.textPrimary, fontSize: 15, fontWeight: 700, marginBottom: 3 }}>Still need tactical assistance?</div>
                <div style={{ color: C.textSecondary, fontSize: 12 }}>Our high-level security engineers are standing by for live deployment support and incident response.</div>
              </div>
            </div>
            <button onClick={() => setModal('command')} style={{
              padding: '10px 20px', borderRadius: 9, flexShrink: 0,
              background: `linear-gradient(135deg, ${C.pink}, #c0392b)`,
              border: 'none', color: '#fff', fontSize: 13, fontWeight: 700,
              cursor: 'pointer', boxShadow: '0 4px 16px rgba(232,67,147,0.3)',
              display: 'flex', alignItems: 'center', gap: 8, whiteSpace: 'nowrap',
            }}>
              <CommandIcon /> Connect with Command
            </button>
          </div>
        </div>

        <SystemStatus />
      </div>

      {/* Modals */}
      {modal === 'ticket' && <TicketModal onClose={closeModal} />}
      {modal === 'chat' && <LiveChatModal onClose={closeModal} />}
      {modal === 'community' && <CommunityModal onClose={closeModal} />}
      {modal === 'command' && <CommandModal onClose={closeModal} />}
      {modal === 'article' && articleData && <ArticleModal article={articleData} onClose={closeModal} />}
    </div>
  );
}