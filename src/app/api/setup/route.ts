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

    // 2. Rütbeleri oluştur
    steps.push('🏆 Rütbeler oluşturuluyor...')
    const ranks = [
      { name: 'Yeni Başlayan', minXp: 0, icon: '🌱', color: '#9CA3AF', order: 0 },
      { name: 'Bronz', minXp: 100, icon: '🥉', color: '#CD7F32', order: 1 },
      { name: 'Gümüş', minXp: 500, icon: '🥈', color: '#C0C0C0', order: 2 },
      { name: 'Altın', minXp: 1000, icon: '🥇', color: '#FFD700', order: 3 },
      { name: 'Platin', minXp: 2500, icon: '💎', color: '#E5E4E2', order: 4 },
      { name: 'Elmas', minXp: 5000, icon: '💠', color: '#B9F2FF', order: 5 },
      { name: 'Ejderha', minXp: 10000, icon: '🐉', color: '#FF0000', order: 6 },
    ]

    for (const rank of ranks) {
      await prisma.rank.upsert({
        where: { name: rank.name },
        update: rank,
        create: rank
      })
    }
    steps.push(`✅ ${ranks.length} rütbe oluşturuldu`)

    // 3. Çark ödülleri oluştur
    steps.push('🎡 Çark ödülleri oluşturuluyor...')
    const wheelPrizes = [
      { name: '50', points: 50, color: '#60A5FA', probability: 3.0, order: 0, isActive: true },
      { name: '100', points: 100, color: '#34D399', probability: 2.5, order: 1, isActive: true },
      { name: '250', points: 250, color: '#FBBF24', probability: 2.0, order: 2, isActive: true },
      { name: '500', points: 500, color: '#F87171', probability: 1.5, order: 3, isActive: true },
      { name: '1,000', points: 1000, color: '#A78BFA', probability: 0.8, order: 4, isActive: true },
      { name: 'JACKPOT', points: 5000, color: '#EC4899', probability: 0.2, order: 5, isActive: true },
    ]

    for (const prize of wheelPrizes) {
      await prisma.wheelPrize.upsert({
        where: { name: prize.name },
        update: prize,
        create: prize
      })
    }
    steps.push(`✅ ${wheelPrizes.length} çark ödülü oluşturuldu`)

    // 4. Örnek market ürünleri
    steps.push('🛍️ Market ürünleri oluşturuluyor...')
    const shopItems = [
      {
        name: '500 TL Nakit Ödül',
        description: 'Direkt hesabına yatırılır',
        price: 5000,
        category: 'Nakit',
        stock: 10,
        order: 0,
        isActive: true
      },
      {
        name: '1000 TL Nakit Ödül',
        description: 'Direkt hesabına yatırılır',
        price: 10000,
        category: 'Nakit',
        stock: 5,
        order: 1,
        isActive: true
      },
      {
        name: 'Özel Rozet',
        description: 'Profilinde özel rozet görünsün',
        price: 1000,
        category: 'Kozmetik',
        stock: null,
        order: 2,
        isActive: true
      },
      {
        name: 'VIP Üyelik (1 Ay)',
        description: 'Özel ayrıcalıklar ve bonuslar',
        price: 2500,
        category: 'Premium',
        stock: null,
        order: 3,
        isActive: true
      },
    ]

    for (const item of shopItems) {
      await prisma.shopItem.upsert({
        where: { name: item.name },
        update: item,
        create: item
      })
    }
    steps.push(`✅ ${shopItems.length} ürün oluşturuldu`)

    // 5. Sistem ayarları oluştur
    steps.push('⚙️ Sistem ayarları oluşturuluyor...')
    const settings = [
      // Telegram Bot Ayarları
      { key: 'telegram_bot_token', value: '', description: 'Telegram Bot Token (@BotFather\'dan alın)', category: 'telegram' },
      { key: 'telegram_webhook_url', value: '', description: 'Telegram Webhook URL (ör: https://site.com/api/telegram/webhook)', category: 'telegram' },

      // Puan ve XP Ayarları
      { key: 'points_per_message', value: '10', description: 'Mesaj başına kazanılan puan', category: 'points' },
      { key: 'xp_per_message', value: '5', description: 'Mesaj başına kazanılan XP', category: 'points' },
      { key: 'messages_for_xp', value: '1', description: 'Kaç mesajda bir XP verilecek (1 = her mesajda)', category: 'points' },

      // Mesaj Kısıtlamaları
      { key: 'min_message_length', value: '3', description: 'Minimum mesaj karakter uzunluğu', category: 'limits' },
      { key: 'message_cooldown_seconds', value: '5', description: 'Mesajlar arası minimum bekleme süresi (saniye)', category: 'limits' },

      // Çark Ayarları
      { key: 'wheel_spin_cost', value: '250', description: 'Çark çevirme maliyeti (puan)', category: 'wheel' },
      { key: 'daily_wheel_spins', value: '3', description: 'Günlük ücretsiz çark hakkı', category: 'wheel' },

      // Genel Ayarlar
      { key: 'maintenance_mode', value: 'false', description: 'Bakım modu aktif mi?', category: 'general' },
      { key: 'allow_new_users', value: 'true', description: 'Yeni kullanıcı kayıtları açık mı?', category: 'general' },
    ]

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
