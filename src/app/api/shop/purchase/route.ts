import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import type { Prisma } from '@prisma/client'
import { requireAuth } from '@/lib/auth'

export async function POST(request: NextRequest) {
  try {
    // Session kontrolü - artık body'den userId yerine session kullanıyoruz
    const session = await requireAuth(request)
    const userId = session.userId

    const body = await request.json()
    const { itemId, walletAddress, sponsorInfo } = body

    if (!itemId) {
      return NextResponse.json(
        { error: 'Item ID required' },
        { status: 400 }
      )
    }

    // Kullanıcı ve ürünü getir
    const [user, item] = await Promise.all([
      prisma.user.findUnique({
        where: { id: userId },
        include: { sponsorInfos: true }
      }),
      prisma.shopItem.findUnique({
        where: { id: itemId },
        include: { sponsor: true }
      })
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

    // Nakit kategorisi kontrolü
    if (item.category === 'Nakit') {
      if (!walletAddress && !user.trc20WalletAddress) {
        return NextResponse.json(
          { error: 'Nakit kategorisindeki ürünler için TRC20 cüzdan adresi gereklidir. Lütfen profilinizden cüzdan adresinizi ekleyin.' },
          { status: 400 }
        )
      }
    }

    // Sponsor kategorisi kontrolü
    if (item.category === 'Sponsor' && item.sponsorId) {
      const userHasSponsorInfo = user.sponsorInfos.some(
        info => info.sponsorId === item.sponsorId
      )

      if (!sponsorInfo && !userHasSponsorInfo) {
        return NextResponse.json(
          {
            error: 'Bu ürün için sponsor bilgisi gereklidir. Lütfen sponsor bilginizi ekleyin.',
            requiresSponsorInfo: true,
            sponsorId: item.sponsorId,
            sponsorName: item.sponsor?.name,
            identifierType: item.sponsor?.identifierType
          },
          { status: 400 }
        )
      }
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

      // Cüzdan adresini belirle (parametre olarak gelmediyse kullanıcının kaydedilmiş adresini kullan)
      const finalWalletAddress = item.category === 'Nakit'
        ? (walletAddress || user.trc20WalletAddress)
        : null

      // Sponsor bilgisini belirle
      let finalSponsorInfo = null
      if (item.category === 'Sponsor' && item.sponsorId) {
        if (sponsorInfo) {
          finalSponsorInfo = sponsorInfo
        } else {
          const userSponsorInfo = user.sponsorInfos.find(
            info => info.sponsorId === item.sponsorId
          )
          finalSponsorInfo = userSponsorInfo?.identifier || null
        }
      }

      // Satın alma kaydı oluştur
      const purchase = await tx.userPurchase.create({
        data: {
          userId,
          itemId,
          pointsSpent: item.price,
          walletAddress: finalWalletAddress,
          sponsorInfo: finalSponsorInfo
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
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json(
        { error: 'Oturum geçersiz. Lütfen tekrar giriş yapın.' },
        { status: 401 }
      )
    }
    console.error('Purchase error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
