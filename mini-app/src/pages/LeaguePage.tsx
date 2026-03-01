import { useGame } from '../game/context';
import { CURRENCY_ICON } from '../game/constants';
import { LEAGUES } from '../game/types';
import type { LeaderboardEntry } from '../game/types';
import './LeaguePage.css';

const DEMO_LEADERBOARD: LeaderboardEntry[] = [
  { user_id: 101, username: 'mega_tapper', first_name: 'Elena', score: 2450000, league: 'master', rank: 1 },
  { user_id: 102, username: 'orb_king', first_name: 'Marcus', score: 1820000, league: 'diamond', rank: 2 },
  { user_id: 103, username: 'tap_fury', first_name: 'Yuki', score: 980000, league: 'diamond', rank: 3 },
  { user_id: 104, username: 'realm_pro', first_name: 'Jake', score: 540000, league: 'platinum', rank: 4 },
  { user_id: 105, username: 'gold_rush', first_name: 'Nina', score: 320000, league: 'platinum', rank: 5 },
  { user_id: 106, username: 'swift_tap', first_name: 'Leo', score: 150000, league: 'gold', rank: 6 },
  { user_id: 107, username: 'orbweaver', first_name: 'Ava', score: 88000, league: 'gold', rank: 7 },
  { user_id: 108, username: 'tap_ninja', first_name: 'Ryu', score: 42000, league: 'gold', rank: 8 },
  { user_id: 109, username: 'crystal_m', first_name: 'Zoe', score: 18000, league: 'silver', rank: 9 },
  { user_id: 110, username: 'new_realm', first_name: 'Dan', score: 6500, league: 'silver', rank: 10 },
];

export function LeaguePage() {
  const { state } = useGame();
  const user = state.user;
  const totalEarned = user?.total_earned || 0;
  const currentLeague = LEAGUES.find(l => l.name === user?.league) || LEAGUES[0];
  const currentIdx = LEAGUES.indexOf(currentLeague);
  const nextLeague = LEAGUES[currentIdx + 1];

  const progress = nextLeague
    ? ((totalEarned - currentLeague.min_score) / (nextLeague.min_score - currentLeague.min_score)) * 100
    : 100;

  const getRankClass = (rank: number) => {
    if (rank === 1) return 'gold';
    if (rank === 2) return 'silver';
    if (rank === 3) return 'bronze-rank';
    return '';
  };

  const getLeagueIcon = (league: string) => {
    const l = LEAGUES.find(lg => lg.name === league);
    return l ? l.icon : '🥉';
  };

  return (
    <div className="league-page">
      <div className="league-header">
        <h1>Leagues 🏆</h1>
        <p>Climb the ranks and earn exclusive rewards</p>
      </div>

      {/* Current rank */}
      <div className="current-rank">
        <div className="rank-label">Your League</div>
        <div className="rank-value" style={{ color: currentLeague.color }}>
          {currentLeague.icon} {currentLeague.display_name}
        </div>
      </div>

      {/* Progress to next */}
      {nextLeague && (
        <div className="league-next-progress">
          <div className="league-next-label">
            <span>{currentLeague.icon} {currentLeague.display_name}</span>
            <span>{nextLeague.icon} {nextLeague.display_name}</span>
          </div>
          <div className="league-next-bar">
            <div
              className="league-next-fill"
              style={{
                width: `${Math.min(100, Math.max(0, progress))}%`,
                background: `linear-gradient(90deg, ${currentLeague.color}, ${nextLeague.color})`,
              }}
            />
          </div>
          <div className="league-next-label" style={{ marginTop: 6 }}>
            <span style={{ fontSize: 11 }}>{CURRENCY_ICON} {totalEarned.toLocaleString()}</span>
            <span style={{ fontSize: 11 }}>{CURRENCY_ICON} {nextLeague.min_score.toLocaleString()}</span>
          </div>
        </div>
      )}

      {/* All tiers */}
      <h3>All Leagues</h3>
      <div className="league-tiers">
        {LEAGUES.map((league, i) => {
          const isCurrent = league.name === currentLeague.name;
          const isUnlocked = totalEarned >= league.min_score;
          return (
            <div
              key={league.name}
              className={`league-card ${isCurrent ? 'current' : ''}`}
              style={{ borderLeftColor: league.color }}
            >
              <div className="league-icon">{league.icon}</div>
              <div className="league-card-info">
                <div className="league-card-name" style={{ color: isCurrent ? league.color : '#fff' }}>
                  {league.display_name}
                </div>
                <div className="league-card-req">
                  {i === 0 ? 'Starting league' : `${CURRENCY_ICON} ${league.min_score.toLocaleString()} total earned`}
                </div>
              </div>
              <span className={`league-card-status ${isCurrent ? 'active' : isUnlocked ? 'unlocked' : 'locked'}`}>
                {isCurrent ? '● Current' : isUnlocked ? '✓ Unlocked' : '🔒 Locked'}
              </span>
            </div>
          );
        })}
      </div>

      {/* Global leaderboard */}
      <h3>Top Players 🌍</h3>
      <div className="global-leaderboard">
        {DEMO_LEADERBOARD.map(entry => (
          <div key={entry.user_id} className={`lb-row ${entry.user_id === user?.id ? 'me' : ''}`}>
            <span className={`lb-rank ${getRankClass(entry.rank)}`}>#{entry.rank}</span>
            <div className="lb-avatar">{entry.first_name[0]}</div>
            <div className="lb-info">
              <div className="lb-name">{entry.first_name}</div>
              <div className="lb-league">{getLeagueIcon(entry.league)} {entry.league}</div>
            </div>
            <div className="lb-score">{CURRENCY_ICON} {entry.score.toLocaleString()}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
