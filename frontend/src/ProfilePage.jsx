import { useState, useEffect } from 'react';
import { getUserProfile, getScanHistory, getDashboardStats, getUserTickets, getChatHistory, updateUserProfile, getUserBadges } from './api';

// ── colour tokens (CSS custom props from App.jsx) ──────────────
const C = {
  bg: 'var(--bg)', bgCard: 'var(--bgCard)', bgCardHover: 'var(--bgCardHover)',
  border: 'var(--border)', borderLight: 'var(--borderLight)',
  accent: 'var(--accent)', accentHover: 'var(--accentHover)', accentSoft: 'var(--accentSoft)',
  pink: 'var(--pink)', pinkSoft: 'var(--pinkSoft)',
  cyan: 'var(--cyan)', cyanSoft: 'var(--cyanSoft)',
  green: 'var(--green)', greenSoft: 'var(--greenSoft)',
  amber: 'var(--amber)', amberSoft: 'var(--amberSoft)',
  red: 'var(--red)', redSoft: 'var(--redSoft)',
  textPrimary: 'var(--textPrimary)', textSecondary: 'var(--textSecondary)', textMuted: 'var(--textMuted)',
};

const flex = (dir = 'row', align = 'center', justify = 'flex-start', gap = 0) => ({
  display: 'flex', flexDirection: dir, alignItems: align, justifyContent: justify,
  ...(gap ? { gap: `${gap}px` } : {}),
});

// ── icons ──────────────────────────────────────────────────────
const Icons = {
  User: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
    </svg>
  ),
  Mail: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/>
    </svg>
  ),
  Building: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="4" y="2" width="16" height="20" rx="2" ry="2"/><path d="M9 22v-4h6v4"/><line x1="8" y1="6" x2="10" y2="6"/><line x1="14" y1="6" x2="16" y2="6"/>
      <line x1="8" y1="10" x2="10" y2="10"/><line x1="14" y1="10" x2="16" y2="10"/><line x1="8" y1="14" x2="10" y2="14"/><line x1="14" y1="14" x2="16" y2="14"/>
    </svg>
  ),
  Calendar: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
    </svg>
  ),
  Shield: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
    </svg>
  ),
  Activity: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
    </svg>
  ),
  Ticket: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 9a3 3 0 1 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 1 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v2z"/>
    </svg>
  ),
  Chat: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
    </svg>
  ),
  TrendUp: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/>
    </svg>
  ),
  Award: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="8" r="7"/><polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88"/>
    </svg>
  ),
  AlertCircle: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
    </svg>
  ),
  Clock: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
    </svg>
  ),
  Globe: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/>
      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
    </svg>
  ),
  LogOut: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
    </svg>
  ),
  Edit: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
    </svg>
  ),
  Check: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12"/>
    </svg>
  ),
  Save: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/>
    </svg>
  ),
  X: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
    </svg>
  ),
};

