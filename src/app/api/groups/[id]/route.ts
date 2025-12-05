import { NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { getAuthUser, unauthorizedResponse, forbiddenResponse } from '@/lib/auth'

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    // Verify authentication
    const authUser = await getAuthUser(request)

    const groupId = params.id

    if (!groupId) {
      return NextResponse.json(
        { error: 'Group ID is required' },
        { status: 400 }
      )
    }

    // Get group with members
    const group = await prisma.group.findUnique({
      where: {
        id: groupId
      },
      include: {
        members: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true
              }
            }
          }
        }
      }
    })

    if (!group) {
      return NextResponse.json(
        { error: 'Group not found' },
        { status: 404 }
      )
    }

    // Verify user is a member of this group
    const isMember = group.members.some(member => member.userId === authUser.id)
    if (!isMember) {
      return forbiddenResponse('You are not a member of this group')
    }

    // Format the response
    const formattedGroup = {
      id: group.id,
      name: group.name,
      created: group.createdAt.toISOString().split('T')[0],
      members: group.members.map(member => ({
        id: member.user.id,
        name: member.user.name,
        email: member.user.email
      }))
    }

    return NextResponse.json(formattedGroup)
  } catch (error: any) {
    console.error('Error fetching group:', error)

    if (error.message?.includes('Unauthorized')) {
      return unauthorizedResponse(error.message)
    }

    if (error.message?.includes('Forbidden')) {
      return forbiddenResponse(error.message)
    }

    return NextResponse.json(
      { error: 'Something went wrong' },
      { status: 500 }
    )
  }
} 