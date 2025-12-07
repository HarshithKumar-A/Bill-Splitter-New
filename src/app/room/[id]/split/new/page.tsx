'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { FaArrowLeft } from 'react-icons/fa'
import { User } from '@prisma/client'
import Header from '@/components/Header'
import { useApiAuth } from '@/hooks/useApiAuth'
import { auth } from '@/lib/firebase.config'
import { signOut, onAuthStateChanged } from 'firebase/auth'

// Travel-specific expense categories
const expenseCategories = [
  { id: 'accommodation', name: '🏨 Accommodation', icon: '🏨' },
  { id: 'transportation', name: '✈️ Transportation', icon: '✈️' },
  { id: 'food', name: '🍽️ Food & Dining', icon: '🍽️' },
  { id: 'activities', name: '🎫 Activities & Entertainment', icon: '🎫' },
  { id: 'shopping', name: '🛍️ Shopping & Souvenirs', icon: '🛍️' },
  { id: 'medical', name: '🏥 Medical/Emergency', icon: '🏥' },
  { id: 'communication', name: '📱 Communication', icon: '📱' },
  { id: 'gear', name: '🎒 Gear & Equipment', icon: '🎒' },
  { id: 'other', name: '💰 Miscellaneous', icon: '💰' }
]

interface MemberShare {
  memberId: string;
  name: string;
  amount: string;
  isIncluded: boolean;
  userEntered: boolean;
}

