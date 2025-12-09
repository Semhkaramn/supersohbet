import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { name, description, logoUrl, websiteUrl, category, isActive, order } = body

    const updateData: any = {}
    if (name) updateData.name = name
    if (description !== undefined) updateData.description = description
    if (logoUrl !== undefined) updateData.logoUrl = logoUrl
    if (websiteUrl !== undefined) updateData.websiteUrl = websiteUrl
    if (category !== undefined) updateData.category = category
    if (typeof isActive === 'boolean') updateData.isActive = isActive
    if (typeof order === 'number') updateData.order = order

    const sponsor = await prisma.sponsor.update({
      where: { id },
      data: updateData
    })

    return NextResponse.json({ sponsor })
  } catch (error) {
    console.error('Update sponsor error:', error)
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

    await prisma.sponsor.delete({
      where: { id }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete sponsor error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
