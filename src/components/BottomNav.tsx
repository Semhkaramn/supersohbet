'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, Ticket, Trophy, Heart, Menu } from 'lucide-react'
import { MenuDrawer } from './MenuDrawer'

interface BottomNavProps {
  userId: string
}

export default function BottomNav({ userId }: BottomNavProps) {
  const pathname = usePathname()
  const [menuOpen, setMenuOpen] = useState(false)

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
    }
  ]

  return (
    <>
      <nav className="fixed bottom-0 left-0 right-0 bg-gradient-to-t from-slate-900 via-slate-900/98 to-slate-900/95 backdrop-blur-xl border-t border-white/10 pb-safe z-50 shadow-2xl">
        <div className="max-w-2xl mx-auto px-2 py-3">
          <div className="flex items-center justify-around">
            {navItems.map((item) => {
              const Icon = item.icon
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  prefetch={false}
                  className={`flex flex-col items-center gap-1.5 px-4 py-2.5 rounded-xl transition-all duration-200 ${
                    item.active
                      ? 'text-blue-400 bg-gradient-to-b from-blue-500/20 to-blue-600/10 scale-105 shadow-lg shadow-blue-500/20'
                      : 'text-gray-400 hover:text-white hover:bg-white/5 hover:scale-105'
                  }`}
                >
                  <Icon className={`w-5 h-5 ${item.active ? 'drop-shadow-glow' : ''}`} />
                  <span className={`text-xs font-medium ${item.active ? 'font-semibold' : ''}`}>{item.label}</span>
                </Link>
              )
            })}

            {/* Menu Button */}
            <button
              onClick={() => setMenuOpen(true)}
              className="flex flex-col items-center gap-1.5 px-4 py-2.5 rounded-xl transition-all duration-200 text-gray-400 hover:text-white hover:bg-white/5 hover:scale-105"
            >
              <Menu className="w-5 h-5" />
              <span className="text-xs font-medium">Menü</span>
            </button>
          </div>
        </div>
      </nav>

      {/* Menu Drawer */}
      <MenuDrawer open={menuOpen} onOpenChange={setMenuOpen} userId={userId} />

      <style jsx>{`
        .drop-shadow-glow {
          filter: drop-shadow(0 0 8px rgba(59, 130, 246, 0.5));
        }
      `}</style>
    </>
  )
}
