'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { FaSearch, FaMapMarkerAlt, FaCalendar, FaDollarSign } from 'react-icons/fa'
import { useApiAuth } from '@/hooks/useApiAuth'
import { auth } from '@/lib/firebase.config'
import { signOut, onAuthStateChanged } from 'firebase/auth'

interface User {
  id: string;
  name: string;
  email: string;
}

interface CreateTripGroupFormProps {
  onClose: () => void;
  onSubmit: (tripData: {
    name: string;
    destination: string;
    description?: string;
    startDate: string;
    endDate: string;
    currency: string;
    memberIds: string[];
  }) => void;
}

const CURRENCIES = [
  { code: 'INR', symbol: '₹', name: 'Indian Rupee' },
  { code: 'USD', symbol: '$', name: 'US Dollar' },
  { code: 'EUR', symbol: '€', name: 'Euro' },
  { code: 'GBP', symbol: '£', name: 'British Pound' },
  { code: 'AUD', symbol: 'A$', name: 'Australian Dollar' },
  { code: 'CAD', symbol: 'C$', name: 'Canadian Dollar' },
  { code: 'SGD', symbol: 'S$', name: 'Singapore Dollar' },
  { code: 'AED', symbol: 'د.إ', name: 'UAE Dirham' },
  { code: 'JPY', symbol: '¥', name: 'Japanese Yen' },
]

export default function CreateTripGroupForm({ onClose, onSubmit }: CreateTripGroupFormProps) {
  const [tripName, setTripName] = useState('')
  const [destination, setDestination] = useState('')
  const [description, setDescription] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [currency, setCurrency] = useState('INR')
  const [selectedMembers, setSelectedMembers] = useState<string[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [users, setUsers] = useState<User[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [currentUser, setCurrentUser] = useState<{ id: string } | null>(null)
  const [firebaseReady, setFirebaseReady] = useState(false)
  const { authenticatedFetch } = useApiAuth()
  const router = useRouter()

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
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
    if (!searchQuery.trim() || !currentUser || !firebaseReady) return

    const fetchUsers = async () => {
      try {
        setIsLoading(true)
        const response = await authenticatedFetch(`/api/users?search=${searchQuery}&exclude=${currentUser.id}`)

        if (response.status === 401) {
          await signOut(auth)
          localStorage.removeItem('user')
          router.push('/login')
          return
        }

        if (!response.ok) {
          throw new Error('Failed to fetch users')
        }

        const data = await response.json()
        setUsers(data)
      } catch (error) {
        console.error('Error searching users:', error)
      } finally {
        setIsLoading(false)
      }
    }

    // Debounce the search
    const timeoutId = setTimeout(() => {
      fetchUsers()
    }, 300)

    return () => clearTimeout(timeoutId)
  }, [searchQuery, currentUser, firebaseReady, authenticatedFetch, router])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSubmit({
      name: tripName,
      destination,
      description: description || undefined,
      startDate,
      endDate,
      currency,
      memberIds: selectedMembers
    })
  }

  const toggleMemberSelection = (memberId: string) => {
    setSelectedMembers(prev =>
      prev.includes(memberId)
        ? prev.filter(id => id !== memberId)
        : [...prev, memberId]
    )
  }

  // Get today's date in YYYY-MM-DD format for min date
  const today = new Date().toISOString().split('T')[0]

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
      <div className="p-6">
        <h2 className="text-2xl font-semibold mb-6 text-gray-900 dark:text-white">Create New Trip</h2>

        <form onSubmit={handleSubmit}>
          {/* Trip Name */}
          <div className="mb-4">
            <label htmlFor="tripName" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Trip Name *
            </label>
            <input
              id="tripName"
              type="text"
              value={tripName}
              onChange={(e) => setTripName(e.target.value)}
              placeholder="e.g., Goa Beach Trip 2024"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
              required
            />
          </div>

          {/* Destination */}
          <div className="mb-4">
            <label htmlFor="destination" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              <FaMapMarkerAlt className="inline mr-1" />
              Destination *
            </label>
            <input
              id="destination"
              type="text"
              value={destination}
              onChange={(e) => setDestination(e.target.value)}
              placeholder="e.g., Goa, India"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
              required
            />
          </div>

          {/* Date Range */}
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label htmlFor="startDate" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                <FaCalendar className="inline mr-1" />
                Start Date *
              </label>
              <input
                id="startDate"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                min={today}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                required
              />
            </div>
            <div>
              <label htmlFor="endDate" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                <FaCalendar className="inline mr-1" />
                End Date *
              </label>
              <input
                id="endDate"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                min={startDate || today}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                required
              />
            </div>
          </div>

          {/* Currency */}
          <div className="mb-4">
            <label htmlFor="currency" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              <FaDollarSign className="inline mr-1" />
              Currency *
            </label>
            <select
              id="currency"
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
              required
            >
              {CURRENCIES.map(curr => (
                <option key={curr.code} value={curr.code}>
                  {curr.symbol} {curr.code} - {curr.name}
                </option>
              ))}
            </select>
          </div>

          {/* Description */}
          <div className="mb-4">
            <label htmlFor="description" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Description (Optional)
            </label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add notes about your trip..."
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white resize-none"
            />
          </div>

          {/* Member selection */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Add Travelers *
            </label>

            {/* Search input */}
            <div className="relative mb-2">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <FaSearch className="text-gray-400" />
              </div>
              <input
                type="text"
                placeholder="Search travelers..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
              />
            </div>

            {/* Selected members count */}
            {selectedMembers.length > 0 && (
              <div className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                {selectedMembers.length} traveler{selectedMembers.length !== 1 ? 's' : ''} selected
              </div>
            )}

            {/* Member list */}
            <div className="max-h-48 overflow-y-auto border border-gray-300 dark:border-gray-600 rounded-md">
              {isLoading ? (
                <div className="px-3 py-4 text-sm text-gray-500 dark:text-gray-400 text-center">
                  Searching...
                </div>
              ) : users.length > 0 ? (
                users.map(user => (
                  <div
                    key={user.id}
                    className="flex items-center px-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-700 border-b border-gray-200 dark:border-gray-600 last:border-b-0"
                  >
                    <input
                      type="checkbox"
                      id={`member-${user.id}`}
                      checked={selectedMembers.includes(user.id)}
                      onChange={() => toggleMemberSelection(user.id)}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <label
                      htmlFor={`member-${user.id}`}
                      className="ml-2 block text-sm text-gray-900 dark:text-white cursor-pointer flex-grow"
                    >
                      {user.name}
                    </label>
                  </div>
                ))
              ) : searchQuery ? (
                <div className="px-3 py-4 text-sm text-gray-500 dark:text-gray-400 text-center">
                  No travelers found matching &quot;{searchQuery}&quot;
                </div>
              ) : (
                <div className="px-3 py-4 text-sm text-gray-500 dark:text-gray-400 text-center">
                  Type to search for travelers
                </div>
              )}
            </div>
          </div>

          <div className="flex justify-end space-x-3 mt-6">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-md"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-sm font-medium text-white bg-blue-500 hover:bg-blue-600 rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={!tripName || !destination || !startDate || !endDate || selectedMembers.length === 0}
            >
              Create Trip
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}