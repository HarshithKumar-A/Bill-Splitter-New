'use client'

import Link from 'next/link'
import { useParams } from 'next/navigation'
import { FaArrowLeft, FaComments } from 'react-icons/fa'

export default function ChatPage() {
  const params = useParams()
  const roomId = params.id as string

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8 flex items-center">
          <Link href={`/room/${roomId}`} className="mr-4 text-gray-500 hover:text-gray-700">
            <FaArrowLeft />
          </Link>
          <h1 className="text-xl font-semibold text-gray-900">Chat</h1>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-3xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
        <div className="bg-white rounded-lg shadow p-10 text-center">
          <div className="flex justify-center mb-6">
            <FaComments className="text-6xl text-blue-400" />
          </div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Chat Feature Coming Soon</h2>
          <p className="text-gray-600 max-w-md mx-auto">
            We're working hard to bring you a seamless chat experience to communicate with your trip group members.
          </p>
          <div className="mt-8">
            <Link 
              href={`/room/${roomId}`}
              className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
            >
              Back to Trip Dashboard
            </Link>
          </div>
        </div>
      </main>
    </div>
  )
} 