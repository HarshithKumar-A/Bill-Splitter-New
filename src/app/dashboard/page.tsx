'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { FaPlus, FaSignOutAlt, FaInfoCircle, FaMapMarkerAlt, FaCalendar, FaClock } from 'react-icons/fa'
import CreateTripGroupForm from '../components/CreateTripGroupForm'
import ThemeToggle from '@/components/ThemeToggle'
import { useApiAuth } from '@/hooks/useApiAuth'
import { auth } from '@/lib/firebase.config'
import { signOut, onAuthStateChanged } from 'firebase/auth'

interface Group {
  id: string;
  name: string;
  destination: string;
  startDate: string;
  endDate: string;
  status: string;
  currency: string;
  members: number;
  created: string;
}

export default function Dashboard() {
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [groups, setGroups] = useState<Group[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const router = useRouter()
  const [user, setUser] = useState<{ id: string; name: string } | null>(null)
  const [firebaseReady, setFirebaseReady] = useState(false)
  const { authenticatedFetch } = useApiAuth()

  // Wait for Firebase auth to initialize
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        // Firebase user is signed in
        setFirebaseReady(true)

        // Also check localStorage
        const userData = localStorage.getItem('user')
        if (userData) {
          setUser(JSON.parse(userData))
        }
      } else {
        // No Firebase user - redirect to login
        router.push('/login')
      }
    })

    return () => unsubscribe()
  }, [router])

  useEffect(() => {
    // Only fetch groups when both user data and Firebase are ready
    if (!user || !firebaseReady) return

    // Fetch groups
    const fetchGroups = async () => {
      try {
        setIsLoading(true)
        const response = await authenticatedFetch('/api/groups')

        if (response.status === 401) {
          // Token expired - sign out and redirect to login
          await signOut(auth)
          localStorage.removeItem('user')
          router.push('/login')
          return
        }

        if (!response.ok) {
          throw new Error('Failed to fetch groups')
        }

        const data = await response.json()
        setGroups(data)
      } catch (error) {
        console.error('Error fetching groups:', error)
        setError('Failed to load trips')
      } finally {
        setIsLoading(false)
      }
    }

    fetchGroups()
  }, [user, firebaseReady, authenticatedFetch, router])

  const handleCreateRoom = async (tripData: {
    name: string;
    destination: string;
    description?: string;
    startDate: string;
    endDate: string;
    currency: string;
    memberIds: string[];
  }) => {
    if (!user) return

    try {
      const response = await authenticatedFetch('/api/groups', {
        method: 'POST',
        body: JSON.stringify(tripData),
      })

      if (response.status === 401) {
        // Token expired
        await signOut(auth)
        localStorage.removeItem('user')
        router.push('/login')
        return
      }

      if (!response.ok) {
        throw new Error('Failed to create trip')
      }

      const data = await response.json()

      // Add the new group to the list
      setGroups(prev => [{
        id: data.group.id,
        name: data.group.name,
        destination: data.group.destination,
        startDate: data.group.startDate,
        endDate: data.group.endDate,
        status: data.group.status,
        currency: data.group.currency,
        members: data.group.members.length,
        created: new Date().toISOString().split('T')[0]
      }, ...prev])

      // Close modal
      setShowCreateModal(false)
    } catch (error) {
      console.error('Error creating trip:', error)
      alert('Failed to create trip')
    }
  }

  const handleLogout = async () => {
    try {
      await signOut(auth)
      localStorage.removeItem('user')
      router.push('/')
    } catch (error) {
      console.error('Logout error:', error)
      // Still clear local data
      localStorage.removeItem('user')
      router.push('/')
    }
  }

  const getTripStatus = (startDate: string, endDate: string, status: string) => {
    const now = new Date()
    const start = new Date(startDate)
    const end = new Date(endDate)

    if (status === 'COMPLETED' || status === 'ARCHIVED') {
      return { label: 'Completed', color: 'bg-gray-500' }
    }

    if (now < start) {
      const daysUntil = Math.ceil((start.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
      return { label: `In ${daysUntil} day${daysUntil !== 1 ? 's' : ''}`, color: 'bg-blue-500' }
    }

    if (now >= start && now <= end) {
      const daysLeft = Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
      return { label: `${daysLeft} day${daysLeft !== 1 ? 's' : ''} left`, color: 'bg-green-500' }
    }

    return { label: 'Past', color: 'bg-gray-500' }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  }

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 transition-colors">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 shadow-sm transition-colors">
        <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8 flex items-center">
          <h1 className="text-xl font-semibold text-gray-900 dark:text-white">Your Trips</h1>
          <div className="ml-auto flex items-center space-x-4">
            <ThemeToggle />
            <Link href="/about" className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300">
              <FaInfoCircle />
            </Link>
            <button
              onClick={handleLogout}
              className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
            >
              <FaSignOutAlt />
            </button>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
        {isLoading ? (
          <div className="text-center py-10">
            <p className="text-gray-500 dark:text-gray-400">Loading your trips...</p>
          </div>
        ) : error ? (
          <div className="text-center py-10">
            <p className="text-red-500 dark:text-red-400">{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="mt-4 px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
            >
              Retry
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {groups.map((group) => {
              const tripStatus = getTripStatus(group.startDate, group.endDate, group.status)
              return (
                <Link
                  key={group.id}
                  href={`/room/${group.id}`}
                  className="block bg-white dark:bg-gray-800 rounded-lg shadow hover:shadow-md transition-shadow"
                >
                  <div className="p-5">
                    <div className="flex items-start justify-between mb-2">
                      <h2 className="text-lg font-medium text-gray-900 dark:text-white">{group.name}</h2>
                      <span className={`px-2 py-1 text-xs font-medium text-white rounded ${tripStatus.color}`}>
                        {tripStatus.label}
                      </span>
                    </div>

                    <div className="space-y-2 mt-3">
                      <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                        <FaMapMarkerAlt className="mr-2 text-gray-400" />
                        {group.destination}
                      </div>

                      <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                        <FaCalendar className="mr-2 text-gray-400" />
                        {formatDate(group.startDate)} - {formatDate(group.endDate)}
                      </div>

                      <div className="flex items-center justify-between text-sm text-gray-500 dark:text-gray-400 pt-2 border-t border-gray-200 dark:border-gray-700">
                        <span>{group.members} traveler{group.members !== 1 ? 's' : ''}</span>
                        <span className="text-xs">{group.currency}</span>
                      </div>
                    </div>
                  </div>
                </Link>
              )
            })}

            {/* Create new trip button */}
            <button
              onClick={() => setShowCreateModal(true)}
              className="flex flex-col items-center justify-center p-5 bg-gray-50 dark:bg-gray-700 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
            >
              <FaPlus className="text-gray-400 text-2xl mb-2" />
              <span className="text-sm font-medium text-gray-500 dark:text-gray-400">Create New Trip</span>
            </button>
          </div>
        )}
      </main>

      {/* Create trip modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <CreateTripGroupForm
            onClose={() => setShowCreateModal(false)}
            onSubmit={handleCreateRoom}
          />
        </div>
      )}
    </div>
  )
}