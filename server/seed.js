const db = require('./db');

// Seed leagues
const insertLeague = db.prepare(
  `INSERT OR IGNORE INTO leagues (name, min_score, max_score, badge_emoji, sort_order, referral_bonus_pct)
   VALUES (?, ?, ?, ?, ?, ?)`
);

const leagues = [
  ['Bronze',   0,        9999,    '🥉', 1, 5],
  ['Silver',   10000,    49999,   '🥈', 2, 7],
  ['Gold',     50000,    199999,  '🥇', 3, 10],
  ['Platinum', 200000,   999999,  '💎', 4, 12],
  ['Diamond',  1000000,  4999999, '💠', 5, 15],
  ['Master',   5000000,  999999999, '👑', 6, 20],
];

const insertLeaguesTransaction = db.transaction(() => {
  for (const l of leagues) {
    insertLeague.run(...l);
  }
});
insertLeaguesTransaction();

// Seed task definitions
const insertTask = db.prepare(
  `INSERT OR IGNORE INTO task_definitions (id, category, title, description, reward, icon, action_type, action_url, required_league, sort_order, is_active)
   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`
);

const tasks = [
  [1,  'onboarding', 'Welcome Tap',         'Tap 10 times to get started',           100,  '👆', 'tap',       null, null,       1],
  [2,  'onboarding', 'Join Community',       'Join our Telegram channel',             500,  '📢', 'link',      'https://t.me/minerkingdom', null, 2],
  [3,  'onboarding', 'Set Username',         'Set your Telegram username',            200,  '✏️', 'check',     null, null,       3],
  [4,  'daily',      'Daily Login',          'Log in every day for rewards',          50,   '📅', 'auto',      null, null,       1],
  [5,  'daily',      'Tap 500 Times',        'Tap 500 times today',                   300,  '🔨', 'tap_count', null, null,       2],
  [6,  'daily',      'Earn 1000 Coins',      'Earn 1000 coins in a single day',       200,  '💰', 'earn',      null, null,       3],
  [7,  'specials',   'Invite 3 Friends',     'Invite 3 friends via referral link',    2000, '👥', 'referral',  null, null,       1],
  [8,  'specials',   'Reach Silver League',   'Accumulate 10,000 total coins',        1000, '🥈', 'league',    null, null,       2],
  [9,  'specials',   'Reach Gold League',     'Accumulate 50,000 total coins',        5000, '🥇', 'league',    null, 'Silver',   3],
  [10, 'community',  'Follow on X',          'Follow Miner Kingdom on X (Twitter)',   300,  '🐦', 'link',      'https://x.com/minerkingdom', null, 1],
  [11, 'community',  'Share on Social',       'Share your mining progress',           200,  '📤', 'link',      null, null,       2],
  [12, 'web3',       'Connect Wallet',        'Connect your TON wallet',              1000, '💳', 'wallet',    null, 'Silver',   1],
  [13, 'web3',       'First Transaction',     'Make your first on-chain transaction', 2000, '🔗', 'tx',        null, 'Gold',     2],
  [14, 'partners',   'Visit Partner App',     'Check out our partner mini app',       500,  '🤝', 'link',      'https://t.me/partnerbot', null, 1],
  [15, 'partners',   'Complete Partner Task', 'Complete a task in partner app',        800,  '✅', 'external',  null, null,       2],
];

const insertTasksTransaction = db.transaction(() => {
  for (const t of tasks) {
    insertTask.run(...t);
  }
});
insertTasksTransaction();

// Seed app settings
const insertSetting = db.prepare(
  `INSERT OR REPLACE INTO app_settings (key, value, updated_at) VALUES (?, ?, datetime('now'))`
);

const settings = [
  ['base_tap_value',      '1'],
  ['energy_regen_rate',   '1'],
  ['max_energy_base',     '500'],
  ['turbo_multiplier',    '5'],
  ['turbo_duration',      '10'],
  ['full_energy_daily_limit', '3'],
  ['turbo_daily_limit',   '3'],
  ['multitap_base_price', '100'],
  ['energy_limit_base_price', '200'],
  ['regen_speed_base_price', '300'],
  ['auto_tap_base_price', '500'],
  ['critical_tap_base_price', '400'],
  ['combo_multiplier_base_price', '600'],
  ['offline_earnings_base_price', '800'],
];

const insertSettingsTransaction = db.transaction(() => {
  for (const [key, value] of settings) {
    insertSetting.run(key, value);
  }
});
insertSettingsTransaction();

// Seed announcements
const insertAnnouncement = db.prepare(
  `INSERT OR IGNORE INTO announcements (id, title, content, type, is_active) VALUES (?, ?, ?, ?, 1)`
);

const announcements = [
  [1, 'Welcome to Miner Kingdom!', 'Start tapping to earn coins and climb the leaderboard. Invite friends for bonus rewards!', 'info'],
  [2, 'Weekend Double Event', 'Earn double coins this weekend! Tap harder and climb the leagues faster.', 'event'],
  [3, 'New Upgrades Available', 'Check out the new Critical Tap and Combo Multiplier upgrades in the boost shop.', 'update'],
];

const insertAnnouncementsTransaction = db.transaction(() => {
  for (const a of announcements) {
    insertAnnouncement.run(...a);
  }
});
insertAnnouncementsTransaction();

console.log('Seed data inserted successfully.');
