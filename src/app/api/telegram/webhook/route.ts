import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { notifyLevelUp } from '@/lib/notifications'
import { checkRandySlots, announceRandyWinner } from '@/lib/randy'
import { invalidateLeaderboardCache } from '@/lib/cache'
import {
  getRollState,
  startRoll,
  saveStep,
  startBreak,
  resumeRoll,
  stopRoll,
  trackUserMessage,
  getStatusList,
  getStepList,
  clearRollData,
  lockRoll,
  unlockRoll
} from '@/lib/roll-system'

// ============================================
// CACHE VE CONSTANTS
// ============================================

// Settings cache - Her 1 dakikada bir yenilenir
let settingsCache: Record<string, string> = {}
let lastCacheUpdate = 0
const CACHE_TTL = 60000 // 1 dakika

// İşlenmiş mesajlar - Duplicate webhook önleme (idempotency)
const processedMessages = new Map<string, number>()
const MESSAGE_CACHE_TTL = 300000 // 5 dakika
const MAX_PROCESSED_MESSAGES = 1000

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Settings'i cache'den al, gerekirse yenile
 */
async function getSettings(): Promise<Record<string, string>> {
  const now = Date.now()
  if (now - lastCacheUpdate > CACHE_TTL) {
    const settings = await prisma.settings.findMany()
    settingsCache = settings.reduce((acc: Record<string, string>, s) => ({ ...acc, [s.key]: s.value }), {})
    lastCacheUpdate = now
  }
  return settingsCache
}

/**
 * Tek bir setting değerini al
 */
function getSetting(key: string, defaultValue: string = '0'): string {
  return settingsCache[key] || defaultValue
}

/**
 * UTC timestamp al - Tüm zaman hesaplamaları için kullan
 */
function getUTCTimestamp(): number {
  return Date.now()
}

/**
 * Telegram mesajı gönder
 */
async function sendTelegramMessage(chatId: number, text: string, keyboard?: any): Promise<boolean> {
  const botToken = getSetting('telegram_bot_token', '')
  if (!botToken) {
    console.error('❌ Bot token not set')
    return false
  }

  const url = `https://api.telegram.org/bot${botToken}/sendMessage`
  const body: any = {
    chat_id: chatId,
    text,
    parse_mode: 'Markdown'
  }

  if (keyboard) {
    body.reply_markup = keyboard
  }

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    })
    return response.ok
  } catch (error) {
    console.error('❌ Error sending message:', error)
    return false
  }
}

/**
 * Callback query'yi yanıtla
 */
async function answerCallbackQuery(callbackQueryId: string, text?: string): Promise<void> {
  const botToken = getSetting('telegram_bot_token', '')
  if (!botToken) return

  const url = `https://api.telegram.org/bot${botToken}/answerCallbackQuery`
  try {
    await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ callback_query_id: callbackQueryId, text })
    })
  } catch (error) {
    console.error('❌ Error answering callback:', error)
  }
}

/**
 * Kullanıcı ban kontrolü
 */
async function checkUserBan(telegramId: string): Promise<{ isBanned: boolean; banReason?: string }> {
  try {
    const user = await prisma.user.findUnique({
      where: { telegramId },
      select: { isBanned: true, banReason: true }
    })

    return {
      isBanned: user?.isBanned || false,
      banReason: user?.banReason || undefined
    }
  } catch (error) {
    console.error('❌ Error checking ban status:', error)
    return { isBanned: false }
  }
}

/**
 * Admin kontrolü - ENV ve grup adminleri
 */
async function checkAdmin(chatId: number, userId: number): Promise<boolean> {
  try {
    // ENV'den tanımlı adminler
    const adminIds = getSetting('roll_admin_ids', '')
    if (adminIds) {
      const adminList = adminIds.split(',').map(id => id.trim())
      if (adminList.includes(String(userId))) {
        return true
      }
    }

    // Grup adminleri
    const botToken = getSetting('telegram_bot_token', '')
    if (!botToken) return false

    const url = `https://api.telegram.org/bot${botToken}/getChatMember`
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, user_id: userId })
    })

    const data = await response.json()
    if (data.ok && data.result) {
      const status = data.result.status
      return status === 'administrator' || status === 'creator'
    }

    return false
  } catch (error) {
    console.error('❌ Error checking admin:', error)
    return false
  }
}

