import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { prisma } from "./prisma";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Kullanıcının çark haklarını kontrol eder ve gerekirse sıfırlar
 * @param userId Kullanıcı ID'si
 * @param wheelResetHour Sıfırlama saati (0-23), varsayılan 0 (gece yarısı)
 * @param dailyWheelSpins Günlük çark hakkı, varsayılan 3
 * @returns Güncellenmiş kullanıcı verisi veya null
 */
export async function checkAndResetWheelSpins(
  userId: string,
  wheelResetHour: number = 0,
  dailyWheelSpins: number = 3
) {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        dailySpinsLeft: true,
        lastSpinReset: true,
      },
    });

    if (!user) return null;

    const now = new Date();
    const lastReset = user.lastSpinReset;

    // Sıfırlama saatini hesapla (bugünün veya dünün reset saati)
    const todayResetTime = new Date(now);
    todayResetTime.setHours(wheelResetHour, 0, 0, 0);

    const yesterdayResetTime = new Date(todayResetTime);
    yesterdayResetTime.setDate(yesterdayResetTime.getDate() - 1);

    // Son sıfırlama zamanından beri reset saati geçmiş mi?
    let shouldReset = false;

    if (!lastReset) {
      // Hiç sıfırlanmamış, hemen sıfırla
      shouldReset = true;
    } else {
      // Eğer şu anki saat reset saatinden önce ise
      if (now.getHours() < wheelResetHour) {
        // Dünün reset zamanından sonra mı?
        shouldReset = lastReset < yesterdayResetTime;
      } else {
        // Bugünün reset zamanından sonra mı?
        shouldReset = lastReset < todayResetTime;
      }
    }

    if (shouldReset) {
      const updatedUser = await prisma.user.update({
        where: { id: userId },
        data: {
          dailySpinsLeft: dailyWheelSpins,
          lastSpinReset: now,
        },
      });

      console.log(`🔄 Çark hakları sıfırlandı: User ${userId} - ${dailyWheelSpins} hak`);
      return updatedUser;
    }

    return user;
  } catch (error) {
    console.error("Wheel reset check error:", error);
    return null;
  }
}
