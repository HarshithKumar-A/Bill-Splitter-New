'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { FaMoneyBillWave, FaHistory, FaComments, FaChartPie, FaFileAlt, FaUsers } from 'react-icons/fa'
import Header from '@/components/Header'
import { useApiAuth } from '@/hooks/useApiAuth'
import { auth } from '@/lib/firebase.config'
import { signOut, onAuthStateChanged } from 'firebase/auth'

export default function RoomDashboard() {
  const params = useParams()
  const router = useRouter()
  const roomId = params.id as string
  const { authenticatedFetch } = useApiAuth()

  const [roomName, setRoomName] = useState("Loading...")
  const [draftCount, setDraftCount] = useState(0)
  const [firebaseReady, setFirebaseReady] = useState(false)

  // Wait for Firebase auth to initialize
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        setFirebaseReady(true)
      } else {
        router.push('/login')
      }
    })

    return () => unsubscribe()
  }, [router])

  useEffect(() => {
    if (!firebaseReady) return

    // Fetch room details
    const fetchRoomDetails = async () => {
      try {
        const response = await authenticatedFetch(`/api/groups/${roomId}`)

        if (response.status === 401) {
          // Token expired - sign out and redirect to login
          await signOut(auth)
          localStorage.removeItem('user')
          router.push('/login')
          return
        }

        if (response.ok) {
          const data = await response.json()
          setRoomName(data.name)
        }
      } catch (error) {
        console.error('Error fetching room details:', error)
      }
    }

    fetchRoomDetails()
  }, [roomId, firebaseReady, authenticatedFetch, router])

  useEffect(() => {
    // Count drafts for this room
    const countDrafts = () => {
      try {
        const allDrafts = JSON.parse(localStorage.getItem('unpublished_items') || '[]')
        const roomDrafts = allDrafts.filter((draft: any) => draft.groupId === roomId)
        setDraftCount(roomDrafts.length)
      } catch (error) {
        console.error('Error counting drafts:', error)
      }
    }

    countDrafts()

    // Listen for storage changes
    window.addEventListener('storage', countDrafts)

    return () => {
      window.removeEventListener('storage', countDrafts)
    }
  }, [roomId, authenticatedFetch, router])

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 transition-colors">
      <Header
        title={roomName}
        showBackButton={true}
        backUrl="/dashboard"
      />

      <main className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          {/* Create Split */}
          <Link
            href={`/room/${roomId}/split/new`}
            className="flex flex-col items-center justify-center p-6 bg-white dark:bg-gray-800 rounded-lg shadow hover:shadow-md transition-shadow"
          >
            <FaMoneyBillWave className="text-green-500 text-3xl mb-3" />
            <h2 className="text-lg font-medium text-gray-900 dark:text-white">Create Split</h2>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400 text-center">Add a new expense to split</p>
          </Link>

          {/* View History */}
          <Link
            href={`/room/${roomId}/history`}
            className="flex flex-col items-center justify-center p-6 bg-white dark:bg-gray-800 rounded-lg shadow hover:shadow-md transition-shadow"
          >
            <FaHistory className="text-blue-500 text-3xl mb-3" />
            <h2 className="text-lg font-medium text-gray-900 dark:text-white">View History</h2>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400 text-center">See all previous expenses</p>
          </Link>

          {/* Chat with Teammates */}
          <Link
            href={`/room/${roomId}/chat`}
            className="flex flex-col items-center justify-center p-6 bg-white dark:bg-gray-800 rounded-lg shadow hover:shadow-md transition-shadow"
          >
            <FaComments className="text-purple-500 text-3xl mb-3" />
            <h2 className="text-lg font-medium text-gray-900 dark:text-white">Chat with Teammates</h2>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400 text-center">Coming soon...</p>
          </Link>

          {/* Draft Expenses */}
          <Link
            href={`/room/${roomId}/drafts`}
            className="flex flex-col items-center justify-center p-6 bg-white dark:bg-gray-800 rounded-lg shadow hover:shadow-md transition-shadow"
          >
            <FaFileAlt className="text-yellow-500 text-3xl mb-3" />
            <h2 className="text-lg font-medium text-gray-900 dark:text-white">Draft Expenses</h2>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400 text-center">
              {draftCount > 0 ? `${draftCount} draft${draftCount > 1 ? 's' : ''} saved` : 'No drafts saved'}
            </p>
          </Link>

          {/* Summary of Expenses */}
          <Link
            href={`/room/${roomId}/summary`}
            className="flex flex-col items-center justify-center p-6 bg-white dark:bg-gray-800 rounded-lg shadow hover:shadow-md transition-shadow"
          >
            <FaChartPie className="text-orange-500 text-3xl mb-3" />
            <h2 className="text-lg font-medium text-gray-900 dark:text-white">Summary of Expenses</h2>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400 text-center">Overview of spending and settlements</p>
          </Link>

          {/* Manage Members */}
          <Link
            href={`/room/${roomId}/members`}
            className="flex flex-col items-center justify-center p-6 bg-white dark:bg-gray-800 rounded-lg shadow hover:shadow-md transition-shadow"
          >
            <FaUsers className="text-purple-500 text-3xl mb-3" />
            <h2 className="text-lg font-medium text-gray-900 dark:text-white">Manage Travelers</h2>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400 text-center">Add or remove travelers</p>
          </Link>
        </div>
      </main>
    </div>
  )
} 