const LEAGUE_BONUS: Record<string, string> = {
  Bronze: '5%',
  Silver: '8%',
  Gold: '12%',
  Platinum: '18%',
  Diamond: '25%',
  Master: '35%',
};

const MILESTONES = [
  { count: 1, reward: '10,000' },
  { count: 3, reward: '50,000' },
  { count: 10, reward: '250,000' },
  { count: 25, reward: '1,000,000' },
  { count: 50, reward: '5,000,000' },
];

const SAMPLE_FRENS = [
  { name: 'Alex', coins: '12,500', premium: false },
  { name: 'Maria', coins: '25,000', premium: true },
  { name: 'John', coins: '5,000', premium: false },
];

export function FrensPage() {
  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--game-bg)',
      padding: '16px 16px 90px',
      color: 'var(--game-text)',
    }}>
      <h1 style={{ fontSize: 24, fontWeight: 800, textAlign: 'center', margin: '8px 0 16px' }}>
        👥 Invite Frens
      </h1>

      {/* Invite button */}
      <button style={{
        width: '100%',
        padding: '16px',
        borderRadius: 16,
        border: 'none',
        background: 'linear-gradient(135deg, var(--game-gold), #e6951e)',
        color: '#000',
        fontSize: 17,
        fontWeight: 700,
        cursor: 'pointer',
        marginBottom: 20,
      }}>
        🔗 Invite a Fren
      </button>

      {/* Reward rules */}
      <div style={{
        background: 'var(--game-card)',
        borderRadius: 16,
        padding: 16,
        marginBottom: 16,
      }}>
        <h3 style={{ fontSize: 15, fontWeight: 700, margin: '0 0 12px', color: 'var(--game-gold)' }}>
          Referral Rewards
        </h3>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: 14 }}>
          <span>Regular user</span>
          <span style={{ color: 'var(--game-gold-light)' }}>🪙 5,000</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14 }}>
          <span>Premium user</span>
          <span style={{ color: 'var(--game-gold-light)' }}>🪙 25,000</span>
        </div>
      </div>

      {/* Milestones */}
      <div style={{
        background: 'var(--game-card)',
        borderRadius: 16,
        padding: 16,
        marginBottom: 16,
      }}>
        <h3 style={{ fontSize: 15, fontWeight: 700, margin: '0 0 12px', color: 'var(--game-gold)' }}>
          Milestone Rewards
        </h3>
        {MILESTONES.map((m) => (
          <div key={m.count} style={{
            display: 'flex',
            justifyContent: 'space-between',
            padding: '8px 0',
            borderBottom: '1px solid var(--game-border)',
            fontSize: 14,
          }}>
            <span>{m.count} fren{m.count > 1 ? 's' : ''}</span>
            <span style={{ color: 'var(--game-gold-light)' }}>🪙 {m.reward}</span>
          </div>
        ))}
      </div>

      {/* League bonus */}
      <div style={{
        background: 'var(--game-card)',
        borderRadius: 16,
        padding: 16,
        marginBottom: 16,
      }}>
        <h3 style={{ fontSize: 15, fontWeight: 700, margin: '0 0 12px', color: 'var(--game-gold)' }}>
          League Bonus
        </h3>
        {Object.entries(LEAGUE_BONUS).map(([league, bonus]) => (
          <div key={league} style={{
            display: 'flex',
            justifyContent: 'space-between',
            padding: '8px 0',
            borderBottom: '1px solid var(--game-border)',
            fontSize: 14,
          }}>
            <span>🏆 {league}</span>
            <span style={{ color: 'var(--game-gold-light)' }}>{bonus}</span>
          </div>
        ))}
      </div>

      {/* Invited friends */}
      <div style={{
        background: 'var(--game-card)',
        borderRadius: 16,
        padding: 16,
      }}>
        <h3 style={{ fontSize: 15, fontWeight: 700, margin: '0 0 12px', color: 'var(--game-gold)' }}>
          Your Frens ({SAMPLE_FRENS.length})
        </h3>
        {SAMPLE_FRENS.map((fren) => (
          <div key={fren.name} style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '10px 0',
            borderBottom: '1px solid var(--game-border)',
            fontSize: 14,
          }}>
            <div>
              <span>{fren.name}</span>
              {fren.premium && (
                <span style={{
                  marginLeft: 6,
                  fontSize: 11,
                  background: 'var(--game-gold)',
                  color: '#000',
                  borderRadius: 4,
                  padding: '1px 5px',
                  fontWeight: 600,
                }}>PRO</span>
              )}
            </div>
            <span style={{ color: 'var(--game-gold-light)' }}>🪙 {fren.coins}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
