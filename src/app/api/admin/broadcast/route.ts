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

    if (!message || !message.trim()) {
      return NextResponse.json({
        success: false,
        error: 'Mesaj metni gerekli'
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
        // Replace tags in message
        let personalizedMessage = message
          .replace(/{username}/g, user.username || user.firstName || 'Kullanıcı')
          .replace(/{firstname}/g, user.firstName || user.username || 'Kullanıcı')
          .replace(/{points}/g, user.points.toString())
          .replace(/{rank}/g, user.rank?.name || 'Rütbesiz')

        const chatId = parseInt(user.telegramId)

        if (imageUrl) {
          // Send photo with caption
          await bot.sendPhoto(chatId, imageUrl, {
            caption: personalizedMessage,
            parse_mode: 'HTML',
            reply_markup: replyMarkup
          })
        } else {
          // Send text message
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
