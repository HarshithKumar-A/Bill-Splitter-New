import { NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { getAuthUser, unauthorizedResponse } from '@/lib/auth'

export async function GET(request: Request) {
  try {
    // Verify authentication
    const authUser = await getAuthUser(request)

    // Use authenticated user's database ID to fetch their groups
    const userId = authUser.id

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
      destination: group.destination,
      startDate: group.startDate.toISOString().split('T')[0],
      endDate: group.endDate.toISOString().split('T')[0],
      status: group.status,
      currency: group.currency,
      created: group.createdAt.toISOString().split('T')[0],
      members: group.members.length
    }))

    return NextResponse.json(formattedGroups)
  } catch (error: any) {
    console.error('Error fetching groups:', error)

    if (error.message?.includes('Unauthorized')) {
      return unauthorizedResponse(error.message)
    }

    return NextResponse.json(
      { error: 'Something went wrong' },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    // Verify authentication
    const authUser = await getAuthUser(request)

    const { name, destination, description, startDate, endDate, currency = 'INR', memberIds = [] } = await request.json()

    // Validate input
    if (!name) {
      return NextResponse.json(
        { error: 'Trip name is required' },
        { status: 400 }
      )
    }

    if (!destination) {
      return NextResponse.json(
        { error: 'Destination is required' },
        { status: 400 }
      )
    }

    if (!startDate || !endDate) {
      return NextResponse.json(
        { error: 'Start and end dates are required' },
        { status: 400 }
      )
    }

    // Create trip with the authenticated user as creator and member
    const group = await prisma.group.create({
      data: {
        name,
        destination,
        description,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        currency,
        status: 'ACTIVE',
        members: {
          create: [
            { userId: authUser.id },
            ...(memberIds || []).map((memberId: string) => ({ userId: memberId }))
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
      { message: 'Trip created successfully', group },
      { status: 201 }
    )
  } catch (error: any) {
    console.error('Error creating group:', error)

    if (error.message?.includes('Unauthorized')) {
      return unauthorizedResponse(error.message)
    }

    return NextResponse.json(
      { error: 'Something went wrong' },
      { status: 500 }
    )
  }
} 