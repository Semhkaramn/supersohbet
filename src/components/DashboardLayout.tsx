'use client'

import { ReactNode } from 'react'
import Sidebar from './Sidebar'
import Header from './Header'

interface DashboardLayoutProps {
  children: ReactNode
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  return (
    <div className="min-h-screen bg-slate-950">
      <Header />
      <Sidebar />

      <div className="lg:pl-20 transition-all duration-300">
        <main className="min-h-screen p-4 md:p-6 lg:p-8 lg:pt-24">
          {children}
        </main>
      </div>
    </div>
  )
}
