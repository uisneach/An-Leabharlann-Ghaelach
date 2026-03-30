'use client'

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/app/AuthContext';
import Header from '@/app/Header';
import Footer from '@/app/Footer';
import { getAuthHeaders, getProfile } from '@/lib/api';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || '/api';

// ─── Types ────────────────────────────────────────────────────────────────────

interface UserProfile {
  username: string;
  role: 'user' | 'admin';
  display_name: string | null;
  createdAt: string | null;
  lastLogin: string | null;
}

type Tab = 'overview' | 'display-name' | 'password';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatDate(raw: string | null): string {
  if (!raw) return '—';
  try {
    // Neo4j DateTime objects serialise as an ISO-ish string; Date handles them fine
    return new Date(raw).toLocaleDateString(undefined, {
      year: 'numeric', month: 'long', day: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
  } catch {
    return raw;
  }
}

function roleBadge(role: string) {
  const isAdmin = role === 'admin';
  return (
    <span
      style={{
        display: 'inline-block',
        padding: '0.2rem 0.65rem',
        borderRadius: '999px',
        fontSize: '0.78rem',
        fontWeight: 700,
        letterSpacing: '0.04em',
        background: isAdmin ? '#1a3a6b' : '#e8ecf5',
        color: isAdmin ? '#fff' : '#3c4f7c',
        border: isAdmin ? 'none' : '1px solid #c3cde8',
      }}
    >
      {role.toUpperCase()}
    </span>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AccountPage() {
  const router = useRouter();
  const { isAuthenticated, username, checkAuthStatus } = useAuth();

  const [profile, setProfile]         = useState<UserProfile | null>(null);
  const [loading, setLoading]         = useState(true);
  const [authChecked, setAuthChecked] = useState(false);
  const [activeTab, setActiveTab]     = useState<Tab>('overview');

  // Display-name form
  const [displayName, setDisplayName]     = useState('');
  const [dnSaving, setDnSaving]           = useState(false);
  const [dnSuccess, setDnSuccess]         = useState('');
  const [dnError, setDnError]             = useState('');

  // Password form
  const [currentPw, setCurrentPw]   = useState('');
  const [newPw, setNewPw]           = useState('');
  const [confirmPw, setConfirmPw]   = useState('');
  const [pwSaving, setPwSaving]     = useState(false);
  const [pwSuccess, setPwSuccess]   = useState('');
  const [pwError, setPwError]       = useState('');

  // ── Auth guard ──────────────────────────────────────────────────────────────
  useEffect(() => {
    const t = setTimeout(() => {
      setAuthChecked(true);
      if (!isAuthenticated) router.push('/');
    }, 100);
    return () => clearTimeout(t);
  }, [isAuthenticated, router]);

  // ── Fetch profile ───────────────────────────────────────────────────────────
  useEffect(() => {
    if (!authChecked || !isAuthenticated) return;
    (async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/auth?action=profile`, {
          headers: getAuthHeaders(),
        });
        if (!res.ok) throw new Error('Failed to load profile');
        const data = await res.json();
        setProfile(data.user);
        setDisplayName(data.user.display_name ?? '');
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    })();
  }, [authChecked, isAuthenticated]);

  // ── Save display name ────────────────────────────────────────────────────────
  const handleSaveDisplayName = async () => {
    setDnError(''); setDnSuccess('');
    if (displayName.length > 60) {
      setDnError('Display name must be 60 characters or fewer.');
      return;
    }
    setDnSaving(true);
    try {
      const res = await fetch(`${API_BASE_URL}/auth?action=update-profile`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ display_name: displayName }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Update failed');
      setProfile(p => p ? { ...p, display_name: displayName || null } : p);
      setDnSuccess('Display name updated.');
    } catch (e) {
      setDnError(e instanceof Error ? e.message : 'Update failed');
    } finally {
      setDnSaving(false);
    }
  };

  // ── Change password ──────────────────────────────────────────────────────────
  const handleChangePassword = async () => {
    setPwError(''); setPwSuccess('');
    if (!currentPw || !newPw || !confirmPw) {
      setPwError('All three fields are required.'); return;
    }
    if (newPw !== confirmPw) {
      setPwError('New password and confirmation do not match.'); return;
    }
    if (newPw.length < 8) {
      setPwError('New password must be at least 8 characters.'); return;
    }
    setPwSaving(true);
    try {
      const res = await fetch(`${API_BASE_URL}/auth?action=change-password`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ currentPassword: currentPw, newPassword: newPw }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Password change failed');
      setPwSuccess('Password changed successfully.');
      setCurrentPw(''); setNewPw(''); setConfirmPw('');
    } catch (e) {
      setPwError(e instanceof Error ? e.message : 'Password change failed');
    } finally {
      setPwSaving(false);
    }
  };

  // ── Loading / redirect states ────────────────────────────────────────────────
  if (!authChecked || loading) {
    return (
      <>
        <Header isAuthenticated={isAuthenticated} username={username} onAuthChange={checkAuthStatus} />
        <div style={{ textAlign: 'center', padding: '4rem' }}>
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Loading…</span>
          </div>
        </div>
      </>
    );
  }

  if (!isAuthenticated) return null;

  // ─────────────────────────────────────────────────────────────────────────────

  const tabs: { key: Tab; label: string }[] = [
    { key: 'overview',     label: 'Overview' },
    { key: 'display-name', label: 'Display Name' },
    { key: 'password',     label: 'Change Password' },
  ];

  return (
    <>
      <Header isAuthenticated={isAuthenticated} username={username} onAuthChange={checkAuthStatus} />

      <div style={styles.page}>
        {/* ── Left panel ──────────────────────────────────────────────────── */}
        <aside style={styles.sidebar}>
          <div style={styles.avatar}>
            {(profile?.display_name ?? profile?.username ?? '?')[0].toUpperCase()}
          </div>
          <div style={styles.sidebarName}>
            {profile?.display_name ?? profile?.username}
          </div>
          <div style={{ marginBottom: '0.4rem' }}>
            {profile && roleBadge(profile.role)}
          </div>
          <div style={styles.sidebarUsername}>@{profile?.username}</div>

          <nav style={styles.nav}>
            {tabs.map(t => (
              <button
                key={t.key}
                style={{ ...styles.navBtn, ...(activeTab === t.key ? styles.navBtnActive : {}) }}
                onClick={() => setActiveTab(t.key)}
              >
                {t.label}
              </button>
            ))}
          </nav>
        </aside>

        {/* ── Main panel ──────────────────────────────────────────────────── */}
        <main style={styles.main}>

          {/* OVERVIEW ──────────────────────────────────────────────────────── */}
          {activeTab === 'overview' && (
            <section>
              <h2 style={styles.sectionTitle}>Account Overview</h2>
              <div style={styles.card}>
                <table style={styles.infoTable}>
                  <tbody>
                    <InfoRow label="Username"     value={profile?.username ?? '—'} />
                    <InfoRow label="Display Name" value={profile?.display_name ?? <em style={{ color: '#999' }}>Not set</em>} />
                    <InfoRow label="Role"         value={profile ? roleBadge(profile.role) : '—'} />
                    <InfoRow label="Member Since" value={formatDate(profile?.createdAt ?? null)} />
                    <InfoRow label="Last Login"   value={formatDate(profile?.lastLogin ?? null)} />
                  </tbody>
                </table>
              </div>

              <p style={styles.hint}>
                Use the tabs on the left to update your display name or change your password.
              </p>
            </section>
          )}

          {/* DISPLAY NAME ──────────────────────────────────────────────────── */}
          {activeTab === 'display-name' && (
            <section>
              <h2 style={styles.sectionTitle}>Display Name</h2>
              <p style={styles.description}>
                Your display name is shown instead of your username across the library.
                It can be up to 60 characters.
              </p>

              <div style={styles.card}>
                <div style={styles.fieldGroup}>
                  <label style={styles.fieldLabel}>Display Name</label>
                  <input
                    type="text"
                    style={styles.input}
                    value={displayName}
                    maxLength={60}
                    placeholder="e.g. Séamus Ó Briain"
                    onChange={e => { setDisplayName(e.target.value); setDnError(''); setDnSuccess(''); }}
                    onKeyPress={e => e.key === 'Enter' && handleSaveDisplayName()}
                  />
                  <div style={styles.charCount}>{displayName.length}/60</div>
                </div>

                {dnError   && <div style={styles.alertDanger}>{dnError}</div>}
                {dnSuccess && <div style={styles.alertSuccess}>{dnSuccess}</div>}

                <div style={styles.actions}>
                  <button
                    style={{ ...styles.btn, ...styles.btnPrimary }}
                    onClick={handleSaveDisplayName}
                    disabled={dnSaving}
                  >
                    {dnSaving ? 'Saving…' : 'Save Display Name'}
                  </button>
                  {profile?.display_name && (
                    <button
                      style={{ ...styles.btn, ...styles.btnGhost }}
                      onClick={() => { setDisplayName(''); setDnError(''); setDnSuccess(''); }}
                      disabled={dnSaving}
                    >
                      Clear
                    </button>
                  )}
                </div>
              </div>
            </section>
          )}

          {/* CHANGE PASSWORD ────────────────────────────────────────────────── */}
          {activeTab === 'password' && (
            <section>
              <h2 style={styles.sectionTitle}>Change Password</h2>
              <p style={styles.description}>
                Enter your current password to confirm your identity, then choose a new password
                of at least 8 characters.
              </p>

              <div style={styles.card}>
                <div style={styles.fieldGroup}>
                  <label style={styles.fieldLabel}>Current Password</label>
                  <input
                    type="password"
                    style={styles.input}
                    value={currentPw}
                    placeholder="Your current password"
                    onChange={e => { setCurrentPw(e.target.value); setPwError(''); setPwSuccess(''); }}
                  />
                </div>

                <div style={{ height: '1px', background: '#e8ecf5', margin: '1.25rem 0' }} />

                <div style={styles.fieldGroup}>
                  <label style={styles.fieldLabel}>New Password</label>
                  <input
                    type="password"
                    style={styles.input}
                    value={newPw}
                    placeholder="At least 8 characters"
                    onChange={e => { setNewPw(e.target.value); setPwError(''); setPwSuccess(''); }}
                  />
                </div>

                <div style={styles.fieldGroup}>
                  <label style={styles.fieldLabel}>Confirm New Password</label>
                  <input
                    type="password"
                    style={{
                      ...styles.input,
                      borderColor: confirmPw && newPw !== confirmPw ? '#dc3545' : undefined,
                    }}
                    value={confirmPw}
                    placeholder="Repeat new password"
                    onChange={e => { setConfirmPw(e.target.value); setPwError(''); setPwSuccess(''); }}
                    onKeyPress={e => e.key === 'Enter' && handleChangePassword()}
                  />
                  {confirmPw && newPw !== confirmPw && (
                    <div style={{ color: '#dc3545', fontSize: '0.8rem', marginTop: '0.3rem' }}>
                      Passwords do not match
                    </div>
                  )}
                </div>

                {/* Strength indicator */}
                {newPw && (
                  <PasswordStrength password={newPw} />
                )}

                {pwError   && <div style={styles.alertDanger}>{pwError}</div>}
                {pwSuccess && <div style={styles.alertSuccess}>{pwSuccess}</div>}

                <div style={styles.actions}>
                  <button
                    style={{ ...styles.btn, ...styles.btnPrimary }}
                    onClick={handleChangePassword}
                    disabled={pwSaving}
                  >
                    {pwSaving ? 'Updating…' : 'Update Password'}
                  </button>
                </div>
              </div>
            </section>
          )}

        </main>
      </div>

      <Footer />
    </>
  );
}

// ─── Sub-components ────────────────────────────────────────────────────────────

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <tr>
      <th style={styles.infoTh}>{label}</th>
      <td style={styles.infoTd}>{value}</td>
    </tr>
  );
}

function PasswordStrength({ password }: { password: string }) {
  const score = [
    password.length >= 8,
    password.length >= 12,
    /[A-Z]/.test(password),
    /[0-9]/.test(password),
    /[^A-Za-z0-9]/.test(password),
  ].filter(Boolean).length;

  const labels = ['', 'Weak', 'Fair', 'Good', 'Strong', 'Very strong'];
  const colours = ['', '#dc3545', '#fd7e14', '#ffc107', '#20c997', '#198754'];

  return (
    <div style={{ marginBottom: '1rem' }}>
      <div style={{ display: 'flex', gap: '4px', marginBottom: '4px' }}>
        {[1,2,3,4,5].map(i => (
          <div key={i} style={{
            flex: 1,
            height: '4px',
            borderRadius: '2px',
            background: i <= score ? colours[score] : '#e8ecf5',
            transition: 'background 0.2s',
          }} />
        ))}
      </div>
      <div style={{ fontSize: '0.78rem', color: colours[score], fontWeight: 600 }}>
        {labels[score]}
      </div>
    </div>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────────

const styles: Record<string, React.CSSProperties> = {
  page: {
    display: 'flex',
    flexDirection: 'row',
    gap: '2rem',
    maxWidth: '960px',
    margin: '2rem auto',
    padding: '0 1rem',
    alignItems: 'flex-start',
  },
  sidebar: {
    width: '220px',
    flexShrink: 0,
    background: '#fff',
    border: '1px solid #dde3f0',
    borderRadius: '10px',
    padding: '1.75rem 1.25rem',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '0.5rem',
    boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
  },
  avatar: {
    width: '72px',
    height: '72px',
    borderRadius: '50%',
    background: 'linear-gradient(135deg, #3366cc 0%, #1a3a6b 100%)',
    color: '#fff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '2rem',
    fontWeight: 700,
    marginBottom: '0.5rem',
    fontFamily: 'Georgia, serif',
    letterSpacing: '-0.02em',
  },
  sidebarName: {
    fontWeight: 700,
    fontSize: '1rem',
    color: '#1a2a4a',
    textAlign: 'center',
    lineHeight: 1.3,
  },
  sidebarUsername: {
    fontSize: '0.82rem',
    color: '#8899bb',
    marginBottom: '1rem',
  },
  nav: {
    display: 'flex',
    flexDirection: 'column',
    width: '100%',
    gap: '2px',
  },
  navBtn: {
    width: '100%',
    textAlign: 'left',
    background: 'none',
    border: 'none',
    padding: '0.55rem 0.9rem',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '0.9rem',
    color: '#4a5a7a',
    fontFamily: 'Georgia, serif',
    transition: 'background 0.15s, color 0.15s',
  },
  navBtnActive: {
    background: '#eef1fb',
    color: '#1a3a6b',
    fontWeight: 600,
  },
  main: {
    flex: 1,
    minWidth: 0,
  },
  sectionTitle: {
    fontSize: '1.4rem',
    fontWeight: 700,
    color: '#1a2a4a',
    margin: '0 0 0.4rem',
    fontFamily: 'Georgia, serif',
  },
  description: {
    color: '#5a6a8a',
    fontSize: '0.9rem',
    margin: '0 0 1.25rem',
    lineHeight: 1.6,
  },
  card: {
    background: '#fff',
    border: '1px solid #dde3f0',
    borderRadius: '10px',
    padding: '1.5rem',
    boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
  },
  infoTable: {
    width: '100%',
    borderCollapse: 'collapse',
  },
  infoTh: {
    textAlign: 'left',
    fontWeight: 600,
    fontSize: '0.85rem',
    color: '#7a8aaa',
    padding: '0.6rem 1rem 0.6rem 0',
    width: '38%',
    verticalAlign: 'middle',
    borderBottom: '1px solid #f0f2fa',
  },
  infoTd: {
    fontSize: '0.9rem',
    color: '#1a2a4a',
    padding: '0.6rem 0',
    borderBottom: '1px solid #f0f2fa',
    verticalAlign: 'middle',
  },
  hint: {
    marginTop: '1.25rem',
    fontSize: '0.85rem',
    color: '#8899bb',
    lineHeight: 1.6,
  },
  fieldGroup: {
    marginBottom: '1.1rem',
  },
  fieldLabel: {
    display: 'block',
    fontWeight: 600,
    fontSize: '0.85rem',
    color: '#4a5a7a',
    marginBottom: '0.4rem',
  },
  input: {
    width: '100%',
    padding: '0.55rem 0.75rem',
    border: '1px solid #ccd5ea',
    borderRadius: '6px',
    fontSize: '0.95rem',
    fontFamily: 'Georgia, serif',
    color: '#1a2a4a',
    outline: 'none',
    transition: 'border-color 0.15s, box-shadow 0.15s',
    boxSizing: 'border-box',
  },
  charCount: {
    textAlign: 'right',
    fontSize: '0.75rem',
    color: '#aab5cc',
    marginTop: '0.25rem',
  },
  actions: {
    display: 'flex',
    gap: '0.75rem',
    marginTop: '1.25rem',
    flexWrap: 'wrap',
  },
  btn: {
    padding: '0.55rem 1.25rem',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontFamily: 'Georgia, serif',
    fontSize: '0.9rem',
    fontWeight: 600,
    transition: 'background 0.15s, opacity 0.15s',
  },
  btnPrimary: {
    background: '#3366cc',
    color: '#fff',
  },
  btnGhost: {
    background: 'none',
    color: '#3366cc',
    border: '1px solid #ccd5ea',
  },
  alertDanger: {
    background: '#fdf0f0',
    border: '1px solid #f5c2c7',
    color: '#842029',
    borderRadius: '6px',
    padding: '0.65rem 0.9rem',
    fontSize: '0.875rem',
    marginTop: '0.75rem',
  },
  alertSuccess: {
    background: '#f0fdf4',
    border: '1px solid #b6efc9',
    color: '#0f5132',
    borderRadius: '6px',
    padding: '0.65rem 0.9rem',
    fontSize: '0.875rem',
    marginTop: '0.75rem',
  },
};