import { NextResponse } from 'next/server'
import prisma from '@/lib/db'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      )
    }

    // Get all groups for the user
    const groups = await prisma.group.findMany({
      where: {
        members: {
          some: {
            userId
          }
        }
      },
      include: {
        members: {
          include: {
            user: {
              select: {
                id: true,
                name: true
              }
            }
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    // Format the response
    const formattedGroups = groups.map(group => ({
      id: group.id,
      name: group.name,
      created: group.createdAt.toISOString().split('T')[0],
      members: group.members.length
    }))

    return NextResponse.json(formattedGroups)
  } catch (error) {
    console.error('Error fetching groups:', error)
    return NextResponse.json(
      { error: 'Something went wrong' },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const { name, userId, memberIds } = await request.json()

    // Validate input
    if (!name || !userId) {
      return NextResponse.json(
        { error: 'Group name and user ID are required' },
        { status: 400 }
      )
    }

    // Create group with the creator as a member
    const group = await prisma.group.create({
      data: {
        name,
        members: {
          create: [
            { userId },
            ...memberIds.map((memberId: string) => ({ userId: memberId }))
          ]
        }
      },
      include: {
        members: {
          include: {
            user: {
              select: {
                id: true,
                name: true
              }
            }
          }
        }
      }
    })

    return NextResponse.json(
      { message: 'Group created successfully', group },
      { status: 201 }
    )
  } catch (error) {
    console.error('Error creating group:', error)
    return NextResponse.json(
      { error: 'Something went wrong' },
      { status: 500 }
    )
  }
} 