import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

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

    // Transaction ile satın alma işlemi
    await prisma.$transaction(async (tx) => {
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
      await tx.userPurchase.create({
        data: {
          userId,
          itemId,
          pointsSpent: item.price
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
