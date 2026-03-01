import { useCallback, useRef, useState } from 'react';
import { useGame } from '@/contexts/GameContext.tsx';
import { EnergyBar } from '@/components/EnergyBar.tsx';

interface FloatingNumber {
  id: number;
  x: number;
  y: number;
  value: number;
}

let floatId = 0;

export function HomePage() {
  const { balance, energy, coinsPerTap, league, rank, tap } = useGame();
  const [floats, setFloats] = useState<FloatingNumber[]>([]);
  const [pressed, setPressed] = useState(false);
  const coinRef = useRef<HTMLDivElement>(null);

  const handleTap = useCallback((e: React.MouseEvent<HTMLDivElement> | React.TouchEvent<HTMLDivElement>) => {
    if (energy <= 0) return;

    let clientX: number, clientY: number;
    if ('touches' in e) {
      const touch = e.touches[0];
      clientX = touch.clientX;
      clientY = touch.clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    const rect = coinRef.current?.getBoundingClientRect();
    const x = rect ? clientX - rect.left : 100;
    const y = rect ? clientY - rect.top : 100;

    tap(1);

    const id = ++floatId;
    setFloats((prev) => [...prev, { id, x, y, value: coinsPerTap }]);
    setTimeout(() => {
      setFloats((prev) => prev.filter((f) => f.id !== id));
    }, 900);

    setPressed(true);
    setTimeout(() => setPressed(false), 100);
  }, [energy, coinsPerTap, tap]);

  const formattedBalance = balance.toLocaleString();

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      minHeight: '100vh',
      paddingBottom: 80,
      background: 'var(--game-bg)',
    }}>
      {/* Header */}
      <div style={{
        width: '100%',
        padding: '16px 20px 8px',
        boxSizing: 'border-box',
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <div style={{
            background: 'var(--game-card)',
            borderRadius: 12,
            padding: '6px 14px',
            fontSize: 13,
            color: 'var(--game-gold)',
            fontWeight: 600,
          }}>
            🏆 {league}
          </div>
          <div style={{
            fontSize: 13,
            color: 'var(--game-text-secondary)',
          }}>
            Rank #{rank}
          </div>
        </div>
      </div>

      {/* Balance */}
      <div style={{
        textAlign: 'center',
        padding: '16px 0 8px',
      }}>
        <div style={{ fontSize: 14, color: 'var(--game-text-secondary)', marginBottom: 4 }}>
          Your Balance
        </div>
        <div style={{
          fontSize: 42,
          fontWeight: 800,
          color: 'var(--game-gold-light)',
          textShadow: '0 0 20px rgba(245,166,35,0.3)',
        }}>
          🪙 {formattedBalance}
        </div>
      </div>

      {/* Tap area */}
      <div style={{
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px 0',
      }}>
        <div
          ref={coinRef}
          onMouseDown={handleTap}
          onTouchStart={handleTap}
          style={{
            position: 'relative',
            width: 200,
            height: 200,
            borderRadius: '50%',
            background: 'radial-gradient(circle at 40% 35%, #ffd700, #f5a623, #c47f17, #8b5e0f)',
            boxShadow: pressed
              ? '0 0 30px rgba(245,166,35,0.6), inset 0 0 20px rgba(0,0,0,0.3)'
              : '0 0 40px rgba(245,166,35,0.3), inset 0 0 20px rgba(0,0,0,0.2)',
            transform: pressed ? 'scale(0.93)' : 'scale(1)',
            transition: 'transform 0.1s ease, box-shadow 0.1s ease',
            cursor: energy > 0 ? 'pointer' : 'not-allowed',
            userSelect: 'none',
            WebkitTapHighlightColor: 'transparent',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <span style={{ fontSize: 64, pointerEvents: 'none' }}>⛏️</span>

          {/* Floating numbers */}
          {floats.map((f) => (
            <div
              key={f.id}
              className="floating-number"
              style={{
                position: 'absolute',
                left: f.x - 15,
                top: f.y - 20,
                pointerEvents: 'none',
              }}
            >
              +{f.value}
            </div>
          ))}
        </div>
      </div>

      {/* Energy bar */}
      <div style={{ width: '100%', paddingBottom: 16 }}>
        <EnergyBar />
      </div>
    </div>
  );
}
