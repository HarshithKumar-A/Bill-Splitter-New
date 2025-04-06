'use client'

import { useTheme } from '@/contexts/ThemeContext'
import { FaSun, FaMoon, FaDesktop } from 'react-icons/fa'

export default function ThemeToggle() {
  const { theme, toggleTheme } = useTheme()
  
  return (
    <button
      onClick={toggleTheme}
      className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
      aria-label={`Current theme: ${theme}. Click to toggle theme.`}
    >
      {theme === 'light' && <FaSun className="text-yellow-500" />}
      {theme === 'dark' && <FaMoon className="text-blue-300" />}
      {theme === 'system' && <FaDesktop className="text-gray-500 dark:text-gray-400" />}
    </button>
  )
} 