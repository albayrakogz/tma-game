import { useGame, upgradePrice } from '@/contexts/GameContext.tsx';

const UPGRADE_INFO: Record<string, { icon: string; title: string; effect: (level: number) => string }> = {
  multitap: {
    icon: '👆',
    title: 'Multitap',
    effect: (lvl) => `+${lvl} coins per tap`,
  },
  energyLimit: {
    icon: '🔋',
    title: 'Energy Limit',
    effect: (lvl) => `${500 + (lvl - 1) * 500} max energy`,
  },
  regenSpeed: {
    icon: '♻️',
    title: 'Regen Speed',
    effect: (lvl) => `${lvl}/sec regeneration`,
  },
  autoBot: {
    icon: '🤖',
    title: 'Auto Tap Bot',
    effect: (lvl) => lvl > 0 ? `Level ${lvl} active` : 'Taps while offline',
  },
};

export function BoostsPage() {
  const { balance, boosts, upgrades, claimBoost, purchaseUpgrade } = useGame();

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--game-bg)',
      padding: '16px 16px 90px',
      color: 'var(--game-text)',
    }}>
      <h1 style={{ fontSize: 24, fontWeight: 800, textAlign: 'center', margin: '8px 0 20px' }}>
        🚀 Boosts
      </h1>

      {/* Balance */}
      <div style={{
        textAlign: 'center',
        marginBottom: 20,
        fontSize: 20,
        fontWeight: 700,
        color: 'var(--game-gold-light)',
      }}>
        🪙 {balance.toLocaleString()}
      </div>

      {/* Free boosters */}
      <h3 style={{ fontSize: 15, fontWeight: 700, margin: '0 0 10px', color: 'var(--game-gold)' }}>
        ⚡ Free Daily Boosters
      </h3>
      <div style={{ display: 'flex', gap: 10, marginBottom: 24 }}>
        {[
          { id: 'fullEnergy', icon: '🔋', title: 'Full Energy' },
          { id: 'turbo', icon: '⚡', title: 'Turbo' },
        ].map((booster) => {
          const usage = boosts[booster.id];
          const available = usage ? usage.used < usage.max : false;
          return (
            <button
              key={booster.id}
              onClick={() => available && claimBoost(booster.id)}
              style={{
                flex: 1,
                background: 'var(--game-card)',
                borderRadius: 16,
                border: available ? '1px solid var(--game-gold)' : '1px solid var(--game-border)',
                padding: '16px 12px',
                textAlign: 'center',
                cursor: available ? 'pointer' : 'default',
                opacity: available ? 1 : 0.5,
                color: 'var(--game-text)',
              }}
            >
              <div style={{ fontSize: 32 }}>{booster.icon}</div>
              <div style={{ fontSize: 14, fontWeight: 600, margin: '6px 0 4px' }}>{booster.title}</div>
              <div style={{ fontSize: 12, color: 'var(--game-text-secondary)' }}>
                {usage ? `${usage.max - usage.used}/${usage.max} left` : '0/3 left'}
              </div>
            </button>
          );
        })}
      </div>

      {/* Upgrades */}
      <h3 style={{ fontSize: 15, fontWeight: 700, margin: '0 0 10px', color: 'var(--game-gold)' }}>
        📈 Upgrades
      </h3>
      {Object.entries(UPGRADE_INFO).map(([id, info]) => {
        const upgrade = upgrades[id];
        if (!upgrade) return null;
        const price = upgradePrice(upgrade.basePrice, upgrade.level);
        const canAfford = balance >= price;
        const maxLevel = 20;
        const atMax = upgrade.level >= maxLevel;

        return (
          <div key={id} style={{
            display: 'flex',
            alignItems: 'center',
            background: 'var(--game-card)',
            borderRadius: 14,
            padding: '14px',
            marginBottom: 8,
            gap: 12,
          }}>
            <div style={{ fontSize: 32, lineHeight: 1 }}>{info.icon}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 14, fontWeight: 600 }}>
                {info.title}
                <span style={{
                  marginLeft: 6,
                  fontSize: 12,
                  color: 'var(--game-text-secondary)',
                }}>Lv.{upgrade.level}</span>
              </div>
              <div style={{ fontSize: 12, color: 'var(--game-text-secondary)', marginTop: 2 }}>
                {info.effect(upgrade.level)}
              </div>
            </div>
            <button
              onClick={() => !atMax && canAfford && purchaseUpgrade(id)}
              style={{
                background: atMax
                  ? '#333'
                  : canAfford
                    ? 'linear-gradient(135deg, var(--game-gold), #e6951e)'
                    : 'var(--game-border)',
                color: atMax ? '#666' : canAfford ? '#000' : 'var(--game-text-secondary)',
                border: 'none',
                borderRadius: 10,
                padding: '8px 14px',
                fontSize: 13,
                fontWeight: 700,
                cursor: atMax ? 'default' : canAfford ? 'pointer' : 'default',
                whiteSpace: 'nowrap',
              }}
            >
              {atMax ? 'MAX' : `🪙 ${price.toLocaleString()}`}
            </button>
          </div>
        );
      })}
    </div>
  );
}
