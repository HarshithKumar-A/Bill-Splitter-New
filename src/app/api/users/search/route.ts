import { NextResponse } from 'next/server'
import { corsMiddleware } from '@/lib/cors'
import prisma from '@/lib/db'
import type { NextRequest } from 'next/server'
import { getAuthUser, unauthorizedResponse } from '@/lib/auth'

export async function GET(request: NextRequest) {
  // Apply CORS headers
  const corsHeaders = corsMiddleware(request)

  try {
    // Verify authentication
    const authUser = await getAuthUser(request)

    const searchParams = request.nextUrl.searchParams
    const query = searchParams.get('q')

    if (!query || query.length < 2) {
      return NextResponse.json(
        { users: [] },
        { status: 200, headers: corsHeaders }
      )
    }

    // Search for users by name or email
    const users = await prisma.user.findMany({
      where: {
        OR: [
          { name: { contains: query, mode: 'insensitive' } },
          { email: { contains: query, mode: 'insensitive' } }
        ]
      },
      select: {
        id: true,
        name: true,
        email: true
      },
      take: 10 // Limit results
    })

    return NextResponse.json(
      { users },
      { status: 200, headers: corsHeaders }
    )
  } catch (error: any) {
    console.error('Error searching users:', error)

    if (error.message?.includes('Unauthorized')) {
      return unauthorizedResponse(error.message)
    }

    return NextResponse.json(
      { error: 'Something went wrong' },
      { status: 500, headers: corsHeaders }
    )
  }
}