import { useLocation, useNavigate } from 'react-router-dom';
import './BottomNav.css';

const TABS = [
  { path: '/', icon: '🏠', label: 'Home' },
  { path: '/frens', icon: '👥', label: 'Frens' },
  { path: '/earn', icon: '📋', label: 'Earn' },
  { path: '/boosts', icon: '🚀', label: 'Boosts' },
];

export function BottomNav() {
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <nav className="bottom-nav">
      {TABS.map(tab => (
        <button
          key={tab.path}
          className={`nav-item ${location.pathname === tab.path ? 'active' : ''}`}
          onClick={() => navigate(tab.path)}
        >
          <span className="nav-icon">{tab.icon}</span>
          <span className="nav-label">{tab.label}</span>
        </button>
      ))}
    </nav>
  );
}
