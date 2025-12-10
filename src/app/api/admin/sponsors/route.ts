import { NextResponse, NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const includeUserData = searchParams.get('includeUserData')

    if (includeUserData === 'true') {
      // Kullanıcı sponsor bilgilerini getir
      const userSponsorInfos = await prisma.userSponsorInfo.findMany({
        include: {
          user: {
            select: {
              id: true,
              telegramId: true,
              username: true,
              firstName: true,
              lastName: true
            }
          },
          sponsor: {
            select: {
              id: true,
              name: true,
              identifierType: true,
              category: true
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        }
      })

      return NextResponse.json({ userSponsorInfos })
    }

    // Normal sponsor listesi
    const sponsors = await prisma.sponsor.findMany({
      orderBy: [{ order: 'asc' }, { createdAt: 'desc' }]
    })

    return NextResponse.json({ sponsors })
  } catch (error) {
    console.error('Error fetching sponsors:', error)
    return NextResponse.json({ error: 'Sponsorlar yüklenemedi' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, description, logoUrl, logoPublicId, websiteUrl, category, identifierType, order } = body

    if (!name) {
      return NextResponse.json(
        { error: 'name required' },
        { status: 400 }
      )
    }

    const sponsor = await prisma.sponsor.create({
      data: {
        name,
        description: description || null,
        logoUrl: logoUrl || null,
        logoPublicId: logoPublicId || null,
        websiteUrl: websiteUrl || null,
        category: category || 'normal',
        identifierType: identifierType || 'username',
        order: order || 0
      }
    })

    return NextResponse.json({ sponsor })
  } catch (error) {
    console.error('Create sponsor error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
