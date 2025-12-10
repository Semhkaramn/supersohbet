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


    for (const prize of wheelPrizes) {
      await prisma.wheelPrize.upsert({
        where: { name: prize.name },
        update: prize,
        create: prize
      })
    }
    steps.push(`✅ ${wheelPrizes.length} çark ödülü oluşturuldu`)


    for (const setting of settings) {
      await prisma.settings.upsert({
        where: { key: setting.key },
        update: setting,
        create: setting
      })
    }
    steps.push(`✅ ${settings.length} ayar oluşturuldu`)

    steps.push('')
    steps.push('🎉 DATABASE KURULUMU TAMAMLANDI!')
    steps.push('')
    steps.push('📋 SONRAKI ADIMLAR:')
    steps.push('')
    steps.push('1️⃣ Admin Paneline Git: /admin')
    steps.push('   👤 Kullanıcı: admin')
    steps.push('   🔑 Şifre: admin123')
    steps.push('   ⚠️ İLK GİRİŞTE ŞİFREYİ DEĞİŞTİR!')
    steps.push('')
    steps.push('2️⃣ Telegram Bot Token\'ı Ekle:')
    steps.push('   • Admin Panel → Settings → Telegram sekmesi')
    steps.push('   • @BotFather\'dan aldığın token\'ı yapıştır')
    steps.push('')
    steps.push('3️⃣ Webhook\'u Aktifleştir:')
    steps.push('   Tarayıcıda şu URL\'i aç:')
    steps.push('   https://api.telegram.org/bot<TOKEN>/setWebhook?url=<SITE_URL>/api/telegram/webhook')
    steps.push('')
    steps.push('✨ Tüm sistem hazır!')

    return NextResponse.json({
      success: true,
      message: 'Database setup completed successfully!',
      steps
    })

  } catch (error) {
    console.error('Setup error:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Database setup failed',
        details: error instanceof Error ? error.message : String(error),
        hint: 'DATABASE_URL environment variable doğru mu? Netlify\'de kontrol edin.'
      },
      { status: 500 }
    )
  }
}

