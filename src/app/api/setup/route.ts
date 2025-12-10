import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'

// Bu endpoint database'i otomatik kurar
// Netlify deploy sonrası sadece /api/setup URL'ini ziyaret edin
export async function GET(request: NextRequest) {
  try {
    const steps: string[] = []

    steps.push('🚀 Database kurulumu başlatılıyor...')
    steps.push('')

    // 1. Super Admin kullanıcısı oluştur (seed.ts ile uyumlu)
    steps.push('👤 Super Admin kullanıcısı kontrol ediliyor...')
    const superAdminPasswordHash = await bcrypt.hash('Abuzittin74.', 10)
    const admin = await prisma.admin.upsert({
      where: { username: 'semhkaramn' },
      update: {},
      create: {
        username: 'semhkaramn',
        passwordHash: superAdminPasswordHash,
        isSuperAdmin: true,
        canAccessDashboard: true,
        canAccessBroadcast: true,
        canAccessStatistics: true,
        canAccessTasks: true,
        canAccessShop: true,
        canAccessWheel: true,
        canAccessSponsors: true,
        canAccessRanks: true,
        canAccessSettings: true,
        canAccessChannels: true,
        canAccessUsers: true,
        canAccessAdmins: true,
        canAccessRandy: true,
      }
    })
    steps.push(`✅ Super Admin hazır: ${admin.username}`)

    steps.push('')
    steps.push('🎉 ADMIN KURULUMU TAMAMLANDI!')
    steps.push('')
    steps.push('📋 GİRİŞ BİLGİLERİ:')
    steps.push('')
    steps.push('1️⃣ Admin Paneline Git: /admin')
    steps.push('   👤 Kullanıcı: semhkaramn')
    steps.push('   🔑 Şifre: Abuzittin74.')
    steps.push('   ⚠️ ŞİFRENİZİ GÜVENLİ TUTUN!')
    steps.push('')
    steps.push('✨ Sistem hazır!')

    return NextResponse.json({
      success: true,
      message: 'Admin setup completed successfully!',
      steps
    })

  } catch (error) {
    console.error('Setup error:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Admin setup failed',
        details: error instanceof Error ? error.message : String(error),
        hint: 'DATABASE_URL environment variable doğru mu? Netlify\'de kontrol edin.'
      },
      { status: 500 }
    )
  }
}
