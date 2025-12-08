import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// PUT - Ödül güncelle
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { name, symbol, points, chance, color, order, isActive } = body

    const prize = await prisma.slotMachinePrize.update({
      where: { id },
      data: {
        name,
        symbol,
        points,
        chance: parseFloat(chance),
        color,
        order,
        isActive
      }
    })

    return NextResponse.json({ success: true, prize })
  } catch (error) {
    console.error('Error updating slot machine prize:', error)
    return NextResponse.json({ error: 'Ödül güncellenemedi' }, { status: 500 })
  }
}

// DELETE - Ödül sil
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    await prisma.slotMachinePrize.delete({
      where: { id }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting slot machine prize:', error)
    return NextResponse.json({ error: 'Ödül silinemedi' }, { status: 500 })
  }
}
