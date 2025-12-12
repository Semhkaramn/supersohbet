import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// ✅ OPTIMIZASYON: Cache revalidation - 10 dakika
export const revalidate = 600

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const userId = searchParams.get('userId')

    const items = await prisma.shopItem.findMany({
      where: { isActive: true },
      orderBy: [
        { category: 'asc' },
        { order: 'asc' }
      ]
    })

    // Eğer userId varsa, her ürün için kullanıcının kaç kez satın aldığını hesapla
    if (userId) {
      const itemsWithPurchaseCount = await Promise.all(
        items.map(async (item) => {
          const userPurchaseCount = await prisma.userPurchase.count({
            where: {
              userId,
              itemId: item.id
            }
          })

          return {
            ...item,
            userPurchaseCount,
            remainingPurchases: item.purchaseLimit !== null
              ? Math.max(0, item.purchaseLimit - userPurchaseCount)
              : null
          }
        })
      )

      // ✅ User-specific data için daha kısa cache
      return NextResponse.json(
        { items: itemsWithPurchaseCount },
        {
          headers: {
            'Cache-Control': 'private, max-age=60'
          }
        }
      )
    }

    // ✅ Genel liste için daha uzun cache
    return NextResponse.json(
      { items },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=600, stale-while-revalidate=1200'
        }
      }
    )
  } catch (error) {
    console.error('Get shop items error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
