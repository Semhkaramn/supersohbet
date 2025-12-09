import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Tüm sponsor bilgilerini getir
export async function GET(request: NextRequest) {
  try {
    const telegramId = request.headers.get("x-telegram-id");

    if (!telegramId) {
      return NextResponse.json(
        { error: "Telegram ID bulunamadı" },
        { status: 401 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { telegramId },
      select: { id: true },
    });

    if (!user) {
      return NextResponse.json(
        { error: "Kullanıcı bulunamadı" },
        { status: 404 }
      );
    }

    const sponsorInfos = await prisma.userSponsorInfo.findMany({
      where: { userId: user.id },
      include: {
        sponsor: {
          select: {
            id: true,
            name: true,
            identifierType: true,
            logoUrl: true,
          },
        },
      },
    });

    return NextResponse.json({ sponsorInfos });
  } catch (error) {
    console.error("Sponsor bilgileri getirme hatası:", error);
    return NextResponse.json(
      { error: "Sponsor bilgileri getirilemedi" },
      { status: 500 }
    );
  }
}

// Sponsor bilgisi kaydet/güncelle
export async function POST(request: NextRequest) {
  try {
    const telegramId = request.headers.get("x-telegram-id");

    if (!telegramId) {
      return NextResponse.json(
        { error: "Telegram ID bulunamadı" },
        { status: 401 }
      );
    }

    const { sponsorId, identifier } = await request.json();

    if (!sponsorId || !identifier) {
      return NextResponse.json(
        { error: "Sponsor ve bilgi gereklidir" },
        { status: 400 }
      );
    }

    // Identifier'ı trim et
    const trimmedIdentifier = identifier.trim();

    if (!trimmedIdentifier) {
      return NextResponse.json(
        { error: "Bilgi boş olamaz" },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { telegramId },
      select: { id: true },
    });

    if (!user) {
      return NextResponse.json(
        { error: "Kullanıcı bulunamadı" },
        { status: 404 }
      );
    }

    // Sponsor var mı kontrol et
    const sponsor = await prisma.sponsor.findUnique({
      where: { id: sponsorId },
    });

    if (!sponsor) {
      return NextResponse.json(
        { error: "Sponsor bulunamadı" },
        { status: 404 }
      );
    }

    // Identifier tipine göre validasyon
    if (sponsor.identifierType === "id") {
      // ID ise sadece sayı kabul et
      if (!/^\d+$/.test(trimmedIdentifier)) {
        return NextResponse.json(
          { error: "ID sadece sayılardan oluşmalıdır" },
          { status: 400 }
        );
      }
    } else if (sponsor.identifierType === "email") {
      // Email ise email formatı kontrol et
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(trimmedIdentifier)) {
        return NextResponse.json(
          { error: "Geçerli bir email adresi giriniz" },
          { status: 400 }
        );
      }
    }

    // Upsert: Varsa güncelle, yoksa oluştur
    const sponsorInfo = await prisma.userSponsorInfo.upsert({
      where: {
        userId_sponsorId: {
          userId: user.id,
          sponsorId,
        },
      },
      update: {
        identifier: trimmedIdentifier,
      },
      create: {
        userId: user.id,
        sponsorId,
        identifier: trimmedIdentifier,
      },
      include: {
        sponsor: {
          select: {
            id: true,
            name: true,
            identifierType: true,
            logoUrl: true,
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      sponsorInfo,
    });
  } catch (error) {
    console.error("Sponsor bilgisi kaydetme hatası:", error);
    return NextResponse.json(
      { error: "Sponsor bilgisi kaydedilemedi" },
      { status: 500 }
    );
  }
}

// Sponsor bilgisini sil
export async function DELETE(request: NextRequest) {
  try {
    const telegramId = request.headers.get("x-telegram-id");

    if (!telegramId) {
      return NextResponse.json(
        { error: "Telegram ID bulunamadı" },
        { status: 401 }
      );
    }

    const { sponsorId } = await request.json();

    if (!sponsorId) {
      return NextResponse.json(
        { error: "Sponsor ID gereklidir" },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { telegramId },
      select: { id: true },
    });

    if (!user) {
      return NextResponse.json(
        { error: "Kullanıcı bulunamadı" },
        { status: 404 }
      );
    }

    await prisma.userSponsorInfo.delete({
      where: {
        userId_sponsorId: {
          userId: user.id,
          sponsorId,
        },
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Sponsor bilgisi silme hatası:", error);
    return NextResponse.json(
      { error: "Sponsor bilgisi silinemedi" },
      { status: 500 }
    );
  }
}
