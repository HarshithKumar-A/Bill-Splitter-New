'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { FaChartPie, FaExchangeAlt, FaArrowRight } from 'react-icons/fa'
import Header from '@/components/Header'

interface Settlement {
  from: {
    id: string
    name: string
  }
  to: {
    id: string
    name: string
  }
  amount: number
}

interface CategoryExpense {
  category: string
  amount: number
  percentage: number
}

interface SummaryData {
  totalExpenses: number
  settlements: Settlement[]
  categoryBreakdown: CategoryExpense[]
}

export default function SummaryPage() {
  const params = useParams()
  const roomId = params.id as string
  
  const [summary, setSummary] = useState<SummaryData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [currentUser, setCurrentUser] = useState<{ id: string; name: string } | null>(null)
  
  useEffect(() => {
    // Get current user from localStorage
    const userData = localStorage.getItem('user')
    if (userData) {
      setCurrentUser(JSON.parse(userData))
    }
  }, [])
  
  useEffect(() => {
    const fetchSummary = async () => {
      try {
        setIsLoading(true)
        const response = await fetch(`/api/groups/${roomId}/summary`)
        
        if (!response.ok) {
          throw new Error('Failed to fetch summary')
        }
        
        const data = await response.json()
        setSummary(data)
      } catch (error) {
        console.error('Error fetching summary:', error)
        setError('Failed to load summary. Please try again.')
      } finally {
        setIsLoading(false)
      }
    }
    
    fetchSummary()
  }, [roomId])
  
  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 transition-colors">
      <Header 
        title="Expense Summary" 
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
            <p className="text-gray-500 dark:text-gray-400">Loading summary...</p>
          </div>
        ) : summary ? (
          <div className="space-y-6">
            {/* Total Expenses */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <h2 className="text-xl font-medium text-gray-900 dark:text-white mb-2">Total Expenses</h2>
              <p className="text-3xl font-bold text-gray-900 dark:text-white">
                ₹{summary.totalExpenses.toFixed(2)}
              </p>
            </div>
            
            {/* Category Breakdown */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <div className="flex items-center mb-4">
                <FaChartPie className="text-blue-500 mr-2" />
                <h2 className="text-xl font-medium text-gray-900 dark:text-white">Category Breakdown</h2>
              </div>
              
              {summary.categoryBreakdown && summary.categoryBreakdown.length > 0 ? (
                <div className="space-y-4">
                  {summary.categoryBreakdown.map((category, index) => (
                    <div key={index}>
                      <div className="flex justify-between mb-1">
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                          {category.category}
                        </span>
                        <span className="text-sm font-medium text-gray-900 dark:text-white">
                          ₹{category.amount.toFixed(2)} ({category.percentage.toFixed(1)}%)
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5">
                        <div 
                          className="bg-blue-600 h-2.5 rounded-full" 
                          style={{ width: `${Math.min(100, category.percentage)}%` }}
                        ></div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 dark:text-gray-400">No expense data available.</p>
              )}
            </div>
            
            {/* Settlements */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <div className="flex items-center mb-4">
                <FaExchangeAlt className="text-purple-500 mr-2" />
                <h2 className="text-xl font-medium text-gray-900 dark:text-white">Settlements</h2>
              </div>
              
              {summary.settlements && summary.settlements.length > 0 ? (
                <div className="space-y-4">
                  {summary.settlements.map((settlement, index) => (
                    <div key={index} className="p-4 rounded-lg bg-gray-50 dark:bg-gray-700">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center">
                          <div className="w-10 h-10 rounded-full bg-red-500 text-white flex items-center justify-center text-sm font-medium">
                            {settlement.from.name.charAt(0).toUpperCase()}
                          </div>
                          <div className="ml-3">
                            <p className="text-sm font-medium text-gray-900 dark:text-white">
                              {settlement.from.name} {currentUser && settlement.from.id === currentUser.id ? '(You)' : ''}
                            </p>
                          </div>
                        </div>
                        
                        <div className="flex flex-col items-center mx-2">
                          <FaArrowRight className="text-gray-500 dark:text-gray-400 mb-1" />
                          <span className="text-sm font-bold text-gray-900 dark:text-white">
                            ₹{settlement.amount.toFixed(2)}
                          </span>
                        </div>
                        
                        <div className="flex items-center">
                          <div className="mr-3 text-right">
                            <p className="text-sm font-medium text-gray-900 dark:text-white">
                              {settlement.to.name} {currentUser && settlement.to.id === currentUser.id ? '(You)' : ''}
                            </p>
                          </div>
                          <div className="w-10 h-10 rounded-full bg-green-500 text-white flex items-center justify-center text-sm font-medium">
                            {settlement.to.name.charAt(0).toUpperCase()}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 dark:text-gray-400">No settlements needed. Everyone is even!</p>
              )}
            </div>
          </div>
        ) : (
          <div className="text-center py-10 bg-white dark:bg-gray-800 rounded-lg shadow">
            <p className="text-gray-500 dark:text-gray-400">No summary data available.</p>
          </div>
        )}
      </main>
    </div>
  )
} 