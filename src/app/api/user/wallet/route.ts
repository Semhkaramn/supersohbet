import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

// Cüzdan adresini getir
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
      select: { trc20WalletAddress: true },
    });

    if (!user) {
      return NextResponse.json(
        { error: "Kullanıcı bulunamadı" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      walletAddress: user.trc20WalletAddress,
    });
  } catch (error) {
    console.error("Cüzdan adresi getirme hatası:", error);
    return NextResponse.json(
      { error: "Cüzdan adresi getirilemedi" },
      { status: 500 }
    );
  }
}

// Cüzdan adresini kaydet/güncelle
export async function POST(request: NextRequest) {
  try {
    const telegramId = request.headers.get("x-telegram-id");

    if (!telegramId) {
      return NextResponse.json(
        { error: "Telegram ID bulunamadı" },
        { status: 401 }
      );
    }

    const { walletAddress } = await request.json();

    if (!walletAddress || typeof walletAddress !== "string") {
      return NextResponse.json(
        { error: "Geçerli bir cüzdan adresi girin" },
        { status: 400 }
      );
    }

    // TRC20 cüzdan adresi validasyonu (T ile başlamalı ve 34 karakter olmalı)
    if (!walletAddress.startsWith("T") || walletAddress.length !== 34) {
      return NextResponse.json(
        { error: "Geçersiz TRC20 cüzdan adresi. T ile başlamalı ve 34 karakter olmalıdır." },
        { status: 400 }
      );
    }

    const user = await prisma.user.update({
      where: { telegramId },
      data: { trc20WalletAddress: walletAddress },
    });

    return NextResponse.json({
      success: true,
      walletAddress: user.trc20WalletAddress,
    });
  } catch (error) {
    console.error("Cüzdan adresi kaydetme hatası:", error);
    return NextResponse.json(
      { error: "Cüzdan adresi kaydedilemedi" },
      { status: 500 }
    );
  }
}

// Cüzdan adresini sil
export async function DELETE(request: NextRequest) {
  try {
    const telegramId = request.headers.get("x-telegram-id");

    if (!telegramId) {
      return NextResponse.json(
        { error: "Telegram ID bulunamadı" },
        { status: 401 }
      );
    }

    await prisma.user.update({
      where: { telegramId },
      data: { trc20WalletAddress: null },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Cüzdan adresi silme hatası:", error);
    return NextResponse.json(
      { error: "Cüzdan adresi silinemedi" },
      { status: 500 }
    );
  }
}
