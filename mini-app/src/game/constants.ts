// Game economy constants (mirrors backend)
export const GAME_NAME = 'TapRealm';
export const CURRENCY_NAME = 'Orbs';
export const CURRENCY_ICON = '🔮';

export const BASE_TAP_POWER = 1;
export const BASE_MAX_ENERGY = 500;
export const BASE_REGEN_RATE = 1; // per second
export const ENERGY_REGEN_INTERVAL_MS = 1000;

export const MAX_TAPS_PER_REQUEST = 20;
export const TAP_DEBOUNCE_MS = 100;
export const TAP_SUBMIT_INTERVAL_MS = 500;

export const UPGRADE_CONFIGS: Record<string, { name: string; description: string; icon: string; base_price: number; max_level: number }> = {
  multitap: { name: 'Multitap', description: 'Increase coins per tap', icon: '👆', base_price: 500, max_level: 20 },
  energy_limit: { name: 'Energy Limit', description: 'Increase max energy', icon: '🔋', base_price: 500, max_level: 20 },
  regen_speed: { name: 'Regen Speed', description: 'Faster energy refill', icon: '⚡', base_price: 1000, max_level: 20 },
  auto_tap: { name: 'Auto Tap Bot', description: 'Earn while away', icon: '🤖', base_price: 5000, max_level: 10 },
  critical_tap: { name: 'Critical Tap', description: 'Chance for 5x tap', icon: '💥', base_price: 2000, max_level: 15 },
  combo_multiplier: { name: 'Combo Multi', description: 'Combo tap multiplier', icon: '🔥', base_price: 3000, max_level: 15 },
};

export const BOOST_CONFIGS: Record<string, { name: string; description: string; icon: string; cooldown_hours: number }> = {
  full_energy: { name: 'Full Energy', description: 'Instantly refill energy', icon: '🔋', cooldown_hours: 8 },
  turbo: { name: 'Turbo Mode', description: '5x tap power for 10s', icon: '🚀', cooldown_hours: 8 },
};

export const REFERRAL_REWARDS = {
  regular: 500,
  premium: 2500,
};

export const DAILY_REWARDS = [100, 200, 300, 500, 800, 1200, 2000, 3000, 5000, 10000];

// API base URL - use env variable or relative path for same-origin
export const API_BASE_URL = import.meta.env.VITE_API_URL || '';
