import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const winners = await prisma.wheelSpin.findMany({
      include: {
        user: {
          select: {
            siteUsername: true,
            firstName: true,
            username: true,
            photoUrl: true,
          }
        },
        prize: {
          select: {
            name: true,
          }
        }
      },
      orderBy: { spunAt: 'desc' },
      take: 5
    })

    return NextResponse.json({ winners })
  } catch (error) {
    console.error('Error fetching recent winners:', error)
    return NextResponse.json(
      { error: 'Son kazananlar alınamadı' },
      { status: 500 }
    )
  }
}
