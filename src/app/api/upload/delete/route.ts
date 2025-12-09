import { NextRequest, NextResponse } from 'next/server'
import { unlink } from 'fs/promises'
import { join } from 'path'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest) {
  try {
    const { url } = await request.json()

    if (!url) {
      return NextResponse.json(
        { error: 'URL gerekli' },
        { status: 400 }
      )
    }

    // Upload URL ayarını kontrol et
    const uploadUrlSetting = await prisma.settings.findUnique({
      where: { key: 'upload_url' }
    })

    const uploadUrl = uploadUrlSetting?.value?.trim()

    // Eğer external hosting kullanılıyorsa
    if (uploadUrl && !url.startsWith('/')) {
      try {
        // External hosting'den sil
        const deleteUrl = uploadUrl.replace('/upload.php', '/delete.php')

        const response = await fetch(deleteUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url })
        })

        if (response.ok) {
          return NextResponse.json({ success: true })
        }
      } catch (error) {
        console.error('External delete error:', error)
        // Hata olsa bile devam et
      }
    }

    // Yerel dosya silme
    if (url.startsWith('/uploads/')) {
      const filename = url.replace('/uploads/', '')
      const filepath = join(process.cwd(), 'public', 'uploads', filename)

      try {
        await unlink(filepath)
        return NextResponse.json({ success: true })
      } catch (error) {
        console.error('File delete error:', error)
        // Dosya zaten yoksa sorun yok
        return NextResponse.json({ success: true })
      }
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete error:', error)
    return NextResponse.json(
      { error: 'Dosya silinemedi' },
      { status: 500 }
    )
  }
}
