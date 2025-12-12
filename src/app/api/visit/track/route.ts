import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { cookies } from 'next/headers'
import { verifyToken } from '@/lib/auth'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { page } = body

    // IP adresini al (privacy için kaydedilmeyecek veya hash'lenecek)
    const ipAddress = request.headers.get('x-forwarded-for') ||
                     request.headers.get('x-real-ip') ||
                     'unknown'

    // User agent al
    const userAgent = request.headers.get('user-agent') || undefined

    // Kullanıcı giriş yapmış mı kontrol et
    let userId: string | undefined
    try {
      const cookieStore = await cookies()
      const token = cookieStore.get('auth_token')?.value
      if (token) {
        const payload = await verifyToken(token)
        if (payload) {
          userId = payload.userId
        }
      }
    } catch {
      // Token yoksa veya geçersizse, userId undefined kalır
    }

    // Ziyareti kaydet
    await prisma.siteVisit.create({
      data: {
        ipAddress: ipAddress.split(',')[0].trim(), // İlk IP'yi al (proxy durumunda)
        userAgent: userAgent?.substring(0, 255), // Maksimum uzunluk sınırı
        page: page || '/',
        userId
      }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error tracking visit:', error)
    // Hata olsa bile başarılı dön (tracking başarısız olsa bile kullanıcı deneyimi etkilenmesin)
    return NextResponse.json({ success: true })
  }
}
