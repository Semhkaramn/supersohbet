import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { verifyAdminToken } from '@/lib/admin-middleware'

// PUT - Sosyal medya bağlantılarını yeniden sırala
export async function PUT(request: NextRequest) {
  const token = request.headers.get('Authorization')?.replace('Bearer ', '')
  if (!token) {
    return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 401 })
  }

  const admin = await verifyAdminToken(token)
  if (!admin) {
    return NextResponse.json({ error: 'Geçersiz token' }, { status: 401 })
  }

  try {
    const { items } = await request.json()

    // Her bir öğe için sıralama bilgisini güncelle
    await Promise.all(
      items.map((item: { id: string; order: number }) =>
        prisma.socialMedia.update({
          where: { id: item.id },
          data: { order: item.order }
        })
      )
    )

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error reordering social media:', error)
    return NextResponse.json({ error: 'Sıralama güncellenemedi' }, { status: 500 })
  }
}
