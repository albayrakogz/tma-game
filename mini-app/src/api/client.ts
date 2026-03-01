import { initData } from '@tma.js/sdk-react';

const BASE_URL = import.meta.env.VITE_API_URL || '';

async function request<T>(path: string, options: RequestInit = {}): Promise<T | null> {
  try {
    const raw = initData.raw();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(raw ? { Authorization: `tma ${raw}` } : {}),
    };
    const res = await fetch(`${BASE_URL}${path}`, { ...options, headers });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

export interface GameState {
  balance: number;
  energy: number;
  maxEnergy: number;
  coinsPerTap: number;
  league: string;
  rank: number;
  multitapLevel: number;
  energyLimitLevel: number;
  regenSpeedLevel: number;
  autoBotLevel: number;
}

export interface TapResult {
  balance: number;
  energy: number;
}

export const api = {
  getState: () => request<GameState>('/api/game/state'),
  tap: (count: number) => request<TapResult>('/api/game/tap', {
    method: 'POST',
    body: JSON.stringify({ count }),
  }),
  purchaseUpgrade: (upgradeId: string) => request<GameState>('/api/game/upgrade', {
    method: 'POST',
    body: JSON.stringify({ upgradeId }),
  }),
  claimBoost: (boostId: string) => request<GameState>('/api/game/boost', {
    method: 'POST',
    body: JSON.stringify({ boostId }),
  }),
};
