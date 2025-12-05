import { NextResponse } from 'next/server'
import { corsMiddleware } from '@/lib/cors'
import prisma from '@/lib/db'
import type { NextRequest } from 'next/server'
import { getAuthUser, unauthorizedResponse, forbiddenResponse } from '@/lib/auth'

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  // Apply CORS headers
  const corsHeaders = corsMiddleware(request)

  try {
    // Verify authentication
    const authUser = await getAuthUser(request)

    const groupId = params.id
    const { email, userId } = await request.json()

    if (!groupId) {
      return NextResponse.json(
        { error: 'Group ID is required' },
        { status: 400, headers: corsHeaders }
      )
    }

    // Check if the group exists and verify user is a member
    const group = await prisma.group.findUnique({
      where: { id: groupId },
      include: {
        members: true
      }
    })

    if (!group) {
      return NextResponse.json(
        { error: 'Group not found' },
        { status: 404, headers: corsHeaders }
      )
    }

    // Verify the requesting user is a member of this group
    const isMember = group.members.some(member => member.userId === authUser.id)
    if (!isMember) {
      return forbiddenResponse('You are not a member of this group')
    }

    if (!email && !userId) {
      return NextResponse.json(
        { error: 'Either email or userId is required' },
        { status: 400, headers: corsHeaders }
      )
    }

    let user;

    // Find or create user based on input
    if (userId) {
      // Find user by ID
      user = await prisma.user.findUnique({
        where: { id: userId }
      })

      if (!user) {
        return NextResponse.json(
          { error: 'User not found' },
          { status: 404, headers: corsHeaders }
        )
      }
    } else {
      // Find or create user by email
      user = await prisma.user.findUnique({
        where: { email }
      })

      // If user doesn't exist, create a new one
      if (!user) {
        // Generate a random name based on email
        const name = email.split('@')[0]

        user = await prisma.user.create({
          data: {
            email,
            name,
            password: null // OAuth users
          }
        })
      }
    }

    // Check if user is already a member of the group
    const existingMember = await prisma.groupMember.findFirst({
      where: {
        groupId,
        userId: user.id
      }
    })

    if (existingMember) {
      return NextResponse.json(
        { error: 'User is already a member of this group' },
        { status: 400, headers: corsHeaders }
      )
    }

    // Add user to the group
    await prisma.groupMember.create({
      data: {
        groupId,
        userId: user.id
      }
    })

    return NextResponse.json(
      {
        message: 'Member added successfully',
        member: {
          id: user.id,
          name: user.name,
          email: user.email
        }
      },
      { status: 201, headers: corsHeaders }
    )
  } catch (error: any) {
    console.error('Error adding member:', error)

    if (error.message?.includes('Unauthorized')) {
      return unauthorizedResponse(error.message)
    }

    if (error.message?.includes('Forbidden')) {
      return forbiddenResponse(error.message)
    }

    return NextResponse.json(
      { error: 'Something went wrong' },
      { status: 500, headers: corsHeaders }
    )
  }
}