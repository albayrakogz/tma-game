import { useNavigate, useLocation } from 'react-router-dom';

const tabs = [
  { path: '/', label: 'Home', icon: '⛏️' },
  { path: '/frens', label: 'Frens', icon: '👥' },
  { path: '/earn', label: 'Earn', icon: '⭐' },
  { path: '/boosts', label: 'Boosts', icon: '🚀' },
];

export function BottomNav() {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <nav style={{
      position: 'fixed',
      bottom: 0,
      left: 0,
      right: 0,
      display: 'flex',
      justifyContent: 'space-around',
      alignItems: 'center',
      background: 'var(--game-surface)',
      borderTop: '1px solid var(--game-border)',
      paddingTop: 8,
      paddingBottom: 'max(8px, env(safe-area-inset-bottom))',
      zIndex: 100,
    }}>
      {tabs.map((tab) => {
        const active = location.pathname === tab.path;
        return (
          <button
            key={tab.path}
            onClick={() => navigate(tab.path)}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 2,
              background: 'none',
              border: 'none',
              padding: '4px 16px',
              borderRadius: 12,
              cursor: 'pointer',
              color: active ? 'var(--game-gold)' : 'var(--game-text-secondary)',
              fontSize: 10,
              fontWeight: active ? 700 : 400,
              transition: 'color 0.2s',
            }}
          >
            <span style={{ fontSize: 22 }}>{tab.icon}</span>
            <span>{tab.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