/**
 * Mesajın duplicate olup olmadığını kontrol et
 */
function checkDuplicateMessage(chatId: number, messageId: number): boolean {
  const key = `${chatId}_${messageId}`
  const now = getUTCTimestamp()

  // Eski mesajları temizle (5 dakikadan eski)
  if (processedMessages.size > 100) {
    for (const [k, timestamp] of processedMessages.entries()) {
      if (now - timestamp > MESSAGE_CACHE_TTL) {
        processedMessages.delete(k)
      }
    }
  }

  // Max limit kontrolü
  if (processedMessages.size > MAX_PROCESSED_MESSAGES) {
    const oldestKey = Array.from(processedMessages.keys())[0]
    processedMessages.delete(oldestKey)
  }

  // Duplicate kontrolü
  if (processedMessages.has(key)) {
    return true
  }

  // Mesajı kaydet
  processedMessages.set(key, now)
  return false
}

/**
 * Telegram grup kullanıcısını oluştur veya güncelle
 */
async function upsertTelegramGroupUser(
  telegramId: string,
  username: string | undefined,
  firstName: string | undefined,
  lastName: string | undefined,
  photoUrl?: string | null
) {
  let telegramGroupUser = await prisma.telegramGroupUser.findUnique({
    where: { telegramId }
  })

  if (!telegramGroupUser) {
    telegramGroupUser = await prisma.telegramGroupUser.create({
      data: {
        telegramId,
        username: username || null,
        firstName: firstName || null,
        lastName: lastName || null,
        photoUrl: photoUrl || null,
        messageCount: 0
      }
    })
    console.log(`✅ Yeni Telegram kullanıcısı: ${telegramId} (${firstName || username})`)
  } else {
    await prisma.telegramGroupUser.update({
      where: { telegramId },
      data: {
        username: username || telegramGroupUser.username,
        firstName: firstName || telegramGroupUser.firstName,
        lastName: lastName || telegramGroupUser.lastName,
        photoUrl: photoUrl || telegramGroupUser.photoUrl
      }
    })
  }

  return telegramGroupUser
}

/**
 * Site kullanıcısını bul (linkedUserId veya telegramId ile)
 */
async function findSiteUser(telegramId: string, telegramGroupUser: any) {
  // Önce linkedUserId kontrol et
  if (telegramGroupUser.linkedUserId) {
    const user = await prisma.user.findUnique({
      where: { id: telegramGroupUser.linkedUserId }
    })
    if (user) {
      console.log(`✅ Kullanıcı bulundu (linkedUserId): ${user.email || user.siteUsername}`)
      return user
    }
  }

  // Sonra telegramId ile dene
  const user = await prisma.user.findUnique({
    where: { telegramId }
  })

  if (user) {
    console.log(`✅ Kullanıcı bulundu (telegramId): ${user.email || user.siteUsername}`)

    // linkedUserId yoksa bağla
    if (!telegramGroupUser.linkedUserId) {
      await prisma.telegramGroupUser.update({
        where: { id: telegramGroupUser.id },
        data: { linkedUserId: user.id }
      })
      console.log(`🔗 LinkedUserId bağlandı: ${telegramGroupUser.id} -> ${user.id}`)
    }
  }

  return user
}

// ============================================
// CALLBACK QUERY HANDLER
// ============================================

