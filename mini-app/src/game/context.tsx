import { createContext, useContext, useCallback, useReducer, useEffect, useRef, type ReactNode } from 'react';
import type { GameState, User, Upgrade, BoostClaim, TaskWithProgress, DailyReward, TapResult } from './types';
import * as api from './api';
import { ENERGY_REGEN_INTERVAL_MS, TAP_SUBMIT_INTERVAL_MS } from './constants';

// Actions
type GameAction =
  | { type: 'SET_LOADING'; loading: boolean }
  | { type: 'SET_ERROR'; error: string | null }
  | { type: 'SET_USER'; user: User }
  | { type: 'SET_GAME_STATE'; user: User; upgrades: Upgrade[]; activeBoosts: BoostClaim[]; tasks: TaskWithProgress[]; dailyReward: DailyReward }
  | { type: 'UPDATE_BALANCE'; balance: number; total_earned?: number }
  | { type: 'UPDATE_ENERGY'; energy: number }
  | { type: 'UPDATE_LEAGUE'; league: string }
  | { type: 'LOCAL_TAP'; coins: number; energy_cost: number }
  | { type: 'SYNC_TAP_RESULT'; result: TapResult }
  | { type: 'SET_UPGRADES'; upgrades: Upgrade[] }
  | { type: 'SET_TASKS'; tasks: TaskWithProgress[] }
  | { type: 'SET_DAILY_REWARD'; dailyReward: DailyReward }
  | { type: 'REGEN_ENERGY' };

const initialState: GameState = {
  user: null,
  upgrades: [],
  activeBoosts: [],
  tasks: [],
  dailyReward: null,
  loading: true,
  error: null,
};

function gameReducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, loading: action.loading };
    case 'SET_ERROR':
      return { ...state, error: action.error };
    case 'SET_USER':
      return { ...state, user: action.user };
    case 'SET_GAME_STATE':
      return {
        ...state,
        user: action.user,
        upgrades: action.upgrades,
        activeBoosts: action.activeBoosts,
        tasks: action.tasks,
        dailyReward: action.dailyReward,
        loading: false,
      };
    case 'UPDATE_BALANCE':
      if (!state.user) return state;
      return {
        ...state,
        user: {
          ...state.user,
          balance: action.balance,
          total_earned: action.total_earned ?? state.user.total_earned,
        },
      };
    case 'UPDATE_ENERGY':
      if (!state.user) return state;
      return { ...state, user: { ...state.user, energy: action.energy } };
    case 'UPDATE_LEAGUE':
      if (!state.user) return state;
      return { ...state, user: { ...state.user, league: action.league } };
    case 'LOCAL_TAP':
      if (!state.user) return state;
      return {
        ...state,
        user: {
          ...state.user,
          balance: state.user.balance + action.coins,
          total_earned: state.user.total_earned + action.coins,
          energy: Math.max(0, state.user.energy - action.energy_cost),
        },
      };
    case 'SYNC_TAP_RESULT':
      if (!state.user) return state;
      return {
        ...state,
        user: {
          ...state.user,
          balance: action.result.new_balance,
          total_earned: action.result.total_earned,
          energy: action.result.energy,
          league: action.result.league,
        },
      };
    case 'SET_UPGRADES':
      return { ...state, upgrades: action.upgrades };
    case 'SET_TASKS':
      return { ...state, tasks: action.tasks };
    case 'SET_DAILY_REWARD':
      return { ...state, dailyReward: action.dailyReward };
    case 'REGEN_ENERGY': {
      if (!state.user) return state;
      const newEnergy = Math.min(state.user.max_energy, state.user.energy + state.user.energy_regen_rate);
      return { ...state, user: { ...state.user, energy: newEnergy } };
    }
    default:
      return state;
  }
}

interface GameContextValue {
  state: GameState;
  tap: (count?: number) => void;
  refreshState: () => Promise<void>;
  claimDaily: () => Promise<void>;
  claimBoost: (boostType: string) => Promise<void>;
  buyUpgrade: (upgradeType: string) => Promise<void>;
  claimTask: (taskId: number) => Promise<void>;
  refreshTasks: () => Promise<void>;
}

const GameContext = createContext<GameContextValue | null>(null);

export function useGame(): GameContextValue {
  const ctx = useContext(GameContext);
  if (!ctx) throw new Error('useGame must be used within GameProvider');
  return ctx;
}

