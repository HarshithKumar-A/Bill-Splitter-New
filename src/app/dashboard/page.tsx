'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { FaPlus, FaSignOutAlt, FaInfoCircle } from 'react-icons/fa'
import CreateTripGroupForm from '../components/CreateTripGroupForm'
import ThemeToggle from '@/components/ThemeToggle'

interface Group {
  id: string;
  name: string;
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

  useEffect(() => {
    // Check if user is logged in
    const userData = localStorage.getItem('user')
    if (!userData) {
      router.push('/login')
      return
    }

    setUser(JSON.parse(userData))
  }, [router])

  useEffect(() => {
    if (!user) return

    // Fetch groups
    const fetchGroups = async () => {
      try {
        setIsLoading(true)
        const response = await fetch(`/api/groups?userId=${user.id}`)
        
        if (!response.ok) {
          throw new Error('Failed to fetch groups')
        }
        
        const data = await response.json()
        setGroups(data)
      } catch (error) {
        console.error('Error fetching groups:', error)
        setError('Failed to load groups')
      } finally {
        setIsLoading(false)
      }
    }

    fetchGroups()
  }, [user])

  const handleCreateRoom = async (groupName: string, memberIds: string[]) => {
    if (!user) return

    try {
      const response = await fetch('/api/groups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: groupName,
          userId: user.id,
          memberIds
        }),
      })
      
      if (!response.ok) {
        throw new Error('Failed to create group')
      }
      
      const data = await response.json()
      
      // Add the new group to the list
      setGroups(prev => [{
        id: data.group.id,
        name: data.group.name,
        members: data.group.members.length,
        created: new Date().toISOString().split('T')[0]
      }, ...prev])
      
      // Close modal
      setShowCreateModal(false)
    } catch (error) {
      console.error('Error creating group:', error)
      alert('Failed to create group')
    }
  }

  const handleLogout = () => {
    localStorage.removeItem('user')
    router.push('/')
  }

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 transition-colors">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 shadow-sm transition-colors">
        <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8 flex items-center">
          <h1 className="text-xl font-semibold text-gray-900 dark:text-white">My Trip Groups</h1>
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
            <p className="text-gray-500">Loading your groups...</p>
          </div>
        ) : error ? (
          <div className="text-center py-10">
            <p className="text-red-500">{error}</p>
            <button 
              onClick={() => window.location.reload()}
              className="mt-4 px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
            >
              Retry
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {groups.map((group) => (
              <Link 
                key={group.id} 
                href={`/room/${group.id}`}
                className="block bg-white rounded-lg shadow hover:shadow-md transition-shadow"
              >
                <div className="p-5">
                  <h2 className="text-lg font-medium text-gray-900">{group.name}</h2>
                  <p className="mt-1 text-sm text-gray-500">{group.members} members</p>
                  <p className="mt-1 text-xs text-gray-400">Created: {group.created}</p>
                </div>
              </Link>
            ))}
            
            {/* Create new room button */}
            <button
              onClick={() => setShowCreateModal(true)}
              className="flex flex-col items-center justify-center p-5 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300 hover:bg-gray-100 transition-colors"
            >
              <FaPlus className="text-gray-400 text-2xl mb-2" />
              <span className="text-sm font-medium text-gray-500">Create New Trip Group</span>
            </button>
          </div>
        )}
      </main>

      {/* Create room modal */}
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