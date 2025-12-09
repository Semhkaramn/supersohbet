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
      gradient: 'from-blue-500/20 to-indigo-600/20',
      iconColor: 'text-blue-400',
      borderColor: 'border-blue-500/30',
      iconBg: 'bg-blue-500/20'
    },
    {
      title: 'Profilim',
      description: 'Profil bilgilerim ve geçmişim',
      icon: User,
      href: `/profile?userId=${userId}`,
      gradient: 'from-cyan-500/20 to-blue-500/20',
      iconColor: 'text-cyan-400',
      borderColor: 'border-cyan-500/30',
      iconBg: 'bg-cyan-500/20'
    },
    {
      title: 'Referans',
      description: 'Arkadaşlarını davet et, ödül kazan',
      icon: Users,
      href: `/referral?userId=${userId}`,
      gradient: 'from-orange-500/20 to-red-500/20',
      iconColor: 'text-orange-400',
      borderColor: 'border-orange-500/30',
      iconBg: 'bg-orange-500/20'
    },
    {
      title: 'Mağaza',
      description: 'Ödüllere göz at ve satın al',
      icon: ShoppingBag,
      href: `/shop?userId=${userId}`,
      gradient: 'from-emerald-500/20 to-teal-500/20',
      iconColor: 'text-emerald-400',
      borderColor: 'border-emerald-500/30',
      iconBg: 'bg-emerald-500/20'
    },
    {
      title: 'Görevler',
      description: 'Günlük ve haftalık görevler',
      icon: FileText,
      href: `/tasks?userId=${userId}`,
      gradient: 'from-purple-500/20 to-pink-500/20',
      iconColor: 'text-purple-400',
      borderColor: 'border-purple-500/30',
      iconBg: 'bg-purple-500/20'
    },
    {
      title: 'Çark',
      description: 'Şansını dene, ödül kazan',
      icon: Ticket,
      href: `/wheel?userId=${userId}`,
      gradient: 'from-yellow-500/20 to-amber-500/20',
      iconColor: 'text-yellow-400',
      borderColor: 'border-yellow-500/30',
      iconBg: 'bg-yellow-500/20'
    },
    {
      title: 'Liderlik',
      description: 'En başarılı kullanıcılar',
      icon: Trophy,
      href: `/leaderboard?userId=${userId}`,
      gradient: 'from-amber-500/20 to-orange-500/20',
      iconColor: 'text-amber-400',
      borderColor: 'border-amber-500/30',
      iconBg: 'bg-amber-500/20'
    },
    {
      title: 'Sponsorlar',
      description: 'Sponsorlarımıza göz atın',
      icon: Heart,
      href: `/sponsors?userId=${userId}`,
      gradient: 'from-pink-500/20 to-rose-500/20',
      iconColor: 'text-pink-400',
      borderColor: 'border-pink-500/30',
      iconBg: 'bg-pink-500/20'
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
          {/* Header */}
          <div className="p-6 pb-4">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-lg">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-white">Menü</h3>
                <p className="text-xs text-slate-400">Tüm özellikler</p>
              </div>
            </div>
          </div>

          {/* Menu Items */}
          <div className="flex-1 px-4 pb-6 space-y-2 overflow-y-auto">
            {menuItems.map((item) => (
              <button
                key={item.title}
                onClick={() => handleNavigate(item.href)}
                className={`w-full bg-gradient-to-br ${item.gradient} border ${item.borderColor} rounded-xl p-4 hover:scale-[1.02] active:scale-[0.98] transition-all backdrop-blur-sm text-left group shadow-lg hover:shadow-xl`}
              >
                <div className="flex items-center gap-4">
                  <div className={`w-14 h-14 rounded-xl ${item.iconBg} flex items-center justify-center border ${item.borderColor} shadow-inner group-hover:scale-110 transition-transform`}>
                    <item.icon className={`w-7 h-7 ${item.iconColor}`} />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-bold text-white mb-1 text-base">{item.title}</h4>
                    <p className="text-xs text-slate-300">{item.description}</p>
                  </div>
                  <ChevronRight className="w-5 h-5 text-white/40 group-hover:text-white/70 group-hover:translate-x-1 transition-all" />
                </div>
              </button>
            ))}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}
