'use client'

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/app/AuthContext';
import Header from '@/app/Header';
import Footer from '@/app/Footer';
import { getProfile, updateProfile, changePassword } from '@/lib/api';
import { parseJwt, getLocalStorage } from '@/lib/utils';
import styles from '@/public/styles/profile.module.css';

// ─── Types ────────────────────────────────────────────────────────────────────

type Tab = 'overview' | 'display-name' | 'password';

interface UserProfile {
  username: string;
  role: string | 'user';
  display_name: string | null;
  createdAt: string | null;
  lastLogin: string | null;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(raw: string | null): string {
  if (!raw) return '—';
  try {
    return new Date(raw).toLocaleDateString(undefined, {
      year: 'numeric', month: 'long', day: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
  } catch {
    return raw;
  }
}

function RoleBadge({ role }: { role: string }) {
  return (
    <span className={role === 'admin' ? styles.roleBadgeAdmin : styles.roleBadge}>
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

  // Derived from the current session's JWT
  const [currentUserIsAdmin, setCurrentUserIsAdmin] = useState(false);

  // Display-name form
  const [displayName, setDisplayName] = useState('');
  const [dnSaving, setDnSaving]       = useState(false);
  const [dnSuccess, setDnSuccess]     = useState('');
  const [dnError, setDnError]         = useState('');

  // Password form
  const [currentPw, setCurrentPassword]       = useState('');
  const [newPassword, setNewPassword]         = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [pwSaving, setPwSaving]               = useState(false);
  const [pwSuccess, setPwSuccess]             = useState('');
  const [pwError, setPwError]                 = useState('');

  // ── Auth guard ──────────────────────────────────────────────────────────────

  useEffect(() => {
    const t = setTimeout(() => {
      setAuthChecked(true);
      if (!isAuthenticated) router.push('/');
    }, 100);
    return () => clearTimeout(t);
  }, [isAuthenticated, router]);

  // Read the current user's role from their own session token
  useEffect(() => {
    if (!isAuthenticated) return;
    const token = getLocalStorage('token');
    if (token) {
      const payload = parseJwt(token);
      setCurrentUserIsAdmin(payload.role === 'admin');
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (!authChecked || !isAuthenticated) return;
    loadProfile();
  }, [authChecked, isAuthenticated]);

  // ── Load profile ────────────────────────────────────────────────────────────

  const loadProfile = async () => {
    try {
      const params = new URLSearchParams(window.location.search);
      const profileUsername = params.get('username');

      if (!profileUsername) return;

      const response = await getProfile(profileUsername!);

      if (!response.ok)
        throw new Error('Failed to load profile');

      const data = await response.json();
      setProfile(data.user);
      setDisplayName(data.user.display_name ?? '');
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  // ── Save display name ────────────────────────────────────────────────────────

  const handleSaveDisplayName = async () => {
    return;
    /*
    setDnError(''); setDnSuccess('');
    if (displayName.length > 30) {
      setDnError('Display name must be 30 characters or fewer.');
      return;
    }
    setDnSaving(true);
    try {
      const res = await updateProfile();
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Update failed');
      setProfile(p => p ? { ...p, display_name: displayName || null } : p);
      setDnSuccess('Display name updated.');
    } catch (e) {
      setDnError(e instanceof Error ? e.message : 'Update failed');
    } finally {
      setDnSaving(false);
    }*/
  };

  // ── Change password ──────────────────────────────────────────────────────────

  const handleChangePassword = async () => {
    setPwError(''); setPwSuccess('');
    if (!currentPw || !newPassword || !confirmPassword) {
      setPwError('All three fields are required.'); return;
    }
    if (newPassword !== confirmPassword) {
      setPwError('New password and confirmation do not match.'); return;
    }
    if (newPassword.length < 6) {
      setPwError('New password must be at least 6 characters.'); return;
    }
    setPwSaving(true);
    try {
      const res = await changePassword(username, currentPw, newPassword);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Password change failed');
      setPwSuccess('Password changed successfully.');
      setCurrentPassword(''); setNewPassword(''); setConfirmPassword('');
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
        <div className={styles.loadingCenter}>
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

  const pwMismatch = !!confirmPassword && newPassword !== confirmPassword;

  return (
    <>
      <Header isAuthenticated={isAuthenticated} username={username} onAuthChange={checkAuthStatus} />

      <div className={styles.page}>

        {/* ── Left panel ──────────────────────────────────────────────────── */}
        <aside className={styles.sidebar}>
          <div className={styles.avatar}>
            {(profile?.display_name ?? profile?.username ?? '?')[0].toUpperCase()}
          </div>
          <div className={styles.sidebarName}>
            {profile?.display_name ?? profile?.username}
          </div>
          {currentUserIsAdmin && profile && (
            <div className={styles.roleBadgeWrapper}>
              <RoleBadge role={profile.role} />
            </div>
          )}
          <div className={styles.sidebarUsername}>@{profile?.username}</div>

          <nav className={styles.nav}>
            {tabs.map(t => (
              <button
                key={t.key}
                className={`${styles.navBtn} ${activeTab === t.key ? styles.navBtnActive : ''}`}
                onClick={() => setActiveTab(t.key)}
              >
                {t.label}
              </button>
            ))}
          </nav>
        </aside>

        {/* ── Main panel ──────────────────────────────────────────────────── */}
        <main className={styles.main}>

          {/* OVERVIEW ──────────────────────────────────────────────────────── */}
          {activeTab === 'overview' && (
            <section>
              <h2 className={styles.sectionTitle}>Account Overview</h2>
              <div className={styles.card}>
                <table className={styles.infoTable}>
                  <tbody>
                    <InfoRow label="Username"     value={profile?.username ?? '—'} />
                    <InfoRow label="Display Name" value={profile?.display_name ?? <em className={styles.notSet}>Not set</em>} />
                    <InfoRow label="Member Since" value={formatDate(profile?.createdAt ?? null)} />
                    {currentUserIsAdmin && profile && (
                      <>
                        <InfoRow label="Role"       value={<RoleBadge role={profile.role} />} />
                        <InfoRow label="Last Login" value={formatDate(profile.lastLogin ?? null)} />
                      </>
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {/* DISPLAY NAME ──────────────────────────────────────────────────── */}
          {activeTab === 'display-name' && (
            <section>
              <h2 className={styles.sectionTitle}>Display Name</h2>
              <p className={styles.description}>
                Your display name is shown instead of your username across the library.
                It can be up to 60 characters.
              </p>

              <div className={styles.card}>
                <div className={styles.fieldGroup}>
                  <label className={styles.fieldLabel}>Display Name</label>
                  <input
                    type="text"
                    className={styles.input}
                    value={displayName}
                    maxLength={60}
                    placeholder="e.g. Séamus Ó Briain"
                    onChange={e => { setDisplayName(e.target.value); setDnError(''); setDnSuccess(''); }}
                    onKeyPress={e => e.key === 'Enter' && handleSaveDisplayName()}
                  />
                  <div className={styles.charCount}>{displayName.length}/60</div>
                </div>

                {dnError   && <div className={styles.alertDanger}>{dnError}</div>}
                {dnSuccess && <div className={styles.alertSuccess}>{dnSuccess}</div>}

                <div className={styles.actions}>
                  <button
                    className={`${styles.btn} ${styles.btnPrimary}`}
                    onClick={handleSaveDisplayName}
                    disabled={dnSaving}
                  >
                    {dnSaving ? 'Saving…' : 'Save Display Name'}
                  </button>
                  {profile?.display_name && (
                    <button
                      className={`${styles.btn} ${styles.btnGhost}`}
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
              <h2 className={styles.sectionTitle}>Change Password</h2>
              <p className={styles.description}>
                Enter your current password to confirm your identity, then choose a new password
                of at least 8 characters.
              </p>

              <div className={styles.card}>
                <div className={styles.fieldGroup}>
                  <label className={styles.fieldLabel}>Current Password</label>
                  <input
                    type="password"
                    className={styles.input}
                    value={currentPw}
                    placeholder="Your current password"
                    onChange={e => { setCurrentPassword(e.target.value); setPwError(''); setPwSuccess(''); }}
                  />
                </div>

                <div className={styles.divider} />

                <div className={styles.fieldGroup}>
                  <label className={styles.fieldLabel}>New Password</label>
                  <input
                    type="password"
                    className={styles.input}
                    value={newPassword}
                    placeholder="At least 8 characters"
                    onChange={e => { setNewPassword(e.target.value); setPwError(''); setPwSuccess(''); }}
                  />
                </div>

                <div className={styles.fieldGroup}>
                  <label className={styles.fieldLabel}>Confirm New Password</label>
                  <input
                    type="password"
                    className={`${styles.input} ${pwMismatch ? styles.inputError : ''}`}
                    value={confirmPassword}
                    placeholder="Repeat new password"
                    onChange={e => { setConfirmPassword(e.target.value); setPwError(''); setPwSuccess(''); }}
                    onKeyPress={e => e.key === 'Enter' && handleChangePassword()}
                  />
                  {pwMismatch && (
                    <div className={styles.pwMismatch}>Passwords do not match</div>
                  )}
                </div>

                {newPassword && <PasswordStrength password={newPassword} />}

                {pwError   && <div className={styles.alertDanger}>{pwError}</div>}
                {pwSuccess && <div className={styles.alertSuccess}>{pwSuccess}</div>}

                <div className={styles.actions}>
                  <button
                    className={`${styles.btn} ${styles.btnPrimary}`}
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
      <th className={styles.infoTh}>{label}</th>
      <td className={styles.infoTd}>{value}</td>
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

  const labels  = ['', 'Weak', 'Fair', 'Good', 'Strong', 'Very strong'];
  const colours = ['', '#dc3545', '#fd7e14', '#ffc107', '#20c997', '#198754'];

  return (
    <div style={{ marginBottom: '1rem' }}>
      <div className={styles.strengthBars}>
        {[1, 2, 3, 4, 5].map(i => (
          // Bar color is runtime-computed (varies per score + index), so inline is correct here
          <div
            key={i}
            className={styles.strengthBar}
            style={{ background: i <= score ? colours[score] : '#e8ecf5' }}
          />
        ))}
      </div>
      <div className={styles.strengthLabel} style={{ color: colours[score] }}>
        {labels[score]}
      </div>
    </div>
  );
}