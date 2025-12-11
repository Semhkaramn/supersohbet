import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { verifyAdminToken } from '@/lib/admin-middleware'

// GET - Tüm sosyal medya bağlantılarını listele
export async function GET(request: NextRequest) {
  const token = request.headers.get('Authorization')?.replace('Bearer ', '')
  if (!token) {
    return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 401 })
  }

  const admin = await verifyAdminToken(token)
  if (!admin) {
    return NextResponse.json({ error: 'Geçersiz token' }, { status: 401 })
  }

  try {
    const socialMedia = await prisma.socialMedia.findMany({
      orderBy: { order: 'asc' }
    })

    return NextResponse.json(socialMedia)
  } catch (error) {
    console.error('Error fetching social media:', error)
    return NextResponse.json({ error: 'Sosyal medya bağlantıları yüklenemedi' }, { status: 500 })
  }
}

// POST - Yeni sosyal medya bağlantısı ekle
export async function POST(request: NextRequest) {
  const token = request.headers.get('Authorization')?.replace('Bearer ', '')
  if (!token) {
    return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 401 })
  }

  const admin = await verifyAdminToken(token)
  if (!admin) {
    return NextResponse.json({ error: 'Geçersiz token' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { name, platform, username, isActive, order } = body

    if (!name || !platform || !username) {
      return NextResponse.json({ error: 'Eksik alanlar' }, { status: 400 })
    }

    const socialMedia = await prisma.socialMedia.create({
      data: {
        name,
        platform,
        username,
        isActive: isActive ?? true,
        order: order ?? 0
      }
    })

    return NextResponse.json(socialMedia)
  } catch (error) {
    console.error('Error creating social media:', error)
    return NextResponse.json({ error: 'Sosyal medya bağlantısı eklenemedi' }, { status: 500 })
  }
}
