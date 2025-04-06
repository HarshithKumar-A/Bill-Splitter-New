'use client'

import { useState } from 'react'
import Link from 'next/link'
import { FaArrowLeft, FaExternalLinkAlt } from 'react-icons/fa'

export default function AboutPage() {
  const [activeIframe, setActiveIframe] = useState<string | null>(null)

  const projects = [
    {
      id: 'typerace',
      title: 'Type Race',
      url: 'https://fin-race-harshithkumar-a.vercel.app/'
    },
    {
      id: 'mafia',
      title: 'Mafia',
      url: 'https://mafia-game-next.vercel.app/'
    },
    {
      id: 'clipboard',
      title: 'Clip Board',
      url: 'https://clip-board-theta.vercel.app/login'
    },
    {
      id: 'nopea',
      title: 'Nopea',
      url: 'https://dap-admin-webapp-git-development-harshithkumar-a.vercel.app/login'
    },
    {
      id: 'datepicker',
      title: 'react-quick-date-range-picker',
      url: 'https://www.npmjs.com/package/react-quick-date-range-picker'
    }
  ]

  const openProject = (url: string) => {
    window.open(url, '_blank')
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8 flex items-center">
          <Link href="/dashboard" className="mr-4 text-gray-500 hover:text-gray-700">
            <FaArrowLeft />
          </Link>
          <h1 className="text-xl font-semibold text-gray-900">About</h1>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Bill Splitter App</h2>
          <p className="text-gray-700 mb-4">
            This bill splitter app helps you track and split expenses with friends during trips and group activities.
            Easily create trip groups, add expenses, and see who owes what to whom.
          </p>
          <p className="text-gray-700">
            Built with Next.js, TypeScript, Tailwind CSS, and PostgreSQL.
          </p>
        </div>

        <h2 className="text-xl font-semibold mb-4">My Other Projects</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {projects.map((project) => (
            <div key={project.id} className="bg-white rounded-lg shadow overflow-hidden">
              <div className="relative w-full h-48">
                <iframe 
                  src={project.url} 
                  title={project.title}
                  className="w-full h-full"
                  onMouseEnter={() => setActiveIframe(project.id)}
                  onMouseLeave={() => setActiveIframe(null)}
                />
                <div 
                  className={`absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center transition-opacity duration-200 ${
                    activeIframe === project.id ? 'opacity-0' : 'opacity-100'
                  }`}
                >
                  <button
                    onClick={() => openProject(project.url)}
                    className="px-4 py-2 bg-white rounded-md font-medium flex items-center"
                  >
                    Open {project.title} <FaExternalLinkAlt className="ml-2" />
                  </button>
                </div>
              </div>
              <div className="p-4 border-t border-gray-200">
                <h3 className="font-medium">{project.title}</h3>
                <a 
                  href={project.url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-sm text-blue-500 hover:text-blue-700 flex items-center mt-1"
                >
                  Visit <FaExternalLinkAlt className="ml-1 text-xs" />
                </a>
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  )
}