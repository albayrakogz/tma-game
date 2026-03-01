import { useGame } from '../game/context';
import { CURRENCY_ICON } from '../game/constants';
import type { TaskWithProgress } from '../game/types';
import './EarnPage.css';

const DEMO_TASKS: TaskWithProgress[] = [
  { id: 1, category: 'onboarding', title: 'First Tap', description: 'Tap the orb for the first time', reward: 100, type: 'action', target_value: 1, icon: '👆', unlock_league: null, progress: 1, status: 'claimed' },
  { id: 2, category: 'onboarding', title: 'Join Channel', description: 'Follow our Telegram channel', reward: 500, type: 'social', target_value: 1, icon: '📢', unlock_league: null, progress: 0, status: 'available' },
  { id: 3, category: 'daily', title: 'Daily Login', description: 'Claim your daily reward', reward: 200, type: 'daily', target_value: 1, icon: '📅', unlock_league: null, progress: 0, status: 'available' },
  { id: 4, category: 'daily', title: 'Tap 100 Times', description: 'Tap 100 times today', reward: 300, type: 'action', target_value: 100, icon: '🎯', unlock_league: null, progress: 42, status: 'in_progress' },
  { id: 5, category: 'specials', title: 'Reach Silver', description: 'Achieve Silver league', reward: 2000, type: 'milestone', target_value: 5000, icon: '🥈', unlock_league: null, progress: 0, status: 'available' },
  { id: 6, category: 'specials', title: 'Invite 3 Frens', description: 'Refer 3 friends', reward: 3000, type: 'referral', target_value: 3, icon: '👥', unlock_league: null, progress: 0, status: 'available' },
  { id: 7, category: 'community', title: 'Follow X/Twitter', description: 'Follow us on X', reward: 500, type: 'social', target_value: 1, icon: '🐦', unlock_league: null, progress: 0, status: 'available' },
  { id: 8, category: 'community', title: 'Gold Exclusive', description: 'Unlock at Gold league', reward: 5000, type: 'social', target_value: 1, icon: '🔒', unlock_league: 'gold', progress: 0, status: 'locked' },
];

const CATEGORIES = [
  { key: 'onboarding', label: 'Onboarding' },
  { key: 'daily', label: 'Daily' },
  { key: 'specials', label: 'Specials' },
  { key: 'community', label: 'Community' },
];

function statusLabel(status: string): string {
  switch (status) {
    case 'available': return 'Start';
    case 'claimable': return 'Claim';
    case 'claimed': return '✓ Done';
    case 'locked': return '🔒 Locked';
    case 'in_progress': return 'In Progress';
    default: return status;
  }
}

export function EarnPage() {
  const { state, claimTask } = useGame();
  const tasks = state.tasks.length > 0 ? state.tasks : DEMO_TASKS;

  return (
    <div className="earn-page">
      <h1>📋 Earn Orbs</h1>

      {CATEGORIES.map(cat => {
        const catTasks = tasks.filter(t => t.category === cat.key);
        if (catTasks.length === 0) return null;
        return (
          <div key={cat.key} className="earn-category">
            <div className="earn-category-header">{cat.label}</div>
            {catTasks.map(task => (
              <div key={task.id} className="task-card">
                <div className="task-icon">{task.icon}</div>
                <div className="task-info">
                  <div className="task-title">{task.title}</div>
                  <div className="task-desc">{task.description}</div>
                  <div className="task-reward">{CURRENCY_ICON} {task.reward.toLocaleString()}</div>
                </div>
                <div className="task-action">
                  <button
                    className={`task-badge ${task.status}`}
                    onClick={() => {
                      if (task.status === 'claimable') {
                        claimTask(task.id);
                      }
                    }}
                    disabled={task.status === 'claimed' || task.status === 'locked'}
                  >
                    {statusLabel(task.status)}
                  </button>
                </div>
              </div>
            ))}
          </div>
        );
      })}
    </div>
  );
}
