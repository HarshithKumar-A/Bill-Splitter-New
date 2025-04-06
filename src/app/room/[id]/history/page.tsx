'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { format } from 'date-fns'
import { FaTrash } from 'react-icons/fa'
import Header from '@/components/Header'

interface Expense {
  id: string
  title: string
  date: string
  category: string
  totalAmount: number
  paidBy: {
    id: string
    name: string
  }
  shares: {
    memberId: string
    name: string
    amount: number
    isPayer: boolean
  }[]
}

export default function HistoryPage() {
  const params = useParams()
  const roomId = params.id as string
  
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [isDeleting, setIsDeleting] = useState<string | null>(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null)
  
  useEffect(() => {
    fetchExpenses()
  }, [roomId])
  
  const fetchExpenses = async () => {
    try {
      setIsLoading(true)
      const response = await fetch(`/api/expenses?groupId=${roomId}`)
      
      if (!response.ok) {
        throw new Error('Failed to fetch expenses')
      }
      
      const data = await response.json()
      setExpenses(data)
    } catch (error) {
      console.error('Error fetching expenses:', error)
      setError('Failed to load expense history. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }
  
  // Group expenses by month
  const groupExpensesByMonth = () => {
    const grouped: Record<string, Expense[]> = {}
    
    expenses.forEach(expense => {
      const date = new Date(expense.date)
      const monthYear = format(date, 'MMMM yyyy')
      
      if (!grouped[monthYear]) {
        grouped[monthYear] = []
      }
      
      grouped[monthYear].push(expense)
    })
    
    // Sort expenses within each month by date (newest first)
    Object.keys(grouped).forEach(month => {
      grouped[month].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    })
    
    return grouped
  }
  
  const handleDeleteClick = (expenseId: string) => {
    setShowDeleteConfirm(expenseId)
  }
  
  const handleCancelDelete = () => {
    setShowDeleteConfirm(null)
  }
  
  const handleConfirmDelete = async (expenseId: string) => {
    try {
      setIsDeleting(expenseId)
      
      const response = await fetch(`/api/expenses/${expenseId}`, {
        method: 'DELETE',
      })
      
      if (!response.ok) {
        throw new Error('Failed to delete expense')
      }
      
      // Remove the expense from the state
      setExpenses(prevExpenses => prevExpenses.filter(expense => expense.id !== expenseId))
      setShowDeleteConfirm(null)
    } catch (error) {
      console.error('Error deleting expense:', error)
      setError('Failed to delete expense. Please try again.')
    } finally {
      setIsDeleting(null)
    }
  }
  
  const groupedExpenses = groupExpensesByMonth()
  
  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 transition-colors">
      <Header 
        title="Expense History" 
        showBackButton={true} 
        backUrl={`/room/${roomId}`}
      />
      
      <main className="max-w-3xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
        {error && (
          <div className="mb-6 p-3 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700 rounded-md">
            <p className="text-sm text-red-700 dark:text-red-200">{error}</p>
          </div>
        )}
        
        {isLoading ? (
          <div className="text-center py-10">
            <p className="text-gray-500 dark:text-gray-400">Loading expense history...</p>
          </div>
        ) : expenses.length === 0 ? (
          <div className="text-center py-10 bg-white dark:bg-gray-800 rounded-lg shadow">
            <p className="text-gray-500 dark:text-gray-400">No expenses found for this room.</p>
          </div>
        ) : (
          <div className="space-y-8">
            {Object.entries(groupedExpenses).map(([monthYear, monthExpenses]) => (
              <div key={monthYear}>
                <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-4">{monthYear}</h2>
                <div className="space-y-4">
                  {monthExpenses.map(expense => (
                    <div key={expense.id} className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
                      <div className="p-4">
                        <div className="flex justify-between items-start">
                          <div>
                            <h3 className="font-medium text-gray-900 dark:text-white">{expense.title}</h3>
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                              {new Date(expense.date).toLocaleDateString()} • {expense.category}
                            </p>
                            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                              Paid by {expense.paidBy.name}
                            </p>
                          </div>
                          <div className="flex items-center">
                            <p className="font-bold text-gray-900 dark:text-white mr-4">
                              ₹{expense.totalAmount.toFixed(2)}
                            </p>
                            <button 
                              onClick={() => handleDeleteClick(expense.id)}
                              className="p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-full"
                              aria-label="Delete expense"
                            >
                              <FaTrash />
                            </button>
                          </div>
                        </div>
                        
                        <div className="mt-4 border-t border-gray-200 dark:border-gray-700 pt-4">
                          <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Split Details</h4>
                          <ul className="space-y-1">
                            {expense.shares.map(share => (
                              <li key={share.memberId} className="flex justify-between text-sm">
                                <span className="text-gray-600 dark:text-gray-400">{share.name}</span>
                                <span className={`${share.isPayer ? 'text-green-600 dark:text-green-400' : 'text-gray-900 dark:text-white'}`}>
                                  {share.isPayer ? '+' : '-'}₹{share.amount.toFixed(2)}
                                </span>
                              </li>
                            ))}
                          </ul>
                        </div>
                        
                        {/* Delete Confirmation */}
                        {showDeleteConfirm === expense.id && (
                          <div className="mt-4 border-t border-gray-200 dark:border-gray-700 pt-4">
                            <p className="text-sm text-gray-700 dark:text-gray-300 mb-3">
                              Are you sure you want to delete this expense? This action cannot be undone.
                            </p>
                            <div className="flex space-x-3">
                              <button
                                onClick={handleCancelDelete}
                                className="px-3 py-1 text-sm text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded"
                              >
                                Cancel
                              </button>
                              <button
                                onClick={() => handleConfirmDelete(expense.id)}
                                disabled={isDeleting === expense.id}
                                className="px-3 py-1 text-sm text-white bg-red-600 hover:bg-red-700 disabled:bg-red-400 dark:disabled:bg-red-800 rounded flex items-center"
                              >
                                {isDeleting === expense.id ? 'Deleting...' : 'Delete'}
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  )
} 