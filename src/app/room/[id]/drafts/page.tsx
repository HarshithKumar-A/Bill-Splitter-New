'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { FaTrash, FaCloudUploadAlt } from 'react-icons/fa'
import Header from '@/components/Header'

interface DraftShare {
  userId: string;
  name: string;
  amount: number;
}

interface DraftExpense {
  id: string;
  title: string;
  amount: number;
  category: string;
  date: string;
  groupId: string;
  paidById: string;
  paidByName: string;
  shares: DraftShare[];
}

export default function DraftsPage() {
  const params = useParams()
  const router = useRouter()
  const roomId = params.id as string
  
  const [drafts, setDrafts] = useState<DraftExpense[]>([])
  const [isPublishing, setIsPublishing] = useState<string | null>(null)
  const [error, setError] = useState('')
  
  useEffect(() => {
    // Load drafts from localStorage
    const loadDrafts = () => {
      try {
        const allDrafts = JSON.parse(localStorage.getItem('unpublished_items') || '[]')
        // Filter drafts for this room
        const roomDrafts = allDrafts.filter((draft: DraftExpense) => draft.groupId === roomId)
        setDrafts(roomDrafts)
      } catch (error) {
        console.error('Error loading drafts:', error)
        setError('Failed to load drafts')
      }
    }
    
    loadDrafts()
    
    // Add event listener to refresh drafts if localStorage changes
    window.addEventListener('storage', loadDrafts)
    
    return () => {
      window.removeEventListener('storage', loadDrafts)
    }
  }, [roomId])

  const deleteDraft = (draftId: string) => {
    if (!confirm('Are you sure you want to delete this draft?')) {
      return
    }

    handleDeleteDraft(draftId)
  }
  
  const handleDeleteDraft = (draftId: string) => {    
    try {
      // Get all drafts
      const allDrafts = JSON.parse(localStorage.getItem('unpublished_items') || '[]')
      
      // Remove the selected draft
      const updatedDrafts = allDrafts.filter((draft: DraftExpense) => draft.id !== draftId)
      
      // Save back to localStorage
      localStorage.setItem('unpublished_items', JSON.stringify(updatedDrafts))
      
      // Update state
      setDrafts(prev => prev.filter(draft => draft.id !== draftId))
    } catch (error) {
      console.error('Error deleting draft:', error)
      setError('Failed to delete draft')
    }
  }
  
  const handlePublishDraft = async (draft: DraftExpense) => {
    try {
      setIsPublishing(draft.id)
      
      // Format the data for the API
      const expenseData = {
        title: draft.title,
        amount: draft.amount,
        category: draft.category,
        groupId: draft.groupId,
        paidById: draft.paidById,
        shares: draft.shares.map(share => ({
          userId: share.userId,
          amount: share.amount
        }))
      }
      
      // Send to API
      const response = await fetch('/api/expenses', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(expenseData)
      })
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to publish draft')
      }
      
      // Delete from drafts on success
      handleDeleteDraft(draft.id)
      
      // Show success message
      alert('Draft published successfully!')
    } catch (error) {
      console.error('Error publishing draft:', error)
      setError('Failed to publish draft. Please try again.')
    } finally {
      setIsPublishing(null)
    }
  }
  
  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 transition-colors">
      <Header 
        title="Draft Expenses" 
        showBackButton={true} 
        backUrl={`/room/${roomId}`}
        showCurrencyInfo={true}
      />
      
      <main className="max-w-3xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
        {error && (
          <div className="mb-6 p-3 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700 rounded-md">
            <p className="text-sm text-red-700 dark:text-red-200">{error}</p>
          </div>
        )}
        
        {drafts.length > 0 ? (
          <div className="space-y-4">
            {drafts.map(draft => (
              <div key={draft.id} className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
                <div className="p-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-medium text-gray-900 dark:text-white">{draft.title}</h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {new Date(draft.date).toLocaleDateString()} • {draft.category}
                      </p>
                      <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                        Paid by {draft.paidByName}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-gray-900 dark:text-white">
                        ₹{draft.amount.toFixed(2)}
                      </p>
                    </div>
                  </div>
                  
                  <div className="mt-4 flex justify-end space-x-2">
                    <button
                      onClick={() => deleteDraft(draft.id)}
                      className="px-3 py-1 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-md"
                      aria-label="Delete draft"
                    >
                      <FaTrash className="inline mr-1" /> Discard
                    </button>
                    <button
                      onClick={() => handlePublishDraft(draft)}
                      className="px-3 py-1 text-sm text-white bg-green-500 hover:bg-green-600 rounded-md disabled:bg-green-300 dark:disabled:bg-green-800"
                      aria-label="Publish draft"
                      disabled={isPublishing === draft.id}
                    >
                      {isPublishing === draft.id ? 'Publishing...' : (
                        <>
                          <FaCloudUploadAlt className="inline mr-1" /> Publish
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-10">
            <p className="text-gray-500 dark:text-gray-400">No draft expenses found.</p>
            <Link 
              href={`/room/${roomId}/split/new`}
              className="mt-4 inline-block px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
            >
              Create a new expense
            </Link>
          </div>
        )}
      </main>
    </div>
  )
} 