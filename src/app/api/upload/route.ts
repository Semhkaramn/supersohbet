import { NextRequest, NextResponse } from 'next/server'
import { writeFile } from 'fs/promises'
import { join } from 'path'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File | null

    if (!file) {
      return NextResponse.json(
        { error: 'Dosya bulunamadı' },
        { status: 400 }
      )
    }

    // Dosya boyutu kontrolü (5MB)
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json(
        { error: 'Dosya boyutu çok büyük (Max: 5MB)' },
        { status: 400 }
      )
    }

    // Dosya tipi kontrolü
    const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml']
    if (!validTypes.includes(file.type)) {
      return NextResponse.json(
        { error: 'Geçersiz dosya tipi. Sadece resim dosyaları kabul edilir.' },
        { status: 400 }
      )
    }

    // Upload URL ayarını kontrol et
    const uploadUrlSetting = await prisma.settings.findUnique({
      where: { key: 'upload_url' }
    })

    const uploadUrl = uploadUrlSetting?.value?.trim()

    // Eğer upload URL varsa, oraya yükle
    if (uploadUrl) {
      try {
        const uploadFormData = new FormData()
        uploadFormData.append('file', file)

        const response = await fetch(uploadUrl, {
          method: 'POST',
          body: uploadFormData
        })

        if (!response.ok) {
          throw new Error('External upload failed')
        }

        const data = await response.json()

        // Dönen response'dan URL'i al (farklı formatlar destekleniyor)
        const externalUrl = data.url || data.link || data.path || data.imageUrl

        if (!externalUrl) {
          throw new Error('No URL returned from upload service')
        }

        return NextResponse.json({ url: externalUrl })
      } catch (error) {
        console.error('External upload error:', error)
        // Dış servise yükleme başarısız olursa yerel yüklemeye geç
        console.log('Falling back to local upload...')
      }
    }

    // Yerel yükleme (fallback veya upload URL yoksa)
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    // Benzersiz dosya adı oluştur
    const timestamp = Date.now()
    const extension = file.name.split('.').pop()
    const filename = `${timestamp}-${Math.random().toString(36).substring(7)}.${extension}`

    const path = join(process.cwd(), 'public', 'uploads', filename)
    await writeFile(path, buffer)

    const url = `/uploads/${filename}`

    return NextResponse.json({ url })
  } catch (error) {
    console.error('Upload error:', error)
    return NextResponse.json(
      { error: 'Dosya yüklenirken bir hata oluştu' },
      { status: 500 }
    )
  }
}
