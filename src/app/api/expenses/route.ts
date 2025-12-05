import { NextResponse } from 'next/server'
import { corsMiddleware } from '@/lib/cors'
import prisma from '@/lib/db'
import type { NextRequest } from 'next/server'
import { getAuthUser, unauthorizedResponse, forbiddenResponse } from '@/lib/auth'

export async function GET(request: NextRequest) {
  // Apply CORS headers
  const corsHeaders = corsMiddleware(request)

  try {
    // Verify authentication
    const authUser = await getAuthUser(request)

    const { searchParams } = new URL(request.url)
    const groupId = searchParams.get('groupId')

    if (!groupId) {
      return NextResponse.json(
        { error: 'Group ID is required' },
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

    // Get all expenses for the group
    const expenses = await prisma.expense.findMany({
      where: {
        groupId
      },
      include: {
        paidBy: {
          select: {
            id: true,
            name: true
          }
        },
        shares: {
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
        date: 'desc'
      }
    })

    // Format the response
    const formattedExpenses = expenses.map(expense => ({
      id: expense.id,
      title: expense.title,
      date: expense.date.toISOString().split('T')[0],
      category: expense.category,
      totalAmount: expense.amount,
      paidBy: {
        id: expense.paidBy.id,
        name: expense.paidBy.name
      },
      shares: expense.shares.map(share => ({
        memberId: share.user.id,
        name: share.user.name,
        amount: share.amount,
        isPayer: share.user.id === expense.paidBy.id
      }))
    }))

    return NextResponse.json(formattedExpenses, { headers: corsHeaders })
  } catch (error: any) {
    console.error('Error fetching expenses:', error)

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

export async function POST(request: NextRequest) {
  // Apply CORS headers
  const corsHeaders = corsMiddleware(request)

  try {
    // Verify authentication
    const authUser = await getAuthUser(request)

    const { title, amount, category, groupId, paidById, shares } = await request.json()

    // Validate input
    if (!title || !amount || !category || !groupId || !paidById || !shares || shares.length === 0) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400, headers: corsHeaders }
      )
    }

    // Verify that the group exists and user is a member
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

    // Verify user is a member of the group
    const isMember = group.members.some(member => member.userId === authUser.id)
    if (!isMember) {
      return forbiddenResponse('You are not a member of this group')
    }

    // Verify that the payer is a member of the group
    const payerIsMember = await prisma.groupMember.findFirst({
      where: {
        groupId,
        userId: paidById
      }
    })

    if (!payerIsMember) {
      return NextResponse.json(
        { error: 'Payer must be a member of the group' },
        { status: 400, headers: corsHeaders }
      )
    }

    // Verify that all users in shares are members of the group
    const userIds = shares.map((share: { userId: string }) => share.userId)

    const groupMembers = await prisma.groupMember.findMany({
      where: {
        groupId,
        userId: { in: userIds }
      }
    })

    if (groupMembers.length !== userIds.length) {
      return NextResponse.json(
        { error: 'All users must be members of the group' },
        { status: 400, headers: corsHeaders }
      )
    }

    // Create expense with shares
    const expense = await prisma.expense.create({
      data: {
        title,
        amount: parseFloat(amount.toString()),
        category,
        groupId,
        paidById,
        shares: {
          create: shares.map((share: { userId: string, amount: number }) => ({
            userId: share.userId,
            amount: parseFloat(share.amount.toString())
          }))
        }
      },
      include: {
        paidBy: true,
        shares: {
          include: {
            user: true
          }
        }
      }
    })

    return NextResponse.json(
      { message: 'Expense created successfully', expense },
      { status: 201, headers: corsHeaders }
    )
  } catch (error: any) {
    console.error('Error creating expense:', error)

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