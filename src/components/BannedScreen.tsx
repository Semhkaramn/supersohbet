'use client'

import { Card } from '@/components/ui/card'
import { Ban, ShieldX, AlertTriangle } from 'lucide-react'

interface BannedScreenProps {
  banReason?: string
  bannedAt?: Date | string
  bannedBy?: string
}

export function BannedScreen({ banReason, bannedAt, bannedBy }: BannedScreenProps) {
  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-red-950/50 via-slate-900 to-slate-950">
      <Card className="max-w-md w-full bg-red-950/30 border-red-500/30 p-8 text-center">
        <div className="mb-6">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-red-500/20 mb-4">
            <ShieldX className="w-12 h-12 text-red-400" />
          </div>
          <h1 className="text-3xl font-bold text-red-400 mb-2">Hesap Yasaklandı</h1>
          <p className="text-gray-300">Hesabınız sistem yöneticileri tarafından yasaklanmıştır.</p>
        </div>

        <div className="space-y-4 mb-6">
          <div className="bg-red-950/40 border border-red-500/30 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-red-400 mt-0.5 flex-shrink-0" />
              <div className="text-left">
                <p className="text-sm font-semibold text-red-300 mb-1">Ban Nedeni:</p>
                <p className="text-sm text-gray-300">
                  {banReason || 'Sistem kurallarını ihlal ettiniz.'}
                </p>
              </div>
            </div>
          </div>

          {bannedAt && (
            <div className="text-sm text-gray-400">
              <p>
                <span className="font-semibold">Tarih:</span>{' '}
                {new Date(bannedAt).toLocaleString('tr-TR')}
              </p>
            </div>
          )}

          {bannedBy && (
            <div className="text-sm text-gray-400">
              <p>
                <span className="font-semibold">Yasaklayan:</span> {bannedBy}
              </p>
            </div>
          )}
        </div>

        <div className="bg-slate-900/50 border border-slate-700 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <Ban className="w-5 h-5 text-yellow-400 mt-0.5 flex-shrink-0" />
            <div className="text-left">
              <p className="text-sm text-gray-300">
                Bu yasak kalıcıdır ve bot özelliklerini kullanmanız engellenmiştir.
                Eğer bunun bir hata olduğunu düşünüyorsanız, lütfen destek ekibiyle iletişime geçin.
              </p>
            </div>
          </div>
        </div>
      </Card>
    </div>
  )
}
