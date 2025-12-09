import { prisma } from './prisma'

// Milestone kontrolü ve ödül verme
export async function checkAndRewardMilestones(userId: string, telegramId: string) {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId }
    })

    if (!user) return

    // Tüm aktif milestone'ları al
    const milestones = await prisma.referralMilestone.findMany({
      where: {
        isActive: true,
        requiredCount: { lte: user.totalReferrals }
      }
    })

    const completedMilestones = []

    for (const milestone of milestones) {
      // Bu milestone daha önce tamamlandı mı kontrol et
      const existing = await prisma.userMilestoneCompletion.findUnique({
        where: {
          userId_milestoneId: {
            userId: user.id,
            milestoneId: milestone.id
          }
        }
      })

      // Eğer tamamlanmamışsa ödül ver
      if (!existing) {
        await prisma.$transaction([
          // Milestone'ı tamamlandı olarak işaretle
          prisma.userMilestoneCompletion.create({
            data: {
              userId: user.id,
              milestoneId: milestone.id,
              rewardClaimed: true
            }
          }),
          // Kullanıcıya puan ekle
          prisma.user.update({
            where: { id: user.id },
            data: {
              points: { increment: milestone.rewardPoints },
              referralPoints: { increment: milestone.rewardPoints }
            }
          }),
          // Puan geçmişi kaydı oluştur
          prisma.pointHistory.create({
            data: {
              userId: user.id,
              amount: milestone.rewardPoints,
              type: 'referral_reward',
              description: `${milestone.name} başarısı tamamlandı`,
              relatedId: milestone.id
            }
          })
        ])

        console.log(`🎉 User ${telegramId} completed milestone: ${milestone.name} (+${milestone.rewardPoints} points)`)
        completedMilestones.push(milestone)
      }
    }

    return completedMilestones
  } catch (error) {
    console.error('Milestone check error:', error)
    return []
  }
}
