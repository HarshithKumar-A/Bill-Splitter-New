'use client'

import { useState, useEffect, useRef } from 'react'
import { useParams } from 'next/navigation'
import { FaPlus, FaTrash, FaSearch, FaUserPlus } from 'react-icons/fa'
import Header from '@/components/Header'

interface Member {
  id: string
  name: string
  email: string
}

interface UserSearchResult {
  id: string
  name: string
  email: string
}

export default function RoomMembersPage() {
  const params = useParams()
  const roomId = params.id as string
  
  const [members, setMembers] = useState<Member[]>([])
  const [roomName, setRoomName] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<UserSearchResult[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [selectedUser, setSelectedUser] = useState<UserSearchResult | null>(null)
  const [isAddingMember, setIsAddingMember] = useState(false)
  const [showDropdown, setShowDropdown] = useState(false)
  const searchRef = useRef<HTMLDivElement>(null)
  
  useEffect(() => {
    const fetchRoomMembers = async () => {
      try {
        setIsLoading(true)
        const response = await fetch(`/api/groups/${roomId}`)
        
        if (!response.ok) {
          throw new Error('Failed to fetch room details')
        }
        
        const data = await response.json()
        setMembers(data.members)
        setRoomName(data.name)
      } catch (error) {
        console.error('Error fetching room members:', error)
        setError('Failed to load room members. Please try again.')
      } finally {
        setIsLoading(false)
      }
    }
    
    fetchRoomMembers()
  }, [roomId])
  
  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowDropdown(false)
      }
    }
    
    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])
  
  // Search for users when query changes
  useEffect(() => {
    const searchUsers = async () => {
      if (!searchQuery.trim() || searchQuery.length < 2) {
        setSearchResults([])
        return
      }
      
      try {
        setIsSearching(true)
        const response = await fetch(`/api/users/search?q=${encodeURIComponent(searchQuery)}`)
        
        if (!response.ok) {
          throw new Error('Failed to search users')
        }
        
        const data = await response.json()
        
        // Filter out users who are already members
        const filteredResults = data.users.filter((user: UserSearchResult) => 
          !members.some(member => member.id === user.id)
        )
        
        setSearchResults(filteredResults)
      } catch (error) {
        console.error('Error searching users:', error)
      } finally {
        setIsSearching(false)
      }
    }
    
    const debounceTimer = setTimeout(searchUsers, 300)
    
    return () => {
      clearTimeout(debounceTimer)
    }
  }, [searchQuery, members])
  
  const handleSearchFocus = () => {
    setShowDropdown(true)
  }
  
  const handleUserSelect = (user: UserSearchResult) => {
    setSelectedUser(user)
    setSearchQuery(`${user.name} (${user.email})`)
    setShowDropdown(false)
  }
  
  const handleAddMember = async () => {
    if (!selectedUser) {
      setError('Please select a user to add')
      return
    }
    
    try {
      setIsAddingMember(true)
      
      const response = await fetch(`/api/groups/${roomId}/members`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId: selectedUser.id }),
      })
      
      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to add member')
      }
      
      // Add the new member to the list
      setMembers(prev => [...prev, selectedUser])
      
      // Clear the input and selection
      setSearchQuery('')
      setSelectedUser(null)
    } catch (error) {
      console.error('Error adding member:', error)
      setError(error instanceof Error ? error.message : 'Failed to add member')
    } finally {
      setIsAddingMember(false)
    }
  }
  
  const handleRemoveMember = async (memberId: string) => {
    if (!confirm('Are you sure you want to remove this member?')) {
      return
    }
    
    try {
      const response = await fetch(`/api/groups/${roomId}/members/${memberId}`, {
        method: 'DELETE',
      })
      
      if (!response.ok) {
        throw new Error('Failed to remove member')
      }
      
      // Remove the member from the list
      setMembers(prev => prev.filter(member => member.id !== memberId))
    } catch (error) {
      console.error('Error removing member:', error)
      setError('Failed to remove member. Please try again.')
    }
  }
  
  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 transition-colors">
      <Header 
        title={`${roomName} - Members`} 
        showBackButton={true} 
        backUrl={`/room/${roomId}`}
      />
      
      <main className="max-w-3xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
        {error && (
          <div className="mb-6 p-3 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700 rounded-md">
            <p className="text-sm text-red-700 dark:text-red-200">{error}</p>
          </div>
        )}

        {/* Add Member Form */}
        <div className="mb-8 bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-3">Add Member</h2>
          <div className="relative" ref={searchRef}>
            <div className="flex items-center">
              <div className="relative flex-1">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <FaSearch className="text-gray-400" />
                </div>
                <input
                  type="text"
                  placeholder="Search users by name or email"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onFocus={handleSearchFocus}
                  className="pl-10 w-full p-2 border border-gray-300 dark:border-gray-600 rounded-l-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
              <button
                type="button"
                onClick={handleAddMember}
                disabled={isAddingMember || !selectedUser}
                className="px-4 py-2 bg-blue-500 text-white rounded-r-md hover:bg-blue-600 disabled:bg-blue-300 dark:disabled:bg-blue-800 flex items-center"
              >
                {isAddingMember ? 'Adding...' : (
                  <>
                    <FaUserPlus className="mr-2" /> Add
                  </>
                )}
              </button>
            </div>
            
            {/* Search Results Dropdown */}
            {showDropdown && (
              <div className="absolute z-10 mt-1 w-full bg-white dark:bg-gray-700 rounded-md shadow-lg max-h-60 overflow-auto">
                {isSearching ? (
                  <div className="p-3 text-center text-gray-500 dark:text-gray-400">
                    Searching...
                  </div>
                ) : searchResults.length === 0 ? (
                  <div className="p-3 text-center text-gray-500 dark:text-gray-400">
                    {searchQuery.length < 2 ? 'Type at least 2 characters to search' : 'No users found'}
                  </div>
                ) : (
                  <ul className="divide-y divide-gray-200 dark:divide-gray-600">
                    {searchResults.map(user => (
                      <li 
                        key={user.id} 
                        className="p-3 hover:bg-gray-100 dark:hover:bg-gray-600 cursor-pointer"
                        onClick={() => handleUserSelect(user)}
                      >
                        <div className="flex items-center">
                          <div className="w-8 h-8 rounded-full bg-blue-500 text-white flex items-center justify-center text-sm font-medium mr-3">
                            {user.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-900 dark:text-white">{user.name}</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">{user.email}</p>
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>
          <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">
            Search for users by name or email to add them to this room.
          </p>
        </div>
        
        {/* Members List */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-lg font-medium text-gray-900 dark:text-white">Members ({members.length})</h2>
          </div>
          
          {isLoading ? (
            <div className="p-6 text-center">
              <p className="text-gray-500 dark:text-gray-400">Loading members...</p>
            </div>
          ) : members.length === 0 ? (
            <div className="p-6 text-center">
              <p className="text-gray-500 dark:text-gray-400">No members found.</p>
            </div>
          ) : (
            <ul className="divide-y divide-gray-200 dark:divide-gray-700">
              {members.map(member => (
                <li key={member.id} className="px-6 py-4 flex items-center justify-between">
                  <div className="flex items-center">
                    <div className="w-8 h-8 rounded-full bg-blue-500 text-white flex items-center justify-center text-sm font-medium mr-3">
                      {member.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <h3 className="text-sm font-medium text-gray-900 dark:text-white">{member.name}</h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400">{member.email}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleRemoveMember(member.id)}
                    className="p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-full"
                    aria-label={`Remove ${member.name}`}
                  >
                    <FaTrash />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </main>
    </div>
  )
} 