import { NextResponse, NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'

// PUT - Randy schedule'ı güncelle (durum değiştir)
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { status } = body

    if (!status || !['active', 'completed', 'cancelled'].includes(status)) {
      return NextResponse.json({ error: 'Geçersiz durum' }, { status: 400 })
    }

    const schedule = await prisma.randySchedule.update({
      where: { id },
      data: { status },
      include: {
        slots: {
          orderBy: { schedTime: 'asc' }
        }
      }
    })

    return NextResponse.json({ schedule })
  } catch (error) {
    console.error('Update randy schedule error:', error)
    return NextResponse.json({ error: 'Güncelleme başarısız' }, { status: 500 })
  }
}

// DELETE - Randy schedule'ı sil
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    // Slotlar CASCADE olduğu için otomatik silinir
    await prisma.randySchedule.delete({
      where: { id }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete randy schedule error:', error)
    return NextResponse.json({ error: 'Silme başarısız' }, { status: 500 })
  }
}
