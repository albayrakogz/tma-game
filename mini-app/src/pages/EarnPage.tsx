type TaskStatus = 'locked' | 'available' | 'claimable' | 'completed';

interface Task {
  icon: string;
  title: string;
  description: string;
  reward: string;
  status: TaskStatus;
}

interface TaskGroup {
  title: string;
  tasks: Task[];
}

const TASK_GROUPS: TaskGroup[] = [
  {
    title: '🎯 Onboarding',
    tasks: [
      { icon: '👆', title: 'Make your first tap', description: 'Tap the coin once', reward: '100', status: 'completed' },
      { icon: '🔗', title: 'Join Telegram channel', description: 'Follow our updates', reward: '5,000', status: 'available' },
      { icon: '👥', title: 'Invite a fren', description: 'Refer your first friend', reward: '10,000', status: 'locked' },
    ],
  },
  {
    title: '📅 Daily',
    tasks: [
      { icon: '📲', title: 'Daily login', description: 'Visit the app today', reward: '500', status: 'claimable' },
      { icon: '⛏️', title: 'Tap 1000 times', description: 'Reach 1000 taps today', reward: '2,000', status: 'available' },
      { icon: '⚡', title: 'Use all energy', description: 'Drain your energy bar', reward: '1,000', status: 'locked' },
    ],
  },
  {
    title: '✨ Specials',
    tasks: [
      { icon: '🏆', title: 'Reach Gold league', description: 'Accumulate 10,000 coins', reward: '25,000', status: 'locked' },
      { icon: '🚀', title: 'Buy first upgrade', description: 'Purchase any upgrade', reward: '5,000', status: 'available' },
    ],
  },
  {
    title: '🌐 Community',
    tasks: [
      { icon: '🐦', title: 'Follow on X', description: 'Follow our X account', reward: '3,000', status: 'available' },
      { icon: '💬', title: 'Join chat group', description: 'Join our community chat', reward: '3,000', status: 'available' },
      { icon: '📺', title: 'Subscribe YouTube', description: 'Watch our videos', reward: '5,000', status: 'locked' },
    ],
  },
];

const STATUS_STYLES: Record<TaskStatus, { bg: string; text: string; label: string }> = {
  locked: { bg: '#333', text: '#666', label: '🔒 Locked' },
  available: { bg: '#1a3a2a', text: '#4ade80', label: '▶ Start' },
  claimable: { bg: '#3a2a1a', text: 'var(--game-gold)', label: '🎁 Claim' },
  completed: { bg: '#1a2a1a', text: '#4ade80', label: '✅ Done' },
};

export function EarnPage() {
  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--game-bg)',
      padding: '16px 16px 90px',
      color: 'var(--game-text)',
    }}>
      <h1 style={{ fontSize: 24, fontWeight: 800, textAlign: 'center', margin: '8px 0 20px' }}>
        ⭐ Earn Coins
      </h1>

      {TASK_GROUPS.map((group) => (
        <div key={group.title} style={{ marginBottom: 20 }}>
          <h3 style={{ fontSize: 15, fontWeight: 700, margin: '0 0 10px', color: 'var(--game-gold)' }}>
            {group.title}
          </h3>
          {group.tasks.map((task) => {
            const style = STATUS_STYLES[task.status];
            return (
              <div key={task.title} style={{
                display: 'flex',
                alignItems: 'center',
                background: 'var(--game-card)',
                borderRadius: 14,
                padding: '12px 14px',
                marginBottom: 8,
                gap: 12,
              }}>
                <div style={{ fontSize: 28, lineHeight: 1 }}>{task.icon}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 2 }}>{task.title}</div>
                  <div style={{ fontSize: 12, color: 'var(--game-text-secondary)' }}>{task.description}</div>
                  <div style={{ fontSize: 12, color: 'var(--game-gold-light)', marginTop: 2 }}>🪙 {task.reward}</div>
                </div>
                <div style={{
                  background: style.bg,
                  color: style.text,
                  fontSize: 11,
                  fontWeight: 600,
                  borderRadius: 8,
                  padding: '5px 10px',
                  whiteSpace: 'nowrap',
                }}>
                  {style.label}
                </div>
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}
