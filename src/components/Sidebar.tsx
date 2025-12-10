'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Home,
  User,
  ShoppingBag,
  FileText,
  Users,
  Ticket,
  Trophy,
  Heart,
  Wallet,
  Sparkles
} from 'lucide-react'

export default function Sidebar() {
  const pathname = usePathname()

  const menuItems = [
    {
      href: '/sponsors',
      label: 'Ana Sayfa',
      icon: Home,
      gradient: 'from-blue-500 to-indigo-600',
      active: pathname === '/sponsors' || pathname === '/dashboard'
    },
    {
      href: '/profile',
      label: 'Profilim',
      icon: User,
      gradient: 'from-cyan-500 to-blue-500',
      active: pathname === '/profile'
    },
    {
      href: '/wallet-info',
      label: 'Cüzdan & Sponsor',
      icon: Wallet,
      gradient: 'from-green-500 to-emerald-500',
      active: pathname === '/wallet-info'
    },
    {
      href: '/referral',
      label: 'Referans',
      icon: Users,
      gradient: 'from-orange-500 to-red-500',
      active: pathname === '/referral'
    },
    {
      href: '/shop',
      label: 'Mağaza',
      icon: ShoppingBag,
      gradient: 'from-emerald-500 to-teal-500',
      active: pathname === '/shop'
    },
    {
      href: '/tasks',
      label: 'Görevler',
      icon: FileText,
      gradient: 'from-purple-500 to-pink-500',
      active: pathname === '/tasks'
    },
    {
      href: '/wheel',
      label: 'Çark',
      icon: Ticket,
      gradient: 'from-yellow-500 to-amber-500',
      active: pathname === '/wheel'
    },
    {
      href: '/leaderboard',
      label: 'Liderlik',
      icon: Trophy,
      gradient: 'from-amber-500 to-orange-500',
      active: pathname === '/leaderboard'
    }
  ]

  return (
    <aside className="hidden lg:flex fixed left-0 top-0 h-screen w-64 bg-slate-900/95 backdrop-blur-xl border-r border-white/10 flex-col">
      {/* Logo */}
      <div className="p-6 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-lg">
            <Sparkles className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">SüperSohbet</h2>
            <p className="text-xs text-slate-400">Ödül Merkezi</p>
          </div>
        </div>
      </div>

      {/* Menu Items */}
      <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
        {menuItems.map((item) => {
          const Icon = item.icon
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group ${
                item.active
                  ? `bg-gradient-to-r ${item.gradient} shadow-lg`
                  : 'hover:bg-white/5'
              }`}
            >
              <Icon className={`w-5 h-5 ${item.active ? 'text-white' : 'text-gray-400 group-hover:text-white'}`} />
              <span className={`font-medium ${item.active ? 'text-white' : 'text-gray-400 group-hover:text-white'}`}>
                {item.label}
              </span>
            </Link>
          )
        })}
      </nav>
    </aside>
  )
}
