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
