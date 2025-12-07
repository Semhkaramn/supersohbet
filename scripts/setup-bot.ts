import TelegramBot from 'node-telegram-bot-api'

const token = process.env.TELEGRAM_BOT_TOKEN || ''
const webAppUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

if (!token) {
  console.error('❌ TELEGRAM_BOT_TOKEN not set!')
  process.exit(1)
}

const bot = new TelegramBot(token, { polling: true })

console.log('🤖 Telegram bot started!')
console.log(`📱 Web App URL: ${webAppUrl}`)

// /start komutu
bot.onText(/\/start/, async (msg) => {
  const chatId = msg.chat.id
  const userId = msg.from?.id

  const welcomeMessage = `
🎉 **SüperSohbet Bot'a Hoş Geldin!**

Merhaba ${msg.from?.first_name}!

Bu bot ile:
✨ Mesaj göndererek puan kazan
🏆 Rütbe atla
🎁 Günlük şans çarkını çevir
🛍️ Puanlarınla ödüller satın al
💰 Sponsor olarak platformu destekle

Başlamak için aşağıdaki butona tıkla!
  `.trim()

  const keyboard = {
    inline_keyboard: [
      [
        {
          text: '🎁 Ödül Merkezi',
          web_app: { url: webAppUrl }
        }
      ],
      [
        {
          text: '📊 İstatistiklerim',
          callback_data: 'my_stats'
        }
      ]
    ]
  }

  await bot.sendMessage(chatId, welcomeMessage, {
    parse_mode: 'Markdown',
    reply_markup: keyboard
  })
})

// İstatistikler
bot.on('callback_query', async (query) => {
  const chatId = query.message?.chat.id
  if (!chatId) return

  if (query.data === 'my_stats') {
    // Basit istatistik mesajı
    const statsMessage = `
📊 **Senin İstatistiklerin**

🌟 Puan: 0
⭐ XP: 0
🏆 Rütbe: Yeni Başlayan
💬 Mesaj: 0

Daha fazla bilgi için Ödül Merkezi'ne git!
    `.trim()

    await bot.answerCallbackQuery(query.id)
    await bot.sendMessage(chatId, statsMessage, {
      parse_mode: 'Markdown'
    })
  }
})

console.log('✅ Bot commands registered!')
console.log('💬 Send /start to your bot to test!')

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n👋 Shutting down bot...')
  bot.stopPolling()
  process.exit(0)
})
