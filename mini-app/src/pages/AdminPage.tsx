import { useState } from 'react';

const STATS = [
  { icon: '👥', label: 'Total Users', value: '12,482' },
  { icon: '🪙', label: 'Total Coins', value: '8.4M' },
  { icon: '👆', label: 'Total Taps', value: '142M' },
  { icon: '🚨', label: 'Suspicious Users', value: '23' },
];

const FLAGGED_USERS = [
  { id: 1, name: 'user_8821', reason: 'Abnormal tap rate (1200/min)', coins: '2.1M', risk: 'high' },
  { id: 2, name: 'user_3304', reason: 'Multiple accounts suspected', coins: '890K', risk: 'medium' },
  { id: 3, name: 'user_5519', reason: 'Bot-like behavior detected', coins: '1.5M', risk: 'high' },
];

const RISK_COLORS: Record<string, string> = {
  high: '#ef4444',
  medium: '#f59e0b',
  low: '#4ade80',
};

export function AdminPage() {
  const [search, setSearch] = useState('');

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--game-bg)',
      padding: '16px 16px 90px',
      color: 'var(--game-text)',
    }}>
      <h1 style={{ fontSize: 24, fontWeight: 800, textAlign: 'center', margin: '8px 0 4px' }}>
        🛡️ Admin Dashboard
      </h1>
      <p style={{ textAlign: 'center', fontSize: 12, color: 'var(--game-text-secondary)', margin: '0 0 20px' }}>
        Manage users, review fraud & send announcements
      </p>

      {/* Stats Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 24 }}>
        {STATS.map((s) => (
          <div key={s.label} style={{
            background: 'var(--game-card)',
            borderRadius: 14,
            padding: '14px 12px',
            textAlign: 'center',
          }}>
            <div style={{ fontSize: 28 }}>{s.icon}</div>
            <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--game-gold-light)', marginTop: 4 }}>{s.value}</div>
            <div style={{ fontSize: 11, color: 'var(--game-text-secondary)', marginTop: 2 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* User Search */}
      <h3 style={{ fontSize: 15, fontWeight: 700, margin: '0 0 10px', color: 'var(--game-gold)' }}>
        🔍 User Search
      </h3>
      <div style={{
        background: 'var(--game-card)',
        borderRadius: 14,
        padding: 14,
        marginBottom: 24,
      }}>
        <input
          type="text"
          placeholder="Search by user ID or username…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{
            width: '100%',
            padding: '10px 12px',
            borderRadius: 10,
            border: '1px solid var(--game-border)',
            background: 'var(--game-bg)',
            color: 'var(--game-text)',
            fontSize: 14,
            outline: 'none',
            boxSizing: 'border-box',
          }}
        />
        <p style={{ fontSize: 12, color: 'var(--game-text-secondary)', margin: '8px 0 0' }}>
          {search ? `Searching for "${search}"…` : 'Enter a user ID or username to look up details.'}
        </p>
      </div>

      {/* Fraud Review Queue */}
      <h3 style={{ fontSize: 15, fontWeight: 700, margin: '0 0 10px', color: 'var(--game-gold)' }}>
        🚨 Fraud Review Queue
      </h3>
      {FLAGGED_USERS.map((user) => (
        <div key={user.id} style={{
          display: 'flex',
          alignItems: 'center',
          background: 'var(--game-card)',
          borderRadius: 14,
          padding: '12px 14px',
          marginBottom: 8,
          gap: 12,
        }}>
          <div style={{
            width: 10,
            height: 10,
            borderRadius: '50%',
            background: RISK_COLORS[user.risk],
            flexShrink: 0,
          }} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 14, fontWeight: 600 }}>{user.name}</div>
            <div style={{ fontSize: 12, color: 'var(--game-text-secondary)' }}>{user.reason}</div>
            <div style={{ fontSize: 12, color: 'var(--game-gold-light)', marginTop: 2 }}>🪙 {user.coins}</div>
          </div>
          <div style={{
            background: RISK_COLORS[user.risk] + '22',
            color: RISK_COLORS[user.risk],
            fontSize: 11,
            fontWeight: 600,
            borderRadius: 8,
            padding: '5px 10px',
            textTransform: 'uppercase',
          }}>
            {user.risk}
          </div>
        </div>
      ))}

      {/* Announcements */}
      <h3 style={{ fontSize: 15, fontWeight: 700, margin: '20px 0 10px', color: 'var(--game-gold)' }}>
        📢 Announcements
      </h3>
      <div style={{
        background: 'var(--game-card)',
        borderRadius: 14,
        padding: 14,
        marginBottom: 24,
      }}>
        <textarea
          placeholder="Write an announcement to all users…"
          rows={3}
          style={{
            width: '100%',
            padding: '10px 12px',
            borderRadius: 10,
            border: '1px solid var(--game-border)',
            background: 'var(--game-bg)',
            color: 'var(--game-text)',
            fontSize: 14,
            outline: 'none',
            resize: 'vertical',
            boxSizing: 'border-box',
            fontFamily: 'inherit',
          }}
        />
        <button style={{
          marginTop: 10,
          width: '100%',
          padding: '10px 0',
          borderRadius: 10,
          border: 'none',
          background: 'linear-gradient(135deg, var(--game-gold), #e6951e)',
          color: '#000',
          fontSize: 14,
          fontWeight: 700,
          cursor: 'pointer',
        }}>
          📤 Send Announcement
        </button>
      </div>

      {/* Quick Actions */}
      <h3 style={{ fontSize: 15, fontWeight: 700, margin: '0 0 10px', color: 'var(--game-gold)' }}>
        ⚡ Quick Actions
      </h3>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        {[
          { icon: '🔄', label: 'Reset Leaderboard' },
          { icon: '🎁', label: 'Airdrop Coins' },
          { icon: '🚫', label: 'Ban Wave' },
          { icon: '📊', label: 'Export Data' },
        ].map((action) => (
          <button key={action.label} style={{
            background: 'var(--game-card)',
            borderRadius: 14,
            border: '1px solid var(--game-border)',
            padding: '14px 12px',
            textAlign: 'center',
            cursor: 'pointer',
            color: 'var(--game-text)',
          }}>
            <div style={{ fontSize: 24 }}>{action.icon}</div>
            <div style={{ fontSize: 12, fontWeight: 600, marginTop: 6 }}>{action.label}</div>
          </button>
        ))}
      </div>
    </div>
  );
}
