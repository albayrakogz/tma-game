import { API_BASE_URL } from './constants';
import type {
  User,
  Upgrade,
  BoostClaim,
  TaskWithProgress,
  DailyReward,
  TapResult,
  Squad,
  SquadMember,
  LeaderboardEntry,
  ReferralFriend,
  Announcement,
} from './types';

let sessionToken: string | null = null;

export function setSessionToken(token: string) {
  sessionToken = token;
}

export function getSessionToken(): string | null {
  return sessionToken;
}

async function apiRequest<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {}),
  };
  if (sessionToken) {
    headers['Authorization'] = `Bearer ${sessionToken}`;
  }
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
  });
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(error.error || `HTTP ${response.status}`);
  }
  return response.json();
}

// Auth
export async function authenticateWithTelegram(initData: string): Promise<{ token: string; user: User }> {
  const result = await apiRequest<{ token: string; user: User }>('/api/auth/telegram', {
    method: 'POST',
    body: JSON.stringify({ initData }),
  });
  sessionToken = result.token;
  return result;
}

// User
export async function getUserProfile(): Promise<User> {
  return apiRequest<User>('/api/user/profile');
}

export async function getGameState(): Promise<{
  user: User;
  upgrades: Upgrade[];
  activeBoosts: BoostClaim[];
  tasks: TaskWithProgress[];
  dailyReward: DailyReward;
}> {
  return apiRequest('/api/user/state');
}

// Game
export async function submitTaps(count: number): Promise<TapResult> {
  return apiRequest<TapResult>('/api/game/tap', {
    method: 'POST',
    body: JSON.stringify({ count }),
  });
}

export async function claimDailyReward(): Promise<{ reward: number; streak: number; balance: number }> {
  return apiRequest('/api/game/claim-daily', { method: 'POST' });
}

export async function claimBoost(boostType: string): Promise<{ boostType: string; energy?: number; duration?: number; multiplier?: number; nextAvailable: string }> {
  return apiRequest('/api/game/boost/claim', {
    method: 'POST',
    body: JSON.stringify({ boost_type: boostType }),
  });
}

export async function buyUpgrade(upgradeType: string): Promise<{ upgradeType: string; newLevel: number; price: number; nextPrice: number | null; user: User }> {
  return apiRequest('/api/game/upgrade/buy', {
    method: 'POST',
    body: JSON.stringify({ upgrade_type: upgradeType }),
  });
}

export async function getUpgrades(): Promise<Upgrade[]> {
  return apiRequest<Upgrade[]>('/api/game/upgrades');
}

// Tasks
export async function getTasks(): Promise<TaskWithProgress[]> {
  return apiRequest<TaskWithProgress[]>('/api/tasks');
}

export async function claimTask(taskId: number): Promise<{ reward: number; balance: number; totalEarned: number }> {
  return apiRequest(`/api/tasks/${taskId}/claim`, { method: 'POST' });
}

export async function updateTaskProgress(taskId: number, progress: number): Promise<{ taskId: number; progress: number; status: string }> {
  return apiRequest(`/api/tasks/${taskId}/progress`, {
    method: 'POST',
    body: JSON.stringify({ progress }),
  });
}

// Social
export async function getReferralInfo(): Promise<{ referral_code: string; invite_link: string; total_friends: number; total_earned: number }> {
  return apiRequest('/api/referral/info');
}

export async function getReferralFriends(): Promise<ReferralFriend[]> {
  return apiRequest<ReferralFriend[]>('/api/referral/friends');
}

export async function claimReferralReward(referralId: number): Promise<{ reward: number; balance: number }> {
  return apiRequest(`/api/referral/claim`, {
    method: 'POST',
    body: JSON.stringify({ referral_id: referralId }),
  });
}

// Squads
export async function createSquad(name: string, description: string): Promise<Squad> {
  return apiRequest<Squad>('/api/squad/create', {
    method: 'POST',
    body: JSON.stringify({ name, description }),
  });
}

export async function joinSquad(squadId: number): Promise<{ message: string; squadId: number }> {
  return apiRequest(`/api/squad/join/${squadId}`, { method: 'POST' });
}

export async function leaveSquad(): Promise<{ message: string }> {
  return apiRequest('/api/squad/leave', { method: 'POST' });
}

export async function getSquad(squadId: number): Promise<Squad> {
  return apiRequest<Squad>(`/api/squad/${squadId}`);
}

export async function getSquadMembers(squadId: number): Promise<SquadMember[]> {
  return apiRequest<SquadMember[]>(`/api/squad/${squadId}/members`);
}

// Leaderboards
export async function getGlobalLeaderboard(): Promise<LeaderboardEntry[]> {
  return apiRequest<LeaderboardEntry[]>('/api/leaderboard/global');
}

export async function getLeagueLeaderboard(league: string): Promise<LeaderboardEntry[]> {
  return apiRequest<LeaderboardEntry[]>(`/api/leaderboard/league/${league}`);
}

export async function getSquadLeaderboard(): Promise<Squad[]> {
  return apiRequest<Squad[]>('/api/leaderboard/squad');
}

// Announcements
export async function getAnnouncements(): Promise<Announcement[]> {
  return apiRequest<Announcement[]>('/api/announcements');
}
