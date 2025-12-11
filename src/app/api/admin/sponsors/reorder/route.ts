import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function PUT(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '')
    if (!token) {
      return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 401 })
    }

    // Token kontrolü burada yapılabilir ama şimdilik geçiyoruz

    const { sponsors } = await request.json()

    if (!Array.isArray(sponsors)) {
      return NextResponse.json({ error: 'Geçersiz veri' }, { status: 400 })
    }

    // Her sponsor için order değerini güncelle
    await Promise.all(
      sponsors.map(({ id, order }: { id: string; order: number }) =>
        prisma.sponsor.update({
          where: { id },
          data: { order }
        })
      )
    )

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error reordering sponsors:', error)
    return NextResponse.json({ error: 'Bir hata oluştu' }, { status: 500 })
  }
}
