'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { FaChartPie, FaExchangeAlt, FaArrowRight } from 'react-icons/fa'
import Header from '@/components/Header'
import { useApiAuth } from '@/hooks/useApiAuth'
import { auth } from '@/lib/firebase.config'
import { signOut, onAuthStateChanged } from 'firebase/auth'
import { formatCurrency, formatWithCommas } from '@/lib/currency.lib'

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
  currentUserExpenses: number
  settlements: Settlement[]
  categoryBreakdown: CategoryExpense[]
}

export default function SummaryPage() {
  const params = useParams()
  const router = useRouter()
  const roomId = params.id as string
  const { authenticatedFetch } = useApiAuth()

  const [summary, setSummary] = useState<SummaryData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [currentUser, setCurrentUser] = useState<{ id: string; name: string } | null>(null)
  const [firebaseReady, setFirebaseReady] = useState(false)

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        setFirebaseReady(true)
        const userData = localStorage.getItem('user')
        if (userData) {
          setCurrentUser(JSON.parse(userData))
        }
      } else {
        router.push('/login')
      }
    })
    return () => unsubscribe()
  }, [router])

  useEffect(() => {
    if (!firebaseReady) return

    const fetchSummary = async () => {
      try {
        setIsLoading(true)
        const response = await authenticatedFetch(`/api/groups/${roomId}/summary`)

        if (response.status === 401) {
          await signOut(auth)
          localStorage.removeItem('user')
          router.push('/login')
          return
        }

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
  }, [roomId, firebaseReady, authenticatedFetch, router])

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 transition-colors">
      <Header
        title="Trip Summary"
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
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 px-4 sm:px-6">
              <h2 className="text-xl font-medium text-gray-900 dark:text-white mb-2">Total Expenses</h2>
              <p className="text-3xl font-bold text-gray-900 dark:text-white break-all">
                ₹{formatWithCommas(summary.totalExpenses)}
              </p>
            </div>

            {/* Current User Expenses */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 px-4 sm:px-6">
              <h2 className="text-xl font-medium text-gray-900 dark:text-white mb-2">Your Expenses</h2>
              <p className="text-3xl font-bold text-blue-600 dark:text-blue-400 break-all">
                ₹{formatWithCommas(summary.currentUserExpenses)}
              </p>
            </div>

            {/* Category Breakdown */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 px-4 sm:px-6">
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
                        <span className="text-sm font-medium text-gray-900 dark:text-white break-all">
                          ₹{formatCurrency(category.amount)} ({category.percentage.toFixed(1)}%)
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
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 px-4 sm:px-6">
              <div className="flex items-center mb-4">
                <FaExchangeAlt className="text-purple-500 mr-2" />
                <h2 className="text-xl font-medium text-gray-900 dark:text-white">Settlements</h2>
              </div>

              {summary.settlements && summary.settlements.length > 0 ? (
                <div className="space-y-4">
                  {summary.settlements.map((settlement, index) => (
                    <div key={index} className="p-3 py-4 rounded-lg bg-gray-50 dark:bg-gray-700">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center w-[calc(50%-6px)]">
                          <div className="mr-1">
                            <div className="w-6 h-6 rounded-full bg-red-500 text-white flex items-center justify-center text-sm font-medium">
                              {settlement.from.name.charAt(0).toUpperCase()}
                            </div>
                          </div>
                          <p className="text-xs font-medium text-gray-900 dark:text-white">
                            {currentUser && settlement.from.id === currentUser.id ? 'You' : settlement.from.name.split(" ")[0]}
                          </p>
                        </div>

                        <FaArrowRight className="text-gray-500 dark:text-gray-400 mb-1 w-3 h-3" />


                        <div className="flex items-center justify-end w-[calc(50%-6px)]">
                          <div className="mr-1 text-right flex-1">
                            <p className="text-xs font-medium text-gray-900 dark:text-white">
                              {currentUser && settlement.to.id === currentUser.id ? 'You' : settlement.to.name.split(" ")[0]}
                            </p>
                          </div>
                          <div className="w-6 h-6 rounded-full bg-green-500 text-white flex items-center justify-center text-sm font-medium">
                            {settlement.to.name.charAt(0).toUpperCase()}
                          </div>
                        </div>
                      </div>
                      <p className="mt-2 px-6 text-sm font-medium text-gray-900 dark:text-white break-all">
                        ₹{formatWithCommas(settlement.amount)}
                      </p>
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