export default function NewSplitPage() {
  const params = useParams()
  const router = useRouter()
  const roomId = params.id as string
  const { authenticatedFetch } = useApiAuth()

  // Form state
  const [title, setTitle] = useState('')
  const [totalAmount, setTotalAmount] = useState('')
  const [category, setCategory] = useState('')
  const [paidBy, setPaidBy] = useState('')
  const [autoSplit, setAutoSplit] = useState(true)
  const [memberShares, setMemberShares] = useState<MemberShare[]>([])
  const [validationError, setValidationError] = useState('')
  const [ignoreTotalError, setIgnoreTotalError] = useState(false)
  const [totalError, setTotalError] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [users, setUsers] = useState<User[]>([])
  const [currentUser, setCurrentUser] = useState<{ id: string } | null>(null)
  const [firebaseReady, setFirebaseReady] = useState(false)

  // Wait for Firebase auth to initialize
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
    if (!currentUser || !firebaseReady) return

    const fetchGroupMembers = async () => {
      try {
        setIsLoading(true)
        const response = await authenticatedFetch(`/api/groups/${roomId}`)

        if (response.status === 401) {
          await signOut(auth)
          localStorage.removeItem('user')
          router.push('/login')
          return
        }

        if (!response.ok) {
          throw new Error('Failed to fetch group members')
        }

        const data = await response.json()

        // Initialize member shares
        const initialMemberShares = data.members.map((member: { id: string, name: string }) => ({
          memberId: member.id,
          name: member.name,
          amount: '',
          isIncluded: true,
          userEntered: false
        }))

        setMemberShares(initialMemberShares)
        setUsers(data.members)

        // Set default paidBy to current user if they're a member
        if (data.members.some((member: { id: string }) => member.id === currentUser.id)) {
          setPaidBy(currentUser.id)
        } else if (data.members.length > 0) {
          setPaidBy(data.members[0].id)
        }

      } catch (error) {
        console.error('Error fetching group members:', error)
        setValidationError('Failed to load group members')
      } finally {
        setIsLoading(false)
      }
    }

    fetchGroupMembers()
  }, [roomId, currentUser, firebaseReady, authenticatedFetch, router])

  // Handle total amount change and auto-split
  const handleTotalAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newAmount = e.target.value
    setTotalAmount(newAmount)

    if (autoSplit) {
      updateAutoSplitAmounts(newAmount)
    }
  }

  // Update auto-split amounts based on total and included members
  const updateAutoSplitAmounts = (amount: string) => {
    if (!amount) {
      setMemberShares(prev => prev.map(share => ({
        ...share,
        amount: ''
      })))
      return
    }

    const totalValue = parseFloat(amount)
    if (isNaN(totalValue)) return

    const includedMembers = memberShares.filter(member => member.isIncluded)
    if (includedMembers.length === 0) return

    const amountPerPerson = (totalValue / includedMembers.length).toFixed(2)

    setMemberShares(prev => prev.map(share => ({
      ...share,
      amount: share.isIncluded ? amountPerPerson : '0.00',
      userEntered: false // Reset userEntered flag when auto-splitting
    })))
  }

  // Toggle auto-split feature
  const handleAutoSplitToggle = () => {
    const newAutoSplit = !autoSplit
    setAutoSplit(newAutoSplit)

    if (newAutoSplit && totalAmount) {
      updateAutoSplitAmounts(totalAmount)
    }
  }

  // Handle member inclusion toggle
  const handleMemberInclusionToggle = (memberId: string) => {
    const updatedShares = memberShares.map(share =>
      share.memberId === memberId
        ? { ...share, isIncluded: !share.isIncluded, amount: !share.isIncluded ? '' : share.amount }
        : share
    )

    setMemberShares(updatedShares)

    // Recalculate auto-split if enabled
    if (autoSplit && totalAmount) {
      const includedMembers = updatedShares.filter(member => member.isIncluded)
      if (includedMembers.length > 0) {
        const totalValue = parseFloat(totalAmount)
        if (!isNaN(totalValue)) {
          const amountPerPerson = (totalValue / includedMembers.length).toFixed(2)

          setMemberShares(updatedShares.map(share => ({
            ...share,
            amount: share.isIncluded ? amountPerPerson : '0.00',
            userEntered: false // Reset userEntered flag when auto-splitting
          })))
        }
      }
    }
  }

  // Handle individual share amount change
  const handleShareAmountChange = (memberId: string, amount: string) => {
    // Update the specific member's share
    const updatedShares = memberShares.map(share =>
      share.memberId === memberId
        ? { ...share, amount, userEntered: true }
        : share
    )

    setMemberShares(updatedShares)

    // If auto-split is enabled, redistribute the remaining amount among other included members
    if (autoSplit && totalAmount) {
      const totalValue = parseFloat(totalAmount)
      if (isNaN(totalValue)) return

      // Get all included members except the one being manually edited
      const otherIncludedMembers = updatedShares.filter(
        share => share.isIncluded && share.memberId !== memberId
      )

      if (otherIncludedMembers.length > 0) {
        // Calculate total of user-entered amounts
        const userEnteredTotal = updatedShares
          .filter(share => share.userEntered && share.isIncluded)
          .reduce((sum, share) => sum + (parseFloat(share.amount) || 0), 0)

        // Calculate remaining amount to distribute
        const remainingAmount = totalValue - userEnteredTotal

        // Count non-user-entered members
        const nonUserEnteredMembers = updatedShares.filter(
          share => !share.userEntered && share.isIncluded
        )

        if (nonUserEnteredMembers.length > 0 && remainingAmount > 0) {
          // Distribute remaining amount evenly
          const amountPerPerson = (remainingAmount / nonUserEnteredMembers.length).toFixed(2)

          setMemberShares(updatedShares.map(share =>
            share.isIncluded && !share.userEntered
              ? { ...share, amount: amountPerPerson }
              : share
          ))
        }
      }
    }

    console.log(memberShares)

    // Check if total matches
    validateTotalAmount(memberShares)
  }

  // Validate that individual shares sum up to total amount
  const validateTotalAmount = (shares = memberShares) => {
    if (!totalAmount || !autoSplit) {
      setTotalError(false)
      return
    }

    const totalValue = parseFloat(totalAmount)
    if (isNaN(totalValue)) return

    const sharesTotal = shares
      .filter(share => share.isIncluded)
      .reduce((sum, share) => sum + (parseFloat(share.amount) || 0), 0)

    // Allow for small floating point differences (less than 1 cent)
    const difference = Math.abs(totalValue - sharesTotal)
    console.log(totalValue, sharesTotal, difference)
    setTotalError(difference > 0.01)
  }

  // Validate form before submission
  const validateForm = () => {
    setValidationError('')
    setTotalError(false)

    if (!title.trim()) {
      setValidationError('Please enter an expense title')
      return false
    }

    if (!totalAmount || parseFloat(totalAmount) <= 0) {
      setValidationError('Please enter a valid total amount')
      return false
    }

    if (!category) {
      setValidationError('Please select a category')
      return false
    }

    if (!paidBy) {
      setValidationError('Please select who paid')
      return false
    }

    const includedMembers = memberShares.filter(m => m.isIncluded)
    if (includedMembers.length === 0) {
      setValidationError('Please include at least one member in the split')
      return false
    }

    // Check if all included members have valid amounts
    const invalidShares = includedMembers.filter(m => !m.amount || parseFloat(m.amount) < 0)
    if (invalidShares.length > 0) {
      setValidationError('All included members must have valid amounts')
      return false
    }

    // Verify that the sum of shares equals the total amount
    const sharesTotal = includedMembers.reduce((sum, m) => sum + parseFloat(m.amount || '0'), 0)
    const total = parseFloat(totalAmount)

    // Allow for small floating point differences (less than 1 cent)
    if (Math.abs(sharesTotal - total) > 0.01) {
      setTotalError(true)
      if (!ignoreTotalError) {
        setValidationError(`The sum of individual shares (₹${sharesTotal.toFixed(2)}) doesn't match the total amount (₹${total.toFixed(2)})`)
        return false
      }
    }

    return true
  }

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) {
      return
    }

    try {
      setIsSaving(true)

      const includedMembers = memberShares.filter(m => m.isIncluded)

      // Check if "Their Own" is selected
      const isTheirOwn = paidBy === 'THEIR_OWN'

      const expenseData = {
        title,
        amount: parseFloat(totalAmount),
        category,
        groupId: roomId,
        paidById: isTheirOwn ? currentUser!.id : paidBy, // Use current user ID when "Their Own" is selected
        paidByTheirOwn: isTheirOwn,
        shares: includedMembers.map(member => ({
          userId: member.memberId,
          amount: parseFloat(member.amount)
        }))
      }

      const response = await authenticatedFetch('/api/expenses', {
        method: 'POST',
        body: JSON.stringify(expenseData)
      })

      if (response.status === 401) {
        await signOut(auth)
        localStorage.removeItem('user')
        router.push('/login')
        return
      }

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to create expense')
      }

      // Redirect to room page on success
      router.push(`/room/${roomId}`)

    } catch (error) {
      console.error('Error creating expense:', error)
      setValidationError('Failed to create expense. Please try again.')
    } finally {
      setIsSaving(false)
    }
  }

  // Save as draft (to localStorage)
  const handleSaveAsDraft = (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) {
      return
    }

    try {
      setIsSaving(true)

      const includedMembers = memberShares.filter(m => m.isIncluded)

      // Check if "Their Own" is selected
      const isTheirOwn = paidBy === 'THEIR_OWN'

      const draftExpense = {
        id: Math.random().toString(), // Generate a unique ID for the draft
        title,
        amount: parseFloat(totalAmount),
        category,
        groupId: roomId,
        paidById: isTheirOwn ? currentUser!.id : paidBy,
        paidByName: isTheirOwn ? 'Their Own' : (memberShares.find(m => m.memberId === paidBy)?.name || 'Unknown'),
        paidByTheirOwn: isTheirOwn,
        date: new Date().toISOString(),
        shares: includedMembers.map(member => ({
          userId: member.memberId,
          name: member.name,
          amount: parseFloat(member.amount)
        }))
      }

      // Get existing drafts from localStorage
      const existingDrafts = JSON.parse(localStorage.getItem('unpublished_items') || '[]')

      // Add new draft to the array
      const updatedDrafts = [...existingDrafts, draftExpense]

      // Save back to localStorage
      localStorage.setItem('unpublished_items', JSON.stringify(updatedDrafts))

      router.push(`/room/${roomId}`)

    } catch (error) {
      console.error('Error saving draft:', error)
      setValidationError('Failed to save draft. Please try again.')
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-500 mb-2">Loading...</p>
          <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 transition-colors">
      <Header
        title="Create New Split"
        showBackButton={true}
        backUrl={`/room/${roomId}`}
      />

      <main className="max-w-3xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
          <form onSubmit={handleSubmit}>
            {/* Title/Description */}
            <div className="mb-6">
              <label htmlFor="title" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Title/Description
              </label>
              <input
                id="title"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g., Dinner at Restaurant"
                required
              />
            </div>

            {/* Total Amount */}
            <div className="mb-6">
              <label htmlFor="totalAmount" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Total Amount (₹) (Max 6 digits)
              </label>
              <input
                id="totalAmount"
                type="number"
                min="0"
                step="0.01"
                value={totalAmount}
                onChange={handleTotalAmountChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="0.00"
                required
                maxLength={6}
              />
            </div>

            {/* Category */}
            <div className="mb-6">
              <label htmlFor="category" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Category
              </label>
              <select
                id="category"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              >
                <option value="">Select a category</option>
                {expenseCategories.map(cat => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
              </select>
            </div>

            {/* Paid By */}
            <div className="mb-6">
              <label htmlFor="paidBy" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Paid By
              </label>
              <select
                id="paidBy"
                value={paidBy}
                onChange={(e) => setPaidBy(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              >
                <option value="">Select who paid</option>
                <option value="THEIR_OWN">Their Own (Everyone paid for themselves)</option>
                {users.map(user => (
                  <option key={user.id} value={user.id}>{user.name}</option>
                ))}
              </select>
            </div>

            {/* Auto Split Toggle */}
            <div className="flex items-center mb-6">
              <input
                id="autoSplit"
                type="checkbox"
                checked={autoSplit}
                onChange={handleAutoSplitToggle}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label htmlFor="autoSplit" className="ml-2 block text-sm text-gray-700 dark:text-gray-300">
                Auto-split amount evenly among included members
              </label>
            </div>

            {/* Member Shares */}
            <div className="mb-6">
              <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Individual Shares</h3>

              {totalError && (
                <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                  <p className="text-sm text-yellow-700">
                    Warning: Individual shares don't add up to the total amount.
                  </p>
                  <div className="mt-2 flex items-center">
                    <input
                      id="ignoreTotalError"
                      type="checkbox"
                      checked={ignoreTotalError}
                      onChange={() => setIgnoreTotalError(!ignoreTotalError)}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <label htmlFor="ignoreTotalError" className="ml-2 text-xs text-gray-600">
                      Ignore this warning and continue
                    </label>
                  </div>
                </div>
              )}

              <div className="border border-gray-300 rounded-md overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th scope="col" className="px-0 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">

                      </th>
                      <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Member
                      </th>
                      <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Amount (₹)
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {memberShares.map(share => (
                      <tr key={share.memberId}>
                        <td className="px-0 ps-2 py-2 whitespace-nowrap">
                          <input
                            type="checkbox"
                            checked={share.isIncluded}
                            onChange={() => handleMemberInclusionToggle(share.memberId)}
                            className="h-3 w-3 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                          />
                        </td>
                        <td className="px-2 py-2 whitespace-nowrap">
                          <span className="text-sm text-gray-900">
                            {share.name.split(" ")[0]} {share.memberId === paidBy && '(paid)'}
                          </span>
                        </td>
                        <td className="px-4 py-2 whitespace-nowrap">
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={share.amount}
                            onChange={(e) => handleShareAmountChange(share.memberId, e.target.value)}
                            disabled={!share.isIncluded}
                            className="w-full px-2 py-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:text-gray-500"
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Error message */}
            {validationError && (
              <div className="mb-6 p-3 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700 rounded-md">
                <p className="text-sm text-red-700 dark:text-red-200">{validationError}</p>
              </div>
            )}

            {/* Submit buttons */}
            <div className="flex justify-end space-x-3">
              <Link
                href={`/room/${roomId}`}
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-md"
              >
                Cancel
              </Link>
              <button
                type="button" // Changed from submit to button
                onClick={handleSaveAsDraft}
                className="px-4 py-2 text-sm font-medium text-white bg-yellow-500 hover:bg-yellow-600 rounded-md disabled:bg-yellow-300 dark:disabled:bg-yellow-800"
                disabled={isSaving}
              >
                {isSaving ? 'Saving...' : 'Save as Draft'}
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-sm font-medium text-white bg-blue-500 hover:bg-blue-600 rounded-md disabled:bg-blue-300 dark:disabled:bg-blue-800"
                disabled={isSaving}
              >
                {isSaving ? 'Saving...' : 'Create Split'}
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  )
} 