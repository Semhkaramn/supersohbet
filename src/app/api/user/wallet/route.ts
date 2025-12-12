import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";

// Cüzdan adresini getir
export async function GET(request: NextRequest) {
  try {
    // Session kontrolü - artık query parametresi yerine session kullanıyoruz
    const session = await requireAuth(request);
    const userId = session.userId;

    const user = await prisma.user.findUnique({
      where: { id: userId },
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
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json(
        { error: 'Oturum geçersiz. Lütfen tekrar giriş yapın.' },
        { status: 401 }
      );
    }
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
    // Session kontrolü - artık query parametresi yerine session kullanıyoruz
    const session = await requireAuth(request);
    const userId = session.userId;

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
      where: { id: userId },
      data: { trc20WalletAddress: walletAddress },
    });

    return NextResponse.json({
      success: true,
      walletAddress: user.trc20WalletAddress,
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json(
        { error: 'Oturum geçersiz. Lütfen tekrar giriş yapın.' },
        { status: 401 }
      );
    }
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
    // Session kontrolü - artık query parametresi yerine session kullanıyoruz
    const session = await requireAuth(request);
    const userId = session.userId;

    await prisma.user.update({
      where: { id: userId },
      data: { trc20WalletAddress: null },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json(
        { error: 'Oturum geçersiz. Lütfen tekrar giriş yapın.' },
        { status: 401 }
      );
    }
    console.error("Cüzdan adresi silme hatası:", error);
    return NextResponse.json(
      { error: "Cüzdan adresi silinemedi" },
      { status: 500 }
    );
  }
}