export function GameProvider({ children, initData }: { children: ReactNode; initData?: string }) {
  const [state, dispatch] = useReducer(gameReducer, initialState);
  const pendingTapsRef = useRef(0);
  const tapTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Initialize: authenticate and load game state
  useEffect(() => {
    async function init() {
      try {
        dispatch({ type: 'SET_LOADING', loading: true });

        if (initData) {
          await api.authenticateWithTelegram(initData);
        }

        const gameState = await api.getGameState();
        dispatch({
          type: 'SET_GAME_STATE',
          user: gameState.user,
          upgrades: gameState.upgrades,
          activeBoosts: gameState.activeBoosts,
          tasks: gameState.tasks,
          dailyReward: gameState.dailyReward,
        });
      } catch (err) {
        console.error('Init error:', err);
        // In demo mode, set up a mock user for offline/demo play
        const demoUser: User = {
          id: 1,
          telegram_id: '12345',
          username: 'demo_player',
          first_name: 'Demo',
          last_name: 'Player',
          is_premium: false,
          balance: 1000,
          total_earned: 1000,
          league: 'bronze',
          energy: 500,
          max_energy: 500,
          energy_regen_rate: 1,
          tap_power: 1,
          referral_code: 'DEMO123',
          squad_id: null,
          created_at: new Date().toISOString(),
        };
        dispatch({
          type: 'SET_GAME_STATE',
          user: demoUser,
          upgrades: [],
          activeBoosts: [],
          tasks: [],
          dailyReward: { day_streak: 0, last_claim: null, can_claim: true, reward_amount: 100 },
        });
      }
    }
    init();
  }, [initData]);

  // Energy regeneration timer
  useEffect(() => {
    const timer = setInterval(() => {
      dispatch({ type: 'REGEN_ENERGY' });
    }, ENERGY_REGEN_INTERVAL_MS);
    return () => clearInterval(timer);
  }, []);

  // Batched tap submission
  const flushTaps = useCallback(async () => {
    const count = pendingTapsRef.current;
    if (count <= 0) return;
    pendingTapsRef.current = 0;
    try {
      const result = await api.submitTaps(count);
      dispatch({ type: 'SYNC_TAP_RESULT', result });
    } catch {
      // Silently fail - local state already updated
    }
  }, []);

  const tap = useCallback((count = 1) => {
    if (!state.user || state.user.energy < count) return;

    // Optimistic local update
    dispatch({
      type: 'LOCAL_TAP',
      coins: count * state.user.tap_power,
      energy_cost: count,
    });

    pendingTapsRef.current += count;

    // Debounce server submission
    if (tapTimerRef.current) clearTimeout(tapTimerRef.current);
    tapTimerRef.current = setTimeout(flushTaps, TAP_SUBMIT_INTERVAL_MS);
  }, [state.user, flushTaps]);

  const refreshState = useCallback(async () => {
    try {
      const gameState = await api.getGameState();
      dispatch({
        type: 'SET_GAME_STATE',
        user: gameState.user,
        upgrades: gameState.upgrades,
        activeBoosts: gameState.activeBoosts,
        tasks: gameState.tasks,
        dailyReward: gameState.dailyReward,
      });
    } catch {
      // Ignore refresh errors
    }
  }, []);

  const claimDaily = useCallback(async () => {
    try {
      const result = await api.claimDailyReward();
      dispatch({ type: 'UPDATE_BALANCE', balance: result.balance });
      dispatch({
        type: 'SET_DAILY_REWARD',
        dailyReward: { day_streak: result.streak, last_claim: new Date().toISOString(), can_claim: false, reward_amount: 0 },
      });
    } catch {
      // Demo mode: local claim
      if (state.user) {
        dispatch({ type: 'UPDATE_BALANCE', balance: state.user.balance + 100 });
      }
    }
  }, [state.user]);

  const claimBoostAction = useCallback(async (boostType: string) => {
    try {
      await api.claimBoost(boostType);
      await refreshState();
    } catch {
      // Demo mode: locally apply boost
      if (state.user && boostType === 'full_energy') {
        dispatch({ type: 'UPDATE_ENERGY', energy: state.user.max_energy });
      }
    }
  }, [state.user, refreshState]);

  const buyUpgradeAction = useCallback(async (upgradeType: string) => {
    try {
      const result = await api.buyUpgrade(upgradeType);
      dispatch({ type: 'UPDATE_BALANCE', balance: result.user.balance });
      await refreshState();
    } catch {
      // Ignore
    }
  }, [refreshState]);

  const claimTaskAction = useCallback(async (taskId: number) => {
    try {
      const result = await api.claimTask(taskId);
      dispatch({ type: 'UPDATE_BALANCE', balance: result.balance, total_earned: result.totalEarned });
      const tasks = await api.getTasks();
      dispatch({ type: 'SET_TASKS', tasks });
    } catch {
      // Ignore
    }
  }, []);

  const refreshTasks = useCallback(async () => {
    try {
      const tasks = await api.getTasks();
      dispatch({ type: 'SET_TASKS', tasks });
    } catch {
      // Ignore
    }
  }, []);

  return (
    <GameContext.Provider value={{
      state,
      tap,
      refreshState,
      claimDaily,
      claimBoost: claimBoostAction,
      buyUpgrade: buyUpgradeAction,
      claimTask: claimTaskAction,
      refreshTasks,
    }}>
      {children}
    </GameContext.Provider>
  );
}
