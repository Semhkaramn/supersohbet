import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import type { Prisma } from '@prisma/client'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { userId, itemId } = body

    if (!userId || !itemId) {
      return NextResponse.json(
        { error: 'User ID and Item ID required' },
        { status: 400 }
      )
    }

    // Kullanıcı ve ürünü getir
    const [user, item] = await Promise.all([
      prisma.user.findUnique({ where: { id: userId } }),
      prisma.shopItem.findUnique({ where: { id: itemId } })
    ])

    if (!user || !item) {
      return NextResponse.json(
        { error: 'User or item not found' },
        { status: 404 }
      )
    }

    if (!item.isActive) {
      return NextResponse.json(
        { error: 'Item is not available' },
        { status: 400 }
      )
    }

    if (user.points < item.price) {
      return NextResponse.json(
        { error: 'Insufficient points' },
        { status: 400 }
      )
    }

    if (item.stock !== null && item.stock <= 0) {
      return NextResponse.json(
        { error: 'Item out of stock' },
        { status: 400 }
      )
    }

    // Satın alma limiti kontrolü
    if (item.purchaseLimit !== null) {
      const purchaseCount = await prisma.userPurchase.count({
        where: {
          userId,
          itemId
        }
      })

      if (purchaseCount >= item.purchaseLimit) {
        return NextResponse.json(
          { error: `Bu ürünü en fazla ${item.purchaseLimit} kez satın alabilirsiniz` },
          { status: 400 }
        )
      }
    }

    // Transaction ile satın alma işlemi
    await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      // Kullanıcı puanını düş
      await tx.user.update({
        where: { id: userId },
        data: { points: { decrement: item.price } }
      })

      // Stok varsa düş
      if (item.stock !== null) {
        await tx.shopItem.update({
          where: { id: itemId },
          data: { stock: { decrement: 1 } }
        })
      }

      // Satın alma kaydı oluştur
      const purchase = await tx.userPurchase.create({
        data: {
          userId,
          itemId,
          pointsSpent: item.price
        }
      })

      // Puan geçmişi kaydı oluştur
      await tx.pointHistory.create({
        data: {
          userId,
          amount: -item.price,
          type: 'shop_purchase',
          description: `${item.name} satın alındı`,
          relatedId: purchase.id
        }
      })
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Purchase error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
