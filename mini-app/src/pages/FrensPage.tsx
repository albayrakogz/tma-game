import { useGame } from '../game/context';
import { CURRENCY_ICON, REFERRAL_REWARDS } from '../game/constants';
import type { ReferralFriend } from '../game/types';
import './FrensPage.css';

const LEAGUE_BONUSES = [
  { league: '🥉 Bronze', bonus: '+0%' },
  { league: '🥈 Silver', bonus: '+10%' },
  { league: '🥇 Gold', bonus: '+25%' },
  { league: '💎 Platinum', bonus: '+50%' },
  { league: '💠 Diamond', bonus: '+100%' },
];

const DEMO_FRIENDS: ReferralFriend[] = [
  { id: 1, username: 'alice_tap', first_name: 'Alice', is_premium: true, reward_claimed: true, reward_amount: 2500, created_at: '2024-01-15T10:00:00Z' },
  { id: 2, username: 'bob_realm', first_name: 'Bob', is_premium: false, reward_claimed: false, reward_amount: 500, created_at: '2024-01-20T10:00:00Z' },
];

export function FrensPage() {
  const { state } = useGame();
  const friends = DEMO_FRIENDS;

  return (
    <div className="frens-page">
      <div className="frens-header">
        <h1>Invite a fren 👥</h1>
        <p>Earn {CURRENCY_ICON} Orbs for each friend who joins!</p>
      </div>

      {/* Reward tiers */}
      <div className="reward-tiers">
        <h3>Referral Rewards</h3>
        <div className="tier-row">
          <span className="tier-label">👤 Regular User</span>
          <span className="tier-reward">{CURRENCY_ICON} {REFERRAL_REWARDS.regular.toLocaleString()}</span>
        </div>
        <div className="tier-row">
          <span className="tier-label">⭐ Premium User</span>
          <span className="tier-reward">{CURRENCY_ICON} {REFERRAL_REWARDS.premium.toLocaleString()}</span>
        </div>
      </div>

      {/* League bonuses */}
      <div className="league-bonuses">
        <h3>League Bonuses</h3>
        {LEAGUE_BONUSES.map(b => (
          <div key={b.league} className="bonus-row">
            <span className="bonus-league">{b.league}</span>
            <span className="bonus-value">{b.bonus}</span>
          </div>
        ))}
      </div>

      {/* Friends list */}
      <div className="friends-section">
        <h3>Your Frens ({friends.length})</h3>
        {friends.length === 0 ? (
          <div className="no-friends">No friends yet. Start inviting!</div>
        ) : (
          friends.map(f => (
            <div key={f.id} className="friend-card">
              <div className="friend-avatar">{f.first_name[0]}</div>
              <div className="friend-info">
                <div className="friend-name">{f.first_name} {f.is_premium && '⭐'}</div>
                <div className="friend-status">{f.reward_claimed ? 'Reward claimed' : 'Pending'}</div>
              </div>
              <div className="friend-reward">{CURRENCY_ICON} {f.reward_amount.toLocaleString()}</div>
            </div>
          ))
        )}
      </div>

      <button
        className="invite-btn"
        onClick={() => {
          const code = state.user?.referral_code || 'DEMO123';
          const text = `Join me on TapRealm! Use my code: ${code}`;
          const tg = (window as { Telegram?: { WebApp?: { openTelegramLink: (url: string) => void } } }).Telegram;
          if (tg?.WebApp) {
            tg.WebApp.openTelegramLink(
              `https://t.me/share/url?url=${encodeURIComponent(text)}`
            );
          } else {
            navigator.clipboard.writeText(text).catch(() => { /* ignore */ });
          }
        }}
      >
        Invite a fren
      </button>
    </div>
  );
}
