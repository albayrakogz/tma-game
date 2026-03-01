import { useState } from 'react';
import { CURRENCY_ICON } from '../game/constants';
import { LEAGUES } from '../game/types';
import './AdminPage.css';

// Demo-only password — in production, use server-side admin auth with proper session management
const ADMIN_PASSWORD = import.meta.env.VITE_ADMIN_PASSWORD || 'admin123';

interface DemoUser {
  id: number;
  username: string;
  balance: number;
  league: string;
  fraud_score: number;
  total_taps: number;
  created_at: string;
}

const DEMO_USERS: DemoUser[] = [
  { id: 1, username: 'elena_tap', balance: 2450000, league: 'master', fraud_score: 0.02, total_taps: 185000, created_at: '2024-01-02' },
  { id: 2, username: 'marcus_king', balance: 1820000, league: 'diamond', fraud_score: 0.05, total_taps: 142000, created_at: '2024-01-05' },
  { id: 3, username: 'yuki_fury', balance: 980000, league: 'diamond', fraud_score: 0.12, total_taps: 95000, created_at: '2024-01-08' },
  { id: 4, username: 'bot_suspect', balance: 540000, league: 'platinum', fraud_score: 0.87, total_taps: 420000, created_at: '2024-01-10' },
  { id: 5, username: 'jake_realm', balance: 320000, league: 'gold', fraud_score: 0.15, total_taps: 48000, created_at: '2024-01-12' },
  { id: 6, username: 'nina_orb', balance: 88000, league: 'gold', fraud_score: 0.03, total_taps: 22000, created_at: '2024-01-15' },
];

const DEMO_LOGS = [
  { time: '14:32', action: 'User bot_suspect flagged for review (abnormal tap rate)' },
  { time: '14:28', action: 'Admin adjusted balance for elena_tap (+5000)' },
  { time: '13:45', action: 'New announcement posted: "Weekend Double Orbs"' },
  { time: '12:00', action: 'Daily stats snapshot saved' },
  { time: '09:15', action: 'System: Auto-ban check completed (0 banned)' },
];

const DEMO_FRAUD_QUEUE = [
  { user: 'bot_suspect', reason: 'Tap rate 420/min exceeds threshold', score: 0.87 },
  { user: 'speed_hack3r', reason: 'Multiple rapid balance increases', score: 0.92 },
];

const APP_SETTINGS = [
  { key: 'Tap Power Base', value: '1' },
  { key: 'Max Energy', value: '500' },
  { key: 'Energy Regen/s', value: '1' },
  { key: 'Referral Reward', value: '500' },
  { key: 'Premium Referral', value: '2500' },
  { key: 'Maintenance Mode', value: 'Off' },
];

