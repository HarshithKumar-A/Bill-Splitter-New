import { NextResponse } from 'next/server'
import { corsMiddleware } from '@/lib/cors'
import prisma from '@/lib/db'
import type { NextRequest } from 'next/server'

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string; memberId: string } }
) {
  // Apply CORS headers
  const corsHeaders = corsMiddleware(request)
  
  try {
    const { id: groupId, memberId } = params
    
    if (!groupId || !memberId) {
      return NextResponse.json(
        { error: 'Group ID and Member ID are required' },
        { status: 400, headers: corsHeaders }
      )
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
  } catch (error) {
    console.error('Error removing member:', error)
    return NextResponse.json(
      { error: 'Something went wrong' },
      { status: 500, headers: corsHeaders }
    )
  }
} 