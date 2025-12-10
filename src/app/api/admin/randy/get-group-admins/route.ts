import { NextResponse } from 'next/server'
import { getGroupAdmins } from '@/lib/telegram'
import { prisma } from '@/lib/prisma'

// GET - Grup adminlerini getir
export async function GET() {
  try {
    // Grup chat ID'sini ayarlardan al - aktif grup ID'si
    const chatIdSetting = await prisma.settings.findUnique({
      where: { key: 'activity_group_id' }
    })

    const chatId = chatIdSetting?.value
    if (!chatId) {
      return NextResponse.json(
        { error: 'Aktif grup ID ayarlanmamış. Lütfen Ayarlar sayfasından aktif grubu seçin.' },
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
