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
    const { name, description, logoUrl, websiteUrl, category, isActive, order } = body

    // Eski sponsor'ı al
    const oldSponsor = await prisma.sponsor.findUnique({
      where: { id },
      select: { logoUrl: true }
    })

    // Eğer logo değiştiyse, eski logoyu sil
    if (logoUrl !== undefined && oldSponsor?.logoUrl && oldSponsor.logoUrl !== logoUrl) {
      await deleteImage(oldSponsor.logoUrl)
    }

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

    // Önce sponsor'ı al (logoyu silmek için)
    const sponsor = await prisma.sponsor.findUnique({
      where: { id },
      select: { logoUrl: true }
    })

    // Logoyu sil
    if (sponsor?.logoUrl) {
      await deleteImage(sponsor.logoUrl)
    }

    // Sponsor'ı sil
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
