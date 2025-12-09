import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getTurkeyDate } from '@/lib/utils'

// Telegram mesaj gönderme fonksiyonu
async function sendTelegramMessage(telegramId: string, text: string) {
  try {
    // Bot token'ı al
    const botTokenSetting = await prisma.settings.findUnique({
      where: { key: 'telegram_bot_token' }
    })

    if (!botTokenSetting?.value) {
      console.error('Bot token not configured')
      return
    }

    const url = `https://api.telegram.org/bot${botTokenSetting.value}/sendMessage`
    await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: telegramId,
        text,
        parse_mode: 'Markdown'
      })
    })
  } catch (error) {
    console.error('Error sending telegram message:', error)
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { status, deliveryInfo, processedBy } = body

    // Önce mevcut siparişi al
    const existingOrder = await prisma.userPurchase.findUnique({
      where: { id },
      select: {
        status: true,
        pointsSpent: true,
        userId: true
      }
    })

    if (!existingOrder) {
      return NextResponse.json({ error: 'Sipariş bulunamadı' }, { status: 404 })
    }

    const updateData: any = {}

    if (status) {
      updateData.status = status
      updateData.processedAt = getTurkeyDate() // Türkiye saati
    }

    if (deliveryInfo !== undefined) {
      updateData.deliveryInfo = deliveryInfo
    }

    if (processedBy) {
      updateData.processedBy = processedBy
    }

    // Transaction ile güncelleme ve puan iadesi
    const order = await prisma.$transaction(async (tx) => {
      // Sipariş güncelle
      const updatedOrder = await tx.userPurchase.update({
        where: { id },
        data: updateData,
        include: {
          user: {
            select: {
              id: true,
              telegramId: true,
              username: true,
              firstName: true,
              lastName: true,
              points: true
            }
          },
          item: {
            select: {
              id: true,
              name: true,
              description: true,
              price: true,
              imageUrl: true,
              category: true
            }
          }
        }
      })

      // Eğer sipariş iptal edildiyse ve önceden iptal edilmemişse puan iadesi yap
      if (status === 'cancelled' && existingOrder.status !== 'cancelled') {
        await tx.user.update({
          where: { id: existingOrder.userId },
          data: {
            points: {
              increment: existingOrder.pointsSpent
            }
          }
        })

        // Puan geçmişi kaydı oluştur
        await tx.pointHistory.create({
          data: {
            userId: existingOrder.userId,
            amount: existingOrder.pointsSpent,
            type: 'refund',
            description: `Sipariş iptali - ${updatedOrder.item.name}`,
            relatedId: id
          }
        })
      }

      return updatedOrder
    })

    // Sipariş onaylandıysa ve bildirim aktifse kullanıcıya mesaj gönder
    if (status === 'completed' && existingOrder.status !== 'completed') {
      const notifySetting = await prisma.settings.findUnique({
        where: { key: 'notify_order_approved' }
      })

      if (notifySetting?.value === 'true' && order.user.telegramId) {
        const message = `
🎉 **Siparişiniz Onaylandı!**

✅ Ürün: ${order.item.name}
💰 Fiyat: ${order.pointsSpent.toLocaleString()} puan

${deliveryInfo ? `📝 Teslimat Bilgisi:\n${deliveryInfo}\n\n` : ''}Siparişiniz hazırlanıyor. En kısa sürede size ulaşacak!

Yeni siparişler için marketi ziyaret edebilirsiniz! 🛍️
        `.trim()

        // Asenkron olarak mesaj gönder
        sendTelegramMessage(order.user.telegramId, message).catch(err =>
          console.error('Failed to send order notification:', err)
        )
      }
    }

    return NextResponse.json({ order })
  } catch (error) {
    console.error('Error updating order:', error)
    return NextResponse.json({ error: 'Sipariş güncellenemedi' }, { status: 500 })
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    // Önce siparişi al
    const order = await prisma.userPurchase.findUnique({
      where: { id },
      select: {
        userId: true,
        pointsSpent: true,
        status: true,
        item: {
          select: {
            name: true
          }
        }
      }
    })

    if (!order) {
      return NextResponse.json({ error: 'Sipariş bulunamadı' }, { status: 404 })
    }

    // Transaction ile silme ve puan iadesi
    await prisma.$transaction(async (tx) => {
      // Siparişi sil
      await tx.userPurchase.delete({
        where: { id }
      })

      // Sadece pending veya processing durumundaysa puan iadesi yap
      // Tamamlanmış (completed) veya iptal edilmiş (cancelled) siparişlerde iade yapma
      if (order.status === 'pending' || order.status === 'processing') {
        await tx.user.update({
          where: { id: order.userId },
          data: {
            points: {
              increment: order.pointsSpent
            }
          }
        })

        // Puan geçmişi kaydı oluştur
        await tx.pointHistory.create({
          data: {
            userId: order.userId,
            amount: order.pointsSpent,
            type: 'refund',
            description: `Sipariş silindi - ${order.item.name}`,
            relatedId: id
          }
        })
      }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting order:', error)
    return NextResponse.json({ error: 'Sipariş silinemedi' }, { status: 500 })
  }
}
