'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { FaArrowLeft, FaSignOutAlt, FaUser } from 'react-icons/fa'
import ThemeToggle from './ThemeToggle'
import { auth } from '@/lib/firebase.config'
import { signOut } from 'firebase/auth'

interface HeaderProps {
  title: string
  showBackButton?: boolean
  backUrl?: string
}

export default function Header({
  title,
  showBackButton = false,
  backUrl = '/dashboard'
}: HeaderProps) {
  const router = useRouter()
  const [user, setUser] = useState<{ id: string; name: string } | null>(null)
  const [showUserMenu, setShowUserMenu] = useState(false)

  useEffect(() => {
    // Get user from localStorage
    const userData = localStorage.getItem('user')
    if (userData) {
      setUser(JSON.parse(userData))
    }
  }, [])

  const handleLogout = async () => {
    try {
      // Sign out from Firebase
      await signOut(auth)

      // Clear localStorage
      localStorage.removeItem('user')

      // Redirect to home
      router.push('/')
    } catch (error) {
      console.error('Logout error:', error)
      // Still clear local data even if Firebase sign out fails
      localStorage.removeItem('user')
      router.push('/')
    }
  }

  // Get user initials for avatar
  const getUserInitials = () => {
    if (!user?.name) return '?'

    const nameParts = user.name.split(' ')
    if (nameParts.length > 1) {
      return `${nameParts[0][0]}${nameParts[1][0]}`.toUpperCase()
    }
    return nameParts[0][0].toUpperCase()
  }

  return (
    <header className="bg-white dark:bg-gray-800 shadow-sm transition-colors sticky top-0 left-0 right-0">
      <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8 flex items-center">
        {showBackButton && (
          <Link href={backUrl} className="mr-4 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300">
            <FaArrowLeft />
          </Link>
        )}

        <h1 className="text-xl font-semibold text-gray-900 dark:text-white">{title}</h1>

        <div className="ml-auto flex items-center space-x-4">
          <ThemeToggle />

          <div className="relative">
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="flex items-center focus:outline-none"
              aria-label="User menu"
            >
              <div className="w-8 h-8 rounded-full bg-blue-500 text-white flex items-center justify-center text-sm font-medium">
                {getUserInitials()}
              </div>
            </button>

            {showUserMenu && (
              <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-md shadow-lg py-1 z-10 border border-gray-200 dark:border-gray-700">
                <div className="px-4 py-2 border-b border-gray-200 dark:border-gray-700">
                  <p className="text-sm font-medium text-gray-900 dark:text-white">{user?.name}</p>
                </div>
                <button
                  onClick={handleLogout}
                  className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center"
                >
                  <FaSignOutAlt className="mr-2" />
                  Sign out
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  )
} 