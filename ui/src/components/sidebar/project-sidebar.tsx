"use client"

import { X, Settings, MoreHorizontal, Edit3, Type, Trash2, Plus } from "lucide-react"
import { useRouter } from "next/navigation"
import Select from "@/components/ui/select"
import { useState, useEffect } from "react"

export type Project = {
  id: string
  label: string
  value: string
  description: string
  icon: string
}

export type Chat = {
  id: string
  title: string
}

type ProjectSidebarProps = {
  isOpen: boolean
  onClose: () => void
  currentProject: Project
  projects: Project[]
  chats: Chat[]
  currentChatId?: string
  onProjectChange: (projectValue: string) => void
  onChatClick: (chatId: string) => void
  onNewChat: () => void
  onSettingsClick: () => void
}

export function ProjectSidebar({
  isOpen,
  onClose,
  currentProject,
  projects,
  chats,
  currentChatId,
  onProjectChange,
  onChatClick,
  onNewChat,
  onSettingsClick,
}: ProjectSidebarProps) {
  const [openDropdown, setOpenDropdown] = useState<string | null>(null)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (openDropdown && !(event.target as Element).closest('.chat-dropdown')) {
        setOpenDropdown(null)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [openDropdown])

  const handleChatAction = (action: string, chatId: string) => {
    console.log(`${action} action for chat:`, chatId)
    setOpenDropdown(null)

    if (action === 'edit') {
      onChatClick(chatId)
    }
  }

  return (
    <div className="w-[28em] h-full bg-gray-50 rounded-2xl p-6 shadow-lg flex-shrink-0">
      <div className="flex items-center justify-end mb-6">
        <div className="flex items-center gap-2">
          <button
            onClick={onSettingsClick}
            className="flex items-center justify-center w-8 h-8 rounded-lg hover:bg-gray-200 transition-colors"
          >
            <Settings className="w-5 h-5 text-gray-600" />
          </button>
          <button
            onClick={onClose}
            className="flex items-center justify-center w-8 h-8 rounded-lg hover:bg-gray-200 transition-colors"
          >
            <X className="w-5 h-5 text-gray-600" />
          </button>
        </div>
      </div>

      <div className="mb-6">
        <div className="relative z-[100]">
          <div className="h-12 w-full rounded-[30px] border border-gray-300 bg-white shadow-sm opacity-0 pointer-events-none" />
          <div className="absolute top-0 left-0 w-full z-50">
            <Select
              data={projects}
              defaultValue={currentProject.value}
              onChange={onProjectChange}
            />
          </div>
        </div>
      </div>

      <div className="mb-6">
        <button
          onClick={onNewChat}
          className="w-full flex items-center gap-3 px-3 py-3 rounded-lg bg-blue-500 hover:bg-blue-600 transition-colors text-white font-medium"
        >
          <Plus className="w-5 h-5" />
          <span>New Chat</span>
        </button>
      </div>

      <div className="flex-1 overflow-hidden">
        <div className="h-full overflow-y-auto space-y-2">
          {chats.map((chat) => (
            <div
              key={chat.id}
              className={`group px-3 py-3 rounded-lg cursor-pointer relative ${
                chat.id === currentChatId
                  ? 'bg-blue-100 border-l-4 border-blue-500'
                  : 'hover:bg-gray-200'
              }`}
              onClick={() => onChatClick(chat.id)}
            >
              <div className="flex items-center justify-between">
                <div className={`font-medium text-base flex-1 mr-2 ${
                  chat.id === currentChatId ? 'text-blue-900' : 'text-gray-900'
                }`}>
                  {chat.title}
                </div>

                <div className="relative chat-dropdown">
                  <button
                    className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 p-1 rounded hover:bg-gray-300 flex items-center justify-center"
                    onClick={(e) => {
                      e.stopPropagation()
                      setOpenDropdown(openDropdown === chat.id ? null : chat.id)
                    }}
                  >
                    <MoreHorizontal className="w-4 h-4 text-gray-600" />
                  </button>

                  {openDropdown === chat.id && (
                    <div className="absolute right-0 top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 w-40">
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          e.preventDefault()
                          handleChatAction('edit', chat.id)
                        }}
                        className="w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2 rounded-t-lg"
                      >
                        <Edit3 className="w-4 h-4" />
                        Edit
                      </button>
                      <button
                        onClick={() => handleChatAction('rename', chat.id)}
                        className="w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
                      >
                        <Type className="w-4 h-4" />
                        Rename
                      </button>
                      <button
                        onClick={() => handleChatAction('delete', chat.id)}
                        className="w-full px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2 rounded-b-lg"
                      >
                        <Trash2 className="w-4 h-4" />
                        Delete
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}