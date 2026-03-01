import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
  type ReactNode,
} from 'react';
import { api } from '@/api/client.ts';

interface Upgrade {
  id: string;
  level: number;
  basePrice: number;
}

interface BoostUsage {
  used: number;
  max: number;
}

interface GameState {
  balance: number;
  energy: number;
  maxEnergy: number;
  coinsPerTap: number;
  league: string;
  rank: number;
  upgrades: Record<string, Upgrade>;
  boosts: Record<string, BoostUsage>;
  regenRate: number;
}

interface GameContextValue extends GameState {
  tap: (count?: number) => void;
  claimBoost: (boostId: string) => void;
  purchaseUpgrade: (upgradeId: string) => boolean;
}

const GameContext = createContext<GameContextValue | null>(null);

function getLeague(balance: number): string {
  if (balance >= 5_000_000) return 'Master';
  if (balance >= 1_000_000) return 'Diamond';
  if (balance >= 200_000) return 'Platinum';
  if (balance >= 50_000) return 'Gold';
  if (balance >= 10_000) return 'Silver';
  return 'Bronze';
}

function upgradePrice(base: number, level: number): number {
  return Math.floor(base * (2 ** level));
}

const DEFAULT_UPGRADES: Record<string, Upgrade> = {
  multitap: { id: 'multitap', level: 1, basePrice: 500 },
  energyLimit: { id: 'energyLimit', level: 1, basePrice: 1000 },
  regenSpeed: { id: 'regenSpeed', level: 1, basePrice: 2000 },
  autoBot: { id: 'autoBot', level: 0, basePrice: 50000 },
};

const DEFAULT_BOOSTS: Record<string, BoostUsage> = {
  fullEnergy: { used: 0, max: 3 },
  turbo: { used: 0, max: 3 },
};

function calcMaxEnergy(level: number): number {
  return 500 + (level - 1) * 500;
}

function calcRegenRate(level: number): number {
  return level;
}

export function GameProvider({ children }: { children: ReactNode }) {
  const [balance, setBalance] = useState(0);
  const [energy, setEnergy] = useState(500);
  const [upgrades, setUpgrades] = useState<Record<string, Upgrade>>({ ...DEFAULT_UPGRADES });
  const [boosts, setBoosts] = useState<Record<string, BoostUsage>>({ ...DEFAULT_BOOSTS });
  const initialized = useRef(false);

  const maxEnergy = calcMaxEnergy(upgrades.energyLimit.level);
  const coinsPerTap = upgrades.multitap.level;
  const regenRate = calcRegenRate(upgrades.regenSpeed.level);
  const league = getLeague(balance);
  const rank = 1;

  // Try loading state from backend on mount
  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;
    api.getState().then((state) => {
      if (state) {
        setBalance(state.balance);
        setEnergy(state.energy);
      }
    });
  }, []);

  // Energy regeneration timer
  useEffect(() => {
    const interval = setInterval(() => {
      setEnergy((prev) => Math.min(prev + regenRate, maxEnergy));
    }, 1000);
    return () => clearInterval(interval);
  }, [regenRate, maxEnergy]);

  const tap = useCallback((count = 1) => {
    setEnergy((prev) => {
      const taps = Math.min(count, prev);
      if (taps <= 0) return prev;
      setBalance((b) => b + taps * coinsPerTap);
      return prev - taps;
    });
  }, [coinsPerTap]);

  const claimBoost = useCallback((boostId: string) => {
    setBoosts((prev) => {
      const boost = prev[boostId];
      if (!boost || boost.used >= boost.max) return prev;
      const updated = { ...prev, [boostId]: { ...boost, used: boost.used + 1 } };

      if (boostId === 'fullEnergy') {
        setEnergy(maxEnergy);
      }
      return updated;
    });
    api.claimBoost(boostId);
  }, [maxEnergy]);

  const purchaseUpgrade = useCallback((upgradeId: string): boolean => {
    const upgrade = upgrades[upgradeId];
    if (!upgrade) return false;
    const price = upgradePrice(upgrade.basePrice, upgrade.level);
    if (balance < price) return false;

    setBalance((b) => b - price);
    setUpgrades((prev) => ({
      ...prev,
      [upgradeId]: { ...prev[upgradeId], level: prev[upgradeId].level + 1 },
    }));

    if (upgradeId === 'energyLimit') {
      setEnergy((prev) => Math.min(prev, calcMaxEnergy(upgrade.level + 1)));
    }

    api.purchaseUpgrade(upgradeId);
    return true;
  }, [upgrades, balance]);

  const value: GameContextValue = {
    balance,
    energy,
    maxEnergy,
    coinsPerTap,
    league,
    rank,
    upgrades,
    boosts,
    regenRate,
    tap,
    claimBoost,
    purchaseUpgrade,
  };

  return <GameContext.Provider value={value}>{children}</GameContext.Provider>;
}

export function useGame(): GameContextValue {
  const ctx = useContext(GameContext);
  if (!ctx) throw new Error('useGame must be used within GameProvider');
  return ctx;
}

export { upgradePrice };
