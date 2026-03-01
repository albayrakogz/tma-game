const Database = require('better-sqlite3');
const path = require('path');

const dbPath = process.env.DB_PATH || path.join(__dirname, 'miner_kingdom.db');
const db = new Database(dbPath);

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    telegram_id TEXT UNIQUE NOT NULL,
    username TEXT,
    first_name TEXT,
    last_name TEXT,
    is_premium INTEGER DEFAULT 0,
    language_code TEXT DEFAULT 'en',
    balance REAL DEFAULT 0,
    total_earned REAL DEFAULT 0,
    current_league TEXT DEFAULT 'Bronze',
    rank INTEGER DEFAULT 0,
    referral_code TEXT UNIQUE,
    referred_by INTEGER REFERENCES users(id),
    squad_id INTEGER REFERENCES squads(id),
    fraud_score INTEGER DEFAULT 0,
    is_restricted INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    last_active_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS energy_state (
    user_id INTEGER PRIMARY KEY REFERENCES users(id),
    current_energy INTEGER DEFAULT 500,
    max_energy INTEGER DEFAULT 500,
    last_regen_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS upgrades (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id),
    upgrade_type TEXT NOT NULL CHECK(upgrade_type IN ('multitap','energy_limit','regen_speed','auto_tap','critical_tap','combo_multiplier','offline_earnings')),
    level INTEGER DEFAULT 1,
    purchased_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS boost_claims (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id),
    boost_type TEXT NOT NULL CHECK(boost_type IN ('full_energy','turbo')),
    claimed_at TEXT DEFAULT (datetime('now')),
    expires_at TEXT
  );

  CREATE TABLE IF NOT EXISTS task_definitions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    category TEXT NOT NULL CHECK(category IN ('onboarding','daily','specials','community','web3','partners')),
    title TEXT NOT NULL,
    description TEXT,
    reward REAL DEFAULT 0,
    icon TEXT,
    action_type TEXT,
    action_url TEXT,
    required_league TEXT,
    sort_order INTEGER DEFAULT 0,
    is_active INTEGER DEFAULT 1
  );

  CREATE TABLE IF NOT EXISTS task_progress (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id),
    task_id INTEGER NOT NULL REFERENCES task_definitions(id),
    status TEXT DEFAULT 'locked' CHECK(status IN ('locked','pending','claimable','completed')),
    progress INTEGER DEFAULT 0,
    max_progress INTEGER DEFAULT 1,
    claimed_at TEXT
  );

  CREATE TABLE IF NOT EXISTS referrals (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    inviter_id INTEGER NOT NULL REFERENCES users(id),
    invitee_id INTEGER NOT NULL REFERENCES users(id),
    inviter_reward REAL DEFAULT 0,
    invitee_reward REAL DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS squads (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    emblem TEXT,
    description TEXT,
    creator_id INTEGER NOT NULL REFERENCES users(id),
    total_score REAL DEFAULT 0,
    member_count INTEGER DEFAULT 0,
    league TEXT DEFAULT 'Bronze',
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS squad_memberships (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id),
    squad_id INTEGER NOT NULL REFERENCES squads(id),
    contribution REAL DEFAULT 0,
    joined_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS leagues (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    min_score REAL DEFAULT 0,
    max_score REAL DEFAULT 0,
    badge_emoji TEXT,
    sort_order INTEGER DEFAULT 0,
    referral_bonus_pct REAL DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS leaderboard_snapshots (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id),
    score REAL DEFAULT 0,
    league TEXT,
    rank INTEGER DEFAULT 0,
    period TEXT CHECK(period IN ('daily','weekly','alltime')),
    snapshot_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS announcements (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    content TEXT,
    type TEXT,
    is_active INTEGER DEFAULT 1,
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

  CREATE TABLE IF NOT EXISTS fraud_flags (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id),
    flag_type TEXT NOT NULL,
    details TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS app_settings (
    key TEXT PRIMARY KEY,
    value TEXT,
    updated_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS daily_rewards (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id),
    day_streak INTEGER DEFAULT 1,
    last_claim_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS sessions (
    id TEXT PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id),
    telegram_init_hash TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    expires_at TEXT
  );
`);

module.exports = db;
