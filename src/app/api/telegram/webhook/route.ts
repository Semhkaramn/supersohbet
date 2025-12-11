import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getTurkeyDate } from '@/lib/utils'
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
  cleanInactiveUsers,
  getStatusList,
  getStepList,
  clearRollData,
  lockRoll,
  unlockRoll
} from '@/lib/roll-system'

// Ayarları cache'e al (performans için)
let settingsCache: Record<string, string> = {}
let lastCacheUpdate = 0
const CACHE_TTL = 60000 // 1 dakika

async function getSettings() {
  const now = Date.now()
  if (now - lastCacheUpdate > CACHE_TTL) {
    const settings = await prisma.settings.findMany()
    settingsCache = settings.reduce((acc: Record<string, string>, s) => ({ ...acc, [s.key]: s.value }), {})
    lastCacheUpdate = now
  }
  return settingsCache
}

function getSetting(key: string, defaultValue: string = '0'): string {
  return settingsCache[key] || defaultValue
}

async function sendTelegramMessage(chatId: number, text: string, keyboard?: any) {
  const botToken = getSetting('telegram_bot_token', '')
  if (!botToken) {
    console.error('Bot token not set')
    return
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
    await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    })
  } catch (error) {
    console.error('Error sending message:', error)
  }
}

async function answerCallbackQuery(callbackQueryId: string, text?: string) {
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
    console.error('Error answering callback:', error)
  }
}

// Ban kontrolü
async function checkUserBan(userId: string): Promise<{ isBanned: boolean; banReason?: string }> {
  try {
    const user = await prisma.user.findUnique({
      where: { telegramId: userId },
      select: { isBanned: true, banReason: true }
    })

    return {
      isBanned: user?.isBanned || false,
      banReason: user?.banReason || undefined
    }
  } catch (error) {
    console.error('Error checking ban status:', error)
    return { isBanned: false }
  }
}

// Admin kontrolü - Hem env'den hem grup adminlerinden kontrol eder
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

    // Grup adminlerini kontrol et
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
    console.error('Error checking admin:', error)
    return false
  }
}

