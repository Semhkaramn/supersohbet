import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { prisma } from "./prisma";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Türkiye saatini (Europe/Istanbul - UTC+3) döndürür
 */
export function getTurkeyDate(): Date {
  const now = new Date();
  // Türkiye saatine çevir (UTC+3)
  const turkeyTime = new Date(now.toLocaleString('en-US', { timeZone: 'Europe/Istanbul' }));
  return turkeyTime;
}

/**
 * Türkiye saatine göre bugünün başlangıcını döndürür (00:00:00)
 */
export function getTurkeyToday(): Date {
  const turkeyNow = getTurkeyDate();
  return new Date(turkeyNow.getFullYear(), turkeyNow.getMonth(), turkeyNow.getDate());
}

/**
 * Türkiye saatine göre belirli bir tarih aralığı döndürür
 * @param daysAgo Kaç gün önce
 */
export function getTurkeyDateAgo(daysAgo: number): Date {
  const today = getTurkeyToday();
  return new Date(today.getTime() - daysAgo * 24 * 60 * 60 * 1000);
}

/**
 * Telegram mesaj gönderme yardımcı fonksiyonu
 */
async function sendTelegramNotification(telegramId: string, message: string) {
  try {
    const botTokenSetting = await prisma.settings.findUnique({
      where: { key: 'telegram_bot_token' }
    })

    if (!botTokenSetting?.value) {
      console.error('Bot token not configured')
      return false
    }

    const url = `https://api.telegram.org/bot${botTokenSetting.value}/sendMessage`
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: telegramId,
        text: message,
        parse_mode: 'Markdown'
      })
    })

    const data = await response.json()
    return data.ok
  } catch (error) {
    console.error('Error sending telegram notification:', error)
    return false
  }
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
        telegramId: true,
        firstName: true,
        username: true,
        dailySpinsLeft: true,
        lastSpinReset: true,
      },
    });

    if (!user) return null;

    const now = getTurkeyDate(); // Türkiye saatini kullan
    const lastReset = user.lastSpinReset;

    // Sıfırlama saatini hesapla (bugünün veya dünün reset saati) - Türkiye saatine göre
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

      // NOT: Bildirim artık otomatik gönderilmiyor
      // Bildirimler sadece belirlenen saatte toplu olarak gönderilir (scripts/wheel-reset-notification.ts)

      return updatedUser;
    }

    return user;
  } catch (error) {
    console.error("Wheel reset check error:", error);
    return null;
  }
}
