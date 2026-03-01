import { useCallback, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGame } from '../game/context';
import { CURRENCY_ICON, GAME_NAME } from '../game/constants';
import { LEAGUES } from '../game/types';
import './HomePage.css';

interface FloatingNumber {
  id: number;
  x: number;
  y: number;
  value: number;
}

export function HomePage() {
  const { state, tap } = useGame();
  const [floatingNumbers, setFloatingNumbers] = useState<FloatingNumber[]>([]);
  const [isPressed, setIsPressed] = useState(false);
  const [glowPulse, setGlowPulse] = useState(false);
  const nextIdRef = useRef(0);
  const navigate = useNavigate();
  const { user } = state;

  const currentLeague = LEAGUES.find(l => l.name === user?.league) || LEAGUES[0];
  const nextLeague = LEAGUES[LEAGUES.indexOf(currentLeague) + 1];
  const leagueProgress = nextLeague
    ? ((user?.total_earned || 0) - currentLeague.min_score) / (nextLeague.min_score - currentLeague.min_score) * 100
    : 100;

  const handleTap = useCallback((e: React.TouchEvent | React.MouseEvent) => {
    e.preventDefault();
    if (!user || user.energy <= 0) return;

    tap(1);

    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    let clientX: number, clientY: number;
    if ('touches' in e) {
      clientX = e.touches[0]?.clientX ?? rect.left + rect.width / 2;
      clientY = e.touches[0]?.clientY ?? rect.top;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    const id = nextIdRef.current++;
    const x = clientX - rect.left;
    const y = clientY - rect.top;

    setFloatingNumbers(prev => [...prev, { id, x, y, value: user.tap_power }]);
    setGlowPulse(true);

    setTimeout(() => {
      setFloatingNumbers(prev => prev.filter(n => n.id !== id));
    }, 800);
    setTimeout(() => setGlowPulse(false), 200);
  }, [user, tap]);

  if (!user) return <div className="home-loading">Loading...</div>;

  const energyPercent = (user.energy / user.max_energy) * 100;

  return (
    <div className="home-page">
      {/* Quick links */}
      <div className="home-quick-links">
        <button className="quick-link" onClick={() => navigate('/squad')}>
          🛡️ {user.squad_id ? 'My Squad' : 'Join a Squad →'}
        </button>
        <button className="quick-link league-link" onClick={() => navigate('/league')}>
          🏆 Leagues
        </button>
      </div>

      {/* Balance */}
      <div className="balance-section">
        <div className="balance-amount">
          <span className="currency-icon">{CURRENCY_ICON}</span>
          <span className="balance-number">{user.balance.toLocaleString()}</span>
        </div>
        <div className="league-badge" style={{ color: currentLeague.color }}>
          {currentLeague.icon} {currentLeague.display_name} League
        </div>
      </div>

      {/* League progress */}
      {nextLeague && (
        <div className="league-progress">
          <div className="league-progress-bar">
            <div className="league-progress-fill" style={{ width: `${Math.min(100, leagueProgress)}%` }} />
          </div>
          <div className="league-progress-labels">
            <span>{currentLeague.icon} {currentLeague.display_name}</span>
            <span>{nextLeague.icon} {nextLeague.display_name}</span>
          </div>
        </div>
      )}

      {/* Tap Area */}
      <div className="tap-container">
        <div
          className={`tap-emblem ${isPressed ? 'pressed' : ''} ${glowPulse ? 'glow' : ''}`}
          onTouchStart={(e) => { setIsPressed(true); handleTap(e); }}
          onTouchEnd={() => setIsPressed(false)}
          onMouseDown={(e) => { setIsPressed(true); handleTap(e); }}
          onMouseUp={() => setIsPressed(false)}
          onMouseLeave={() => setIsPressed(false)}
        >
          <div className="emblem-inner">
            <div className="emblem-icon">{CURRENCY_ICON}</div>
            <div className="emblem-label">{GAME_NAME}</div>
          </div>
          <div className="emblem-ring" />
          <div className="emblem-ring ring-2" />
        </div>

        {/* Floating numbers */}
        {floatingNumbers.map(num => (
          <div
            key={num.id}
            className="floating-number"
            style={{ left: num.x, top: num.y }}
          >
            +{num.value}
          </div>
        ))}
      </div>

      {/* Energy bar */}
      <div className="energy-section">
        <div className="energy-info">
          <span className="energy-icon">⚡</span>
          <span className="energy-text">{user.energy} / {user.max_energy}</span>
        </div>
        <div className="energy-bar">
          <div
            className="energy-fill"
            style={{ width: `${energyPercent}%` }}
          />
        </div>
      </div>
    </div>
  );
}