async function handleCallbackQuery(query: any): Promise<NextResponse> {
  const chatId = query.message?.chat.id
  const userId = String(query.from.id)

  // Ban kontrolü
  const banStatus = await checkUserBan(userId)
  if (banStatus.isBanned) {
    await answerCallbackQuery(query.id)
    if (chatId) {
      const banMessage = `🚫 **Hesabınız Yasaklandı**\n\n${banStatus.banReason || 'Sistem kurallarını ihlal ettiniz.'}\n\nBot özelliklerini kullanmanız engellenmiştir.`
      await sendTelegramMessage(chatId, banMessage)
    }
    return NextResponse.json({ ok: true })
  }

  // Stats butonu
  if (query.data === 'my_stats') {
    const user = await prisma.user.findUnique({
      where: { telegramId: userId },
      include: { rank: true }
    })

    const statsMessage = user
      ? `📊 **Senin İstatistiklerin**\n\n🌟 Puan: ${user.points.toLocaleString()}\n⭐ XP: ${user.xp.toLocaleString()}\n🏆 Rütbe: ${user.rank?.icon || '🌱'} ${user.rank?.name || 'Yeni Başlayan'}\n💬 Mesaj: ${user.totalMessages.toLocaleString()}\n\nDaha fazla bilgi için Ödül Merkezi'ne git!`
      : `📊 **Senin İstatistiklerin**\n\n🌟 Puan: 0\n⭐ XP: 0\n🏆 Rütbe: Yeni Başlayan\n💬 Mesaj: 0\n\nDaha fazla bilgi için Ödül Merkezi'ne git!`

    await answerCallbackQuery(query.id)
    if (chatId) {
      await sendTelegramMessage(chatId, statsMessage)
    }
  }

  return NextResponse.json({ ok: true })
}

// ============================================
// ROLL SYSTEM HANDLER
// ============================================

async function handleRollCommands(
  chatId: number,
  userId: string,
  messageText: string,
  chatType: string
): Promise<boolean> {
  // Sadece gruplarda çalışır
  if (chatType !== 'group' && chatType !== 'supergroup') {
    return false
  }

  const groupId = String(chatId)
  const text = messageText.trim()

  // Roll sistemi aktif mi?
  const rollSetting = await prisma.settings.findUnique({
    where: { key: 'roll_enabled' }
  })
  const rollEnabled = rollSetting?.value === 'true'

  if (!rollEnabled) {
    if (text.toLowerCase() === 'liste' || text.startsWith('roll ') || text === 'roll') {
      return true // Komut işlendi (ama devre dışı)
    }
    return false
  }

  // "liste" komutu
  if (text.toLowerCase() === 'liste') {
    const statusMsg = getStatusList(groupId)
    await sendTelegramMessage(chatId, statusMsg)
    return true
  }

  // Roll komutları - Sadece adminler
  if (text.startsWith('roll ') || text === 'roll') {
    const isAdmin = await checkAdmin(chatId, Number(userId))
    const parts = text.split(' ')

    if (parts.length === 1) {
      return true // Sadece "roll" - sessiz kal
    }

    const command = parts.slice(1).join(' ').toLowerCase()

    // roll <sayı> - Başlat
    if (/^\d+$/.test(command)) {
      if (!isAdmin) return true
      const duration = Number.parseInt(command)
      startRoll(groupId, duration)
      await sendTelegramMessage(chatId, `✅ Roll Başladı!\n⏳ ${duration} dakika içinde mesaj yazmayan listeden çıkarılır.`)
      return true
    }

    // roll adım
    if (command === 'adım' || command === 'adim') {
      if (!isAdmin) return true
      const result = saveStep(groupId)
      if (!result.success) {
        await sendTelegramMessage(chatId, result.message)
        return true
      }
      const stepList = getStepList(groupId)
      await sendTelegramMessage(chatId, `📌 Adım ${result.stepNumber} Kaydedildi!\n\n${stepList}`)
      return true
    }

    // roll mola
    if (command === 'mola') {
      if (!isAdmin) return true
      const state = getRollState(groupId)
      if (state.status === 'stopped') {
        await sendTelegramMessage(chatId, '⚠️ Roll aktif değil. Mola başlatılamaz.')
        return true
      }
      if (state.status === 'break') {
        await sendTelegramMessage(chatId, '⚠️ Zaten molada.')
        return true
      }
      startBreak(groupId)
      await sendTelegramMessage(chatId, '☕ Mola başladı! Liste korunuyor.')
      return true
    }

    // roll devam
    if (command === 'devam') {
      if (!isAdmin) return true
      const state = getRollState(groupId)
      if (state.status !== 'paused' && state.status !== 'break') {
        await sendTelegramMessage(chatId, '⚠️ Roll zaten aktif veya durdurulmuş.')
        return true
      }
      const wasBreak = state.status === 'break'
      resumeRoll(groupId)
      const updatedState = getRollState(groupId)
      const stepList = getStepList(groupId)
      const nextStep = updatedState.currentStep + 1
      const statusText = updatedState.status === 'active' ? '▶️ Aktif' : '⏸ Duraklatıldı'

      if (wasBreak) {
        await sendTelegramMessage(chatId, `${stepList ? stepList + '\n\n' : ''}✅ Mola bitti! ${statusText}\n⏳ ${updatedState.activeDuration} dakika kuralı geçerlidir.`)
      } else {
        await sendTelegramMessage(chatId, `${stepList ? stepList + '\n\n' : ''}▶️ Adım ${nextStep}'e geçildi!\n⏳ ${updatedState.activeDuration} dakika kuralı geçerlidir.`)
      }
      return true
    }

    // roll kilit
    if (command === 'kilit') {
      if (!isAdmin) return true
      const state = getRollState(groupId)
      if (state.status === 'stopped') {
        await sendTelegramMessage(chatId, '⚠️ Roll aktif değil.')
        return true
      }
      if (state.status === 'locked') {
        await sendTelegramMessage(chatId, '⚠️ Liste zaten kilitli.')
        return true
      }
      lockRoll(groupId)
      await sendTelegramMessage(chatId, '🔒 Liste kilitlendi! Yeni kullanıcı giremez, mevcut kullanıcılar devam edebilir.')
      return true
    }

    // roll bitir
    if (command === 'bitir') {
      if (!isAdmin) return true
      const state = getRollState(groupId)
      if (state.status === 'stopped') {
        await sendTelegramMessage(chatId, '⚠️ Roll zaten durdurulmuş.')
        return true
      }
      stopRoll(groupId)
      const stepList = getStepList(groupId)
      if (!stepList) {
        await sendTelegramMessage(chatId, '✅ Roll Sonlandı!\n📭 Hiç adım kaydedilmedi.')
      } else {
        await sendTelegramMessage(chatId, `🏁 Roll Sonlandı!\n\n${stepList}`)
      }
      clearRollData(groupId)
      return true
    }

    return true // Geçersiz komut - sessiz kal
  }

  // Normal mesaj - tracking
  if (rollEnabled) {
    const state = getRollState(groupId)
    if (state.status === 'active' || state.status === 'locked') {
      trackUserMessage(groupId, userId, undefined, undefined)
    }
  }

  return false
}

