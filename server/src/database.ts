import Database from 'better-sqlite3';
import path from 'path';
import crypto from 'crypto';

const DB_PATH = process.env.DB_PATH || path.join(__dirname, '..', 'taprealm.db');

let db: Database.Database;

export function getDb(): Database.Database {
  if (!db) {
    db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
  }
  return db;
}

export function initializeDatabase(): void {
  const database = getDb();

  database.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      telegram_id TEXT UNIQUE NOT NULL,
      username TEXT,
      first_name TEXT,
      last_name TEXT,
      is_premium INTEGER DEFAULT 0,
      photo_url TEXT,
      balance INTEGER DEFAULT 0,
      total_earned INTEGER DEFAULT 0,
      league TEXT DEFAULT 'bronze',
      energy INTEGER DEFAULT 500,
      max_energy INTEGER DEFAULT 500,
      energy_regen_rate INTEGER DEFAULT 1,
      last_energy_update TEXT,
      tap_power INTEGER DEFAULT 1,
      referral_code TEXT UNIQUE,
      referred_by INTEGER REFERENCES users(id),
      squad_id INTEGER REFERENCES squads(id),
      is_banned INTEGER DEFAULT 0,
      fraud_score INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id),
      token TEXT UNIQUE NOT NULL,
      init_data_hash TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      expires_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS tap_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id),
      taps INTEGER NOT NULL,
      coins_earned INTEGER NOT NULL,
      energy_spent INTEGER NOT NULL,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS upgrades (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id),
      upgrade_type TEXT NOT NULL,
      level INTEGER DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      UNIQUE(user_id, upgrade_type)
    );

    CREATE TABLE IF NOT EXISTS boost_claims (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id),
      boost_type TEXT NOT NULL,
      claimed_at TEXT DEFAULT (datetime('now')),
      next_available TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS task_definitions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      category TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      reward INTEGER NOT NULL,
      type TEXT NOT NULL,
      target_value INTEGER DEFAULT 1,
      icon TEXT,
      unlock_league TEXT DEFAULT 'bronze',
      is_active INTEGER DEFAULT 1,
      sort_order INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS task_progress (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id),
      task_id INTEGER NOT NULL REFERENCES task_definitions(id),
      progress INTEGER DEFAULT 0,
      status TEXT DEFAULT 'available',
      claimed_at TEXT,
      UNIQUE(user_id, task_id)
    );

    CREATE TABLE IF NOT EXISTS referrals (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      inviter_id INTEGER NOT NULL REFERENCES users(id),
      invitee_id INTEGER NOT NULL REFERENCES users(id),
      reward_claimed INTEGER DEFAULT 0,
      reward_amount INTEGER,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS leagues (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE NOT NULL,
      display_name TEXT NOT NULL,
      min_score INTEGER NOT NULL,
      icon TEXT,
      color TEXT,
      sort_order INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS squads (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE NOT NULL,
      description TEXT,
      emblem TEXT,
      leader_id INTEGER NOT NULL REFERENCES users(id),
      total_score INTEGER DEFAULT 0,
      member_count INTEGER DEFAULT 0,
      league TEXT DEFAULT 'bronze',
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS squad_memberships (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      squad_id INTEGER NOT NULL REFERENCES squads(id),
      user_id INTEGER NOT NULL REFERENCES users(id),
      role TEXT DEFAULT 'member',
      contribution INTEGER DEFAULT 0,
      joined_at TEXT DEFAULT (datetime('now')),
      UNIQUE(user_id)
    );

    CREATE TABLE IF NOT EXISTS leaderboard_snapshots (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id),
      score INTEGER NOT NULL,
      league TEXT,
      rank INTEGER,
      period TEXT NOT NULL,
      snapshot_date TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS announcements (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      type TEXT DEFAULT 'info',
      is_active INTEGER DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now')),
      expires_at TEXT
    );

    CREATE TABLE IF NOT EXISTS fraud_flags (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id),
      flag_type TEXT NOT NULL,
      details TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS audit_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER REFERENCES users(id),
      action TEXT NOT NULL,
      details TEXT,
      ip_address TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS daily_rewards (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id),
      day_streak INTEGER DEFAULT 1,
      last_claim TEXT,
      UNIQUE(user_id)
    );

    CREATE TABLE IF NOT EXISTS app_settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_users_telegram_id ON users(telegram_id);
    CREATE INDEX IF NOT EXISTS idx_users_referral_code ON users(referral_code);
    CREATE INDEX IF NOT EXISTS idx_users_total_earned ON users(total_earned);
    CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(token);
    CREATE INDEX IF NOT EXISTS idx_tap_events_user_created ON tap_events(user_id, created_at);
    CREATE INDEX IF NOT EXISTS idx_referrals_inviter ON referrals(inviter_id);
    CREATE INDEX IF NOT EXISTS idx_squad_memberships_squad ON squad_memberships(squad_id);
    CREATE INDEX IF NOT EXISTS idx_leaderboard_period ON leaderboard_snapshots(period, snapshot_date);
  `);
}

export function seed(): void {
  const database = getDb();

  // Seed leagues
  const leagueCount = database.prepare('SELECT COUNT(*) as count FROM leagues').get() as { count: number };
  if (leagueCount.count === 0) {
    const insertLeague = database.prepare(
      'INSERT INTO leagues (name, display_name, min_score, icon, color, sort_order) VALUES (?, ?, ?, ?, ?, ?)'
    );
    const leagueData: [string, string, number, string, string, number][] = [
      ['bronze', 'Bronze', 0, '🥉', '#CD7F32', 1],
      ['silver', 'Silver', 5000, '🥈', '#C0C0C0', 2],
      ['gold', 'Gold', 25000, '🥇', '#FFD700', 3],
      ['platinum', 'Platinum', 100000, '💎', '#E5E4E2', 4],
      ['diamond', 'Diamond', 500000, '💠', '#B9F2FF', 5],
      ['master', 'Master', 2000000, '👑', '#FF4500', 6],
    ];
    const insertLeagues = database.transaction(() => {
      for (const l of leagueData) {
        insertLeague.run(...l);
      }
    });
    insertLeagues();
  }

  // Seed task definitions
  const taskCount = database.prepare('SELECT COUNT(*) as count FROM task_definitions').get() as { count: number };
  if (taskCount.count === 0) {
    const insertTask = database.prepare(
      'INSERT INTO task_definitions (category, title, description, reward, type, target_value, icon, unlock_league, is_active, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
    );
    const tasks: [string, string, string, number, string, number, string, string, number, number][] = [
      ['onboarding', 'First Tap', 'Tap the emblem for the first time', 100, 'tap_count', 1, '👆', 'bronze', 1, 1],
      ['onboarding', 'Tap Apprentice', 'Reach 100 total taps', 500, 'tap_count', 100, '🔨', 'bronze', 1, 2],
      ['onboarding', 'Buy First Upgrade', 'Purchase any upgrade', 200, 'upgrade_buy', 1, '⬆️', 'bronze', 1, 3],
      ['onboarding', 'Join a Squad', 'Join or create a squad', 300, 'squad_join', 1, '👥', 'bronze', 1, 4],
      ['daily', 'Daily Tapper', 'Tap 500 times today', 250, 'daily_taps', 500, '📅', 'bronze', 1, 10],
      ['daily', 'Energy Master', 'Use all your energy', 150, 'energy_drain', 1, '⚡', 'bronze', 1, 11],
      ['daily', 'Streak Keeper', 'Maintain a 7-day streak', 1000, 'daily_streak', 7, '🔥', 'silver', 1, 12],
      ['community', 'Invite a Friend', 'Refer 1 friend to TapRealm', 500, 'referral_count', 1, '📨', 'bronze', 1, 20],
      ['community', 'Social Butterfly', 'Refer 5 friends', 2500, 'referral_count', 5, '🦋', 'silver', 1, 21],
      ['community', 'Squad Leader', 'Create a squad', 1000, 'squad_create', 1, '🏴', 'gold', 1, 22],
      ['specials', 'Orb Collector', 'Earn 10,000 total orbs', 1000, 'total_earned', 10000, '🔮', 'bronze', 1, 30],
      ['specials', 'Orb Hoarder', 'Earn 100,000 total orbs', 5000, 'total_earned', 100000, '💰', 'silver', 1, 31],
      ['specials', 'Platinum Achievement', 'Reach Platinum league', 10000, 'league_reach', 1, '🏆', 'platinum', 1, 32],
      ['specials', 'Diamond Hands', 'Reach Diamond league', 50000, 'league_reach', 1, '💎', 'diamond', 1, 33],
    ];
    const insertTasks = database.transaction(() => {
      for (const t of tasks) {
        insertTask.run(...t);
      }
    });
    insertTasks();
  }

  // Seed app settings
  const settingsCount = database.prepare('SELECT COUNT(*) as count FROM app_settings').get() as { count: number };
  if (settingsCount.count === 0) {
    const insertSetting = database.prepare('INSERT INTO app_settings (key, value) VALUES (?, ?)');
    const settings: [string, string][] = [
      ['tap_base_rate', '1'],
      ['energy_regen_interval_ms', '1000'],
      ['max_taps_per_request', '20'],
      ['max_taps_per_second', '15'],
      ['referral_reward_regular', '500'],
      ['referral_reward_premium', '2500'],
      ['boost_cooldown_hours', '8'],
      ['turbo_duration_seconds', '10'],
      ['turbo_multiplier', '5'],
      ['daily_reward_base', '100'],
      ['daily_reward_streak_bonus', '50'],
      ['max_upgrade_level', '20'],
      ['maintenance_mode', 'false'],
      ['min_app_version', '1.0.0'],
    ];
    const insertSettings = database.transaction(() => {
      for (const s of settings) {
        insertSetting.run(...s);
      }
    });
    insertSettings();
  }

  // Seed announcements
  const announcementCount = database.prepare('SELECT COUNT(*) as count FROM announcements').get() as { count: number };
  if (announcementCount.count === 0) {
    const insertAnnouncement = database.prepare(
      'INSERT INTO announcements (title, content, type, is_active) VALUES (?, ?, ?, ?)'
    );
    insertAnnouncement.run('Welcome to TapRealm!', 'Start tapping the emblem to earn Orbs. Upgrade your abilities and climb the leaderboard!', 'info', 1);
    insertAnnouncement.run('Invite Friends', 'Earn bonus Orbs for every friend you invite. Premium users get 5x rewards!', 'promo', 1);
  }
}

export function generateReferralCode(): string {
  return crypto.randomBytes(6).toString('hex');
}
