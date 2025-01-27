import React, { useEffect, useState } from 'react'
import { Dialog, Transition } from '@headlessui/react'
import { X, Search, Trash2 } from 'lucide-react'
import { SavedPrompt, getSavedPrompts, deleteSavedPrompt } from '../services/api'

interface SavedPromptsDialogProps {
  isOpen: boolean
  onClose: () => void
  onSelectPrompt: (prompt: SavedPrompt) => void
  projectId: number
  onPromptSelected?: (content: string) => void
}

export default function SavedPromptsDialog({ isOpen, onClose, onSelectPrompt, projectId, onPromptSelected }: SavedPromptsDialogProps) {
  const [prompts, setPrompts] = useState<SavedPrompt[]>([])
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    const fetchPrompts = async () => {
      try {
        const savedPrompts = await getSavedPrompts(projectId)
        setPrompts(savedPrompts)
      } catch (error) {
        console.error('Error fetching saved prompts:', error)
      }
    }

    if (isOpen) {
      fetchPrompts()
    }
  }, [isOpen, projectId])

  const handleDelete = async (promptId: number, e: React.MouseEvent) => {
    e.stopPropagation()
    try {
      await deleteSavedPrompt(projectId, promptId)
      setPrompts(prompts.filter(p => p.id !== promptId))
    } catch (error) {
      console.error('Error deleting prompt:', error)
    }
  }

  const filteredPrompts = prompts.filter(prompt =>
    prompt.content.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const handleSelectPrompt = (prompt: SavedPrompt) => {
    onSelectPrompt(prompt)
    if (onPromptSelected) {
      onPromptSelected(prompt.content)
    }
    onClose()
  }

  return (
    <Transition appear show={isOpen} as={React.Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        <Transition.Child
          as={React.Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black bg-opacity-25" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4 text-center">
            <Transition.Child
              as={React.Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-white dark:bg-gray-800 p-6 text-left align-middle shadow-xl transition-all">
                <div className="flex justify-between items-center mb-4">
                  <Dialog.Title as="h3" className="text-lg font-medium leading-6 text-gray-900 dark:text-gray-100">
                    Saved Prompts
                  </Dialog.Title>
                  <button onClick={onClose} className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">
                    <X className="w-5 h-5" />
                  </button>
                </div>
                
                {/* Search Bar */}
                <div className="relative mb-4">
                  <input
                    type="text"
                    placeholder="Search prompts..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-full bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-300 w-5 h-5" />
                </div>

                {/* Prompts List */}
                <div className="max-h-60 overflow-y-auto">
                  {filteredPrompts.length > 0 ? (
                    filteredPrompts.map((prompt, index) => (
                      <React.Fragment key={prompt.id}>
                        {index > 0 && <div className="border-t border-gray-200 dark:border-gray-700 my-1" />}
                        <button
                          onClick={() => handleSelectPrompt(prompt)}
                          className="w-full text-left px-4 py-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 group relative"
                        >
                          <div className="flex items-start gap-2">
                            <span className="text-sm font-medium text-gray-400 dark:text-gray-500 min-w-[20px]">
                              {index + 1}.
                            </span>
                            <div className="text-sm text-gray-600 dark:text-gray-300 pr-8">{prompt.content}</div>
                          </div>
                          <button
                            onClick={(e) => handleDelete(prompt.id, e)}
                            className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-red-100 dark:hover:bg-red-900/30 rounded"
                          >
                            <Trash2 className="w-4 h-4 text-red-500" />
                          </button>
                        </button>
                      </React.Fragment>
                    ))
                  ) : (
                    <div className="text-center text-gray-500 dark:text-gray-400">
                      No saved prompts found.
                    </div>
                  )}
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  )
} 