// ============================================
// /START KOMUTU HANDLER
// ============================================

async function handleStartCommand(
  chatId: number,
  userId: string,
  username: string | undefined,
  firstName: string | undefined,
  lastName: string | undefined,
  messageText: string
): Promise<boolean> {
  const webAppUrl = getSetting('telegram_webhook_url', '').replace('/api/telegram/webhook', '') || process.env.NEXT_PUBLIC_APP_URL || 'https://soft-fairy-c52849.netlify.app'
  const startParam = messageText.split(' ')[1]

  // Profil fotoğrafını al
  const { getUserProfilePhoto } = await import('@/lib/telegram')
  let photoUrl: string | null = null
  try {
    photoUrl = await getUserProfilePhoto(Number(userId))
    console.log(`📸 Profil fotoğrafı: ${photoUrl ? 'Alındı' : 'Yok'}`)
  } catch (error) {
    console.error('❌ Profil fotoğrafı alınamadı:', error)
  }

  // 6 haneli bağlantı kodu kontrolü
  if (startParam && /^\d{6}$/.test(startParam)) {
    console.log(`🔐 Bağlantı kodu denemesi: ${startParam}`)

    const webUser = await prisma.user.findFirst({
      where: {
        telegramConnectionToken: startParam,
        telegramConnectionTokenExpiry: { gte: new Date() },
        telegramId: null
      }
    })

    if (webUser) {
      // Bağlantıyı kur
      await prisma.user.update({
        where: { id: webUser.id },
        data: {
          telegramId: userId,
          username: username || webUser.username,
          firstName: firstName || webUser.firstName,
          lastName: lastName || webUser.lastName,
          photoUrl: photoUrl || webUser.photoUrl,
          hadStart: true,
          telegramConnectionToken: null,
          telegramConnectionTokenExpiry: null
        }
      })

      // Telegram grup kullanıcısını bağla
      let telegramGroupUser = await prisma.telegramGroupUser.findUnique({
        where: { telegramId: userId }
      })

      if (telegramGroupUser) {
        await prisma.telegramGroupUser.update({
          where: { id: telegramGroupUser.id },
          data: {
            linkedUserId: webUser.id,
            username: username || telegramGroupUser.username,
            firstName: firstName || telegramGroupUser.firstName,
            lastName: lastName || telegramGroupUser.lastName,
            photoUrl: photoUrl || telegramGroupUser.photoUrl
          }
        })
        console.log(`✅ Telegram kullanıcısı bağlandı (${telegramGroupUser.messageCount} geçmiş mesaj)`)
      } else {
        telegramGroupUser = await prisma.telegramGroupUser.create({
          data: {
            telegramId: userId,
            username: username || null,
            firstName: firstName || null,
            lastName: lastName || null,
            photoUrl: photoUrl || null,
            linkedUserId: webUser.id,
            messageCount: 0
          }
        })
        console.log(`✅ Yeni telegram kullanıcısı oluşturuldu ve bağlandı`)
      }

      const successMsg = `✅ **Hesabınız Başarıyla Bağlandı!**\n\nMerhaba ${firstName || webUser.firstName}!${telegramGroupUser && telegramGroupUser.messageCount > 0 ? `\n📊 ${telegramGroupUser.messageCount} geçmiş mesajınız hesabınıza aktarıldı!` : ''}`
      await sendTelegramMessage(chatId, successMsg)
      return true
    }

    // Token bulunamadı
    const errorMsg = `❌ **Bağlantı Kodu Geçersiz!**\n\nBu bağlantı kodu geçersiz veya süresi dolmuş.\n\nLütfen web sitesinden yeni bir kod alın ve tekrar deneyin.`
    await sendTelegramMessage(chatId, errorMsg)
    return true
  }

  // Normal /start - Hoşgeldin mesajı
  const welcomeMessage = `🎉 **SüperSohbet Bot'a Hoş Geldin!**\n\nMerhaba ${firstName}!\n✨ Mesaj göndererek puan kazan\n🏆 Rütbe atla\n🎁 Günlük şans çarkını çevir\n🛍️ Puanlarınla ödüller satın al\n\nSiteye Butondan ulaşabilirsiniz`
  await sendTelegramMessage(chatId, welcomeMessage)

  // Mevcut kullanıcı varsa güncelle
  const existingUser = await prisma.user.findUnique({
    where: { telegramId: userId }
  })

  if (existingUser) {
    await prisma.user.update({
      where: { telegramId: userId },
      data: {
        username,
        firstName,
        lastName,
        photoUrl: photoUrl || existingUser.photoUrl,
        hadStart: true
      }
    })
  }

  return true
}

