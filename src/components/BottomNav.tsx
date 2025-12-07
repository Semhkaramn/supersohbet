'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, Ticket, Trophy, Heart, Menu } from 'lucide-react'

interface BottomNavProps {
  userId: string
}

export default function BottomNav({ userId }: BottomNavProps) {
  const pathname = usePathname()

  const navItems = [
    {
      href: `/dashboard?userId=${userId}`,
      label: 'Ana Menü',
      icon: Home,
      active: pathname === '/dashboard'
    },
    {
      href: `/wheel?userId=${userId}`,
      label: 'Çark',
      icon: Ticket,
      active: pathname === '/wheel'
    },
    {
      href: `/leaderboard?userId=${userId}`,
      label: 'Liderlik',
      icon: Trophy,
      active: pathname === '/leaderboard'
    },
    {
      href: `/sponsors?userId=${userId}`,
      label: 'Sponsorlar',
      icon: Heart,
      active: pathname === '/sponsors'
    },
    {
      href: `/menu?userId=${userId}`,
      label: 'Menü',
      icon: Menu,
      active: pathname === '/menu'
    },
  ]

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-slate-900/95 backdrop-blur-lg border-t border-white/10 pb-safe z-50">
      <div className="max-w-2xl mx-auto px-2 py-2">
        <div className="flex items-center justify-around">
          {navItems.map((item) => {
            const Icon = item.icon
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex flex-col items-center gap-1 px-3 py-2 rounded-lg transition-colors ${
                  item.active
                    ? 'text-blue-400 bg-blue-500/10'
                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <Icon className="w-5 h-5" />
                <span className="text-xs font-medium">{item.label}</span>
              </Link>
            )
          })}
        </div>
      </div>
    </nav>
  )
}
