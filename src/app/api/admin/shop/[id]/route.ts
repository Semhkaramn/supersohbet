import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

async function deleteImage(imageUrl: string) {
  if (!imageUrl) return

  try {
    await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/upload/delete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: imageUrl })
    })
  } catch (error) {
    console.error('Delete image error:', error)
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { name, description, price, imageUrl, category, stock, purchaseLimit, isActive, order } = body

    // Eski item'ı al
    const oldItem = await prisma.shopItem.findUnique({
      where: { id },
      select: { imageUrl: true }
    })

    // Eğer resim değiştiyse, eski resmi sil
    if (imageUrl !== undefined && oldItem?.imageUrl && oldItem.imageUrl !== imageUrl) {
      await deleteImage(oldItem.imageUrl)
    }

    const updateData: any = {}
    if (name) updateData.name = name
    if (description !== undefined) updateData.description = description
    if (typeof price === 'number') updateData.price = price
    if (imageUrl !== undefined) updateData.imageUrl = imageUrl
    if (category) updateData.category = category
    if (stock !== undefined) updateData.stock = stock
    if (purchaseLimit !== undefined) updateData.purchaseLimit = purchaseLimit
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

    // Önce item'ı al (resmi silmek için)
    const item = await prisma.shopItem.findUnique({
      where: { id },
      select: { imageUrl: true }
    })

    // Resmi sil
    if (item?.imageUrl) {
      await deleteImage(item.imageUrl)
    }

    // Item'ı sil
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