export function AdminPage() {
  const [authed, setAuthed] = useState(false);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [selectedUser, setSelectedUser] = useState<DemoUser | null>(null);
  const [adjustAmount, setAdjustAmount] = useState('');
  const [announceTitle, setAnnounceTitle] = useState('');
  const [announceContent, setAnnounceContent] = useState('');

  const handleLogin = () => {
    if (password === ADMIN_PASSWORD) {
      setAuthed(true);
      setError('');
    } else {
      setError('Invalid password');
    }
  };

  if (!authed) {
    return (
      <div className="admin-page">
        <div className="admin-gate">
          <h2>🔐 Admin Panel</h2>
          <p>Enter admin password to continue</p>
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleLogin()}
          />
          <button onClick={handleLogin}>Login</button>
          {error && <div className="error">{error}</div>}
        </div>
      </div>
    );
  }

  const getLeagueIcon = (league: string) => {
    const l = LEAGUES.find(lg => lg.name === league);
    return l ? l.icon : '🥉';
  };

  const getFraudClass = (score: number) => {
    if (score >= 0.7) return 'high';
    if (score >= 0.3) return 'medium';
    return 'low';
  };

  const filteredUsers = DEMO_USERS.filter(u =>
    u.username.toLowerCase().includes(search.toLowerCase())
  );

  const totalTaps = DEMO_USERS.reduce((s, u) => s + u.total_taps, 0);
  const totalOrbs = DEMO_USERS.reduce((s, u) => s + u.balance, 0);
  const suspicious = DEMO_USERS.filter(u => u.fraud_score >= 0.7).length;

  return (
    <div className="admin-page">
      <h1>Admin Panel ⚙️</h1>

      {/* Dashboard */}
      <div className="admin-dashboard">
        <div className="dash-card">
          <div className="dash-value">{DEMO_USERS.length}</div>
          <div className="dash-label">Total Users</div>
        </div>
        <div className="dash-card">
          <div className="dash-value">{totalTaps.toLocaleString()}</div>
          <div className="dash-label">Total Taps</div>
        </div>
        <div className="dash-card">
          <div className="dash-value">{CURRENCY_ICON} {totalOrbs.toLocaleString()}</div>
          <div className="dash-label">Total Orbs</div>
        </div>
        <div className="dash-card">
          <div className="dash-value">4</div>
          <div className="dash-label">Active Today</div>
        </div>
        <div className="dash-card wide">
          <div className="dash-value" style={{ color: suspicious > 0 ? '#f44336' : '#4caf50' }}>{suspicious}</div>
          <div className="dash-label">Suspicious Users</div>
        </div>
      </div>

      {/* User detail overlay */}
      {selectedUser && (
        <div className="admin-user-detail">
          <div className="detail-header">
            <h3>{selectedUser.username}</h3>
            <button className="detail-close" onClick={() => setSelectedUser(null)}>✕</button>
          </div>
          <div className="detail-row"><span className="label">ID</span><span>{selectedUser.id}</span></div>
          <div className="detail-row"><span className="label">Balance</span><span>{CURRENCY_ICON} {selectedUser.balance.toLocaleString()}</span></div>
          <div className="detail-row"><span className="label">League</span><span>{getLeagueIcon(selectedUser.league)} {selectedUser.league}</span></div>
          <div className="detail-row"><span className="label">Total Taps</span><span>{selectedUser.total_taps.toLocaleString()}</span></div>
          <div className="detail-row"><span className="label">Fraud Score</span><span>{(selectedUser.fraud_score * 100).toFixed(0)}%</span></div>
          <div className="detail-row"><span className="label">Joined</span><span>{selectedUser.created_at}</span></div>
          <div className="detail-adjust">
            <input
              type="number"
              placeholder="Adjust balance (+/-)"
              value={adjustAmount}
              onChange={e => setAdjustAmount(e.target.value)}
            />
            <button onClick={() => setAdjustAmount('')}>Apply</button>
          </div>
        </div>
      )}

      {/* User search & list */}
      <h3>Users</h3>
      <div className="admin-search">
        <input
          type="text"
          placeholder="Search users..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>
      <div className="admin-user-list">
        {filteredUsers.map(u => (
          <div key={u.id} className="admin-user-row" onClick={() => setSelectedUser(u)}>
            <span className="u-id">#{u.id}</span>
            <span className="u-name">{u.username}</span>
            <span className="u-balance">{CURRENCY_ICON} {u.balance.toLocaleString()}</span>
            <span className="u-league">{getLeagueIcon(u.league)}</span>
            <span className={`u-fraud ${getFraudClass(u.fraud_score)}`}>{(u.fraud_score * 100).toFixed(0)}%</span>
          </div>
        ))}
      </div>

      {/* Audit log */}
      <div className="admin-section">
        <h3>Audit Log</h3>
        {DEMO_LOGS.map((log, i) => (
          <div key={i} className="log-entry">
            <span className="log-time">{log.time}</span>
            {log.action}
          </div>
        ))}
      </div>

      {/* Announcements */}
      <div className="admin-section">
        <h3>Create Announcement</h3>
        <div className="announce-form">
          <input
            type="text"
            placeholder="Title"
            value={announceTitle}
            onChange={e => setAnnounceTitle(e.target.value)}
          />
          <textarea
            placeholder="Content..."
            value={announceContent}
            onChange={e => setAnnounceContent(e.target.value)}
          />
          <button onClick={() => { setAnnounceTitle(''); setAnnounceContent(''); }}>Publish</button>
        </div>
      </div>

      {/* App Settings */}
      <div className="admin-section">
        <h3>App Settings</h3>
        {APP_SETTINGS.map(s => (
          <div key={s.key} className="settings-row">
            <span className="s-key">{s.key}</span>
            <span className="s-value">{s.value}</span>
          </div>
        ))}
      </div>

      {/* Fraud queue */}
      <div className="admin-section">
        <h3>Fraud Queue</h3>
        {DEMO_FRAUD_QUEUE.map((f, i) => (
          <div key={i} className="fraud-row">
            <div>
              <div className="fraud-user">{f.user}</div>
              <div className="fraud-reason">{f.reason}</div>
            </div>
            <button>Review</button>
          </div>
        ))}
      </div>
    </div>
  );
}
