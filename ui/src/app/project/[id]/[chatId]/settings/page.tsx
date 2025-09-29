"use client"

import {
  PromptInput,
  PromptInputAction,
  PromptInputActions,
  PromptInputTextarea,
} from "@/components/ui/prompt-input"
import { Button } from "@/components/ui/button"
import Select from "@/components/ui/select"
import { ArrowLeft, ArrowUp, Menu, Paperclip, Square, X, Settings, MoreHorizontal, Edit3, Type, Trash2, Plus } from "lucide-react"
import { useRef, useState, use, useEffect } from "react"
import { useRouter } from "next/navigation"
import { sidebarStore } from "@/lib/sidebar-store"

export default function ChatSettings({ params }: { params: Promise<{ id: string; chatId: string }> }) {
  const { id, chatId } = use(params)
  const router = useRouter()
  const [input, setInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [files, setFiles] = useState<File[]>([])
  // Always initialize from store to maintain state across routes
  const [isMenuOpen, setIsMenuOpen] = useState(() => sidebarStore.getIsOpen())
  const [allowAnimations, setAllowAnimations] = useState(false)  // Only allow animations after user interaction
  const [isSelectOpen, setIsSelectOpen] = useState(false)
  const [openDropdown, setOpenDropdown] = useState<string | null>(null)
  const uploadInputRef = useRef<HTMLInputElement>(null)

  const projectsData = [
    {
      id: '1',
      label: 'TeamZ Dashboard',
      value: 'teamz_dashboard',
      description: 'Main project dashboard and analytics',
      icon: '📊',
    },
    {
      id: '2',
      label: 'Mobile App',
      value: 'mobile_app',
      description: 'iOS and Android mobile application',
      icon: '📱',
    },
    {
      id: '3',
      label: 'API Gateway',
      value: 'api_gateway',
      description: 'Backend services and API management',
      icon: '🔗',
    },
    {
      id: '4',
      label: 'Marketing Site',
      value: 'marketing_site',
      description: 'Public website and landing pages',
      icon: '🌐',
    },
  ]

  const chatTitles = [
    { id: 'chat-1', title: 'Project Planning Discussion' },
    { id: 'chat-2', title: 'UI/UX Review' },
    { id: 'chat-3', title: 'Bug Fixes & Updates' },
    { id: 'chat-4', title: 'Team Standup Notes' },
    { id: 'chat-5', title: 'Feature Requirements' },
    { id: 'chat-6', title: 'Performance Optimization' },
    { id: 'chat-7', title: 'Code Review Session' },
    { id: 'chat-8', title: 'Design System Updates' },
    { id: 'chat-9', title: 'Testing Strategy' },
    { id: 'chat-10', title: 'Deployment Pipeline' },
  ]

  // Get the current project based on the route ID
  const currentProject = projectsData.find(p => p.value === id) || projectsData[0]
  const currentChat = chatTitles.find(c => c.id === chatId)

  // Subscribe to global sidebar store
  useEffect(() => {
    // Subscribe to sidebar store changes
    const unsubscribe = sidebarStore.subscribe((isOpen) => {
      setIsMenuOpen(isOpen)
    })

    // Hydrate store (only happens once)
    sidebarStore.hydrate()

    return unsubscribe
  }, [])

  // Handle clicking outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (openDropdown && !(event.target as Element).closest('.chat-dropdown')) {
        setOpenDropdown(null)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [openDropdown])

  const handleSubmit = () => {
    if (input.trim() || files.length > 0) {
      setIsLoading(true)
      // Here you would handle the actual message sending
      console.log("Sending message:", input)
      console.log("Project ID:", id)
      console.log("Chat ID:", chatId)

      setTimeout(() => {
        setIsLoading(false)
        setInput("")
        setFiles([])
      }, 2000)
    }
  }

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) {
      const newFiles = Array.from(event.target.files)
      setFiles((prev) => [...prev, ...newFiles])
    }
  }

  const handleRemoveFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index))
    if (uploadInputRef?.current) {
      uploadInputRef.current.value = ""
    }
  }

  const handleProjectSelect = (projectValue: string) => {
    const project = projectsData.find(p => p.value === projectValue)
    if (project) {
      // Navigate to project with same chat settings
      router.push(`/project/${projectValue}/${chatId}/settings`)
    }
  }

  const handleChatAction = (action: string, chatActionId: string) => {
    console.log(`${action} action for chat:`, chatActionId)
    setOpenDropdown(null)
    // Add actual implementation here
  }

  const handleChatClick = (clickedChatId: string) => {
    router.push(`/project/${id}/${clickedChatId}/settings`)
  }

  return (
    <div className="flex h-screen bg-white relative">
      {/* Backdrop overlay when select is open */}
      {isSelectOpen && (
        <div className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40 transition-all duration-200" />
      )}
      {/* Sidebar */}
      <div
        className={`${
          isMenuOpen ? "w-[28em]" : "w-0"
        } ${allowAnimations ? "transition-all duration-150 ease-in-out" : ""} overflow-hidden flex-shrink-0 ${isMenuOpen ? "p-4" : "p-0"}`}
      >
        <div className="w-[28em] h-full bg-gray-50 rounded-2xl p-6 shadow-lg flex-shrink-0">
          <div className="flex items-center justify-end mb-6">
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  // Just navigate - the global store will maintain state
                  router.push(`/project/${id}/settings`)
                }}
                className="flex items-center justify-center w-8 h-8 rounded-lg hover:bg-gray-200 transition-colors"
              >
                <Settings className="w-5 h-5 text-gray-600" />
              </button>
              <button
                onClick={() => {
                  setAllowAnimations(true)  // Enable animations for user interaction
                  sidebarStore.setIsOpenExplicit(false)  // Only save to sessionStorage on explicit close
                }}
                className="flex items-center justify-center w-8 h-8 rounded-lg hover:bg-gray-200 transition-colors"
              >
                <X className="w-5 h-5 text-gray-600" />
              </button>
            </div>
          </div>

          <div className="mb-6">
            <div className="relative">
              {/* Dummy placeholder to maintain layout */}
              <div className="h-12 w-full rounded-[30px] border border-gray-300 bg-white shadow-sm opacity-0 pointer-events-none" />
              {/* Actual Select component positioned absolutely */}
              <div className="absolute top-0 left-0 w-full z-50">
                <Select
                  data={projectsData}
                  defaultValue={currentProject.value}
                  onOpenChange={setIsSelectOpen}
                  onChange={handleProjectSelect}
                />
              </div>
            </div>
          </div>

          {/* New Chat Button */}
          <div className="mb-6">
            <button
              onClick={() => {
                router.push(`/project/${id}`)
              }}
              className="w-full flex items-center gap-3 px-3 py-3 rounded-lg bg-blue-500 hover:bg-blue-600 transition-colors text-white font-medium"
            >
              <Plus className="w-5 h-5" />
              <span>New Chat</span>
            </button>
          </div>

          <div className="flex-1 overflow-hidden">

            <div className="h-full overflow-y-auto space-y-2">
              {chatTitles.map((chat) => (
                <div
                  key={chat.id}
                  className={`group px-3 py-3 rounded-lg cursor-pointer relative ${
                    chat.id === chatId
                      ? 'bg-blue-100 border-l-4 border-blue-500'
                      : 'hover:bg-gray-200'
                  }`}
                  onClick={() => handleChatClick(chat.id)}
                >
                  <div className="flex items-center justify-between">
                    <div className={`font-medium text-base flex-1 mr-2 ${
                      chat.id === chatId ? 'text-blue-900' : 'text-gray-900'
                    }`}>
                      {chat.title}
                    </div>

                    {/* 3-dot button that fades in on hover */}
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

                      {/* Dropdown menu */}
                      {openDropdown === chat.id && (
                        <div className="absolute right-0 top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 w-40">
                          <button
                            onClick={() => handleChatAction('edit', chat.id)}
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
      </div>

      {/* Main Content Area - Chat Settings */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Settings Content with fade animation */}
        <div className="flex-1 flex flex-col animate-in fade-in duration-300">
          {/* Settings Header */}
          <div className="p-4 border-b border-gray-200">
            <div className="flex items-center gap-4">
              <button
                className={`flex items-center justify-center w-10 h-10 rounded-lg hover:bg-gray-100 transition-all duration-300 ${
                  isMenuOpen ? "opacity-0 pointer-events-none" : "opacity-100"
                }`}
                onClick={() => {
                  setAllowAnimations(true)  // Enable animations for user interaction
                  sidebarStore.setIsOpen(true, false)  // Open but don't save to sessionStorage
                }}
              >
                <Menu className="w-6 h-6 text-gray-600" />
              </button>
              <button
                onClick={() => {
                  // Navigate back to chat
                  router.push(`/project/${id}/${chatId}`)
                }}
                className="flex items-center justify-center w-10 h-10 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <ArrowLeft className="w-5 h-5 text-gray-600" />
              </button>
              <h1 className="text-xl font-semibold text-gray-900">
                {currentChat?.title} Settings
              </h1>
            </div>
          </div>

          {/* Settings Content */}
          <div className="flex-1 p-6">
            <div className="max-w-2xl mx-auto space-y-6">
              <div className="space-y-2">
                <h2 className="text-lg font-medium text-gray-900">Chat Settings</h2>
                <p className="text-sm text-gray-500">Manage settings for this specific chat.</p>
              </div>

              <div className="space-y-4">
                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="font-medium text-gray-900 mb-2">Chat Information</h3>
                  <div className="space-y-2 text-sm text-gray-600">
                    <p><span className="font-medium">Chat ID:</span> {chatId}</p>
                    <p><span className="font-medium">Title:</span> {currentChat?.title}</p>
                    <p><span className="font-medium">Project:</span> {currentProject.label}</p>
                    <p><span className="font-medium">Created:</span> January 2024</p>
                  </div>
                </div>

                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="font-medium text-gray-900 mb-2">Chat Configuration</h3>
                  <div className="space-y-2">
                    <button className="w-full text-left px-3 py-2 rounded-lg hover:bg-gray-200 text-sm text-gray-700">
                      Rename Chat
                    </button>
                    <button className="w-full text-left px-3 py-2 rounded-lg hover:bg-gray-200 text-sm text-gray-700">
                      Chat Permissions
                    </button>
                    <button className="w-full text-left px-3 py-2 rounded-lg hover:bg-gray-200 text-sm text-gray-700">
                      Notification Settings
                    </button>
                    <button className="w-full text-left px-3 py-2 rounded-lg hover:bg-gray-200 text-sm text-gray-700">
                      Message History
                    </button>
                  </div>
                </div>

                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="font-medium text-gray-900 mb-2">Advanced Options</h3>
                  <div className="space-y-2">
                    <button className="w-full text-left px-3 py-2 rounded-lg hover:bg-gray-200 text-sm text-gray-700">
                      Export Chat History
                    </button>
                    <button className="w-full text-left px-3 py-2 rounded-lg hover:bg-gray-200 text-sm text-gray-700">
                      Archive Chat
                    </button>
                    <button className="w-full text-left px-3 py-2 rounded-lg hover:bg-red-100 text-sm text-red-600">
                      Delete Chat
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}