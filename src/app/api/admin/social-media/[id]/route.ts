import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { verifyAdminToken } from '@/lib/admin-middleware'

// PUT - Sosyal medya bağlantısını güncelle
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const token = request.headers.get('Authorization')?.replace('Bearer ', '')
  if (!token) {
    return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 401 })
  }

  const admin = await verifyAdminToken(token)
  if (!admin) {
    return NextResponse.json({ error: 'Geçersiz token' }, { status: 401 })
  }

  try {
    const { id } = await params
    const body = await request.json()
    const { name, platform, username, isActive, order } = body

    const socialMedia = await prisma.socialMedia.update({
      where: { id },
      data: {
        name,
        platform,
        username,
        isActive,
        order
      }
    })

    return NextResponse.json(socialMedia)
  } catch (error) {
    console.error('Error updating social media:', error)
    return NextResponse.json({ error: 'Sosyal medya bağlantısı güncellenemedi' }, { status: 500 })
  }
}

// DELETE - Sosyal medya bağlantısını sil
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const token = request.headers.get('Authorization')?.replace('Bearer ', '')
  if (!token) {
    return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 401 })
  }

  const admin = await verifyAdminToken(token)
  if (!admin) {
    return NextResponse.json({ error: 'Geçersiz token' }, { status: 401 })
  }

  try {
    const { id } = await params
    await prisma.socialMedia.delete({
      where: { id }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting social media:', error)
    return NextResponse.json({ error: 'Sosyal medya bağlantısı silinemedi' }, { status: 500 })
  }
}
