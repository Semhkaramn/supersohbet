import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('Starting seed...')

  // Settings oluştur
  const settings = [
    // Telegram Bot Ayarları
    { key: 'telegram_bot_token', value: '', description: 'Telegram Bot Token', category: 'telegram' },
    { key: 'telegram_bot_username', value: '', description: 'Telegram Bot Kullanıcı Adı (@username)', category: 'telegram' },
    { key: 'telegram_webhook_url', value: 'https://soft-fairy-c52849.netlify.app/api/telegram/webhook', description: 'Telegram Webhook URL', category: 'telegram' },

    // Cloudinary Ayarları
    { key: 'cloudinary_cloud_name', value: '', description: 'Cloudinary Cloud Name', category: 'cloudinary' },
    { key: 'cloudinary_api_key', value: '', description: 'Cloudinary API Key', category: 'cloudinary' },
    { key: 'cloudinary_api_secret', value: '', description: 'Cloudinary API Secret', category: 'cloudinary' },

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
    { key: 'wheel_reset_hour', value: '0', description: 'Günlük çark haklarının sıfırlanacağı saat (0-23)', category: 'wheel' },

    // Referans Sistemi
    { key: 'referral_bonus_inviter', value: '100', description: 'Davet eden kişinin kazandığı puan', category: 'referral' },
    { key: 'referral_bonus_invited', value: '50', description: 'Davet edilen kişinin kazandığı puan', category: 'referral' },

    // Genel Ayarlar
    { key: 'maintenance_mode', value: 'false', description: 'Bakım modu aktif mi?', category: 'general' },
    { key: 'allow_new_users', value: 'true', description: 'Yeni kullanıcı kayıtları açık mı?', category: 'general' },
    { key: 'activity_group_id', value: '', description: 'Mesaj dinleme ve puan verme yapılacak grup ID', category: 'general' },
  ]

  // Ana admin kullanıcısı oluştur (semhkaramn)
  const superAdminPasswordHash = await bcrypt.hash('Abuzittin74.', 10)
  const superAdmin = await prisma.admin.upsert({
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
    }
  })
  console.log('✅ Super Admin created:', superAdmin.username)



  // Rütbeleri oluştur
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
  console.log('✅ Ranks created:', ranks.length)

  // Çark ödülleri oluştur
  const wheelPrizes = [
    { name: '50', points: 50, color: '#60A5FA', probability: 3.0, order: 0 },
    { name: '100', points: 100, color: '#34D399', probability: 2.5, order: 1 },
    { name: '250', points: 250, color: '#FBBF24', probability: 2.0, order: 2 },
    { name: '500', points: 500, color: '#F87171', probability: 1.5, order: 3 },
    { name: '1,000', points: 1000, color: '#A78BFA', probability: 0.8, order: 4 },
    { name: 'JACKPOT', points: 5000, color: '#EC4899', probability: 0.2, order: 5 },
  ]

  for (const prize of wheelPrizes) {
    await prisma.wheelPrize.upsert({
      where: { name: prize.name },
      update: prize,
      create: prize
    })
  }
  console.log('✅ Wheel prizes created:', wheelPrizes.length)

  for (const setting of settings) {
    await prisma.settings.upsert({
      where: { key: setting.key },
      update: setting,
      create: setting
    })
  }
  console.log('✅ Settings created:', settings.length)

  // Referans milestone'ları oluştur
  const referralMilestones = [
    { requiredCount: 5, rewardPoints: 100, name: '5 Üye', description: '5 kişi davet et', order: 0 },
    { requiredCount: 10, rewardPoints: 200, name: '10 Üye', description: '10 kişi davet et', order: 1 },
    { requiredCount: 25, rewardPoints: 500, name: '25 Üye', description: '25 kişi davet et', order: 2 },
    { requiredCount: 50, rewardPoints: 1000, name: '50 Üye', description: '50 kişi davet et', order: 3 },
    { requiredCount: 100, rewardPoints: 2500, name: '100 Üye', description: '100 kişi davet et', order: 4 },
  ]

  for (const milestone of referralMilestones) {
    await prisma.referralMilestone.upsert({
      where: { requiredCount: milestone.requiredCount },
      update: milestone,
      create: milestone
    })
  }
  console.log('✅ Referral milestones created:', referralMilestones.length)

  console.log('🎉 Seeding completed!')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
