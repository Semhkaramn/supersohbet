'use client'

import { Card } from '@/components/ui/card'
import { Wrench, AlertTriangle, Clock } from 'lucide-react'

export function MaintenanceScreen() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-orange-950/50 via-slate-900 to-slate-950">
      <Card className="max-w-md w-full bg-orange-950/30 border-orange-500/30 p-8 text-center">
        <div className="mb-6">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-orange-500/20 mb-4">
            <Wrench className="w-12 h-12 text-orange-400" />
          </div>
          <h1 className="text-3xl font-bold text-orange-400 mb-2">Bakım Modu</h1>
          <p className="text-gray-300">Sistem şu anda bakım modunda</p>
        </div>

        <div className="space-y-4 mb-6">
          <div className="bg-orange-950/40 border border-orange-500/30 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-orange-400 mt-0.5 flex-shrink-0" />
              <div className="text-left">
                <p className="text-sm font-semibold text-orange-300 mb-1">Geçici Olarak Kapalı</p>
                <p className="text-sm text-gray-300">
                  Sistemimiz şu anda güncellemeler için bakımda.
                  Lütfen daha sonra tekrar deneyin.
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-slate-900/50 border border-slate-700 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <Clock className="w-5 h-5 text-blue-400 mt-0.5 flex-shrink-0" />
            <div className="text-left">
              <p className="text-sm text-gray-300">
                Bakım işlemi tamamlandıktan sonra bot tekrar aktif olacaktır.
                Anlayışınız için teşekkür ederiz.
              </p>
            </div>
          </div>
        </div>
      </Card>
    </div>
  )
}
