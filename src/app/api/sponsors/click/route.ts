import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { sponsorId } = body

    if (!sponsorId) {
      return NextResponse.json(
        { error: 'Sponsor ID required' },
        { status: 400 }
      )
    }

    // Tıklama sayısını artır
    await prisma.sponsor.update({
      where: { id: sponsorId },
      data: { clicks: { increment: 1 } }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Track sponsor click error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
