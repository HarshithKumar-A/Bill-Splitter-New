import { NextResponse } from 'next/server'
import { corsMiddleware } from '@/lib/cors'
import prisma from '@/lib/db'
import type { NextRequest } from 'next/server'
import { getAuthUser, unauthorizedResponse, forbiddenResponse } from '@/lib/auth'

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string; memberId: string } }
) {
  // Apply CORS headers
  const corsHeaders = corsMiddleware(request)

  try {
    // Verify authentication
    const authUser = await getAuthUser(request)

    const { id: groupId, memberId } = params

    if (!groupId || !memberId) {
      return NextResponse.json(
        { error: 'Group ID and Member ID are required' },
        { status: 400, headers: corsHeaders }
      )
    }

    // Verify user is a member of the group
    const membership = await prisma.groupMember.findFirst({
      where: {
        groupId,
        userId: authUser.id
      }
    })

    if (!membership) {
      return forbiddenResponse('You are not a member of this group')
    }

    // Check if the member exists in the group
    const member = await prisma.groupMember.findFirst({
      where: {
        groupId,
        userId: memberId
      }
    })

    if (!member) {
      return NextResponse.json(
        { error: 'Member not found in this group' },
        { status: 404, headers: corsHeaders }
      )
    }

    // Delete the member from the group
    await prisma.groupMember.delete({
      where: {
        id: member.id
      }
    })

    return NextResponse.json(
      { message: 'Member removed successfully' },
      { status: 200, headers: corsHeaders }
    )
  } catch (error: any) {
    console.error('Error removing member:', error)

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