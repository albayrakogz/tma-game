# Miner Kingdom — Telegram Mini App Game

A full-stack tap-to-earn Telegram Mini App game with premium UI, energy mechanics, upgrades, referrals, squads, leagues, and an admin panel.

## Architecture

```
├── bot.js              # Telegram bot (Grammy) with referral deep linking
├── server/             # Express.js backend with SQLite
│   ├── index.js        # Server entry point (port 3001)
│   ├── db.js           # Database schema (17 tables)
│   ├── seed.js         # Seed data (leagues, tasks, settings)
│   ├── middleware/      # Auth & Telegram init data validation
│   └── routes/         # API routes (auth, game, boosts, tasks, referrals, squads, leaderboard, admin)
├── mini-app/           # React + TypeScript frontend (Vite)
│   └── src/
│       ├── pages/      # Game screens (Home, Frens, Earn, Boosts, Squad, League, Admin)
│       ├── components/ # BottomNav, EnergyBar, ErrorBoundary
│       ├── contexts/   # GameContext (state management)
│       └── api/        # Backend API client
```

## Getting Started

### Bot
```bash
npm install
echo "BOT_TOKEN=your_bot_token" > .env
npm run bot
```

### Backend Server
```bash
cd server
npm install
node seed.js   # Seed demo data
npm start      # Starts on port 3001
```

### Frontend (Mini App)
```bash
cd mini-app
npm install
npm run dev    # Dev server
npm run build  # Production build
```

## Game Features

- **Tap-to-Earn**: Tap the central coin to earn in-game currency
- **Energy System**: Tapping consumes energy; energy regenerates over time
- **Upgrades**: Multitap, Energy Limit, Regen Speed, Auto Tap Bot
- **Boosters**: Free daily Full Energy and Turbo boosts
- **Tasks**: Onboarding, Daily, Special, and Community tasks
- **Referrals**: Invite friends for bonuses, league-based referral multipliers
- **Squads**: Create/join squads, compete in squad leaderboards
- **Leagues**: Bronze → Silver → Gold → Platinum → Diamond → Master
- **Admin Panel**: Dashboard, user management, fraud review, announcements

## Telegram Integration

- Telegram Web App JS SDK via `@tma.js/sdk-react`
- Theme-aware (adapts to Telegram dark/light mode)
- Safe area and viewport handling
- Telegram init data validation on backend
- Referral deep linking via bot start parameters
- TON Connect wallet integration ready