export async function POST(request: NextRequest) {
  try {
    const update = await request.json()

    // Ayarları yükle
    await getSettings()

    // Bakım modu kontrolü
    if (getSetting('maintenance_mode') === 'true') {
      return NextResponse.json({ ok: true, message: 'Maintenance mode' })
    }

    // Callback query işle
    if (update.callback_query) {
      const query = update.callback_query
      const chatId = query.message?.chat.id
      const userId = String(query.from.id)

      // Ban kontrolü
      const banStatus = await checkUserBan(userId)
      if (banStatus.isBanned) {
        await answerCallbackQuery(query.id)
        if (chatId) {
          const banMessage = `
🚫 **Hesabınız Yasaklandı**

${banStatus.banReason ? `Neden: ${banStatus.banReason}` : 'Sistem kurallarını ihlal ettiniz.'}

Bot özelliklerini kullanmanız engellenmiştir.
          `.trim()
          await sendTelegramMessage(chatId, banMessage)
        }
        return NextResponse.json({ ok: true })
      }

      if (query.data === 'my_stats') {
        const user = await prisma.user.findUnique({
          where: { telegramId: userId },
          include: { rank: true }
        })

        const statsMessage = user ? `
📊 **Senin İstatistiklerin**

🌟 Puan: ${user.points.toLocaleString()}
⭐ XP: ${user.xp.toLocaleString()}
🏆 Rütbe: ${user.rank?.icon || '🌱'} ${user.rank?.name || 'Yeni Başlayan'}
💬 Mesaj: ${user.totalMessages.toLocaleString()}

Daha fazla bilgi için Ödül Merkezi'ne git!
        `.trim() : `
📊 **Senin İstatistiklerin**

🌟 Puan: 0
⭐ XP: 0
🏆 Rütbe: Yeni Başlayan
💬 Mesaj: 0

Daha fazla bilgi için Ödül Merkezi'ne git!
        `.trim()

        await answerCallbackQuery(query.id)
        if (chatId) {
          await sendTelegramMessage(chatId, statsMessage)
        }
      }

      return NextResponse.json({ ok: true })
    }

    // Mesaj varsa işle
    if (update.message && update.message.text) {
      const message = update.message

      // 🔍 KONTROL: message.from var mı? (anonymous admin/channel mesajlarında olmayabilir)
      if (!message.from || !message.from.id) {
        console.log('⚠️ message.from YOK veya message.from.id YOK - Anonymous admin veya channel mesajı')
        console.log('sender_chat:', message.sender_chat)
        console.log('message_id:', message.message_id)
        return NextResponse.json({ ok: true, message: 'No from.id - anonymous/channel message' })
      }

      const chatId = message.chat.id
      const userId = String(message.from.id)
      const username = message.from.username
      const firstName = message.from.first_name
      const lastName = message.from.last_name
      const messageText = message.text

      // 📊 LOG: Alınan değerleri logla
      console.log(`📩 MESAJ ALINDI:`, {
        messageId: message.message_id,
        fromUserId: message.from.id,
        fromUsername: username,
        fromFirstName: firstName,
        chatId: chatId,
        chatType: message.chat.type,
        extractedUserId: userId
      })

      // Aktif grup kontrolü - Sadece GRUP mesajlarında kontrol et, private chat'leri geçir
      const chatType = message.chat.type
      const activityGroupId = getSetting('activity_group_id', '')

      // Eğer grup veya supergroup ise ve activity_group_id ayarlanmışsa kontrol et
      if ((chatType === 'group' || chatType === 'supergroup') && activityGroupId && activityGroupId.trim() !== '') {
        const chatIdStr = String(chatId)
        const isActivityGroup = chatIdStr === activityGroupId

        console.log(`🔍 Grup Kontrolü:`, {
          chatType,
          messageChatId: chatIdStr,
          activityGroupId: activityGroupId,
          isMatch: isActivityGroup,
          from: `${firstName || username || userId}`
        })

        if (!isActivityGroup) {
          console.log(`⏭️ Mesaj aktif grupta değil - atlandı`)
          return NextResponse.json({ ok: true, message: 'Not activity group' })
        }

        console.log(`✅ Mesaj aktif grupta - işleniyor`)
      } else if (chatType === 'private') {
        console.log(`💬 Private mesaj - işleniyor (grup kontrolü atlandı)`)
      } else {
        console.log(`⚠️ Aktif grup ayarlanmamış veya private chat - tüm mesajlar işleniyor`)
      }

      // /start komutu hariç her şey için ban kontrolü
      if (messageText !== '/start' && !messageText.startsWith('/start ')) {
        const banStatus = await checkUserBan(userId)
        if (banStatus.isBanned) {
          const banMessage = `
🚫 **Hesabınız Yasaklandı**

${banStatus.banReason ? `Neden: ${banStatus.banReason}` : 'Sistem kurallarını ihlal ettiniz.'}

Bot özelliklerini kullanmanız engellenmiştir.
          `.trim()
          await sendTelegramMessage(chatId, banMessage)
          return NextResponse.json({ ok: true })
        }
      }

      // ROLL SİSTEMİ - Sadece gruplarda çalışır
      if (chatType === 'group' || chatType === 'supergroup') {
        const groupId = String(chatId)
        const text = messageText.trim()

        // Roll sistemi aktif mi kontrol et - ANLIK DB OKUMA
        const rollSetting = await prisma.settings.findUnique({
          where: { key: 'roll_enabled' }
        })
        const rollEnabled = rollSetting?.value === 'true'

        if (!rollEnabled) {
          // Roll sistemi devre dışı - roll komutlarını ignore et
          if (text.toLowerCase() === 'liste' || text.startsWith('roll ') || text === 'roll') {
            return NextResponse.json({ ok: true })
          }
        }

        // Aktif grup kontrolü - Roll sistemi sadece aktif grupta çalışır
        const activeGroupId = getSetting('activity_group_id', '')
        const isActiveGroup = activeGroupId === groupId

        // "liste" komutu - Herkes kullanabilir (sadece aktif grupta)
        if (text.toLowerCase() === 'liste') {
          if (!isActiveGroup) {
            return NextResponse.json({ ok: true })
          }

          const statusMsg = getStatusList(groupId)
          await sendTelegramMessage(chatId, statusMsg)
          return NextResponse.json({ ok: true })
        }

        // Roll komutları - Sadece adminler (sadece aktif grupta)
        if (text.startsWith('roll ') || text === 'roll') {
          if (!isActiveGroup) {
            return NextResponse.json({ ok: true })
          }

          const isAdmin = await checkAdmin(chatId, Number(userId))

          const parts = text.split(' ')

          if (parts.length === 1) {
            // Sadece "roll" yazılmış - sessiz kal
            return NextResponse.json({ ok: true })
          }

          const command = parts.slice(1).join(' ').toLowerCase()

          // roll <sayı> - Roll başlat
          if (/^\d+$/.test(command)) {
            if (!isAdmin) return NextResponse.json({ ok: true })

            const duration = Number.parseInt(command)
            startRoll(groupId, duration)

            await sendTelegramMessage(
              chatId,
              `✅ Roll Başladı!\n⏳ ${duration} dakika içinde mesaj yazmayan listeden çıkarılır.`
            )
            return NextResponse.json({ ok: true })
          }

          // roll adım - Adım kaydet ve duraklat
          if (command === 'adım' || command === 'adim') {
            if (!isAdmin) return NextResponse.json({ ok: true })

            const result = saveStep(groupId)

            if (!result.success) {
              await sendTelegramMessage(chatId, result.message)
              return NextResponse.json({ ok: true })
            }

            const stepList = getStepList(groupId)
            await sendTelegramMessage(
              chatId,
              `📌 Adım ${result.stepNumber} Kaydedildi!\n\n${stepList}`
            )
            return NextResponse.json({ ok: true })
          }

          // roll mola - Mola başlat
          if (command === 'mola') {
            if (!isAdmin) return NextResponse.json({ ok: true })

            const state = getRollState(groupId)

            if (state.status === 'stopped') {
              await sendTelegramMessage(chatId, '⚠️ Roll aktif değil. Mola başlatılamaz.')
              return NextResponse.json({ ok: true })
            }

            if (state.status === 'break') {
              await sendTelegramMessage(chatId, '⚠️ Zaten molada.')
              return NextResponse.json({ ok: true })
            }

            startBreak(groupId)
            await sendTelegramMessage(chatId, '☕ Mola başladı! Liste korunuyor.')
            return NextResponse.json({ ok: true })
          }

          // roll devam - Akıllı devam (hem paused hem break için)
          if (command === 'devam') {
            if (!isAdmin) return NextResponse.json({ ok: true })

            const state = getRollState(groupId)

            if (state.status !== 'paused' && state.status !== 'break') {
              await sendTelegramMessage(chatId, '⚠️ Roll zaten aktif veya durdurulmuş.')
              return NextResponse.json({ ok: true })
            }

            const wasBreak = state.status === 'break'
            resumeRoll(groupId)

            // Get updated state after resumeRoll
            const updatedState = getRollState(groupId)
            const stepList = getStepList(groupId)
            const nextStep = updatedState.currentStep + 1
            const statusText = updatedState.status === 'active' ? '▶️ Aktif' : '⏸ Duraklatıldı'

            if (wasBreak) {
              await sendTelegramMessage(
                chatId,
                `${stepList ? stepList + '\n\n' : ''}✅ Mola bitti! ${statusText}\n⏳ ${updatedState.activeDuration} dakika kuralı geçerlidir.`
              )
            } else {
              await sendTelegramMessage(
                chatId,
                `${stepList ? stepList + '\n\n' : ''}▶️ Adım ${nextStep}'e geçildi!\n⏳ ${updatedState.activeDuration} dakika kuralı geçerlidir.`
              )
            }

            return NextResponse.json({ ok: true })
          }

          // roll kilit - Yeni kullanıcı girişini kapat
          if (command === 'kilit') {
            if (!isAdmin) return NextResponse.json({ ok: true })

            const state = getRollState(groupId)

            if (state.status === 'stopped') {
              await sendTelegramMessage(chatId, '⚠️ Roll aktif değil.')
              return NextResponse.json({ ok: true })
            }

            if (state.status === 'locked') {
              await sendTelegramMessage(chatId, '⚠️ Liste zaten kilitli.')
              return NextResponse.json({ ok: true })
            }

            lockRoll(groupId)
            await sendTelegramMessage(chatId, '🔒 Liste kilitlendi! Yeni kullanıcı giremez, mevcut kullanıcılar devam edebilir.')
            return NextResponse.json({ ok: true })
          }

          // roll bitir - Sonlandır
          if (command === 'bitir') {
            if (!isAdmin) return NextResponse.json({ ok: true })

            const state = getRollState(groupId)

            if (state.status === 'stopped') {
              await sendTelegramMessage(chatId, '⚠️ Roll zaten durdurulmuş.')
              return NextResponse.json({ ok: true })
            }

            stopRoll(groupId)

            const stepList = getStepList(groupId)

            if (!stepList) {
              await sendTelegramMessage(chatId, '✅ Roll Sonlandı!\n📭 Hiç adım kaydedilmedi.')
            } else {
              await sendTelegramMessage(chatId, `🏁 Roll Sonlandı!\n\n${stepList}`)
            }

            clearRollData(groupId)
            return NextResponse.json({ ok: true })
          }

          // Geçersiz komut - sessiz kal
          return NextResponse.json({ ok: true })
        }

        // Normal mesaj - tracking aktifse kaydet (sadece aktif grupta)
        if (isActiveGroup && rollEnabled) {
          const state = getRollState(groupId)
          if (state.status === 'active' || state.status === 'locked') {
            trackUserMessage(groupId, userId, username || null, firstName || null)
          }
        }
      }

      // RANDY SİSTEMİ - Her mesajda slot kontrolü yap (sadece gruplarda)
      if (chatType === 'group' || chatType === 'supergroup') {
        try {
          const randyResults = await checkRandySlots()
          const botToken = getSetting('telegram_bot_token', '')
          const sendAnnouncement = getSetting('randy_send_announcement', 'true') === 'true'
          const sendDM = getSetting('randy_send_dm', 'true') === 'true'
          const pinWinnerMessage = getSetting('randy_pin_winner_message', 'true') === 'true'
          const groupTemplate = getSetting('randy_group_template', '')
          const dmTemplate = getSetting('randy_dm_template', '')

          // Kazananları duyur ve DM gönder
          for (const result of randyResults) {
            if (result.assigned && result.winner && result.prizeText && botToken) {
              // Grup duyurusu gönder
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
                  // Slot'u güncelle - duyuruldu olarak işaretle
                  await prisma.randySlot.update({
                    where: { id: result.slotId },
                    data: { groupAnnounced: true }
                  })
                }
              }

              // DM gönder (sadece /start yapmış kullanıcılara)
              if (sendDM) {
                const { sendRandyDM } = await import('@/lib/randy')
                const dmSuccess = await sendRandyDM(
                  botToken,
                  result.winner,
                  result.prizeText,
                  dmTemplate || undefined
                )

                if (dmSuccess && result.slotId) {
                  // Slot'u güncelle - DM gönderildi olarak işaretle
                  await prisma.randySlot.update({
                    where: { id: result.slotId },
                    data: { dmSent: true }
                  })
                }
              }
            }
          }
        } catch (error) {
          console.error('Randy check error:', error)
        }
      }

      // /start komutu kontrolü
      if (messageText === '/start' || messageText.startsWith('/start ')) {
        const webAppUrl = getSetting('telegram_webhook_url', '').replace('/api/telegram/webhook', '') || process.env.NEXT_PUBLIC_APP_URL || 'https://soft-fairy-c52849.netlify.app'

        const startParam = messageText.split(' ')[1]

        // Profil fotoğrafını al (tüm yeni/mevcut kullanıcılar için)
        const { getUserProfilePhoto } = await import('@/lib/telegram')
        let photoUrl: string | null = null
        try {
          photoUrl = await getUserProfilePhoto(Number(userId))
          console.log(`📸 PP alındı: ${photoUrl ? 'Var' : 'Yok'}`)
        } catch (error) {
          console.error('PP alınamadı:', error)
        }

        // 1️⃣ ÖNCELİK: Connection Token kontrolü (6 haneli kod)
        if (startParam && /^\d{6}$/.test(startParam)) {
          console.log('🔐 Token ile bağlantı denemesi:', { token: startParam, telegramId: userId, firstName, username })

          // Web'den kayıtlı kullanıcıyı token ile bul
          const webUser = await prisma.user.findFirst({
            where: {
              telegramConnectionToken: startParam,
              telegramConnectionTokenExpiry: { gte: new Date() }, // Token geçerli mi?
              telegramId: null // Henüz bağlanmamış
            }
          })

          console.log('👤 Token ile kullanıcı arama sonucu:', webUser ? `Bulundu: ${webUser.email || webUser.id}` : 'Bulunamadı')

          if (webUser) {
            // Kullanıcıya Telegram bilgilerini ekle
            const updatedUser = await prisma.user.update({
              where: { id: webUser.id },
              data: {
                telegramId: userId,
                username: username || webUser.username,
                firstName: firstName || webUser.firstName,
                lastName: lastName || webUser.lastName,
                photoUrl: photoUrl || webUser.photoUrl, // PP'yi kaydet
                hadStart: true,
                telegramConnectionToken: null, // Token'ı sil
                telegramConnectionTokenExpiry: null
              }
            })

            // ========== YENİ: TELEGRAM GRUP KULLANICISINI BAĞLA ==========
            // Telegram grup kullanıcısını bul veya oluştur
            let telegramGroupUser = await prisma.telegramGroupUser.findUnique({
              where: { telegramId: userId }
            })

            if (telegramGroupUser) {
              // Mevcut telegram grup kullanıcısını site kullanıcısıyla bağla
              await prisma.telegramGroupUser.update({
                where: { id: telegramGroupUser.id },
                data: {
                  linkedUserId: updatedUser.id,
                  username: username || telegramGroupUser.username,
                  firstName: firstName || telegramGroupUser.firstName,
                  lastName: lastName || telegramGroupUser.lastName,
                  photoUrl: photoUrl || telegramGroupUser.photoUrl
                }
              })
              console.log(`✅ Telegram grup kullanıcısı site kullanıcısıyla bağlandı (${telegramGroupUser.messageCount} geçmiş mesaj birleştirildi)`)
            } else {
              // Telegram grup kullanıcısı yoksa oluştur ve bağla
              telegramGroupUser = await prisma.telegramGroupUser.create({
                data: {
                  telegramId: userId,
                  username: username || null,
                  firstName: firstName || null,
                  lastName: lastName || null,
                  photoUrl: photoUrl || null,
                  linkedUserId: updatedUser.id,
                  messageCount: 0
                }
              })
              console.log(`✅ Yeni telegram grup kullanıcısı oluşturuldu ve site kullanıcısıyla bağlandı`)
            }
            // ========== YENİ BİTİŞ ==========

            await sendTelegramMessage(chatId, `
✅ **Hesabınız Başarıyla Bağlandı!**

Merhaba ${firstName || webUser.firstName}!
${telegramGroupUser && telegramGroupUser.messageCount > 0 ? `\n📊 ${telegramGroupUser.messageCount} geçmiş mesajınız hesabınıza aktarıldı!` : ''}
            `.trim())

            console.log('✅ Web kullanıcısı Telegram ile bağlandı:', {
              userId: webUser.id,
              email: webUser.email,
              telegramId: userId,
              updatedUser: updatedUser.telegramId
            })

            return NextResponse.json({ ok: true })
          }

          // Token bulunamadı - Detaylı kontrol
          console.log('🔍 Token bulunamadı, detaylı kontrol yapılıyor...')

          // Token'ı olan tüm kullanıcıları kontrol et (debug için)
          const allTokenUsers = await prisma.user.findMany({
            where: {
              telegramConnectionToken: startParam
            },
            select: {
              id: true,
              email: true,
              telegramId: true,
              telegramConnectionToken: true,
              telegramConnectionTokenExpiry: true
            }
          })

          console.log('📋 Bu token ile bulunan kullanıcılar:', JSON.stringify(allTokenUsers, null, 2))

          if (allTokenUsers.length > 0) {
            const user = allTokenUsers[0]
            console.log('⚠️ Token bulundu AMA:', {
              zatenTelegramBagli: user.telegramId ? 'EVET' : 'HAYIR',
              tokenSuresiGecmis: user.telegramConnectionTokenExpiry ? (user.telegramConnectionTokenExpiry < new Date() ? 'EVET' : 'HAYIR') : 'BİLİNMİYOR'
            })
          }

          // Token geçersiz veya bulunamadı
          await sendTelegramMessage(chatId, `
❌ **Bağlantı Kodu Geçersiz!**

Bu bağlantı kodu geçersiz veya süresi dolmuş.

Lütfen web sitesinden yeni bir kod alın ve tekrar deneyin.
          `.trim())

          return NextResponse.json({ ok: true })
        }


        const welcomeMessage = `
🎉 **SüperSohbet Bot'a Hoş Geldin!**

Merhaba ${firstName}!
✨ Mesaj göndererek puan kazan
🏆 Rütbe atla
🎁 Günlük şans çarkını çevir
🛍️ Puanlarınla ödüller satın al

Siteye Butondan ulaşabilirsiniz
        `.trim()

        await sendTelegramMessage(chatId, welcomeMessage)

        // Mevcut kullanıcı kontrolü (artık Telegram'dan yeni kayıt yapılamaz)
        const existingUser = await prisma.user.findUnique({
          where: { telegramId: userId }
        })

        if (existingUser) {
          // Mevcut kullanıcı, sadece temel bilgileri güncelle
          await prisma.user.update({
            where: { telegramId: userId },
            data: {
              username,
              firstName,
              lastName,
              photoUrl: photoUrl || undefined, // PP varsa güncelle, yoksa mevcut kalsın
              hadStart: true // Kullanıcı /start yaptı
            }
          })
        }
      }

      // Ayarları al
      const minMessageLength = parseInt(getSetting('min_message_length', '3'))
      const messageCooldown = parseInt(getSetting('message_cooldown_seconds', '5'))
      const pointsPerMessage = parseInt(getSetting('points_per_message', '10'))
      const xpPerMessage = parseInt(getSetting('xp_per_message', '5'))
      const messagesForXp = parseInt(getSetting('messages_for_xp', '1'))
      const allowNewUsers = getSetting('allow_new_users', 'true') === 'true'

      // PUAN KAZANMA SADECE GRUPLARDA OLUR - Private chat'te puan verilmez
      if (chatType === 'private') {
        console.log(`💬 Private chat mesajı - puan verilmez`)
        return NextResponse.json({ ok: true, message: 'Private chat - no points' })
      }

      // ========== YENİ: TÜM TELEGRAM KULLANICILARINI KAYDET ==========
      // Telegram grup kullanıcısını oluştur veya güncelle (siteye kayıt olmamış bile olsa)
      let telegramGroupUser = await prisma.telegramGroupUser.findUnique({
        where: { telegramId: userId }
      })

      if (!telegramGroupUser) {
        // Yeni telegram kullanıcısı - oluştur
        telegramGroupUser = await prisma.telegramGroupUser.create({
          data: {
            telegramId: userId,
            username: username || null,
            firstName: firstName || null,
            lastName: lastName || null,
            messageCount: 0
          }
        })
        console.log(`✅ Yeni Telegram grup kullanıcısı oluşturuldu: ${userId} (${firstName || username})`)
      } else {
        // Mevcut telegram kullanıcısı - bilgileri güncelle
        await prisma.telegramGroupUser.update({
          where: { telegramId: userId },
          data: {
            username: username || telegramGroupUser.username,
            firstName: firstName || telegramGroupUser.firstName,
            lastName: lastName || telegramGroupUser.lastName
          }
        })
      }

      // Telegram grup mesajını kaydet (TÜM KULLANICILAR İÇİN)
      await prisma.telegramGroupMessage.create({
        data: {
          telegramUserId: telegramGroupUser.id,
          content: messageText.substring(0, 500),
          messageLength: messageText.length
        }
      })

      // Telegram grup kullanıcısının mesaj sayısını artır
      await prisma.telegramGroupUser.update({
        where: { id: telegramGroupUser.id },
        data: {
          messageCount: { increment: 1 },
          lastMessageAt: new Date()
        }
      })

      console.log(`📝 Telegram grup mesajı kaydedildi: ${userId} - ${telegramGroupUser.messageCount + 1} mesaj`)
      // ========== YENİ BİTİŞ ==========

      // 🔍 DEBUG: userId değerini detaylı logla
      console.log(`🔍 DB ARAMA - userId:`, {
        value: userId,
        type: typeof userId,
        length: userId.length,
        charCodes: [...userId].map(c => c.charCodeAt(0))
      })

      // Kullanıcıyı bul - Önce telegramId ile, yoksa linkedUserId ile
      let user = await prisma.user.findUnique({
        where: { telegramId: userId }
      })

      console.log(`🔍 DB SONUÇ - User bulundu mu:`, {
        found: !!user,
        userId: user?.id,
        telegramId: user?.telegramId,
        email: user?.email,
        siteUsername: user?.siteUsername
      })

      // TelegramId ile bulunamadıysa, TelegramGroupUser üzerinden linkedUserId ile bul
      if (!user && telegramGroupUser.linkedUserId) {
        user = await prisma.user.findUnique({
          where: { id: telegramGroupUser.linkedUserId }
        })
        console.log(`🔗 Kullanıcı linkedUserId ile bulundu: ${user?.email || user?.siteUsername}`)
      }

      // Manuel kontrol - telegramId ile arama
      if (!user) {
        console.log(`❌ User bulunamadı, manuel kontrol yapılıyor...`)
        const allUsers = await prisma.user.findMany({
          where: {
            OR: [
              { telegramId: userId },
              { telegramId: String(userId) },
              { telegramId: { contains: '5725763398' } }
            ]
          },
          select: { id: true, telegramId: true, email: true, siteUsername: true }
        })
        console.log(`📋 Manuel arama sonucu (${allUsers.length} kayıt):`, JSON.stringify(allUsers, null, 2))
      }

      // Kullanıcı yoksa (web'den kayıt olmamış ve bağlantı yapmamış), mesajı kaydettik ama puan vermiyoruz
      if (!user) {
        console.log(`⚠️ Kullanıcı siteye kayıtlı değil - mesaj kaydedildi ama puan verilmedi: ${userId}`)
        return NextResponse.json({ ok: true, message: 'Message saved - user not registered on website' })
      }

      // Sitede kayıtlı olması yeterli - /start şartı kaldırıldı
      const canEarnPoints = true

      // TÜM MESAJLARI İSTATİSTİK İÇİN KAYDET (KURALLARDAN BAĞIMSIZ)
      await prisma.messageStats.create({
        data: {
          userId: user.id,
          content: messageText.substring(0, 500),
          messageLength: messageText.length,
          earnedReward: false // Varsayılan olarak false, ödül verilirse güncellenecek
        }
      })

      // Toplam mesaj sayısını artır (tüm mesajlar için - görevler için kullanılır)
      await prisma.user.update({
        where: { id: user.id },
        data: {
          totalMessages: { increment: 1 }
        }
      })

      // Mesaj uzunluğu kontrolü (ÖDÜL İÇİN)
      if (messageText.length < minMessageLength) {
        return NextResponse.json({ ok: true, message: 'Message too short' })
      }

      // Spam kontrolü - Son mesajdan beri yeterli süre geçmiş mi? (ÖDÜL İÇİN)
      if (user.lastMessageAt) {
        const timeSinceLastMessage = (Date.now() - user.lastMessageAt.getTime()) / 1000
        if (timeSinceLastMessage < messageCooldown) {
          return NextResponse.json({ ok: true, message: 'Cooldown active' })
        }
      }

      // Mesaj sayacını artır
      const newMessageCount = user.messageCount + 1

      // XP verilecek mi kontrol et
      const shouldGiveXp = newMessageCount % messagesForXp === 0

      // Kullanıcıyı güncelle (ÖDÜL VER)
      const updatedUser = await prisma.user.update({
        where: { id: user.id },
        data: {
          points: { increment: pointsPerMessage },
          xp: shouldGiveXp ? { increment: xpPerMessage } : undefined,
          messageCount: newMessageCount,
          lastMessageAt: getTurkeyDate() // Türkiye saati
        }
      })

      // Bu mesajın ödül kazandığını işaretle
      await prisma.messageStats.updateMany({
        where: {
          userId: user.id,
          createdAt: { gte: new Date(getTurkeyDate().getTime() - 2000) } // Son 2 saniyedeki mesaj (Türkiye saati)
        },
        data: {
          earnedReward: true
        }
      })

      // ✅ Puan/XP değiştiği için leaderboard cache'ini temizle
      // Not: Her mesajda invalidate yapıyoruz çünkü points her mesajda artıyor
      invalidateLeaderboardCache()

      // Rütbe kontrolü ve güncelleme (sadece XP verildiğinde)
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

          // Seviye atlama bildirimi - SADECE GRUPTA, MENTION İLE
          const notificationSent = await notifyLevelUp(
            userId,
            firstName || username || 'Kullanıcı',
            {
              icon: currentRank.icon,
              name: currentRank.name,
              xp: updatedUser.xp
            }
          )

          if (notificationSent) {
            console.log(`✅ Rütbe atlaması bildirimi gönderildi: ${userId} -> ${currentRank.name}`)
          } else {
            console.log(`⚠️ Rütbe atlaması bildirimi gönderilemedi: ${userId}`)
          }
        }
      }
    }

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('Webhook error:', error)
    return NextResponse.json({ ok: true })
  }
}
