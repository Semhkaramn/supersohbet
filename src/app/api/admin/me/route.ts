import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-middleware'

export async function GET(request: NextRequest) {
  const authCheck = await requireAdmin(request)
  if (authCheck.error) return authCheck.error

  const admin = authCheck.admin!

  return NextResponse.json({
    id: admin.id,
    username: admin.username,
    isSuperAdmin: admin.isSuperAdmin,
    permissions: {
      canAccessDashboard: admin.canAccessDashboard,
      canAccessBroadcast: admin.canAccessBroadcast,
      canAccessStatistics: admin.canAccessStatistics,
      canAccessTasks: admin.canAccessTasks,
      canAccessShop: admin.canAccessShop,
      canAccessWheel: admin.canAccessWheel,
      canAccessSponsors: admin.canAccessSponsors,
      canAccessRanks: admin.canAccessRanks,
      canAccessSettings: admin.canAccessSettings,
      canAccessChannels: admin.canAccessChannels,
      canAccessUsers: admin.canAccessUsers,
      canAccessAdmins: admin.canAccessAdmins,
    },
    createdAt: admin.createdAt,
    updatedAt: admin.updatedAt,
  })
}
