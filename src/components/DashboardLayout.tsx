'use client'

import { ReactNode } from 'react'
import Sidebar from './Sidebar'
import Header from './Header'
import SponsorBanner from './SponsorBanner'

interface DashboardLayoutProps {
  children: ReactNode
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  return (
    <div className="min-h-screen bg-slate-950">
      <Header />
      <SponsorBanner />
      <Sidebar />

      <div className="transition-all duration-300">
        <main className="min-h-screen p-4 md:p-6 lg:p-8 pt-20 lg:pt-24 lg:ml-64">
          {children}
        </main>
      </div>
    </div>
  )
}
