'use client'

import { ReactNode } from 'react'
import Sidebar from './Sidebar'
import Header from './Header'
import BottomNav from './BottomNav'

interface DashboardLayoutProps {
  children: ReactNode
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  return (
    <div className="min-h-screen bg-slate-950">
      {/* Sidebar - collapsible */}
      <Sidebar />

      {/* Main Content Area - no fixed margin, sidebar handles its own width */}
      <div className="lg:pl-20 transition-all duration-300">
        {/* Desktop Header */}
        <Header />

        {/* Page Content */}
        <main className="min-h-screen pb-20 lg:pb-8">
          {children}
        </main>
      </div>

      {/* Mobile Bottom Navigation */}
      <BottomNav />
    </div>
  )
}
