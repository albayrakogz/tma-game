import { useGame } from '@/contexts/GameContext.tsx';

export function EnergyBar() {
  const { energy, maxEnergy } = useGame();
  const pct = Math.min((energy / maxEnergy) * 100, 100);

  return (
    <div style={{
      width: '100%',
      padding: '0 20px',
      boxSizing: 'border-box',
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 6,
        fontSize: 14,
        color: 'var(--game-text-secondary)',
      }}>
        <span>⚡ Energy</span>
        <span style={{ color: 'var(--game-text)' }}>
          {energy} / {maxEnergy}
        </span>
      </div>
      <div style={{
        height: 10,
        borderRadius: 5,
        background: 'var(--game-border)',
        overflow: 'hidden',
      }}>
        <div style={{
          height: '100%',
          width: `${pct}%`,
          borderRadius: 5,
          background: 'linear-gradient(90deg, var(--game-energy), #22d3ee)',
          transition: 'width 0.3s ease',
        }} />
      </div>
    </div>
  );
}
