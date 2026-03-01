import { useState, useEffect } from 'react';
import { useGame } from '../game/context';
import { CURRENCY_ICON, UPGRADE_CONFIGS, BOOST_CONFIGS } from '../game/constants';
import type { Upgrade } from '../game/types';
import './BoostsPage.css';

const DEMO_UPGRADES: Upgrade[] = Object.entries(UPGRADE_CONFIGS).map(([key, cfg]) => ({
  upgrade_type: key,
  level: 0,
  next_price: cfg.base_price,
  max_level: cfg.max_level,
  current_effect: 0,
  next_effect: 1,
}));

function getCooldownRemaining(nextAvailable: string): string {
  const diff = new Date(nextAvailable).getTime() - Date.now();
  if (diff <= 0) return '';
  const hours = Math.floor(diff / 3600000);
  const mins = Math.floor((diff % 3600000) / 60000);
  return `${hours}h ${mins}m`;
}

export function BoostsPage() {
  const { state, claimBoost, buyUpgrade } = useGame();
  const [, setTick] = useState(0);

  // Refresh cooldown timers every minute
  useEffect(() => {
    const timer = setInterval(() => setTick(t => t + 1), 60000);
    return () => clearInterval(timer);
  }, []);

  const upgrades = state.upgrades.length > 0 ? state.upgrades : DEMO_UPGRADES;
  const balance = state.user?.balance ?? 0;

  return (
    <div className="boosts-page">
      <h1>🚀 Boosts</h1>

      {/* Free daily boosters */}
      <div className="boosts-section">
        <div className="boosts-section-title">Free Daily Boosters</div>
        {Object.entries(BOOST_CONFIGS).map(([key, cfg]) => {
          const activeClaim = state.activeBoosts.find(b => b.boost_type === key);
          const cooldown = activeClaim ? getCooldownRemaining(activeClaim.next_available) : '';
          const isReady = !cooldown;

          return (
            <div key={key} className="boost-card">
              <div className="boost-icon">{cfg.icon}</div>
              <div className="boost-info">
                <div className="boost-name">{cfg.name}</div>
                <div className="boost-desc">{cfg.description}</div>
                {cooldown && <div className="boost-cooldown">Available in {cooldown}</div>}
              </div>
              <button
                className={`boost-btn ${isReady ? 'ready' : 'cooldown'}`}
                onClick={() => { if (isReady) claimBoost(key); }}
                disabled={!isReady}
              >
                {isReady ? 'Use' : 'Wait'}
              </button>
            </div>
          );
        })}
      </div>

      {/* Purchasable upgrades */}
      <div className="boosts-section">
        <div className="boosts-section-title">Upgrades</div>
        {upgrades.map(upg => {
          const cfg = UPGRADE_CONFIGS[upg.upgrade_type];
          if (!cfg) return null;
          const isMaxed = upg.level >= upg.max_level;
          const canAfford = balance >= upg.next_price;

          return (
            <div key={upg.upgrade_type} className="upgrade-card">
              <div className="upgrade-icon">{cfg.icon}</div>
              <div className="upgrade-info">
                <div className="upgrade-name">{cfg.name}</div>
                <div className="upgrade-detail">{cfg.description}</div>
                <div className="upgrade-level">
                  Lvl {upg.level}/{upg.max_level}
                  {!isMaxed && <> · {CURRENCY_ICON} {upg.next_price.toLocaleString()}</>}
                </div>
              </div>
              {isMaxed ? (
                <span className="upgrade-maxed">MAX</span>
              ) : (
                <button
                  className="upgrade-buy-btn"
                  onClick={() => buyUpgrade(upg.upgrade_type)}
                  disabled={!canAfford}
                >
                  Buy
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
