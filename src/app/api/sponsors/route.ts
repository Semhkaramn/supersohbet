import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// ✅ OPTIMIZASYON: Cache revalidation - 1 saat
export const revalidate = 3600

export async function GET(request: NextRequest) {
  try {
    const sponsors = await prisma.sponsor.findMany({
      where: { isActive: true },
      orderBy: { order: 'asc' }
    })

    // ✅ OPTIMIZASYON: Cache-Control header'ları ekle
    return NextResponse.json(
      { sponsors },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=7200'
        }
      }
    )
  } catch (error) {
    console.error('Get sponsors error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
