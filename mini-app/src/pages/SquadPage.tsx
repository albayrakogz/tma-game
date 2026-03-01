import { useState } from 'react';
import { useGame } from '../game/context';
import { CURRENCY_ICON } from '../game/constants';
import type { Squad, SquadMember } from '../game/types';
import { LEAGUES } from '../game/types';
import './SquadPage.css';

const DEMO_SQUADS: Squad[] = [
  { id: 1, name: 'Orb Hunters', description: 'Top tappers', emblem: '🐉', leader_id: 1, total_score: 125000, member_count: 12, league: 'gold', created_at: '2024-01-01T00:00:00Z' },
  { id: 2, name: 'Tap Titans', description: 'Never stop tapping', emblem: '⚔️', leader_id: 2, total_score: 85000, member_count: 8, league: 'silver', created_at: '2024-01-05T00:00:00Z' },
  { id: 3, name: 'Realm Reapers', description: 'Reap the rewards', emblem: '💀', leader_id: 3, total_score: 210000, member_count: 15, league: 'platinum', created_at: '2024-01-03T00:00:00Z' },
];

const DEMO_MEMBERS: SquadMember[] = [
  { id: 1, user_id: 1, username: 'dragon_lord', first_name: 'Alex', role: 'leader', contribution: 45000, joined_at: '2024-01-01T00:00:00Z' },
  { id: 2, user_id: 2, username: 'tap_queen', first_name: 'Mia', role: 'member', contribution: 32000, joined_at: '2024-01-02T00:00:00Z' },
  { id: 3, user_id: 3, username: 'orb_master', first_name: 'Sam', role: 'member', contribution: 28000, joined_at: '2024-01-04T00:00:00Z' },
  { id: 4, user_id: 4, username: 'realm_walker', first_name: 'Kai', role: 'member', contribution: 20000, joined_at: '2024-01-06T00:00:00Z' },
];

export function SquadPage() {
  const { state } = useGame();
  const [inSquad, setInSquad] = useState(false);
  const [squadName, setSquadName] = useState('');
  const [activeTab, setActiveTab] = useState<'members' | 'leaderboard'>('members');
  const [mySquad, setMySquad] = useState<Squad | null>(null);

  const handleCreate = () => {
    if (!squadName.trim()) return;
    const newSquad: Squad = {
      id: 99,
      name: squadName.trim(),
      description: '',
      emblem: '🛡️',
      leader_id: state.user?.id || 0,
      total_score: state.user?.total_earned || 0,
      member_count: 1,
      league: state.user?.league || 'bronze',
      created_at: new Date().toISOString(),
    };
    setMySquad(newSquad);
    setInSquad(true);
    setSquadName('');
  };

  const handleJoin = (squad: Squad) => {
    setMySquad({ ...squad, member_count: squad.member_count + 1 });
    setInSquad(true);
  };

  const handleLeave = () => {
    if (window.confirm('Are you sure you want to leave this squad?')) {
      setMySquad(null);
      setInSquad(false);
    }
  };

  const getLeagueIcon = (league: string) => {
    const l = LEAGUES.find(lg => lg.name === league);
    return l ? l.icon : '🥉';
  };

  const sortedMembers = [...DEMO_MEMBERS].sort((a, b) => b.contribution - a.contribution);

  if (!inSquad) {
    return (
      <div className="squad-page">
        <div className="squad-header">
          <h1>Squads 🛡️</h1>
          <p>Join or create a squad to compete together!</p>
        </div>

        <div className="squad-create">
          <h3>Create a Squad</h3>
          <div className="squad-form">
            <input
              type="text"
              placeholder="Squad name..."
              value={squadName}
              onChange={e => setSquadName(e.target.value)}
              maxLength={24}
            />
            <button onClick={handleCreate}>Create</button>
          </div>
        </div>

        <h3>Browse Squads</h3>
        <div className="squad-list">
          {DEMO_SQUADS.map(squad => (
            <div key={squad.id} className="squad-card">
              <div className="squad-emblem">{squad.emblem}</div>
              <div className="squad-info">
                <div className="squad-name">{squad.name}</div>
                <div className="squad-meta">
                  {squad.member_count} members · {CURRENCY_ICON} {squad.total_score.toLocaleString()} · {getLeagueIcon(squad.league)}
                </div>
              </div>
              <button className="squad-join-btn" onClick={() => handleJoin(squad)}>Join</button>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="squad-page">
      <div className="my-squad-detail">
        <div className="my-squad-emblem">{mySquad?.emblem || '🛡️'}</div>
        <div className="my-squad-name">{mySquad?.name || 'My Squad'}</div>
        <div className="my-squad-stats">
          <div className="my-squad-stat">
            <span className="stat-value">{CURRENCY_ICON} {(mySquad?.total_score || 0).toLocaleString()}</span>
            <span className="stat-label">Total Score</span>
          </div>
          <div className="my-squad-stat">
            <span className="stat-value">{mySquad?.member_count || 1}</span>
            <span className="stat-label">Members</span>
          </div>
          <div className="my-squad-stat">
            <span className="stat-value">{getLeagueIcon(mySquad?.league || 'bronze')}</span>
            <span className="stat-label">League</span>
          </div>
        </div>
      </div>

      <div className="squad-tabs">
        <button className={`squad-tab ${activeTab === 'members' ? 'active' : ''}`} onClick={() => setActiveTab('members')}>Members</button>
        <button className={`squad-tab ${activeTab === 'leaderboard' ? 'active' : ''}`} onClick={() => setActiveTab('leaderboard')}>Leaderboard</button>
      </div>

      <div className="member-list">
        {(activeTab === 'leaderboard' ? sortedMembers : DEMO_MEMBERS).map((m, i) => (
          <div key={m.id} className="member-row">
            <span className="member-rank">#{activeTab === 'leaderboard' ? i + 1 : ''}</span>
            <div className="member-avatar">{m.first_name[0]}</div>
            <div className="member-info">
              <div className="member-name">{m.first_name}</div>
              <div className="member-role">{m.role === 'leader' ? '👑 Leader' : 'Member'}</div>
            </div>
            <div className="member-score">{CURRENCY_ICON} {m.contribution.toLocaleString()}</div>
          </div>
        ))}
      </div>

      <button className="leave-btn" onClick={handleLeave}>Leave Squad</button>
    </div>
  );
}
