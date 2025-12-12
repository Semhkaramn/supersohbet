import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getTelegramBot } from '@/lib/telegram'

interface InlineButton {
  text: string
  url: string
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { message, imageUrl, buttons, sendToAll, userIds } = body

    // At least one content should exist: message or image
    if ((!message || !message.trim()) && !imageUrl) {
      return NextResponse.json({
        success: false,
        error: 'En az bir mesaj metni veya görsel gerekli'
      }, { status: 400 })
    }

    // Get users to send message to
    let targetUsers: any[] = []

    if (sendToAll) {
      targetUsers = await prisma.user.findMany({
        where: {
          isBanned: false
        },
        select: {
          id: true,
          telegramId: true,
          siteUsername: true,
          username: true,
          firstName: true,
          points: true,
          rank: {
            select: {
              name: true
            }
          }
        }
      })
    } else {
      if (!userIds || userIds.length === 0) {
        return NextResponse.json({
          success: false,
          error: 'En az bir kullanıcı seçmelisiniz'
        }, { status: 400 })
      }

      targetUsers = await prisma.user.findMany({
        where: {
          id: { in: userIds },
          isBanned: false
        },
        select: {
          id: true,
          telegramId: true,
          siteUsername: true,
          username: true,
          firstName: true,
          points: true,
          rank: {
            select: {
              name: true
            }
          }
        }
      })
    }

    if (targetUsers.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'Mesaj gönderilecek kullanıcı bulunamadı'
      }, { status: 404 })
    }

    const bot = await getTelegramBot()
    let sentCount = 0
    let failedCount = 0

    // Process buttons if provided
    let replyMarkup: any = undefined
    if (buttons && buttons.length > 0) {
      const inlineKeyboard = buttons.map((btn: InlineButton) => [
        { text: btn.text, url: btn.url }
      ])
      replyMarkup = {
        inline_keyboard: inlineKeyboard
      }
    }

    // Send messages to users
    for (const user of targetUsers) {
      try {
        // Telegram bağlantısı yoksa atla (pratikte olmamalı ama güvenlik için)
        if (!user.telegramId) {
          console.log(`⏭️ Kullanıcı ${user.id} atlandı - Telegram bağlı değil`)
          failedCount++
          continue
        }

        // Replace tags in message (with @ prefix for username)
        let personalizedMessage = ''
        if (message && message.trim()) {
          personalizedMessage = message
            .replace(/{username}/g, user.username ? `@${user.username}` : (user.firstName || 'Kullanıcı'))
            .replace(/{firstname}/g, user.firstName || user.username || 'Kullanıcı')
            .replace(/{points}/g, user.points.toString())
            .replace(/{rank}/g, user.rank?.name || 'Rütbesiz')
        }

        const chatId = parseInt(user.telegramId)

        if (imageUrl && personalizedMessage) {
          // Send photo with caption (text + image)
          await bot.sendPhoto(chatId, imageUrl, {
            caption: personalizedMessage,
            parse_mode: 'HTML',
            reply_markup: replyMarkup
          })
        } else if (imageUrl) {
          // Send photo only (no caption)
          await bot.sendPhoto(chatId, imageUrl, {
            reply_markup: replyMarkup
          })
        } else if (personalizedMessage) {
          // Send text message only
          await bot.sendMessage(chatId, personalizedMessage, {
            parse_mode: 'HTML',
            reply_markup: replyMarkup
          })
        }

        sentCount++

        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 50))
      } catch (error: any) {
        console.error(`Failed to send message to user ${user.telegramId}:`, error.message)
        failedCount++
      }
    }

    return NextResponse.json({
      success: true,
      sentCount,
      failedCount,
      totalUsers: targetUsers.length
    })
  } catch (error) {
    console.error('Error sending broadcast:', error)
    return NextResponse.json({
      success: false,
      error: 'Mesajlar gönderilirken hata oluştu'
    }, { status: 500 })
  }
}
