import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getTurkeyToday, getTurkeyDateAgo } from '@/lib/utils'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const search = searchParams.get('search') || ''
    const sortBy = searchParams.get('sortBy') || 'messages' // rank, points, messages
    const sortOrder = searchParams.get('sortOrder') || 'desc' // asc, desc
    const bannedFilter = searchParams.get('banned') // 'true', 'false', or null
    const registrationFilter = searchParams.get('registered') // 'true' (siteye kayıtlı), 'false' (kayıtlı değil), or null (hepsi)

    const today = getTurkeyToday()
    const weekAgo = getTurkeyDateAgo(7)
    const monthAgo = getTurkeyDateAgo(30)

    // ========== YENİ: TÜM TELEGRAM KULLANICILARINI AL ==========
    // Telegram grup kullanıcılarını al
    const telegramWhereClause: any = {}
    if (search) {
      telegramWhereClause.OR = [
        { username: { contains: search, mode: 'insensitive' } },
        { firstName: { contains: search, mode: 'insensitive' } },
        { telegramId: { contains: search } }
      ]
    }
    if (registrationFilter === 'true') {
      telegramWhereClause.linkedUserId = { not: null }
    } else if (registrationFilter === 'false') {
      telegramWhereClause.linkedUserId = null
    }

    const telegramUsers = await prisma.telegramGroupUser.findMany({
      where: telegramWhereClause,
      include: {
        linkedUser: {
          select: {
            id: true,
            siteUsername: true,
            points: true,
            xp: true,
            isBanned: true,
            banReason: true,
            bannedAt: true,
            bannedBy: true,
            hadStart: true,
            rank: {
              select: {
                name: true,
                icon: true,
                color: true,
                minXp: true
              }
            },
            _count: {
              select: {
                purchases: true,
                wheelSpins: true
              }
            }
          }
        },
        _count: {
          select: {
            groupMessages: true
          }
        }
      }
    })

    // Telegram kullanıcılarını formatla
    let combinedUsers = telegramUsers.map(tgUser => ({
      id: tgUser.id,
      telegramId: tgUser.telegramId,
      siteUsername: tgUser.linkedUser?.siteUsername || null,
      username: tgUser.username,
      firstName: tgUser.firstName,
      lastName: tgUser.lastName,
      photoUrl: tgUser.photoUrl,
      points: tgUser.linkedUser?.points || 0,
      xp: tgUser.linkedUser?.xp || 0,
      totalMessages: tgUser.messageCount,
      dailySpinsLeft: 0,
      isBanned: tgUser.linkedUser?.isBanned || false,
      banReason: tgUser.linkedUser?.banReason || null,
      bannedAt: tgUser.linkedUser?.bannedAt || null,
      bannedBy: tgUser.linkedUser?.bannedBy || null,
      createdAt: tgUser.firstSeenAt,
      hadStart: tgUser.linkedUser?.hadStart || false,
      isRegistered: !!tgUser.linkedUserId, // Siteye kayıtlı mı?
      rank: tgUser.linkedUser?.rank || null,
      _count: {
        purchases: tgUser.linkedUser?._count?.purchases || 0,
        wheelSpins: tgUser.linkedUser?._count?.wheelSpins || 0,
        messages: tgUser._count.groupMessages
      }
    }))

    // Ban filtresi uygula
    if (bannedFilter === 'true') {
      combinedUsers = combinedUsers.filter(u => u.isBanned)
    } else if (bannedFilter === 'false') {
      combinedUsers = combinedUsers.filter(u => !u.isBanned)
    }

    // Sıralama
    combinedUsers.sort((a, b) => {
      let aVal = 0, bVal = 0

      if (sortBy === 'points') {
        aVal = a.points
        bVal = b.points
      } else if (sortBy === 'messages') {
        aVal = a.totalMessages
        bVal = b.totalMessages
      } else if (sortBy === 'rank') {
        aVal = a.rank?.minXp || 0
        bVal = b.rank?.minXp || 0
      }

      return sortOrder === 'desc' ? bVal - aVal : aVal - bVal
    })
    // ========== YENİ BİTİŞ ==========

    // Get overall statistics
    const [
      totalSiteUsers,
      totalTelegramUsers,
      totalLinkedUsers,
      bannedUsers,
      hadStartUsers,
      totalMessageStats,
      dailyMessageStats,
      weeklyMessageStats,
      monthlyMessageStats,
      totalTelegramMessages,
      dailyTelegramMessages,
      weeklyTelegramMessages,
      monthlyTelegramMessages
    ] = await Promise.all([
      prisma.user.count(),
      prisma.telegramGroupUser.count(),
      prisma.telegramGroupUser.count({ where: { linkedUserId: { not: null } } }),
      prisma.user.count({ where: { isBanned: true } }),
      prisma.user.count({ where: { hadStart: true } }),
      prisma.messageStats.count(),
      prisma.messageStats.count({ where: { createdAt: { gte: today } } }),
      prisma.messageStats.count({ where: { createdAt: { gte: weekAgo } } }),
      prisma.messageStats.count({ where: { createdAt: { gte: monthAgo } } }),
      prisma.telegramGroupMessage.count(),
      prisma.telegramGroupMessage.count({ where: { createdAt: { gte: today } } }),
      prisma.telegramGroupMessage.count({ where: { createdAt: { gte: weekAgo } } }),
      prisma.telegramGroupMessage.count({ where: { createdAt: { gte: monthAgo } } })
    ])

    return NextResponse.json({
      users: combinedUsers,
      stats: {
        totalSiteUsers, // Toplam site kullanıcısı
        totalTelegramUsers, // Toplam telegram grup kullanıcısı
        totalLinkedUsers, // Site hesabına bağlı telegram kullanıcısı
        totalUnlinkedUsers: totalTelegramUsers - totalLinkedUsers, // Siteye kayıtlı olmayan telegram kullanıcısı
        bannedUsers,
        hadStartUsers,
        usersWithMessages: totalTelegramUsers, // Mesaj yazan telegram kullanıcısı
        messages: {
          total: totalTelegramMessages, // Toplam telegram grup mesajı
          daily: dailyTelegramMessages,
          weekly: weeklyTelegramMessages,
          monthly: monthlyTelegramMessages
        },
        siteMessages: {
          total: totalMessageStats,
          daily: dailyMessageStats,
          weekly: weeklyMessageStats,
          monthly: monthlyMessageStats
        }
      }
    })
  } catch (error) {
    console.error('Get statistics error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
