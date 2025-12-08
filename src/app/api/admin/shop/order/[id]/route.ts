import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { status, deliveryInfo, processedBy } = body

    const updateData: any = {}

    if (status) {
      updateData.status = status
      updateData.processedAt = new Date()
    }

    if (deliveryInfo !== undefined) {
      updateData.deliveryInfo = deliveryInfo
    }

    if (processedBy) {
      updateData.processedBy = processedBy
    }

    const order = await prisma.userPurchase.update({
      where: { id },
      data: updateData,
      include: {
        user: {
          select: {
            id: true,
            telegramId: true,
            username: true,
            firstName: true,
            lastName: true
          }
        },
        item: {
          select: {
            id: true,
            name: true,
            description: true,
            price: true,
            imageUrl: true,
            category: true
          }
        }
      }
    })

    return NextResponse.json({ order })
  } catch (error) {
    console.error('Error updating order:', error)
    return NextResponse.json({ error: 'Sipariş güncellenemedi' }, { status: 500 })
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    await prisma.userPurchase.delete({
      where: { id }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting order:', error)
    return NextResponse.json({ error: 'Sipariş silinemedi' }, { status: 500 })
  }
}
