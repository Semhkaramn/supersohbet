import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const setting = await prisma.settings.findUnique({
      where: { key: 'sponsor_banner_enabled' }
    })

    return NextResponse.json({
      enabled: setting?.value === 'true'
    })
  } catch (error) {
    console.error('Error fetching sponsor banner setting:', error)
    return NextResponse.json(
      { error: 'Failed to fetch setting' },
      { status: 500 }
    )
  }
}
