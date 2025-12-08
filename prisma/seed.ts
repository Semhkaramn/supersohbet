import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Seeding database...')

  // Admin kullanıcısı oluştur
  const adminPasswordHash = await bcrypt.hash('admin123', 10)
  const admin = await prisma.admin.upsert({
    where: { username: 'admin' },
    update: {},
    create: {
      username: 'admin',
      passwordHash: adminPasswordHash
    }
  })
  console.log('✅ Admin created:', admin.username)

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

  // Slot Makinesi Ödülleri
  const slotPrizes = [
    { name: 'Triple Seven', symbol: '777', points: 10000, chance: 5, color: '#FFD700', order: 0 },
    { name: 'Jackpot', symbol: 'JACKPOT', points: 5000, chance: 10, color: '#FF1744', order: 1 },
    { name: 'Diamond', symbol: '💎', points: 2500, chance: 15, color: '#00E5FF', order: 2 },
    { name: 'Star', symbol: '⭐', points: 1000, chance: 20, color: '#FFC400', order: 3 },
    { name: 'Cherry', symbol: '🍒', points: 500, chance: 25, color: '#FF5252', order: 4 },
    { name: 'Lemon', symbol: '🍋', points: 250, chance: 25, color: '#FFEB3B', order: 5 },
  ]

  for (const prize of slotPrizes) {
    await prisma.slotMachinePrize.upsert({
      where: { name: prize.name },
      update: prize,
      create: prize
    })
  }
  console.log('✅ Slot machine prizes created:', slotPrizes.length)

  // Örnek market ürünleri
  const shopItems = [
    {
      name: '500 TL Nakit Ödül',
      description: 'Direkt hesabına yatırılır',
      price: 5000,
      category: 'Nakit',
      stock: 10,
      order: 0
    },
    {
      name: '1000 TL Nakit Ödül',
      description: 'Direkt hesabına yatırılır',
      price: 10000,
      category: 'Nakit',
      stock: 5,
      order: 1
    },
    {
      name: 'Özel Rozet',
      description: 'Profilinde özel rozet görünsün',
      price: 1000,
      category: 'Kozmetik',
      stock: null,
      order: 2
    },
    {
      name: 'VIP Üyelik (1 Ay)',
      description: 'Özel ayrıcalıklar ve bonuslar',
      price: 2500,
      category: 'Premium',
      stock: null,
      order: 3
    },
  ]

  for (const item of shopItems) {
    await prisma.shopItem.upsert({
      where: { name: item.name },
      update: item,
      create: item
    })
  }
  console.log('✅ Shop items created:', shopItems.length)

  // Sistem ayarları oluştur
  const settings = [
    // Telegram Bot Ayarları
    { key: 'telegram_bot_token', value: '', description: 'Telegram Bot Token', category: 'telegram' },
    { key: 'telegram_webhook_url', value: 'https://soft-fairy-c52849.netlify.app/api/telegram/webhook', description: 'Telegram Webhook URL', category: 'telegram' },

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

    // Slot Makinesi Ayarları
    { key: 'daily_slot_spins', value: '3', description: 'Günlük slot makinesi hakkı', category: 'slot' },

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
  console.log('✅ Settings created:', settings.length)

  console.log('🎉 Seeding completed!')
}

main()
  .catch((e) => {
    console.error('❌ Seeding error:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
