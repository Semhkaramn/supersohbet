import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// PUT - Ödülü güncelle
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { name, symbol, points, chance, color, order, isActive } = body

    const updateData: {
      name?: string;
      symbol?: string;
      points?: number;
      chance?: number;
      color?: string;
      order?: number;
      isActive?: boolean;
    } = {}

    if (name !== undefined) updateData.name = name
    if (symbol !== undefined) updateData.symbol = symbol
    if (points !== undefined) updateData.points = parseInt(points)
    if (chance !== undefined) updateData.chance = parseFloat(chance)
    if (color !== undefined) updateData.color = color
    if (order !== undefined) updateData.order = parseInt(order)
    if (isActive !== undefined) updateData.isActive = isActive

    const prize = await prisma.slotMachinePrize.update({
      where: { id },
      data: updateData
    })

    return NextResponse.json({ success: true, prize })
  } catch (error) {
    console.error('Error updating slot machine prize:', error)
    return NextResponse.json({ error: 'Ödül güncellenemedi' }, { status: 500 })
  }
}

// DELETE - Ödülü sil
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
