'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState, useEffect } from 'react'
import {
  Home,
  ShoppingBag,
  FileText,
  Users,
  Ticket,
  Trophy,
  Heart,
  Wallet,
  Sparkles,
  Menu,
  X,
  ChevronLeft,
  ChevronRight
} from 'lucide-react'

export default function Sidebar() {
  const pathname = usePathname()
  const [isOpen, setIsOpen] = useState(true)
  const [isMobileOpen, setIsMobileOpen] = useState(false)

  const menuItems = [
    {
      href: '/',
      label: 'Ana Sayfa',
      icon: Home,
      gradient: 'from-blue-500 to-indigo-600',
      active: pathname === '/'
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

  // Close desktop sidebar when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const sidebar = document.getElementById('desktop-sidebar')
      const toggleBtn = document.getElementById('desktop-sidebar-toggle')
      const target = event.target as Node

      if (isOpen && sidebar && toggleBtn && !sidebar.contains(target) && !toggleBtn.contains(target)) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  return (
    <>
      {/* Mobile Hamburger Button */}
      <button
        onClick={() => setIsMobileOpen(!isMobileOpen)}
        className="lg:hidden fixed top-3 left-3 z-50 p-2 rounded-xl bg-slate-900/95 backdrop-blur-xl border border-white/10 text-white hover:bg-slate-800 transition-all"
      >
        {isMobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
      </button>

      {/* Mobile Overlay */}
      {isMobileOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/50 backdrop-blur-sm z-30"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* Desktop Overlay */}
      {isOpen && (
        <div
          className="hidden lg:block fixed inset-0 bg-black/20 backdrop-blur-[2px] z-30 top-20"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Desktop Toggle Button - Fixed position */}
      <button
        id="desktop-sidebar-toggle"
        onClick={() => setIsOpen(!isOpen)}
        className={`hidden lg:flex fixed z-50 p-2 rounded-xl bg-slate-900/95 backdrop-blur-xl border border-white/10 text-white hover:bg-slate-800 transition-all duration-300 shadow-lg ${
          isOpen ? 'left-[15.5rem] top-24' : 'left-4 top-24'
        }`}
      >
        {isOpen ? <ChevronLeft className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
      </button>

      {/* Desktop Sidebar - Starts Below Header */}
      <aside
        id="desktop-sidebar"
        className={`hidden lg:flex fixed left-0 top-16 lg:top-20 h-[calc(100vh-4rem)] lg:h-[calc(100vh-5rem)] bg-slate-900/95 backdrop-blur-xl border-r border-white/10 flex-col transition-all duration-300 ease-in-out z-40 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        } w-64`}
      >
        {/* Logo */}
        <div className="p-6 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-lg flex-shrink-0">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
            <div className="overflow-hidden">
              <h2 className="text-xl font-bold text-white whitespace-nowrap">SüperSohbet</h2>
              <p className="text-xs text-slate-400 whitespace-nowrap">Ödül Merkezi</p>
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
                onClick={() => setIsOpen(false)}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group ${
                  item.active
                    ? `bg-gradient-to-r ${item.gradient} shadow-lg`
                    : 'hover:bg-white/5'
                }`}
                title={item.label}
              >
                <Icon className={`w-5 h-5 flex-shrink-0 ${item.active ? 'text-white' : 'text-gray-400 group-hover:text-white'}`} />
                <span className={`font-medium whitespace-nowrap ${item.active ? 'text-white' : 'text-gray-400 group-hover:text-white'}`}>
                  {item.label}
                </span>
              </Link>
            )
          })}
        </nav>
      </aside>

      {/* Mobile Sidebar */}
      <aside
        className={`lg:hidden fixed left-0 top-0 h-screen w-64 bg-slate-900/95 backdrop-blur-xl border-r border-white/10 flex-col z-40 transition-transform duration-300 ease-in-out ${
          isMobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Logo */}
        <div className="p-6 border-b border-white/10 pt-16">
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
                onClick={() => setIsMobileOpen(false)}
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
    </>
  )
}
