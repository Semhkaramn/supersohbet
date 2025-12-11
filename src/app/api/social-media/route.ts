import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

// GET - Aktif sosyal medya bağlantılarını listele (public)
export async function GET() {
  try {
    const socialMedia = await prisma.socialMedia.findMany({
      where: { isActive: true },
      orderBy: { order: 'asc' },
      select: {
        id: true,
        name: true,
        platform: true,
        username: true,
        order: true
      }
    })

    return NextResponse.json(socialMedia)
  } catch (error) {
    console.error('Error fetching social media:', error)
    return NextResponse.json({ error: 'Sosyal medya bağlantıları yüklenemedi' }, { status: 500 })
  }
}
