import { NextResponse } from 'next/server'
import { corsMiddleware } from '@/lib/cors'
import prisma from '@/lib/db'
import type { NextRequest } from 'next/server'

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  // Apply CORS headers
  const corsHeaders = corsMiddleware(request)
  
  try {
    const expenseId = params.id
    
    if (!expenseId) {
      return NextResponse.json(
        { error: 'Expense ID is required' },
        { status: 400, headers: corsHeaders }
      )
    }
    
    // Check if the expense exists
    const expense = await prisma.expense.findUnique({
      where: { id: expenseId }
    })
    
    if (!expense) {
      return NextResponse.json(
        { error: 'Expense not found' },
        { status: 404, headers: corsHeaders }
      )
    }
    
    // Delete the expense shares first (due to foreign key constraints)
    await prisma.expenseShare.deleteMany({
      where: { expenseId }
    })
    
    // Then delete the expense
    await prisma.expense.delete({
      where: { id: expenseId }
    })
    
    return NextResponse.json(
      { message: 'Expense deleted successfully' },
      { status: 200, headers: corsHeaders }
    )
  } catch (error) {
    console.error('Error deleting expense:', error)
    return NextResponse.json(
      { error: 'Something went wrong' },
      { status: 500, headers: corsHeaders }
    )
  }
} 