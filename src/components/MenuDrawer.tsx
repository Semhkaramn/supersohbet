'use client'

import { useRouter } from 'next/navigation'
import { Sheet, SheetContent } from '@/components/ui/sheet'
import {
  User,
  ShoppingBag,
  FileText,
  Users,
  ChevronRight,
  Sparkles,
  Home,
  Ticket,
  Trophy,
  Heart
} from 'lucide-react'

interface MenuDrawerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  userId: string
}

export function MenuDrawer({ open, onOpenChange, userId }: MenuDrawerProps) {
  const router = useRouter()

  const menuItems = [
    {
      title: 'Ana Menü',
      description: 'Ana sayfaya dön',
      icon: Home,
      href: `/dashboard?userId=${userId}`,
      gradient: 'from-slate-500/20 to-slate-600/20',
      iconColor: 'text-slate-400',
      borderColor: 'border-slate-500/30'
    },
    {
      title: 'Profilim',
      description: 'Profil bilgilerim ve geçmişim',
      icon: User,
      href: `/profile?userId=${userId}`,
      gradient: 'from-blue-500/20 to-indigo-500/20',
      iconColor: 'text-blue-400',
      borderColor: 'border-blue-500/30'
    },
    {
      title: 'Referans',
      description: 'Arkadaşlarını davet et, ödül kazan',
      icon: Users,
      href: `/referral?userId=${userId}`,
      gradient: 'from-orange-500/20 to-red-500/20',
      iconColor: 'text-orange-400',
      borderColor: 'border-orange-500/30'
    },
    {
      title: 'Mağaza',
      description: 'Ödüllere göz at ve satın al',
      icon: ShoppingBag,
      href: `/shop?userId=${userId}`,
      gradient: 'from-emerald-500/20 to-teal-500/20',
      iconColor: 'text-emerald-400',
      borderColor: 'border-emerald-500/30'
    },
    {
      title: 'Görevler',
      description: 'Günlük ve haftalık görevler',
      icon: FileText,
      href: `/tasks?userId=${userId}`,
      gradient: 'from-purple-500/20 to-pink-500/20',
      iconColor: 'text-purple-400',
      borderColor: 'border-purple-500/30'
    },
    {
      title: 'Çark',
      description: 'Şansını dene, ödül kazan',
      icon: Ticket,
      href: `/wheel?userId=${userId}`,
      gradient: 'from-yellow-500/20 to-amber-500/20',
      iconColor: 'text-yellow-400',
      borderColor: 'border-yellow-500/30'
    },
    {
      title: 'Liderlik',
      description: 'En başarılı kullanıcılar',
      icon: Trophy,
      href: `/leaderboard?userId=${userId}`,
      gradient: 'from-amber-500/20 to-orange-500/20',
      iconColor: 'text-amber-400',
      borderColor: 'border-amber-500/30'
    },
    {
      title: 'Sponsorlar',
      description: 'Sponsorlarımıza göz atın',
      icon: Heart,
      href: `/sponsors?userId=${userId}`,
      gradient: 'from-pink-500/20 to-rose-500/20',
      iconColor: 'text-pink-400',
      borderColor: 'border-pink-500/30'
    }
  ]

  function handleNavigate(href: string) {
    onOpenChange(false)
    router.push(href)
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent onClose={() => onOpenChange(false)}>
        <div className="flex flex-col h-full">
          {/* Menu Items */}
          <div className="flex-1 p-6 space-y-3 overflow-y-auto">
            <div className="flex items-center gap-2 mb-4">
              <Sparkles className="w-5 h-5 text-blue-400" />
              <h3 className="text-lg font-bold text-white">Menü</h3>
            </div>

            {menuItems.map((item) => (
              <button
                key={item.title}
                onClick={() => handleNavigate(item.href)}
                className={`w-full bg-gradient-to-br ${item.gradient} border ${item.borderColor} rounded-lg p-4 hover:scale-[1.02] transition-transform backdrop-blur-sm text-left group`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-12 h-12 rounded-full bg-slate-800/50 flex items-center justify-center border ${item.borderColor}`}>
                    <item.icon className={`w-6 h-6 ${item.iconColor}`} />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-bold text-white mb-0.5">{item.title}</h4>
                    <p className="text-xs text-slate-400">{item.description}</p>
                  </div>
                  <ChevronRight className="w-5 h-5 text-white/40 group-hover:text-white/60 transition-colors" />
                </div>
              </button>
            ))}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}
