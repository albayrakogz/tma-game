import { useState } from 'react';

const SAMPLE_SQUADS = [
  { name: 'Diamond Dogs', emblem: '💎', score: '2,450,000', members: 48, league: 'Diamond' },
  { name: 'Gold Rush', emblem: '⚡', score: '1,820,000', members: 35, league: 'Platinum' },
  { name: 'Moon Squad', emblem: '🌙', score: '1,300,000', members: 62, league: 'Gold' },
  { name: 'Fire Nation', emblem: '🔥', score: '980,000', members: 27, league: 'Gold' },
  { name: 'Crypto Kings', emblem: '👑', score: '750,000', members: 19, league: 'Silver' },
];

const TABS = ['Daily', 'Weekly'] as const;

export function SquadPage() {
  const [activeTab, setActiveTab] = useState<string>(TABS[0]);

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--game-bg)',
      padding: '16px 16px 90px',
      color: 'var(--game-text)',
    }}>
      <h1 style={{ fontSize: 24, fontWeight: 800, textAlign: 'center', margin: '8px 0 16px' }}>
        🛡️ Squads
      </h1>

      {/* Action buttons */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
        <button style={{
          flex: 1,
          padding: '14px',
          borderRadius: 16,
          border: 'none',
          background: 'linear-gradient(135deg, var(--game-gold), #e6951e)',
          color: '#000',
          fontSize: 15,
          fontWeight: 700,
          cursor: 'pointer',
        }}>
          ➕ Create Squad
        </button>
        <button style={{
          flex: 1,
          padding: '14px',
          borderRadius: 16,
          border: '2px solid var(--game-gold)',
          background: 'transparent',
          color: 'var(--game-gold)',
          fontSize: 15,
          fontWeight: 700,
          cursor: 'pointer',
        }}>
          🔍 Join Squad
        </button>
      </div>

      {/* Competition tabs */}
      <div style={{
        display: 'flex',
        background: 'var(--game-card)',
        borderRadius: 12,
        padding: 4,
        marginBottom: 16,
      }}>
        {TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={{
              flex: 1,
              padding: '10px 0',
              borderRadius: 10,
              border: 'none',
              background: activeTab === tab
                ? 'linear-gradient(135deg, var(--game-gold), #e6951e)'
                : 'transparent',
              color: activeTab === tab ? '#000' : 'var(--game-text-secondary)',
              fontSize: 14,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Squad leaderboard */}
      <div style={{
        background: 'var(--game-card)',
        borderRadius: 16,
        padding: 16,
        marginBottom: 16,
      }}>
        <h3 style={{ fontSize: 15, fontWeight: 700, margin: '0 0 12px', color: 'var(--game-gold)' }}>
          🏅 Top Squads — {activeTab}
        </h3>
        {SAMPLE_SQUADS.map((squad, i) => (
          <div key={squad.name} style={{
            display: 'flex',
            alignItems: 'center',
            padding: '10px 0',
            borderBottom: i < SAMPLE_SQUADS.length - 1 ? '1px solid var(--game-border)' : 'none',
            gap: 10,
          }}>
            <span style={{
              width: 24,
              textAlign: 'center',
              fontSize: 16,
              fontWeight: 700,
              color: i === 0 ? 'var(--game-gold-light)' : 'var(--game-text-secondary)',
            }}>
              {i + 1}
            </span>
            <span style={{ fontSize: 24 }}>{squad.emblem}</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 14, fontWeight: 600 }}>{squad.name}</div>
              <div style={{ fontSize: 12, color: 'var(--game-text-secondary)' }}>
                {squad.members} members · 🏆 {squad.league}
              </div>
            </div>
            <span style={{ fontSize: 13, color: 'var(--game-gold-light)', fontWeight: 600 }}>
              🪙 {squad.score}
            </span>
          </div>
        ))}
      </div>

      {/* Squad cards */}
      <div style={{
        background: 'var(--game-card)',
        borderRadius: 16,
        padding: 16,
      }}>
        <h3 style={{ fontSize: 15, fontWeight: 700, margin: '0 0 12px', color: 'var(--game-gold)' }}>
          Featured Squads
        </h3>
        {SAMPLE_SQUADS.slice(0, 3).map((squad) => (
          <div key={squad.name} style={{
            background: 'var(--game-surface)',
            borderRadius: 12,
            padding: 14,
            marginBottom: 10,
            border: '1px solid var(--game-border)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
              <span style={{ fontSize: 28 }}>{squad.emblem}</span>
              <div>
                <div style={{ fontSize: 15, fontWeight: 700 }}>{squad.name}</div>
                <div style={{ fontSize: 12, color: 'var(--game-text-secondary)' }}>
                  🏆 {squad.league}
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
              <span style={{ color: 'var(--game-text-secondary)' }}>
                👥 {squad.members} members
              </span>
              <span style={{ color: 'var(--game-gold-light)', fontWeight: 600 }}>
                🪙 {squad.score}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
