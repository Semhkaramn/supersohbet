import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { name, minXp, icon, color, order } = body

    const updateData: any = {}
    if (name) updateData.name = name
    if (typeof minXp === 'number') updateData.minXp = minXp
    if (icon) updateData.icon = icon
    if (color) updateData.color = color
    if (typeof order === 'number') updateData.order = order

    const rank = await prisma.rank.update({
      where: { id },
      data: updateData
    })

    return NextResponse.json({ rank })
  } catch (error) {
    console.error('Update rank error:', error)
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

    await prisma.rank.delete({
      where: { id }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete rank error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
