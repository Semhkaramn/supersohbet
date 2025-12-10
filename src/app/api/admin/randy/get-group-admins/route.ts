import { NextResponse } from 'next/server'
import { getGroupAdmins } from '@/lib/telegram'
import { prisma } from '@/lib/prisma'

// GET - Grup adminlerini getir
export async function GET() {
  try {
    // Grup chat ID'sini ayarlardan al
    const chatIdSetting = await prisma.settings.findUnique({
      where: { key: 'telegram_group_id' }
    })

    const chatId = chatIdSetting?.value
    if (!chatId) {
      return NextResponse.json(
        { error: 'Grup ID ayarlanmamış' },
        { status: 400 }
      )
    }

    // Grup adminlerini getir
    const admins = await getGroupAdmins(chatId)

    return NextResponse.json({ admins })
  } catch (error: any) {
    console.error('Grup adminleri alınamadı:', error)
    return NextResponse.json(
      { error: error.message || 'Adminler alınamadı' },
      { status: 500 }
    )
  }
}
