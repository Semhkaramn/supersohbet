import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const sponsors = await prisma.sponsor.findMany({
      orderBy: { order: 'asc' }
    })

    return NextResponse.json({ sponsors })
  } catch (error) {
    console.error('Get sponsors error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, description, logoUrl, websiteUrl, category, order } = body

    if (!name) {
      return NextResponse.json(
        { error: 'name required' },
        { status: 400 }
      )
    }

    const sponsor = await prisma.sponsor.create({
      data: {
        name,
        description: description || null,
        logoUrl: logoUrl || null,
        websiteUrl: websiteUrl || null,
        category: category || 'normal',
        order: order || 0
      }
    })

    return NextResponse.json({ sponsor })
  } catch (error) {
    console.error('Create sponsor error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
