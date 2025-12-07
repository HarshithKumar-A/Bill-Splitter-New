import { NextResponse } from 'next/server'
import { corsMiddleware } from '@/lib/cors'
import prisma from '@/lib/db'
import type { NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
    // Apply CORS headers
    const corsHeaders = corsMiddleware(request)

    try {
        const { searchParams } = new URL(request.url)
        const token = searchParams.get('token') || request.headers.get('Authorization')?.replace('Bearer ', '')
        const groupId = searchParams.get('groupId')

        // 1. Verify Token
        if (token !== process.env.NEXT_EXT_TOKEN) {
            return NextResponse.json(
                { error: 'Unauthorized: Invalid token' },
                { status: 401, headers: corsHeaders }
            )
        }

        // 2. Validate Group ID
        if (!groupId) {
            return NextResponse.json(
                { error: 'Group ID is required' },
                { status: 400, headers: corsHeaders }
            )
        }

        // 3. Fetch Expenses
        const expenses = await prisma.expense.findMany({
            where: {
                groupId
            },
            include: {
                paidBy: {
                    select: {
                        name: true
                    }
                },
                shares: {
                    include: {
                        user: {
                            select: {
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

        // 4. Format Response
        const formattedExpenses = expenses.map(expense => ({
            description: expense.title,
            total: expense.amount,
            paid: expense.paidByTheirOwn ? 'Their Own' : expense.paidBy.name,
            category: expense.category,
            splitAmount: expense.amount,
            shares: expense.shares.map(share => ({
                name: share.user.name,
                amount: share.amount
            })),
            date: expense.date.toISOString().split('T')[0]
        }))

        return NextResponse.json(formattedExpenses, { headers: corsHeaders })

    } catch (error: any) {
        console.error('Error fetching external expenses:', error)
        return NextResponse.json(
            { error: 'Something went wrong' },
            { status: 500, headers: corsHeaders }
        )
    }
}

export async function OPTIONS(request: NextRequest) {
    return NextResponse.json({}, { headers: corsMiddleware(request) })
}