// ── Stat Card ──────────────────────────────────────────────────
function StatCard({ icon, label, value, color, bgColor, sub }) {
  return (
    <div style={{
      background: C.bgCard, border: `1px solid ${C.border}`, borderRadius: 12,
      padding: '18px 20px', flex: 1, minWidth: 140,
      transition: 'all 0.2s', position: 'relative', overflow: 'hidden',
    }}>
      {/* Decorative corner glow */}
      <div style={{
        position: 'absolute', top: -20, right: -20, width: 60, height: 60,
        borderRadius: '50%', background: bgColor, opacity: 0.5, filter: 'blur(15px)',
      }} />
      <div style={{ ...flex('row', 'center', 'flex-start', 10), marginBottom: 10, position: 'relative' }}>
        <div style={{
          width: 32, height: 32, borderRadius: 8,
          background: bgColor, color,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          {icon}
        </div>
        <span style={{ color: C.textSecondary, fontSize: 11, fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
          {label}
        </span>
      </div>
      <div style={{ fontSize: 26, fontWeight: 800, color: C.textPrimary, lineHeight: 1, position: 'relative' }}>
        {value}
      </div>
      {sub && (
        <div style={{ fontSize: 11, color: C.textMuted, marginTop: 4, position: 'relative' }}>{sub}</div>
      )}
    </div>
  );
}

// ── Grade Badge ────────────────────────────────────────────────
function GradeBadge({ grade }) {
  const gradeColors = {
    A: { bg: 'rgba(0,184,148,0.15)', color: '#00b894', border: 'rgba(0,184,148,0.3)' },
    B: { bg: 'rgba(0,206,201,0.15)', color: '#00cec9', border: 'rgba(0,206,201,0.3)' },
    C: { bg: 'rgba(253,203,110,0.15)', color: '#fdcb6e', border: 'rgba(253,203,110,0.3)' },
    D: { bg: 'rgba(225,112,85,0.15)', color: '#e17055', border: 'rgba(225,112,85,0.3)' },
    F: { bg: 'rgba(214,48,49,0.15)', color: '#d63031', border: 'rgba(214,48,49,0.3)' },
  };
  const g = gradeColors[grade] || gradeColors.F;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      width: 32, height: 32, borderRadius: 8,
      background: g.bg, border: `1px solid ${g.border}`,
      color: g.color, fontSize: 14, fontWeight: 800,
    }}>
      {grade}
    </span>
  );
}

// ── Preference Tag ─────────────────────────────────────────────
function PrefTag({ label, value }) {
  if (!value) return null;
  return (
    <div style={{
      background: C.accentSoft, border: `1px solid rgba(108,92,231,0.2)`,
      borderRadius: 8, padding: '8px 14px',
      display: 'flex', flexDirection: 'column', gap: 2,
    }}>
      <span style={{ fontSize: 10, color: C.textMuted, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
        {label}
      </span>
      <span style={{ fontSize: 13, color: C.textPrimary, fontWeight: 500, textTransform: 'capitalize' }}>
        {value}
      </span>
    </div>
  );
}

// ── Score Ring ──────────────────────────────────────────────────
function ScoreRing({ score, size = 100, strokeWidth = 8 }) {
  const r = (size - strokeWidth) / 2;
  const circ = 2 * Math.PI * r;
  const filled = (score / 100) * circ;
  const color = score >= 75 ? '#00b894' : score >= 50 ? '#fdcb6e' : score >= 25 ? '#e17055' : '#d63031';

  return (
    <div style={{ position: 'relative', width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={C.border} strokeWidth={strokeWidth} />
        <circle
          cx={size / 2} cy={size / 2} r={r} fill="none"
          stroke={color} strokeWidth={strokeWidth}
          strokeDasharray={`${filled} ${circ}`}
          strokeLinecap="round"
          style={{ transition: 'stroke-dasharray 1s ease' }}
        />
      </svg>
      <div style={{
        position: 'absolute', inset: 0,
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      }}>
        <span style={{ fontSize: 24, fontWeight: 800, color: C.textPrimary, lineHeight: 1 }}>{score}</span>
        <span style={{ fontSize: 9, color: C.textMuted, textTransform: 'uppercase', fontWeight: 600, letterSpacing: '0.06em' }}>Score</span>
      </div>
    </div>
  );
}

// ── Main Profile Page ──────────────────────────────────────────
export default function ProfilePage({ user, userPreferences, onLogout, setPage, onUserUpdate }) {
  const [profile, setProfile] = useState(null);
  const [stats, setStats] = useState(null);
  const [scanHistory, setScanHistory] = useState([]);
  const [tickets, setTickets] = useState([]);
  const [chatCount, setChatCount] = useState(0);
  const [badges, setBadges] = useState({ earned: [], locked: [], total_earned: 0, total: 0 });
  const [loadingData, setLoadingData] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [mounted, setMounted] = useState(false);

  // Edit Profile modal state
  const [showEditModal, setShowEditModal] = useState(false);
  const [editName, setEditName] = useState('');
  const [editCompany, setEditCompany] = useState('');
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState('');
  const [editSuccess, setEditSuccess] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 50);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (!user?.id) return;
    loadProfileData();
  }, [user]);

  async function loadProfileData() {
    setLoadingData(true);
    try {
      const [profileData, statsData, historyData, ticketData, chatData, badgeData] = await Promise.allSettled([
        getUserProfile(user.id),
        getDashboardStats(user.id),
        getScanHistory(user.id),
        getUserTickets(user.id),
        getChatHistory(user.id),
        getUserBadges(user.id),
      ]);
      if (profileData.status === 'fulfilled') setProfile(profileData.value);
      if (statsData.status === 'fulfilled') setStats(statsData.value);
      if (historyData.status === 'fulfilled') setScanHistory(historyData.value.scans || []);
      if (ticketData.status === 'fulfilled') setTickets(ticketData.value.tickets || []);
      if (chatData.status === 'fulfilled') setChatCount((chatData.value.messages || []).length);
      if (badgeData.status === 'fulfilled') setBadges(badgeData.value);
    } catch (err) {
      console.error('Profile load error:', err);
    }
    setLoadingData(false);
  }

  const displayProfile = profile || user;
  const prefs = displayProfile?.preferences || userPreferences || {};
  const initials = (displayProfile?.name || 'U').split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  const memberSince = displayProfile?.created_at
    ? new Date(displayProfile.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
    : 'Recently joined';

  function openEditModal() {
    setEditName(displayProfile?.name || '');
    setEditCompany(displayProfile?.company || '');
    setEditError('');
    setEditSuccess(false);
    setShowEditModal(true);
  }

  async function handleSaveProfile() {
    if (!editName.trim()) {
      setEditError('Name cannot be empty');
      return;
    }
    setEditSaving(true);
    setEditError('');
    try {
      const result = await updateUserProfile(user.id, editName.trim(), editCompany.trim());
      if (result.success) {
        setProfile(prev => ({ ...prev, name: result.user.name, company: result.user.company }));
        if (onUserUpdate) {
          onUserUpdate({ name: result.user.name, company: result.user.company });
        }
        setEditSuccess(true);
        setTimeout(() => {
          setShowEditModal(false);
          setEditSuccess(false);
        }, 1200);
      }
    } catch (err) {
      setEditError(err.response?.data?.detail || 'Failed to update profile');
    }
    setEditSaving(false);
  }

  const tabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'badges', label: `Badges (${badges.total_earned}/${badges.total})` },
    { id: 'scans', label: 'Scan History' },
    { id: 'tickets', label: 'Tickets' },
    { id: 'preferences', label: 'Preferences' },
  ];

  const severityColors = {
    CRITICAL: { bg: 'rgba(255,71,87,0.12)', color: '#ff4757' },
    HIGH: { bg: 'rgba(255,165,2,0.12)', color: '#ffa502' },
    MEDIUM: { bg: 'rgba(30,144,255,0.12)', color: '#1e90ff' },
    INFO: { bg: 'rgba(162,155,254,0.1)', color: '#a29bfe' },
    PASS: { bg: 'rgba(0,184,148,0.1)', color: '#00b894' },
  };

  return (
    <div style={{
      flex: 1, padding: '24px 32px', overflowY: 'auto',
      opacity: mounted ? 1 : 0, transform: mounted ? 'translateY(0)' : 'translateY(12px)',
      transition: 'opacity 0.4s ease, transform 0.4s ease',
    }}>
      {/* ── Profile Header ── */}
      <div style={{
        background: C.bgCard, border: `1px solid ${C.border}`, borderRadius: 16,
        padding: 0, overflow: 'hidden', marginBottom: 24,
      }}>
        {/* Banner gradient — top stripe only */}
        <div style={{
          height: 90, position: 'relative', flexShrink: 0,
          background: 'linear-gradient(135deg, rgba(108,92,231,0.35) 0%, rgba(232,67,147,0.22) 50%, rgba(0,206,201,0.18) 100%)',
        }}>
          {/* Grid overlay */}
          <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0.1 }}>
            <defs>
              <pattern id="profileGrid" width="28" height="28" patternUnits="userSpaceOnUse">
                <path d="M 28 0 L 0 0 0 28" fill="none" stroke="#fff" strokeWidth="0.5"/>
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#profileGrid)" />
          </svg>
          {/* Floating orbs */}
          <div style={{
            position: 'absolute', top: 14, right: 80, width: 55, height: 55,
            borderRadius: '50%', background: 'rgba(108,92,231,0.2)', filter: 'blur(18px)',
          }} />
          <div style={{
            position: 'absolute', bottom: 6, left: 200, width: 36, height: 36,
            borderRadius: '50%', background: 'rgba(232,67,147,0.18)', filter: 'blur(14px)',
          }} />
        </div>

        {/* Profile info section — starts below the banner */}
        <div style={{ padding: '20px 28px 24px' }}>
          <div style={{ ...flex('row', 'flex-start', 'space-between', 16), marginBottom: 20 }}>
            {/* Avatar + name */}
            <div style={{ ...flex('row', 'center', 'flex-start', 16) }}>
              <div style={{
                width: 80, height: 80, borderRadius: 18, flexShrink: 0,
                background: 'linear-gradient(135deg, #6c5ce7, #e84393)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#fff', fontSize: 26, fontWeight: 800, letterSpacing: '-0.5px',
                border: `3px solid ${C.bgCard}`,
                boxShadow: '0 6px 24px rgba(108,92,231,0.3)',
              }}>
                {initials}
              </div>
              <div>
                <h1 style={{ margin: '0 0 2px', color: C.textPrimary, fontSize: 22, fontWeight: 700 }}>
                  {displayProfile?.name || 'User'}
                </h1>
                <div style={{ ...flex('row', 'center', 'flex-start', 12), flexWrap: 'wrap' }}>
                  <span style={{ ...flex('row', 'center', 'flex-start', 5), color: C.textSecondary, fontSize: 12 }}>
                    <Icons.Mail /> {displayProfile?.email}
                  </span>
                  {displayProfile?.company && (
                    <span style={{ ...flex('row', 'center', 'flex-start', 5), color: C.textSecondary, fontSize: 12 }}>
                      <Icons.Building /> {displayProfile.company}
                    </span>
                  )}
                  <span style={{ ...flex('row', 'center', 'flex-start', 5), color: C.textMuted, fontSize: 12 }}>
                    <Icons.Calendar /> Joined {memberSince}
                  </span>
                </div>
              </div>
            </div>

            {/* Action buttons */}
            <div style={{ ...flex('row', 'center', 'flex-end', 8), flexShrink: 0 }}>
              <button
                onClick={openEditModal}
                style={{
                  ...flex('row', 'center', 'center', 6),
                  padding: '8px 16px', borderRadius: 8,
                  background: C.accentSoft, border: `1px solid rgba(108,92,231,0.2)`,
                  color: C.accent, fontSize: 12, fontWeight: 600, cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
              >
                <Icons.Edit /> Edit Profile
              </button>
              <button
                onClick={onLogout}
                style={{
                  ...flex('row', 'center', 'center', 6),
                  padding: '8px 16px', borderRadius: 8,
                  background: 'rgba(214,48,49,0.08)', border: '1px solid rgba(214,48,49,0.15)',
                  color: '#d63031', fontSize: 12, fontWeight: 600, cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
              >
                <Icons.LogOut /> Log Out
              </button>
            </div>
          </div>

          {/* Security Level Badge */}
          <div style={{
            ...flex('row', 'center', 'flex-start', 12), flexWrap: 'wrap',
          }}>
            <div style={{
              ...flex('row', 'center', 'flex-start', 6),
              padding: '5px 12px', borderRadius: 20,
              background: 'linear-gradient(135deg, rgba(108,92,231,0.12), rgba(232,67,147,0.08))',
              border: '1px solid rgba(108,92,231,0.2)',
            }}>
              <Icons.Shield />
              <span style={{ color: C.accent, fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                Security Sentinel
              </span>
            </div>
            <div style={{
              ...flex('row', 'center', 'flex-start', 6),
              padding: '5px 12px', borderRadius: 20,
              background: C.greenSoft, border: '1px solid rgba(0,184,148,0.2)',
            }}>
              <Icons.Check />
              <span style={{ color: C.green, fontSize: 11, fontWeight: 600 }}>Account Verified</span>
            </div>
            {stats?.total_scans > 0 && (
              <div style={{
                ...flex('row', 'center', 'flex-start', 6),
                padding: '5px 12px', borderRadius: 20,
                background: C.amberSoft, border: '1px solid rgba(253,203,110,0.2)',
              }}>
                <Icons.Activity />
                <span style={{ color: C.amber, fontSize: 11, fontWeight: 600 }}>{stats.total_scans} Scans Completed</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Tabs ── */}
      <div style={{
        ...flex('row', 'center', 'flex-start', 0),
        background: C.bgCard, border: `1px solid ${C.border}`,
        borderRadius: 10, padding: 4, marginBottom: 24,
      }}>
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              padding: '8px 20px', borderRadius: 7,
              background: activeTab === tab.id ? C.bg : 'transparent',
              border: activeTab === tab.id ? `1px solid ${C.border}` : '1px solid transparent',
              color: activeTab === tab.id ? C.textPrimary : C.textMuted,
              fontSize: 13, fontWeight: activeTab === tab.id ? 600 : 400,
              cursor: 'pointer', transition: 'all 0.2s',
              boxShadow: activeTab === tab.id ? '0 2px 8px rgba(0,0,0,0.15)' : 'none',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── Loading State ── */}
      {loadingData && (
        <div style={{
          ...flex('row', 'center', 'center', 10),
          padding: 40, color: C.textSecondary, fontSize: 13,
        }}>
          <span style={{ animation: 'spin 0.8s linear infinite', display: 'inline-block', fontSize: 18 }}>⟳</span>
          Loading profile data...
        </div>
      )}

      {/* ── Overview Tab ── */}
      {!loadingData && activeTab === 'overview' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Stats cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
            <StatCard icon={<Icons.Shield />} label="Total Scans" value={stats?.total_scans || 0}
              color="#6c5ce7" bgColor="rgba(108,92,231,0.12)" sub="Security assessments" />
            <StatCard icon={<Icons.TrendUp />} label="Avg Score" value={stats?.avg_score || 0}
              color="#00b894" bgColor="rgba(0,184,148,0.12)" sub="Across all scans" />
            <StatCard icon={<Icons.Award />} label="Badges Earned" value={badges.total_earned || 0}
              color="#fdcb6e" bgColor="rgba(253,203,110,0.12)" sub={`of ${badges.total} total`} />
            <StatCard icon={<Icons.AlertCircle />} label="Critical Issues" value={stats?.critical_total || 0}
              color="#d63031" bgColor="rgba(214,48,49,0.12)" sub="Needs attention" />
          </div>

          {/* Two columns */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            {/* Latest Score */}
            <div style={{
              background: C.bgCard, border: `1px solid ${C.border}`, borderRadius: 12,
              padding: 24, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16,
            }}>
              <div style={{ color: C.textSecondary, fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                Latest Security Score
              </div>
              <ScoreRing score={stats?.latest_score || 0} />
              <div style={{
                ...flex('row', 'center', 'center', 8),
                padding: '6px 14px', borderRadius: 20,
                background: C.accentSoft, border: '1px solid rgba(108,92,231,0.15)',
              }}>
                <Icons.TrendUp />
                <span style={{ color: C.accent, fontSize: 11, fontWeight: 600 }}>
                  {stats?.latest_score >= (stats?.avg_score || 0) ? 'Above Average' : 'Below Average'}
                </span>
              </div>
            </div>

            {/* Activity Summary */}
            <div style={{
              background: C.bgCard, border: `1px solid ${C.border}`, borderRadius: 12, padding: 24,
            }}>
              <div style={{ color: C.textSecondary, fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 16 }}>
                Activity Summary
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {[
                  { icon: <Icons.Shield />, label: 'Security Scans', value: stats?.total_scans || 0, color: C.accent, bg: C.accentSoft },
                  { icon: <Icons.Ticket />, label: 'Support Tickets', value: tickets.length, color: C.pink, bg: C.pinkSoft },
                  { icon: <Icons.Chat />, label: 'Chat Messages', value: chatCount, color: C.cyan, bg: C.cyanSoft },
                  { icon: <Icons.AlertCircle />, label: 'High Risk Findings', value: stats?.high_total || 0, color: C.amber, bg: C.amberSoft },
                ].map((item, i) => (
                  <div key={i} style={{
                    ...flex('row', 'center', 'space-between', 0),
                    padding: '10px 14px', borderRadius: 8, background: C.bg,
                    border: `1px solid ${C.border}`,
                  }}>
                    <div style={{ ...flex('row', 'center', 'flex-start', 10) }}>
                      <div style={{
                        width: 28, height: 28, borderRadius: 7, background: item.bg,
                        color: item.color, display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}>
                        {item.icon}
                      </div>
                      <span style={{ color: C.textPrimary, fontSize: 13 }}>{item.label}</span>
                    </div>
                    <span style={{ color: C.textPrimary, fontSize: 16, fontWeight: 700 }}>{item.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Score Trend */}
          {stats?.score_trend?.length > 0 && (
            <div style={{
              background: C.bgCard, border: `1px solid ${C.border}`, borderRadius: 12, padding: 24,
            }}>
              <div style={{ color: C.textSecondary, fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 16 }}>
                Score Trend
              </div>
              <div style={{ ...flex('row', 'flex-end', 'flex-start', 0), height: 100, position: 'relative' }}>
                {/* Y-axis labels */}
                <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', height: '100%', marginRight: 8, paddingBottom: 20 }}>
                  {[100, 50, 0].map(v => (
                    <span key={v} style={{ color: C.textMuted, fontSize: 9 }}>{v}</span>
                  ))}
                </div>
                {/* Bars */}
                <div style={{ flex: 1, display: 'flex', alignItems: 'flex-end', gap: 6, height: '100%', paddingBottom: 20, borderLeft: `1px solid ${C.border}` }}>
                  {stats.score_trend.map((point, i) => {
                    const color = point.score >= 75 ? '#00b894' : point.score >= 50 ? '#fdcb6e' : '#d63031';
                    return (
                      <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, height: '100%', justifyContent: 'flex-end' }}>
                        <span style={{ fontSize: 9, color, fontWeight: 700 }}>{point.score}</span>
                        <div style={{
                          width: '100%', maxWidth: 36,
                          height: `${Math.max(4, point.score)}%`,
                          background: `linear-gradient(to top, ${color}, ${color}88)`,
                          borderRadius: '4px 4px 0 0',
                          transition: 'height 0.5s ease',
                        }} />
                        <span style={{ fontSize: 8, color: C.textMuted, whiteSpace: 'nowrap' }}>{point.date}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Scan History Tab ── */}
      {!loadingData && activeTab === 'scans' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {scanHistory.length === 0 ? (
            <div style={{
              background: C.bgCard, border: `1px solid ${C.border}`, borderRadius: 12,
              padding: 40, textAlign: 'center',
            }}>
              <div style={{ color: C.textMuted, fontSize: 40, marginBottom: 12 }}>🔍</div>
              <div style={{ color: C.textPrimary, fontSize: 16, fontWeight: 600, marginBottom: 6 }}>No scans yet</div>
              <div style={{ color: C.textSecondary, fontSize: 13, marginBottom: 16 }}>Run your first security scan to see results here.</div>
              <button
                onClick={() => setPage('scans')}
                style={{
                  padding: '10px 24px', borderRadius: 8,
                  background: C.accent, border: 'none', color: '#fff',
                  fontSize: 13, fontWeight: 600, cursor: 'pointer',
                }}
              >
                Start Scanning
              </button>
            </div>
          ) : (
            scanHistory.map((scan, i) => {
              const gradeColors = { A: '#00b894', B: '#00cec9', C: '#fdcb6e', D: '#e17055', F: '#d63031' };
              const scanDate = scan.date ? new Date(scan.date).toLocaleDateString('en-US', {
                year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
              }) : 'Unknown date';

              return (
                <div key={scan.id || i} style={{
                  background: C.bgCard, border: `1px solid ${C.border}`, borderRadius: 12,
                  padding: 18, transition: 'all 0.2s',
                }}>
                  <div style={{ ...flex('row', 'center', 'space-between', 0), marginBottom: 12 }}>
                    <div style={{ ...flex('row', 'center', 'flex-start', 12) }}>
                      <GradeBadge grade={scan.grade || 'F'} />
                      <div>
                        <div style={{ color: C.textPrimary, fontSize: 14, fontWeight: 600 }}>
                          Score: {scan.score}/100
                        </div>
                        <div style={{ ...flex('row', 'center', 'flex-start', 8), color: C.textMuted, fontSize: 11, marginTop: 2 }}>
                          <span style={{ ...flex('row', 'center', 'flex-start', 4) }}><Icons.Clock /> {scanDate}</span>
                          {scan.website_url && (
                            <span style={{ ...flex('row', 'center', 'flex-start', 4) }}>
                              <Icons.Globe /> {scan.website_url.replace(/^https?:\/\//, '').slice(0, 30)}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div style={{
                      fontSize: 28, fontWeight: 800, lineHeight: 1,
                      color: gradeColors[scan.grade] || '#d63031',
                    }}>
                      {scan.grade}
                    </div>
                  </div>
                  {/* Finding counts */}
                  <div style={{ ...flex('row', 'center', 'flex-start', 8), flexWrap: 'wrap' }}>
                    {scan.critical > 0 && (
                      <span style={{ padding: '3px 10px', borderRadius: 4, background: severityColors.CRITICAL.bg, color: severityColors.CRITICAL.color, fontSize: 10, fontWeight: 700 }}>
                        {scan.critical} Critical
                      </span>
                    )}
                    {scan.high > 0 && (
                      <span style={{ padding: '3px 10px', borderRadius: 4, background: severityColors.HIGH.bg, color: severityColors.HIGH.color, fontSize: 10, fontWeight: 700 }}>
                        {scan.high} High
                      </span>
                    )}
                    {scan.medium > 0 && (
                      <span style={{ padding: '3px 10px', borderRadius: 4, background: severityColors.MEDIUM.bg, color: severityColors.MEDIUM.color, fontSize: 10, fontWeight: 700 }}>
                        {scan.medium} Medium
                      </span>
                    )}
                    <span style={{ color: C.textMuted, fontSize: 11 }}>
                      {scan.findings_count || 0} total findings
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* ── Tickets Tab ── */}
      {!loadingData && activeTab === 'tickets' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {tickets.length === 0 ? (
            <div style={{
              background: C.bgCard, border: `1px solid ${C.border}`, borderRadius: 12,
              padding: 40, textAlign: 'center',
            }}>
              <div style={{ color: C.textMuted, fontSize: 40, marginBottom: 12 }}>🎫</div>
              <div style={{ color: C.textPrimary, fontSize: 16, fontWeight: 600, marginBottom: 6 }}>No support tickets</div>
              <div style={{ color: C.textSecondary, fontSize: 13, marginBottom: 16 }}>Visit the Support page to create a ticket.</div>
              <button
                onClick={() => setPage('support')}
                style={{
                  padding: '10px 24px', borderRadius: 8,
                  background: C.accent, border: 'none', color: '#fff',
                  fontSize: 13, fontWeight: 600, cursor: 'pointer',
                }}
              >
                Go to Support
              </button>
            </div>
          ) : (
            tickets.map((ticket, i) => {
              const priorityColors = {
                critical: { bg: 'rgba(214,48,49,0.12)', color: '#d63031' },
                high: { bg: 'rgba(255,165,2,0.12)', color: '#ffa502' },
                medium: { bg: 'rgba(108,92,231,0.12)', color: '#6c5ce7' },
                low: { bg: 'rgba(0,184,148,0.12)', color: '#00b894' },
              };
              const statusColors = {
                open: { bg: 'rgba(30,144,255,0.12)', color: '#1e90ff' },
                in_progress: { bg: 'rgba(253,203,110,0.12)', color: '#fdcb6e' },
                resolved: { bg: 'rgba(0,184,148,0.12)', color: '#00b894' },
                closed: { bg: 'rgba(74,85,104,0.12)', color: '#4a5568' },
              };
              const pc = priorityColors[ticket.priority] || priorityColors.medium;
              const sc = statusColors[ticket.status] || statusColors.open;
              const ticketDate = ticket.created_at ? new Date(ticket.created_at).toLocaleDateString('en-US', {
                month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
              }) : '';

              return (
                <div key={ticket.id || i} style={{
                  background: C.bgCard, border: `1px solid ${C.border}`, borderRadius: 12,
                  padding: 18, transition: 'all 0.2s',
                }}>
                  <div style={{ ...flex('row', 'center', 'space-between', 0), marginBottom: 8 }}>
                    <div style={{ ...flex('row', 'center', 'flex-start', 10) }}>
                      <span style={{ color: C.accent, fontSize: 12, fontWeight: 700, fontFamily: 'monospace' }}>
                        {ticket.ticket_number}
                      </span>
                      <span style={{ padding: '2px 8px', borderRadius: 4, background: pc.bg, color: pc.color, fontSize: 10, fontWeight: 700, textTransform: 'uppercase' }}>
                        {ticket.priority}
                      </span>
                      <span style={{ padding: '2px 8px', borderRadius: 4, background: sc.bg, color: sc.color, fontSize: 10, fontWeight: 700, textTransform: 'uppercase' }}>
                        {ticket.status?.replace('_', ' ')}
                      </span>
                    </div>
                    <span style={{ color: C.textMuted, fontSize: 11 }}>{ticketDate}</span>
                  </div>
                  <div style={{ color: C.textPrimary, fontSize: 14, fontWeight: 500 }}>{ticket.subject}</div>
                  {ticket.description && (
                    <div style={{ color: C.textSecondary, fontSize: 12, marginTop: 4, lineHeight: 1.4 }}>
                      {ticket.description}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}

      {/* ── Badges Tab ── */}
      {!loadingData && activeTab === 'badges' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          {/* Badge Progress Bar */}
          <div style={{
            background: C.bgCard, border: `1px solid ${C.border}`, borderRadius: 12,
            padding: 24,
          }}>
            <div style={{ ...flex('row', 'center', 'space-between', 0), marginBottom: 14 }}>
              <div>
                <div style={{ color: C.textPrimary, fontSize: 16, fontWeight: 700, marginBottom: 2 }}>Badge Collection</div>
                <div style={{ color: C.textSecondary, fontSize: 12 }}>
                  {badges.total_earned} of {badges.total} badges earned — {badges.total > 0 ? Math.round((badges.total_earned / badges.total) * 100) : 0}% complete
                </div>
              </div>
              <div style={{
                padding: '6px 14px', borderRadius: 20,
                background: badges.total_earned >= 10 ? 'linear-gradient(135deg, rgba(253,203,110,0.2), rgba(232,67,147,0.15))'
                  : badges.total_earned >= 5 ? C.greenSoft : C.accentSoft,
                border: `1px solid ${badges.total_earned >= 10 ? 'rgba(253,203,110,0.3)' : badges.total_earned >= 5 ? 'rgba(0,184,148,0.2)' : 'rgba(108,92,231,0.2)'}`,
                color: badges.total_earned >= 10 ? '#fdcb6e' : badges.total_earned >= 5 ? C.green : C.accent,
                fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em',
              }}>
                {badges.total_earned >= 10 ? '👑 Legend' : badges.total_earned >= 5 ? '🔥 Expert' : badges.total_earned >= 1 ? '⭐ Starter' : '🔒 Newcomer'}
              </div>
            </div>
            {/* Progress bar */}
            <div style={{
              height: 8, borderRadius: 4, background: C.bg, overflow: 'hidden',
              border: `1px solid ${C.border}`,
            }}>
              <div style={{
                height: '100%', borderRadius: 4,
                width: `${badges.total > 0 ? (badges.total_earned / badges.total) * 100 : 0}%`,
                background: 'linear-gradient(90deg, #6c5ce7, #e84393, #fdcb6e)',
                transition: 'width 1s ease',
              }} />
            </div>
          </div>

          {/* Earned Badges */}
          {badges.earned.length > 0 && (
            <div>
              <div style={{
                color: C.textSecondary, fontSize: 11, fontWeight: 700,
                textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 14,
                ...flex('row', 'center', 'flex-start', 8),
              }}>
                <Icons.Award /> Earned Badges
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 12 }}>
                {badges.earned.map((badge) => {
                  const earnedDate = badge.earned_at
                    ? new Date(badge.earned_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                    : '';
                  return (
                    <div
                      key={badge.slug}
                      style={{
                        background: C.bgCard, borderRadius: 14, padding: 20, position: 'relative',
                        overflow: 'hidden', cursor: 'default',
                        border: `1px solid ${badge.color}33`,
                        boxShadow: `0 4px 20px ${badge.color}15`,
                        transition: 'all 0.3s ease',
                      }}
                      onMouseEnter={e => {
                        e.currentTarget.style.transform = 'translateY(-3px)';
                        e.currentTarget.style.boxShadow = `0 8px 32px ${badge.color}25`;
                        e.currentTarget.style.borderColor = `${badge.color}55`;
                      }}
                      onMouseLeave={e => {
                        e.currentTarget.style.transform = 'translateY(0)';
                        e.currentTarget.style.boxShadow = `0 4px 20px ${badge.color}15`;
                        e.currentTarget.style.borderColor = `${badge.color}33`;
                      }}
                    >
                      {/* Glow orb */}
                      <div style={{
                        position: 'absolute', top: -15, right: -15, width: 70, height: 70,
                        borderRadius: '50%', background: badge.color, opacity: 0.08, filter: 'blur(20px)',
                      }} />
                      {/* Shimmer bar */}
                      <div style={{
                        position: 'absolute', top: 0, left: 0, right: 0, height: 3,
                        background: `linear-gradient(90deg, transparent, ${badge.color}66, transparent)`,
                      }} />
                      <div style={{ ...flex('row', 'flex-start', 'flex-start', 14), position: 'relative' }}>
                        <div style={{
                          width: 48, height: 48, borderRadius: 12, flexShrink: 0,
                          background: `${badge.color}18`,
                          border: `1px solid ${badge.color}30`,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: 24,
                        }}>
                          {badge.icon}
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ color: C.textPrimary, fontSize: 14, fontWeight: 700, marginBottom: 3 }}>
                            {badge.name}
                          </div>
                          <div style={{ color: C.textSecondary, fontSize: 11, lineHeight: 1.4, marginBottom: 6 }}>
                            {badge.description}
                          </div>
                          <div style={{ ...flex('row', 'center', 'flex-start', 8) }}>
                            <span style={{
                              padding: '2px 8px', borderRadius: 4,
                              background: `${badge.color}15`, color: badge.color,
                              fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em',
                            }}>
                              {badge.category}
                            </span>
                            {earnedDate && (
                              <span style={{ color: C.textMuted, fontSize: 10, ...flex('row', 'center', 'flex-start', 4) }}>
                                <Icons.Clock /> {earnedDate}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Locked Badges */}
          {badges.locked.length > 0 && (
            <div>
              <div style={{
                color: C.textMuted, fontSize: 11, fontWeight: 700,
                textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 14,
                ...flex('row', 'center', 'flex-start', 8),
              }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                </svg>
                Locked — Keep scanning to unlock!
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 12 }}>
                {badges.locked.map((badge) => (
                  <div
                    key={badge.slug}
                    style={{
                      background: C.bgCard, borderRadius: 14, padding: 20, position: 'relative',
                      overflow: 'hidden', opacity: 0.55,
                      border: `1px solid ${C.border}`,
                      transition: 'all 0.3s ease',
                    }}
                    onMouseEnter={e => {
                      e.currentTarget.style.opacity = '0.8';
                      e.currentTarget.style.transform = 'translateY(-2px)';
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.opacity = '0.55';
                      e.currentTarget.style.transform = 'translateY(0)';
                    }}
                  >
                    {/* Lock overlay */}
                    <div style={{
                      position: 'absolute', top: 12, right: 12, zIndex: 2,
                      width: 22, height: 22, borderRadius: 6,
                      background: 'rgba(0,0,0,0.3)', backdropFilter: 'blur(4px)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                      </svg>
                    </div>
                    <div style={{ ...flex('row', 'flex-start', 'flex-start', 14), position: 'relative' }}>
                      <div style={{
                        width: 48, height: 48, borderRadius: 12, flexShrink: 0,
                        background: C.bg, border: `1px solid ${C.border}`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 24, filter: 'grayscale(100%)',
                      }}>
                        {badge.icon}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ color: C.textSecondary, fontSize: 14, fontWeight: 700, marginBottom: 3 }}>
                          {badge.name}
                        </div>
                        <div style={{ color: C.textMuted, fontSize: 11, lineHeight: 1.4, marginBottom: 6 }}>
                          {badge.description}
                        </div>
                        <span style={{
                          padding: '2px 8px', borderRadius: 4,
                          background: C.bg, color: C.textMuted,
                          fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em',
                          border: `1px solid ${C.border}`,
                        }}>
                          {badge.category}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Empty state */}
          {badges.total === 0 && (
            <div style={{
              background: C.bgCard, border: `1px solid ${C.border}`, borderRadius: 12,
              padding: 40, textAlign: 'center',
            }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>🏆</div>
              <div style={{ color: C.textPrimary, fontSize: 16, fontWeight: 600, marginBottom: 6 }}>No badges available yet</div>
              <div style={{ color: C.textSecondary, fontSize: 13 }}>Run security scans and fix issues to start earning badges!</div>
            </div>
          )}
        </div>
      )}

      {/* ── Preferences Tab ── */}
      {!loadingData && activeTab === 'preferences' && (
        <div style={{
          background: C.bgCard, border: `1px solid ${C.border}`, borderRadius: 12, padding: 24,
        }}>
          <div style={{ ...flex('row', 'center', 'space-between', 0), marginBottom: 20 }}>
            <div>
              <div style={{ color: C.textPrimary, fontSize: 16, fontWeight: 600, marginBottom: 2 }}>Security Preferences</div>
              <div style={{ color: C.textSecondary, fontSize: 12 }}>Your responses from the onboarding questionnaire</div>
            </div>
            <button
              onClick={() => {
                sessionStorage.removeItem('securepulse_prefs');
                window.location.reload();
              }}
              style={{
                ...flex('row', 'center', 'center', 6),
                padding: '8px 16px', borderRadius: 8,
                background: C.accentSoft, border: '1px solid rgba(108,92,231,0.2)',
                color: C.accent, fontSize: 12, fontWeight: 600, cursor: 'pointer',
              }}
            >
              <Icons.Edit /> Retake Questionnaire
            </button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
            <PrefTag label="Project Type" value={prefs.project_type} />
            <PrefTag label="Security Concern" value={prefs.security_concern} />
            <PrefTag label="Experience Level" value={prefs.experience_level} />
            <PrefTag label="Detail Level" value={prefs.detail_level} />
            <PrefTag label="Deployment Env" value={prefs.deployment_env} />
          </div>
          {!prefs.project_type && !prefs.security_concern && (
            <div style={{
              marginTop: 16, padding: '14px 18px', borderRadius: 8,
              background: C.amberSoft, border: '1px solid rgba(253,203,110,0.2)',
              color: C.amber, fontSize: 12,
              ...flex('row', 'center', 'flex-start', 8),
            }}>
              <Icons.AlertCircle /> No preferences saved yet. Complete the questionnaire for personalized recommendations.
            </div>
          )}
        </div>
      )}

      {/* ── Edit Profile Modal ── */}
      {showEditModal && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 1000,
          background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}
          onClick={(e) => { if (e.target === e.currentTarget) setShowEditModal(false); }}
        >
          <div style={{
            width: '100%', maxWidth: 440,
            background: C.bgCard, border: `1px solid ${C.border}`,
            borderRadius: 16, padding: 0, overflow: 'hidden',
            boxShadow: '0 24px 64px rgba(0,0,0,0.5)',
            animation: 'modalIn 0.25s ease',
          }}>
            {/* Modal Header */}
            <div style={{
              padding: '18px 24px', borderBottom: `1px solid ${C.border}`,
              ...flex('row', 'center', 'space-between', 0),
            }}>
              <div style={{ ...flex('row', 'center', 'flex-start', 10) }}>
                <div style={{
                  width: 32, height: 32, borderRadius: 8,
                  background: 'linear-gradient(135deg, rgba(108,92,231,0.15), rgba(232,67,147,0.1))',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: C.accent,
                }}>
                  <Icons.Edit />
                </div>
                <span style={{ color: C.textPrimary, fontSize: 16, fontWeight: 600 }}>Edit Profile</span>
              </div>
              <button
                onClick={() => setShowEditModal(false)}
                style={{
                  background: 'none', border: 'none', color: C.textMuted,
                  cursor: 'pointer', padding: 4, display: 'flex',
                  transition: 'color 0.15s',
                }}
                onMouseEnter={e => e.currentTarget.style.color = C.textPrimary}
                onMouseLeave={e => e.currentTarget.style.color = C.textMuted}
              >
                <Icons.X />
              </button>
            </div>

            {/* Modal Body */}
            <div style={{ padding: 24 }}>
              {/* Avatar preview */}
              <div style={{ ...flex('row', 'center', 'flex-start', 16), marginBottom: 24 }}>
                <div style={{
                  width: 56, height: 56, borderRadius: 14, flexShrink: 0,
                  background: 'linear-gradient(135deg, #6c5ce7, #e84393)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: '#fff', fontSize: 20, fontWeight: 800,
                  boxShadow: '0 4px 16px rgba(108,92,231,0.3)',
                }}>
                  {(editName || 'U').split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                </div>
                <div>
                  <div style={{ color: C.textPrimary, fontSize: 14, fontWeight: 600 }}>
                    {editName || 'Your Name'}
                  </div>
                  <div style={{ color: C.textSecondary, fontSize: 12 }}>
                    {displayProfile?.email}
                  </div>
                </div>
              </div>

              {/* Name field */}
              <div style={{ marginBottom: 18 }}>
                <label style={{
                  display: 'block', color: C.textSecondary, fontSize: 11,
                  fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase',
                  marginBottom: 7,
                }}>
                  Full Name
                </label>
                <div style={{
                  ...flex('row', 'center', 'flex-start', 8),
                  background: C.bg, border: `1px solid ${C.border}`,
                  borderRadius: 8, padding: '0 12px',
                  transition: 'border-color 0.2s',
                }}>
                  <span style={{ color: C.textMuted, flexShrink: 0 }}><Icons.User /></span>
                  <input
                    value={editName}
                    onChange={e => setEditName(e.target.value)}
                    placeholder="Enter your full name"
                    autoFocus
                    style={{
                      flex: 1, background: 'transparent', border: 'none', outline: 'none',
                      color: C.textPrimary, fontSize: 13, padding: '11px 0',
                      fontFamily: 'inherit',
                    }}
                  />
                </div>
              </div>

              {/* Company field */}
              <div style={{ marginBottom: 18 }}>
                <label style={{
                  display: 'block', color: C.textSecondary, fontSize: 11,
                  fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase',
                  marginBottom: 7,
                }}>
                  Company / Organization
                </label>
                <div style={{
                  ...flex('row', 'center', 'flex-start', 8),
                  background: C.bg, border: `1px solid ${C.border}`,
                  borderRadius: 8, padding: '0 12px',
                }}>
                  <span style={{ color: C.textMuted, flexShrink: 0 }}><Icons.Building /></span>
                  <input
                    value={editCompany}
                    onChange={e => setEditCompany(e.target.value)}
                    placeholder="Enter your company (optional)"
                    style={{
                      flex: 1, background: 'transparent', border: 'none', outline: 'none',
                      color: C.textPrimary, fontSize: 13, padding: '11px 0',
                      fontFamily: 'inherit',
                    }}
                  />
                </div>
              </div>

              {/* Email (read-only) */}
              <div style={{ marginBottom: 20 }}>
                <label style={{
                  display: 'block', color: C.textSecondary, fontSize: 11,
                  fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase',
                  marginBottom: 7,
                }}>
                  Email Address
                </label>
                <div style={{
                  ...flex('row', 'center', 'flex-start', 8),
                  background: C.bg, border: `1px solid ${C.border}`,
                  borderRadius: 8, padding: '0 12px', opacity: 0.6,
                }}>
                  <span style={{ color: C.textMuted, flexShrink: 0 }}><Icons.Mail /></span>
                  <input
                    value={displayProfile?.email || ''}
                    disabled
                    style={{
                      flex: 1, background: 'transparent', border: 'none', outline: 'none',
                      color: C.textSecondary, fontSize: 13, padding: '11px 0',
                      fontFamily: 'inherit', cursor: 'not-allowed',
                    }}
                  />
                </div>
                <div style={{ color: C.textMuted, fontSize: 10, marginTop: 4 }}>Email cannot be changed</div>
              </div>

              {/* Error message */}
              {editError && (
                <div style={{
                  padding: '10px 14px', borderRadius: 8, marginBottom: 16,
                  background: 'rgba(214,48,49,0.1)', border: '1px solid rgba(214,48,49,0.2)',
                  color: '#d63031', fontSize: 12,
                  ...flex('row', 'center', 'flex-start', 8),
                }}>
                  <Icons.AlertCircle /> {editError}
                </div>
              )}

              {/* Success message */}
              {editSuccess && (
                <div style={{
                  padding: '10px 14px', borderRadius: 8, marginBottom: 16,
                  background: 'rgba(0,184,148,0.1)', border: '1px solid rgba(0,184,148,0.2)',
                  color: '#00b894', fontSize: 12,
                  ...flex('row', 'center', 'flex-start', 8),
                }}>
                  <Icons.Check /> Profile updated successfully!
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div style={{
              padding: '16px 24px', borderTop: `1px solid ${C.border}`,
              ...flex('row', 'center', 'flex-end', 10),
            }}>
              <button
                onClick={() => setShowEditModal(false)}
                style={{
                  padding: '9px 20px', borderRadius: 8,
                  background: 'transparent', border: `1px solid ${C.border}`,
                  color: C.textSecondary, fontSize: 13, fontWeight: 500,
                  cursor: 'pointer', transition: 'all 0.15s',
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleSaveProfile}
                disabled={editSaving || editSuccess}
                style={{
                  ...flex('row', 'center', 'center', 6),
                  padding: '9px 24px', borderRadius: 8,
                  background: editSuccess
                    ? '#00b894'
                    : editSaving
                      ? C.textMuted
                      : 'linear-gradient(135deg, #6c5ce7, #8b7cf8)',
                  border: 'none', color: '#fff', fontSize: 13, fontWeight: 600,
                  cursor: editSaving || editSuccess ? 'not-allowed' : 'pointer',
                  transition: 'all 0.2s',
                  boxShadow: editSaving || editSuccess ? 'none' : '0 4px 16px rgba(108,92,231,0.3)',
                }}
              >
                {editSaving ? (
                  <><span style={{ animation: 'spin 0.8s linear infinite', display: 'inline-block' }}>⟳</span> Saving...</>
                ) : editSuccess ? (
                  <><Icons.Check /> Saved!</>
                ) : (
                  <><Icons.Save /> Save Changes</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes modalIn {
          from { opacity: 0; transform: scale(0.95) translateY(10px); }
          to { opacity: 1; transform: scale(1) translateY(0); }
        }
        input::placeholder { color: var(--textMuted); }
      `}</style>
    </div>
  );
}
