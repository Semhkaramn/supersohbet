import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// Cloudinary resim silme fonksiyonu
async function deleteFromCloudinary(publicId: string) {
  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/upload`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ publicId }),
    });

    if (!response.ok) {
      console.error('Cloudinary silme hatası:', await response.text());
    }
  } catch (error) {
    console.error('Cloudinary silme hatası:', error);
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { name, description, logoUrl, logoPublicId, websiteUrl, category, isActive, order } = body

    // Mevcut sponsor bilgisini al
    const existingSponsor = await prisma.sponsor.findUnique({
      where: { id }
    });

    // Eğer logo değiştiyse, eski logoyu Cloudinary'den sil
    if (logoUrl !== undefined && existingSponsor?.logoPublicId &&
        logoUrl !== existingSponsor.logoUrl) {
      await deleteFromCloudinary(existingSponsor.logoPublicId);
    }

    const updateData: any = {}
    if (name) updateData.name = name
    if (description !== undefined) updateData.description = description
    if (logoUrl !== undefined) updateData.logoUrl = logoUrl
    if (logoPublicId !== undefined) updateData.logoPublicId = logoPublicId
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

    // Sponsor bilgisini al
    const sponsor = await prisma.sponsor.findUnique({
      where: { id }
    });

    // Eğer logo varsa Cloudinary'den sil
    if (sponsor?.logoPublicId) {
      await deleteFromCloudinary(sponsor.logoPublicId);
    }

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
