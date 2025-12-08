import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const channels = await prisma.requiredChannel.findMany({
      orderBy: { order: 'asc' }
    })

    return NextResponse.json({ channels })
  } catch (error) {
    console.error('Get admin channels error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { channelId, channelName, channelLink, order } = body

    if (!channelId || !channelName || !channelLink) {
      return NextResponse.json(
        { error: 'All fields required' },
        { status: 400 }
      )
    }

    const channel = await prisma.requiredChannel.create({
      data: {
        channelId,
        channelName,
        channelLink,
        order: order || 0
      }
    })

    return NextResponse.json({ channel })
  } catch (error) {
    console.error('Create channel error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
