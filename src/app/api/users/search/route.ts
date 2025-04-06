import { NextResponse } from 'next/server'
import { corsMiddleware } from '@/lib/cors'
import prisma from '@/lib/db'
import type { NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  // Apply CORS headers
  const corsHeaders = corsMiddleware(request)
  
  try {
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
  } catch (error) {
    console.error('Error searching users:', error)
    return NextResponse.json(
      { error: 'Something went wrong' },
      { status: 500, headers: corsHeaders }
    )
  }
} 