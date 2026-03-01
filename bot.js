require('dotenv').config();
const { Bot, InlineKeyboard } = require('grammy');

const bot = new Bot(process.env.BOT_TOKEN);

const MINI_APP_URL = 'https://albayrakogz.github.io/tma-game/';
const DIRECT_LINK = 'https://t.me/minerkingdombot/game';

bot.command('start', async (ctx) => {
  const startParam = ctx.match || '';
  const appUrl = startParam ? `${MINI_APP_URL}?startapp=${startParam}` : MINI_APP_URL;

  const keyboard = new InlineKeyboard()
    .webApp('⛏️ Play Miner Kingdom', appUrl)
    .row()
    .url('🔗 Share with Friends', DIRECT_LINK);

  await ctx.reply(
    `👋 Welcome ${ctx.from?.first_name ?? 'Miner'}!\n\n` +
    `⛏️ *Miner Kingdom* awaits you!\n\n` +
    `Tap, mine, earn coins, upgrade your tools, and compete with friends. ` +
    `Press the button below to start mining:`,
    {
      parse_mode: 'Markdown',
      reply_markup: keyboard,
    }
  );
});

bot.command('help', async (ctx) => {
  await ctx.reply(
    `📖 *Help*\n\n` +
    `/start - Launch the game\n` +
    `/play - Quick play\n` +
    `/stats - Your stats\n` +
    `/help - Show this message\n\n` +
    `🔗 Direct link: ${DIRECT_LINK}`,
    { parse_mode: 'Markdown' }
  );
});

bot.command('play', async (ctx) => {
  const keyboard = new InlineKeyboard().webApp('⛏️ Start Mining', MINI_APP_URL);
  await ctx.reply('Ready to mine? ⛏️🚀', { reply_markup: keyboard });
});

bot.command('stats', async (ctx) => {
  await ctx.reply(
    `📊 *Your Stats*\n\n` +
    `Stats are available inside the game!\n` +
    `Open the app to see your progress.`,
    { parse_mode: 'Markdown' }
  );
});

bot.on('message', async (ctx) => {
  const keyboard = new InlineKeyboard().webApp('⛏️ Play Now', MINI_APP_URL);
  await ctx.reply('Tap the button to start playing! 👇', { reply_markup: keyboard });
});

bot.start({
  onStart: () => console.log(`✅ @${bot.botInfo.username} is running!`),
});

process.once('SIGINT', () => bot.stop());
process.once('SIGTERM', () => bot.stop());
