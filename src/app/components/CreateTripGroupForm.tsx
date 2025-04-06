'use client'

import { useState, useEffect } from 'react'
import { FaSearch } from 'react-icons/fa'

interface User {
  id: string;
  name: string;
  email: string;
}

interface CreateTripGroupFormProps {
  onClose: () => void;
  onSubmit: (groupName: string, memberIds: string[]) => void;
}

export default function CreateTripGroupForm({ onClose, onSubmit }: CreateTripGroupFormProps) {
  const [groupName, setGroupName] = useState('')
  const [selectedMembers, setSelectedMembers] = useState<string[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [users, setUsers] = useState<User[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [currentUser, setCurrentUser] = useState<{ id: string } | null>(null)

  useEffect(() => {
    // Get current user from localStorage
    const userData = localStorage.getItem('user')
    if (userData) {
      setCurrentUser(JSON.parse(userData))
    }
  }, [])

  useEffect(() => {
    if (!searchQuery.trim() || !currentUser) return

    const fetchUsers = async () => {
      try {
        setIsLoading(true)
        const response = await fetch(`/api/users?search=${searchQuery}&exclude=${currentUser.id}`)
        
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
  }, [searchQuery, currentUser])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSubmit(groupName, selectedMembers)
  }

  const toggleMemberSelection = (memberId: string) => {
    setSelectedMembers(prev => 
      prev.includes(memberId)
        ? prev.filter(id => id !== memberId)
        : [...prev, memberId]
    )
  }

  return (
    <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
      <div className="p-6">
        <h2 className="text-xl font-semibold mb-4">Create New Trip Group</h2>
        
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label htmlFor="groupName" className="block text-sm font-medium text-gray-700 mb-1">
              Group Name
            </label>
            <input
              id="groupName"
              type="text"
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
          
          {/* Member selection */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Members
            </label>
            
            {/* Search input */}
            <div className="relative mb-2">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <FaSearch className="text-gray-400" />
              </div>
              <input
                type="text"
                placeholder="Search members..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            
            {/* Selected members count */}
            {selectedMembers.length > 0 && (
              <div className="text-sm text-gray-600 mb-2">
                {selectedMembers.length} member{selectedMembers.length !== 1 ? 's' : ''} selected
              </div>
            )}
            
            {/* Member list */}
            <div className="max-h-60 overflow-y-auto border border-gray-300 rounded-md">
              {isLoading ? (
                <div className="px-3 py-4 text-sm text-gray-500 text-center">
                  Searching...
                </div>
              ) : users.length > 0 ? (
                users.map(user => (
                  <div 
                    key={user.id}
                    className="flex items-center px-3 py-2 hover:bg-gray-50 border-b border-gray-200 last:border-b-0"
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
                      className="ml-2 block text-sm text-gray-900 cursor-pointer flex-grow"
                    >
                      {user.name}
                    </label>
                  </div>
                ))
              ) : searchQuery ? (
                <div className="px-3 py-4 text-sm text-gray-500 text-center">
                  No members found matching &quot;{searchQuery}&quot;
                </div>
              ) : (
                <div className="px-3 py-4 text-sm text-gray-500 text-center">
                  Type to search for members
                </div>
              )}
            </div>
          </div>
          
          <div className="flex justify-end space-x-3 mt-6">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-sm font-medium text-white bg-blue-500 hover:bg-blue-600 rounded-md"
              disabled={!groupName || selectedMembers.length === 0}
            >
              Create
            </button>
          </div>
        </form>
      </div>
    </div>
  )
} 