// ============================================
// ÖDÜL SİSTEMİ
// ============================================

async function handleRewardSystem(
  telegramGroupUser: any,
  user: any,
  messageText: string,
  userId: string,
  firstName: string | undefined,
  username: string | undefined
): Promise<NextResponse> {
  const now = getUTCTimestamp()

  // Ayarlar
  const minMessageLength = parseInt(getSetting('min_message_length', '3'))
  const messageCooldown = parseInt(getSetting('message_cooldown_seconds', '5'))
  const pointsPerMessage = parseInt(getSetting('points_per_message', '10'))
  const xpPerMessage = parseInt(getSetting('xp_per_message', '5'))
  const messagesForXp = parseInt(getSetting('messages_for_xp', '1'))

  console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`)
  console.log(`🎯 ÖDÜL SİSTEMİ`)
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`)
  console.log(`👤 Kullanıcı: ${user.email || user.siteUsername}`)
  console.log(`📝 Mesaj: ${messageText.length} karakter (Min: ${minMessageLength})`)
  console.log(`💰 Puan: +${pointsPerMessage} | XP: ${(user.messageCount + 1) % messagesForXp === 0 ? `+${xpPerMessage}` : '0'}`)

  // Ban kontrolü
  if (user.isBanned) {
    console.log(`❌ BANLII KULLANICI`)
    return NextResponse.json({ ok: true, message: 'User banned' })
  }

  // Toplam mesaj sayısını artır (tüm mesajlar için)
  await prisma.user.update({
    where: { id: user.id },
    data: { totalMessages: { increment: 1 } }
  })

  // Mesaj uzunluğu kontrolü
  if (messageText.length < minMessageLength) {
    console.log(`❌ MESAJ ÇOK KISA`)
    return NextResponse.json({ ok: true, message: 'Too short' })
  }

  // Cooldown kontrolü
  if (user.lastMessageAt) {
    const lastMessageTime = new Date(user.lastMessageAt).getTime()
    const timeSince = Math.floor((now - lastMessageTime) / 1000)

    console.log(`⏳ Cooldown: ${timeSince}s geçti (Min: ${messageCooldown}s)`)

    if (timeSince < messageCooldown) {
      console.log(`❌ COOLDOWN AKTİF`)
      return NextResponse.json({ ok: true, message: 'Cooldown' })
    }
  }

  // Ödül ver
  const newMessageCount = user.messageCount + 1
  const shouldGiveXp = newMessageCount % messagesForXp === 0

  const updatedUser = await prisma.user.update({
    where: { id: user.id },
    data: {
      points: { increment: pointsPerMessage },
      xp: shouldGiveXp ? { increment: xpPerMessage } : undefined,
      messageCount: newMessageCount,
      lastMessageAt: new Date(now) // UTC timestamp
    }
  })

  console.log(`✅ ÖDÜL VERİLDİ - Puan: ${updatedUser.points}, XP: ${updatedUser.xp}`)

  // MessageStats'ı güncelle (ödül kazandı)
  await prisma.messageStats.updateMany({
    where: {
      telegramUserId: telegramGroupUser.id,
      createdAt: { gte: new Date(now - 2000) } // Son 2 saniye
    },
    data: { earnedReward: true }
  })

  // Leaderboard cache temizle
  invalidateLeaderboardCache()

  // Rütbe kontrolü
  if (shouldGiveXp) {
    const currentRank = await prisma.rank.findFirst({
      where: { minXp: { lte: updatedUser.xp } },
      orderBy: { minXp: 'desc' }
    })

    if (currentRank && user.rankId !== currentRank.id) {
      await prisma.user.update({
        where: { id: user.id },
        data: { rankId: currentRank.id }
      })

      await notifyLevelUp(userId, firstName || username || 'Kullanıcı', {
        icon: currentRank.icon,
        name: currentRank.name,
        xp: updatedUser.xp
      })

      console.log(`🎉 RÜTBE ATLADI: ${currentRank.name}`)
    }
  }

  return NextResponse.json({ ok: true })
}

