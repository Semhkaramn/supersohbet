import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const prizes = await prisma.wheelPrize.findMany({
      where: { isActive: true },
      orderBy: { order: 'asc' }
    })

    return NextResponse.json({ prizes })
  } catch (error) {
    console.error('Error fetching wheel prizes:', error)
    return NextResponse.json({ error: 'Ödüller getirilemedi' }, { status: 500 })
  }
}
