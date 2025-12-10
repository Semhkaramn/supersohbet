import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('Starting seed...')

  // Settings oluştur
  const settings = [
    // Randy Sistemi
    { key: 'randy_dm_template', value: '🎉 **Tebrikler! Randy Kazandınız!**\n\nMerhaba {firstname},\n\nRandy çekilişinde kazanan siz oldunuz!\n\n🎁 **Ödülünüz:** {prize}\n\nÖdülünüzü almak için lütfen grup yöneticileriyle iletişime geçin.\n\nTebrikler! 🎊', description: 'Randy kazananına gönderilecek DM şablonu ({firstname}, {username}, {prize} kullanılabilir)', category: 'randy' },
    { key: 'randy_group_template', value: '🎉 **Randy Kazananı!**\n\n{mention} tebrikler!\n\n🎁 **Ödül:** {prize}\n\nÖdülünüzü almak için lütfen yöneticilerle iletişime geçin.', description: 'Randy kazananı grup duyurusu şablonu ({mention}, {username}, {firstname}, {prize} kullanılabilir)', category: 'randy' },
    { key: 'randy_start_template', value: '🎊 **Randy Başladı!**\n\nYeni bir Randy çekilişi başladı!\n\n🎁 **Ödül:** {prize}\n👥 **Kazanan Sayısı:** {winners}\n⏱️ **Süre:** {hours} saat\n📅 **Bitiş:** {endtime}\n\nÇekilişe katılmak için sadece aktif olun ve mesaj yazın. Kazananlar rastgele seçilecek!\n\nŞans herkese! 🍀', description: 'Randy başlangıç duyurusu şablonu ({prize}, {winners}, {hours}, {endtime} kullanılabilir)', category: 'randy' },
    { key: 'randy_send_dm', value: 'true', description: 'Randy kazananına DM gönder (sadece /start yapmış kullanıcılara)', category: 'randy' },
    { key: 'randy_send_announcement', value: 'true', description: 'Randy kazananını grupta duyur', category: 'randy' },
    { key: 'randy_pin_start_message', value: 'true', description: 'Randy başlangıç duyurusunu sabitle', category: 'randy' },
    { key: 'randy_pin_winner_message', value: 'true', description: 'Randy kazanan duyurusunu sabitle', category: 'randy' },
    { key: 'randy_one_per_user', value: 'true', description: 'Her kullanıcı bir Randy planında sadece bir kez kazanabilir', category: 'randy' },

    // Roll Sistemi
    { key: 'roll_enabled', value: 'true', description: 'Roll sistemi komutlarını aktifleştir (/başlat, /kaydet, /durum vs.)', category: 'roll' },
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
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

