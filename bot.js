require('dotenv').config();
const { Bot, InlineKeyboard } = require('grammy');

const bot = new Bot(process.env.BOT_TOKEN);

const MINI_APP_URL = 'https://albayrakogz.github.io/tma-game/?v=20260225-5';
const DIRECT_LINK = 'https://t.me/minerkingdombot/game';

// /start command — welcome message with WebApp button
bot.command('start', async (ctx) => {
  const keyboard = new InlineKeyboard()
    .webApp('🔮 Open TapRealm', MINI_APP_URL)
    .row()
    .url('🔗 Share with Friends', DIRECT_LINK);

  await ctx.reply(
    `👋 Hey ${ctx.from?.first_name ?? 'Tapper'}!\n\n` +
    `🔮 *Welcome to TapRealm!*\n\n` +
    `Tap the orb, earn Orbs, upgrade your power, and climb the leagues. ` +
    `Press the button below to start playing:`,
    {
      parse_mode: 'Markdown',
      reply_markup: keyboard,
    }
  );
});

// /help command
bot.command('help', async (ctx) => {
  await ctx.reply(
    `📖 *Help*\n\n` +
    `/start - Start the game\n` +
    `/play - Open TapRealm\n` +
    `/help - Show this message\n\n` +
    `🔗 Direct link: ${DIRECT_LINK}`,
    { parse_mode: 'Markdown' }
  );
});

// /play command
bot.command('play', async (ctx) => {
  const keyboard = new InlineKeyboard().webApp('🔮 Play TapRealm', MINI_APP_URL);
  await ctx.reply('Ready to tap? 🚀', { reply_markup: keyboard });
});

// Default handler — respond with game button
bot.on('message', async (ctx) => {
  const keyboard = new InlineKeyboard().webApp('🔮 Open TapRealm', MINI_APP_URL);
  await ctx.reply('Tap the button to play! 👇', { reply_markup: keyboard });
});

bot.start({
  onStart: () => console.log(`✅ @${bot.botInfo.username} started!`),
});

process.once('SIGINT', () => bot.stop());
process.once('SIGTERM', () => bot.stop());
