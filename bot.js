require('dotenv').config();
const { Bot, InlineKeyboard } = require('grammy');

const bot = new Bot(process.env.BOT_TOKEN);

const MINI_APP_URL = 'https://albayrakogz.github.io/tma-game/?v=20260225-5';
const DIRECT_LINK = 'https://t.me/minerkingdombot/game';

// /start komutu — inline WebApp butonu ile karşılama
bot.command('start', async (ctx) => {
  const keyboard = new InlineKeyboard()
    .webApp('🎮 Miner Kingdom\'ı Aç', MINI_APP_URL)
    .row()
    .url('🔗 Arkadaşlarla Paylaş', DIRECT_LINK);

  await ctx.reply(
    `👋 Merhaba ${ctx.from?.first_name ?? 'Madenci'}!\n\n` +
    `⛏️ *Miner Kingdom*'a hoş geldin!\n\n` +
    `Madencilik yap, kaynak topla ve krallığını büyüt. ` +
    `Aşağıdaki butona basarak oyuna başlayabilirsin:`,
    {
      parse_mode: 'Markdown',
      reply_markup: keyboard,
    }
  );
});

// /help komutu
bot.command('help', async (ctx) => {
  await ctx.reply(
    `📖 *Yardım*\n\n` +
    `/start - Oyunu başlat\n` +
    `/play - Oyunu aç\n` +
    `/help - Bu mesajı göster\n\n` +
    `🔗 Direkt link: ${DIRECT_LINK}`,
    { parse_mode: 'Markdown' }
  );
});

// /play komutu
bot.command('play', async (ctx) => {
  const keyboard = new InlineKeyboard().webApp('🎮 Oyuna Gir', MINI_APP_URL);
  await ctx.reply('Hazır mısın? 🚀', { reply_markup: keyboard });
});

// Bilinmeyen mesajlara inline butonla cevap
bot.on('message', async (ctx) => {
  const keyboard = new InlineKeyboard().webApp('🎮 Oyunu Aç', MINI_APP_URL);
  await ctx.reply('Oynamak için butona bas! 👇', { reply_markup: keyboard });
});

bot.start({
  onStart: () => console.log(`✅ @${bot.botInfo.username} başlatıldı!`),
});

process.once('SIGINT', () => bot.stop());
process.once('SIGTERM', () => bot.stop());
