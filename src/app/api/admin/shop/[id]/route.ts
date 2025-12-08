import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { name, description, price, imageUrl, category, stock, isActive, order } = body

    const updateData: {
      name?: string;
      description?: string | null;
      price?: number;
      imageUrl?: string | null;
      category?: string;
      stock?: number | null;
      isActive?: boolean;
      order?: number;
    } = {}
    if (name) updateData.name = name
    if (description !== undefined) updateData.description = description
    if (typeof price === 'number') updateData.price = price
    if (imageUrl !== undefined) updateData.imageUrl = imageUrl
    if (category) updateData.category = category
    if (stock !== undefined) updateData.stock = stock
    if (typeof isActive === 'boolean') updateData.isActive = isActive
    if (typeof order === 'number') updateData.order = order

    const item = await prisma.shopItem.update({
      where: { id },
      data: updateData
    })

    return NextResponse.json({ item })
  } catch (error) {
    console.error('Update shop item error:', error)
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

    await prisma.shopItem.delete({
      where: { id }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete shop item error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
