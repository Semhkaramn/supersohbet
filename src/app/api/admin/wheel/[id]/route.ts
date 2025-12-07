import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { name, points, probability, color, isActive, order } = body

    const updateData: any = {}
    if (name) updateData.name = name
    if (typeof points === 'number') updateData.points = points
    if (typeof probability === 'number') updateData.probability = probability
    if (color) updateData.color = color
    if (typeof isActive === 'boolean') updateData.isActive = isActive
    if (typeof order === 'number') updateData.order = order

    const prize = await prisma.wheelPrize.update({
      where: { id },
      data: updateData
    })

    return NextResponse.json({ prize })
  } catch (error) {
    console.error('Update wheel prize error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    await prisma.wheelPrize.delete({
      where: { id }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete wheel prize error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
