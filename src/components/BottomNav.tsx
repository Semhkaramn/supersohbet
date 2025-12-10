'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, Ticket, Trophy, Heart, Menu } from 'lucide-react'
import { MenuDrawer } from './MenuDrawer'

export default function BottomNav() {
  const pathname = usePathname()
  const [menuOpen, setMenuOpen] = useState(false)

  const navItems = [
    {
      href: '/dashboard',
      label: 'Ana Menü',
      icon: Home,
      active: pathname === '/dashboard'
    },
    {
      href: '/wheel',
      label: 'Çark',
      icon: Ticket,
      active: pathname === '/wheel'
    },
    {
      href: '/leaderboard',
      label: 'Liderlik',
      icon: Trophy,
      active: pathname === '/leaderboard'
    },
    {
      href: '/sponsors',
      label: 'Sponsorlar',
      icon: Heart,
      active: pathname === '/sponsors'
    }
  ]

  return (
    <>
      <nav className="fixed bottom-0 left-0 right-0 bg-slate-900/95 backdrop-blur-lg border-t border-white/10 pb-safe z-50">
        <div className="max-w-2xl mx-auto px-2 py-2">
          <div className="flex items-center justify-around">
            {navItems.map((item) => {
              const Icon = item.icon
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  prefetch={false}
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

            {/* Menu Button */}
            <button
              onClick={() => setMenuOpen(true)}
              className="flex flex-col items-center gap-1 px-3 py-2 rounded-lg transition-colors text-gray-400 hover:text-white hover:bg-white/5"
            >
              <Menu className="w-5 h-5" />
              <span className="text-xs font-medium">Menü</span>
            </button>
          </div>
        </div>
      </nav>

      {/* Menu Drawer */}
      <MenuDrawer open={menuOpen} onOpenChange={setMenuOpen} />
    </>
  )
}
