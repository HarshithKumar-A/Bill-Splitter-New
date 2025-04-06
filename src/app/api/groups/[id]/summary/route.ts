import { NextResponse } from 'next/server'
import { corsMiddleware } from '@/lib/cors'
import prisma from '@/lib/db'
import type { NextRequest } from 'next/server'
import { Expense } from '@prisma/client'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  // Apply CORS headers
  const corsHeaders = corsMiddleware(request)
  
  try {
    const groupId = params.id
    
    if (!groupId) {
      return NextResponse.json(
        { error: 'Group ID is required' },
        { status: 400, headers: corsHeaders }
      )
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
      }
    })

    // Get all members of the group
    const groupMembers = await prisma.groupMember.findMany({
      where: {
        groupId
      },
      include: {
        user: {
          select: {
            id: true,
            name: true
          }
        }
      }
    })
    
    // Calculate total expenses
    const totalExpenses = expenses.reduce((sum, expense) => sum + expense.amount, 0)
    
    // Calculate settlements
    const settlements = calculateSettlement(groupMembers, expenses)
    
    // Calculate category breakdown
    const categoryBreakdown = calculateCategoryBreakdown(expenses, totalExpenses)
    
    return NextResponse.json(
      {
        totalExpenses,
        settlements,
        categoryBreakdown
      },
      { status: 200, headers: corsHeaders }
    )
  } catch (error) {
    console.error('Error fetching group summary:', error)
    return NextResponse.json(
      { error: 'Something went wrong' },
      { status: 500, headers: corsHeaders }
    )
  }
}

// Helper function to calculate settlements
function calculateSettlement(users: any[], expenses: any[]) {
  let balances: Record<string, { id: string; name: string; balance: number }> = {};
  
  // Initialize user balances
  users.forEach(user => {
    balances[user.userId] = { id: user.userId, name: user.user.name, balance: 0 };
  });
  
  // Compute payments and debts
  expenses.forEach(expense => {
    const paidBy = expense.paidBy;
    balances[paidBy.id].name = paidBy.name;
    balances[paidBy.id].balance += expense.amount;
    
    expense.shares.forEach((share: any) => {
      balances[share.user.id].name = share.user.name;
      balances[share.user.id].balance -= share.amount;
    });
  });
  
  // Convert balances to arrays
  let debtors: { id: string; name: string; balance: number }[] = [];
  let creditors: { id: string; name: string; balance: number }[] = [];
  
  Object.values(balances).forEach(user => {
    if (user.balance < -0.01) {
      debtors.push(user);
    } else if (user.balance > 0.01) {
      creditors.push(user);
    }
  });
  
  // Settlement logic
  let settlements: { from: { id: string; name: string }; to: { id: string; name: string }; amount: number }[] = [];
  
  debtors.sort((a, b) => a.balance - b.balance);
  creditors.sort((a, b) => b.balance - a.balance);
  
  let i = 0, j = 0;
  while (i < debtors.length && j < creditors.length) {
    let debtor = debtors[i];
    let creditor = creditors[j];
    
    let amount = Math.min(-debtor.balance, creditor.balance);
    
    settlements.push({
      from: { id: debtor.id, name: debtor.name },
      to: { id: creditor.id, name: creditor.name },
      amount: parseFloat(amount.toFixed(2))
    });
    
    debtor.balance += amount;
    creditor.balance -= amount;
    
    if (Math.abs(debtor.balance) < 0.01) i++;
    if (Math.abs(creditor.balance) < 0.01) j++;
  }
  
  return settlements;
}

// Helper function to calculate category breakdown
function calculateCategoryBreakdown(expenses: Expense[], totalExpenses: number) {
  // Group expenses by category
  const categoryMap: Record<string, number> = {}
  
  expenses.forEach(expense => {
    const category = expense.category || 'Other'
    
    if (!categoryMap[category]) {
      categoryMap[category] = 0
    }
    
    categoryMap[category] += expense.amount
  })
  
  // Convert to array and calculate percentages
  const categoryBreakdown = Object.entries(categoryMap).map(([category, amount]) => ({
    category,
    amount,
    percentage: totalExpenses > 0 ? (amount / totalExpenses) * 100 : 0
  }))
  
  // Sort by amount (descending)
  categoryBreakdown.sort((a, b) => b.amount - a.amount)
  
  return categoryBreakdown
} 