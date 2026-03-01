import { useGame } from '@/contexts/GameContext.tsx';

const LEAGUE_TIERS = [
  { name: 'Bronze', emoji: '🥉', threshold: 0, color: '#cd7f32' },
  { name: 'Silver', emoji: '🥈', threshold: 10_000, color: '#c0c0c0' },
  { name: 'Gold', emoji: '🥇', threshold: 50_000, color: '#ffd700' },
  { name: 'Platinum', emoji: '💠', threshold: 200_000, color: '#e5e4e2' },
  { name: 'Diamond', emoji: '💎', threshold: 1_000_000, color: '#b9f2ff' },
  { name: 'Master', emoji: '👑', threshold: 5_000_000, color: '#ff6b6b' },
];

const LEADERBOARD = [
  { rank: 1, name: 'CryptoWhale', score: '15,200,000', league: 'Master' },
  { rank: 2, name: 'MoonWalker', score: '12,800,000', league: 'Master' },
  { rank: 3, name: 'DiamondHands', score: '8,500,000', league: 'Diamond' },
  { rank: 4, name: 'GoldDigger', score: '5,300,000', league: 'Diamond' },
  { rank: 5, name: 'SilverFox', score: '2,100,000', league: 'Diamond' },
  { rank: 6, name: 'TapKing', score: '980,000', league: 'Platinum' },
  { rank: 7, name: 'CoinMaster', score: '750,000', league: 'Platinum' },
  { rank: 8, name: 'RocketMan', score: '320,000', league: 'Platinum' },
  { rank: 9, name: 'StarPlayer', score: '85,000', league: 'Gold' },
  { rank: 10, name: 'NewRiser', score: '42,000', league: 'Gold' },
];

function getRankEmoji(rank: number): string {
  if (rank === 1) return '🥇';
  if (rank === 2) return '🥈';
  if (rank === 3) return '🥉';
  return `#${rank}`;
}

export function LeaguePage() {
  const { balance, league } = useGame();

  const currentTierIdx = LEAGUE_TIERS.findIndex((t) => t.name === league);
  const nextTier = currentTierIdx < LEAGUE_TIERS.length - 1 ? LEAGUE_TIERS[currentTierIdx + 1] : null;
  const currentThreshold = LEAGUE_TIERS[currentTierIdx].threshold;
  const nextThreshold = nextTier ? nextTier.threshold : currentThreshold;
  const progress = nextTier
    ? Math.min(((balance - currentThreshold) / (nextThreshold - currentThreshold)) * 100, 100)
    : 100;

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--game-bg)',
      padding: '16px 16px 90px',
      color: 'var(--game-text)',
    }}>
      <h1 style={{ fontSize: 24, fontWeight: 800, textAlign: 'center', margin: '8px 0 16px' }}>
        🏆 Leagues
      </h1>

      {/* League progression */}
      <div style={{
        background: 'var(--game-card)',
        borderRadius: 16,
        padding: 16,
        marginBottom: 16,
      }}>
        <h3 style={{ fontSize: 15, fontWeight: 700, margin: '0 0 14px', color: 'var(--game-gold)' }}>
          League Tiers
        </h3>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center' }}>
          {LEAGUE_TIERS.map((tier) => {
            const isCurrent = tier.name === league;
            return (
              <div key={tier.name} style={{
                width: 'calc(33.33% - 8px)',
                background: isCurrent ? 'var(--game-surface)' : 'transparent',
                border: isCurrent ? '2px solid var(--game-gold)' : '1px solid var(--game-border)',
                borderRadius: 12,
                padding: '10px 6px',
                textAlign: 'center',
                boxSizing: 'border-box',
              }}>
                <div style={{ fontSize: 24 }}>{tier.emoji}</div>
                <div style={{
                  fontSize: 12,
                  fontWeight: 700,
                  color: isCurrent ? 'var(--game-gold-light)' : 'var(--game-text)',
                  marginTop: 4,
                }}>
                  {tier.name}
                </div>
                <div style={{ fontSize: 10, color: 'var(--game-text-secondary)', marginTop: 2 }}>
                  {tier.threshold === 0 ? '0' : tier.threshold.toLocaleString()}+
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Current progress */}
      <div style={{
        background: 'var(--game-card)',
        borderRadius: 16,
        padding: 16,
        marginBottom: 16,
      }}>
        <h3 style={{ fontSize: 15, fontWeight: 700, margin: '0 0 10px', color: 'var(--game-gold)' }}>
          Your Progress
        </h3>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, marginBottom: 6 }}>
          <span>Current: <strong style={{ color: 'var(--game-gold-light)' }}>{league}</strong></span>
          {nextTier && (
            <span>Next: <strong style={{ color: 'var(--game-text-secondary)' }}>{nextTier.name}</strong></span>
          )}
        </div>
        <div style={{
          width: '100%',
          height: 10,
          background: 'var(--game-surface)',
          borderRadius: 5,
          overflow: 'hidden',
          marginBottom: 8,
        }}>
          <div style={{
            width: `${progress}%`,
            height: '100%',
            background: 'linear-gradient(90deg, var(--game-gold), var(--game-gold-light))',
            borderRadius: 5,
            transition: 'width 0.3s ease',
          }} />
        </div>
        <div style={{ fontSize: 12, color: 'var(--game-text-secondary)', textAlign: 'center' }}>
          🪙 {balance.toLocaleString()}
          {nextTier && <span> / {nextTier.threshold.toLocaleString()}</span>}
        </div>
      </div>

      {/* Leaderboard */}
      <div style={{
        background: 'var(--game-card)',
        borderRadius: 16,
        padding: 16,
      }}>
        <h3 style={{ fontSize: 15, fontWeight: 700, margin: '0 0 12px', color: 'var(--game-gold)' }}>
          🏅 Top Players
        </h3>
        {LEADERBOARD.map((player, i) => (
          <div key={player.rank} style={{
            display: 'flex',
            alignItems: 'center',
            padding: '10px 0',
            borderBottom: i < LEADERBOARD.length - 1 ? '1px solid var(--game-border)' : 'none',
            gap: 10,
          }}>
            <span style={{
              width: 28,
              textAlign: 'center',
              fontSize: player.rank <= 3 ? 18 : 13,
              fontWeight: 700,
              color: player.rank <= 3 ? 'var(--game-gold-light)' : 'var(--game-text-secondary)',
            }}>
              {getRankEmoji(player.rank)}
            </span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 14, fontWeight: 600 }}>{player.name}</div>
              <div style={{ fontSize: 12, color: 'var(--game-text-secondary)' }}>
                🏆 {player.league}
              </div>
            </div>
            <span style={{ fontSize: 13, color: 'var(--game-gold-light)', fontWeight: 600 }}>
              🪙 {player.score}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
