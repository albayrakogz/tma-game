export interface User {
  id: number;
  telegram_id: string;
  username: string;
  first_name: string;
  last_name: string;
  is_premium: boolean;
  balance: number;
  total_earned: number;
  league: string;
  energy: number;
  max_energy: number;
  energy_regen_rate: number;
  tap_power: number;
  referral_code: string;
  squad_id: number | null;
  created_at: string;
}

export interface GameState {
  user: User | null;
  upgrades: Upgrade[];
  activeBoosts: BoostClaim[];
  tasks: TaskWithProgress[];
  dailyReward: DailyReward | null;
  loading: boolean;
  error: string | null;
}

export interface Upgrade {
  upgrade_type: string;
  level: number;
  next_price: number;
  max_level: number;
  current_effect: number;
  next_effect: number;
}

export interface BoostClaim {
  boost_type: string;
  claimed_at: string;
  next_available: string;
}

export interface TaskWithProgress {
  id: number;
  category: string;
  title: string;
  description: string;
  reward: number;
  type: string;
  target_value: number;
  icon: string;
  unlock_league: string | null;
  progress: number;
  status: string; // 'available' | 'in_progress' | 'claimable' | 'claimed' | 'locked'
}

export interface DailyReward {
  day_streak: number;
  last_claim: string | null;
  can_claim: boolean;
  reward_amount: number;
}

export interface Squad {
  id: number;
  name: string;
  description: string;
  emblem: string;
  leader_id: number;
  total_score: number;
  member_count: number;
  league: string;
  created_at: string;
}

export interface SquadMember {
  id: number;
  user_id: number;
  username: string;
  first_name: string;
  role: string;
  contribution: number;
  joined_at: string;
}

export interface LeaderboardEntry {
  user_id: number;
  username: string;
  first_name: string;
  score: number;
  league: string;
  rank: number;
}

export interface ReferralFriend {
  id: number;
  username: string;
  first_name: string;
  is_premium: boolean;
  reward_claimed: boolean;
  reward_amount: number;
  created_at: string;
}

export interface TapResult {
  coins_earned: number;
  new_balance: number;
  energy: number;
  total_earned: number;
  league: string;
}

export interface Announcement {
  id: number;
  title: string;
  content: string;
  type: string;
  created_at: string;
}

export type LeagueName = 'bronze' | 'silver' | 'gold' | 'platinum' | 'diamond' | 'master';

export interface LeagueInfo {
  name: LeagueName;
  display_name: string;
  min_score: number;
  icon: string;
  color: string;
}

export const LEAGUES: LeagueInfo[] = [
  { name: 'bronze', display_name: 'Bronze', min_score: 0, icon: '🥉', color: '#CD7F32' },
  { name: 'silver', display_name: 'Silver', min_score: 5000, icon: '🥈', color: '#C0C0C0' },
  { name: 'gold', display_name: 'Gold', min_score: 25000, icon: '🥇', color: '#FFD700' },
  { name: 'platinum', display_name: 'Platinum', min_score: 100000, icon: '💎', color: '#E5E4E2' },
  { name: 'diamond', display_name: 'Diamond', min_score: 500000, icon: '💠', color: '#B9F2FF' },
  { name: 'master', display_name: 'Master', min_score: 2000000, icon: '👑', color: '#FF4500' },
];