// ============================================
// MAIN WEBHOOK HANDLER
// ============================================

export async function POST(request: NextRequest) {
  try {
    const update = await request.json()

    // Settings yükle
    await getSettings()

    // Bakım modu kontrolü
    if (getSetting('maintenance_mode') === 'true') {
      return NextResponse.json({ ok: true, message: 'Maintenance mode' })
    }

    // ========== CALLBACK QUERY ==========
    if (update.callback_query) {
      return await handleCallbackQuery(update.callback_query)
    }

    // ========== MESAJ İŞLEME ==========
    if (update.message && update.message.text) {
      const message = update.message

      // Anonymous/channel mesaj kontrolü
      if (!message.from || !message.from.id) {
        return NextResponse.json({ ok: true, message: 'No from.id' })
      }

      // DUPLICATE KONTROLÜ
      if (checkDuplicateMessage(message.chat.id, message.message_id)) {
        console.log(`⚠️ DUPLICATE MESAJ ENGELLENDI: ${message.chat.id}_${message.message_id}`)
        return NextResponse.json({ ok: true, message: 'Duplicate' })
      }

      const chatId = message.chat.id
      const chatType = message.chat.type
      const userId = String(message.from.id)
      const username = message.from.username
      const firstName = message.from.first_name
      const lastName = message.from.last_name
      const messageText = message.text

      // Aktif grup kontrolü
      const activityGroupId = getSetting('activity_group_id', '')
      const isPrivateChat = chatType === 'private'

      // Private chat - Sadece /start
      if (isPrivateChat) {
        if (messageText === '/start' || messageText.startsWith('/start ')) {
          return await handleStartCommand(chatId, userId, username, firstName, lastName, messageText)
            ? NextResponse.json({ ok: true })
            : NextResponse.json({ ok: true })
        }
        return NextResponse.json({ ok: true, message: 'Private - only /start' })
      }

      // Grup - Aktif grup kontrolü
      if (!activityGroupId || String(chatId) !== activityGroupId) {
        return NextResponse.json({ ok: true, message: 'Not activity group' })
      }

      console.log(`✅ Mesaj alındı: ${firstName || username} - ${messageText.substring(0, 50)}`)

      // Ban kontrolü (/start hariç)
      if (messageText !== '/start' && !messageText.startsWith('/start ')) {
        const banStatus = await checkUserBan(userId)
        if (banStatus.isBanned) {
          const banMsg = `🚫 **Hesabınız Yasaklandı**\n\n${banStatus.banReason || 'Sistem kurallarını ihlal ettiniz.'}\n\nBot özelliklerini kullanmanız engellenmiştir.`
          await sendTelegramMessage(chatId, banMsg)
          return NextResponse.json({ ok: true })
        }
      }

      // Roll sistemi komutları
      const rollHandled = await handleRollCommands(chatId, userId, messageText, chatType)
      if (rollHandled) {
        return NextResponse.json({ ok: true })
      }

      // Randy sistemi
      if (chatType === 'group' || chatType === 'supergroup') {
        try {
          const randyResults = await checkRandySlots()
          const botToken = getSetting('telegram_bot_token', '')
          const sendAnnouncement = getSetting('randy_send_announcement', 'true') === 'true'
          const sendDM = getSetting('randy_send_dm', 'true') === 'true'
          const pinWinnerMessage = getSetting('randy_pin_winner_message', 'true') === 'true'
          const groupTemplate = getSetting('randy_group_template', '')
          const dmTemplate = getSetting('randy_dm_template', '')

          for (const result of randyResults) {
            if (result.assigned && result.winner && result.prizeText && botToken) {
              if (sendAnnouncement) {
                const success = await announceRandyWinner(
                  botToken,
                  chatId,
                  result.winner,
                  result.prizeText,
                  pinWinnerMessage,
                  groupTemplate || undefined
                )
                if (success && result.slotId) {
                  await prisma.randySlot.update({
                    where: { id: result.slotId },
                    data: { groupAnnounced: true }
                  })
                }
              }

              if (sendDM) {
                const { sendRandyDM } = await import('@/lib/randy')
                const dmSuccess = await sendRandyDM(botToken, result.winner, result.prizeText, dmTemplate || undefined)
                if (dmSuccess && result.slotId) {
                  await prisma.randySlot.update({
                    where: { id: result.slotId },
                    data: { dmSent: true }
                  })
                }
              }
            }
          }
        } catch (error) {
          console.error('❌ Randy error:', error)
        }
      }

      // /start komutu
      if (messageText === '/start' || messageText.startsWith('/start ')) {
        await handleStartCommand(chatId, userId, username, firstName, lastName, messageText)
        // /start sonrası mesaj istatistiklerini kaydetme, sadece komutu işle
        return NextResponse.json({ ok: true })
      }

      // ========== MESAJ İSTATİSTİKLERİ ==========
      // Telegram grup kullanıcısını kaydet/güncelle
      const telegramGroupUser = await upsertTelegramGroupUser(userId, username, firstName, lastName)

      // Mesaj istatistiğini kaydet (HERKES İÇİN)
      await prisma.messageStats.create({
        data: {
          telegramUserId: telegramGroupUser.id,
          content: messageText.substring(0, 500),
          messageLength: messageText.length,
          earnedReward: false
        }
      })

      // Telegram grup kullanıcısını güncelle
      await prisma.telegramGroupUser.update({
        where: { id: telegramGroupUser.id },
        data: {
          messageCount: { increment: 1 },
          lastMessageAt: new Date()
        }
      })

      console.log(`📊 Mesaj istatistiği kaydedildi: ${userId}`)

      // ========== ÖDÜL SİSTEMİ ==========
      // Site kullanıcısını bul
      const user = await findSiteUser(userId, telegramGroupUser)

      if (!user) {
        console.log(`⚠️ Kullanıcı siteye kayıtlı değil - sadece istatistik kaydedildi`)
        return NextResponse.json({ ok: true, message: 'Not registered' })
      }

      // Ödül sistemi
      return await handleRewardSystem(telegramGroupUser, user, messageText, userId, firstName, username)
    }

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('❌ Webhook error:', error)
    return NextResponse.json({ ok: true })
  }
}
