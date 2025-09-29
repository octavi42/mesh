"use client"

import {
  PromptInput,
  PromptInputAction,
  PromptInputActions,
  PromptInputTextarea,
} from "@/components/ui/prompt-input"
import { Button } from "@/components/ui/button"
import Select from "@/components/ui/select"
import { ArrowUp, Menu, Paperclip, Square, X, Settings, MoreHorizontal, Edit3, Type, Trash2, Plus, User, CreditCard } from "lucide-react"
import { useRef, useState, use, useEffect } from "react"
import { useRouter } from "next/navigation"
import { sidebarStore } from "@/lib/sidebar-store"
import { Sheet, SheetStack } from "@silk-hq/components"

export default function ChatPage({ params }: { params: Promise<{ id: string; chatId: string }> }) {
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

    // Ensure local state matches store state
    const currentState = sidebarStore.getIsOpen()
    if (currentState !== isMenuOpen) {
      setIsMenuOpen(currentState)
    }

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
      // Navigate to project with same chat
      router.push(`/project/${projectValue}/${chatId}`)
    }
  }

  const handleChatAction = (action: string, chatActionId: string) => {
    console.log(`${action} action for chat:`, chatActionId)
    console.log(`Navigating to: /project/${id}/${chatActionId}/settings`)
    setOpenDropdown(null)

    if (action === 'edit') {
      router.push(`/project/${id}/${chatActionId}/settings`)
    }
    // Add other action implementations here
  }

  const handleChatClick = (clickedChatId: string) => {
    router.push(`/project/${id}/${clickedChatId}`)
  }

  return (
    <SheetStack.Root>
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
      </div>

      {/* Main Chat Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center justify-between w-full">
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
              <h1 className="text-xl font-semibold text-gray-900">
                {currentChat?.title || 'Chat'}
              </h1>
            </div>

            {/* Avatar for Account Menu */}
            <Sheet.Root license="commercial" forComponent="closest">
              <Sheet.Trigger asChild>
                <button className="flex items-center justify-center w-10 h-10 rounded-full bg-blue-500 hover:bg-blue-600 transition-colors">
                  <User className="w-5 h-5 text-white" />
                </button>
              </Sheet.Trigger>

              <Sheet.Portal>
                <Sheet.View
                  contentPlacement="right"
                  nativeEdgeSwipePrevention={true}
                >
                  <Sheet.Backdrop travelAnimation={{ opacity: [0, 0.3] }} />
                  <div className="p-12 h-full flex items-center justify-end">
                    <Sheet.Content
                      className="bg-white rounded-2xl shadow-xl max-w-xs w-full"
                    stackingAnimation={{
                      translateX: ({ progress }: { progress: number }) =>
                        progress <= 1
                          ? progress * -10 + "px"
                          : "calc(-12.5px + 2.5px *" + progress + ")",
                      scale: [1, 0.933],
                      transformOrigin: "0 50%",
                    }}
                  >
                    <div className="p-8">
                      <div className="flex items-center justify-between mb-6">
                        <h2 className="text-lg font-semibold text-gray-900">Account</h2>
                        <Sheet.Trigger action="dismiss" asChild>
                          <button className="flex items-center justify-center w-8 h-8 rounded-lg hover:bg-gray-200 transition-colors">
                            <X className="w-5 h-5 text-gray-600" />
                          </button>
                        </Sheet.Trigger>
                      </div>

                      {/* User Profile Section */}
                      <div className="mb-6 p-4 bg-gray-50 rounded-xl">
                        <div className="flex items-center gap-3 mb-3">
                          <div className="w-12 h-12 rounded-full bg-blue-500 flex items-center justify-center">
                            <User className="w-6 h-6 text-white" />
                          </div>
                          <div>
                            <h3 className="font-medium text-gray-900">John Doe</h3>
                            <p className="text-sm text-gray-500">john.doe@teamz.com</p>
                          </div>
                        </div>
                        <div className="text-xs text-gray-400">
                          Member since January 2024
                        </div>
                      </div>

                      {/* Account Actions */}
                      <div className="space-y-2">
                        <Sheet.Root license="commercial" forComponent="closest">
                          <Sheet.Trigger asChild>
                            <button className="w-full flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-gray-100 transition-colors text-left">
                              <User className="w-5 h-5 text-gray-600" />
                              <span className="text-gray-900">Profile Settings</span>
                            </button>
                          </Sheet.Trigger>
                          <Sheet.Portal>
                            <Sheet.View contentPlacement="right" nativeEdgeSwipePrevention={true}>
                              <Sheet.Backdrop travelAnimation={{ opacity: [0, 0.3] }} />
                              <div className="p-12 h-full flex items-center justify-end">
                                <Sheet.Content
                                  className="bg-white rounded-2xl shadow-xl max-w-xs w-full"
                                  stackingAnimation={{
                                    translateX: ({ progress }: { progress: number }) =>
                                      progress <= 1
                                        ? progress * -10 + "px"
                                        : "calc(-12.5px + 2.5px *" + progress + ")",
                                    scale: [1, 0.933],
                                    transformOrigin: "0 50%",
                                  }}
                                >
                                  <div className="p-8">
                                    <div className="flex items-center justify-between mb-6">
                                      <h2 className="text-lg font-semibold text-gray-900">Profile Settings</h2>
                                      <Sheet.Trigger action="dismiss" asChild>
                                        <button className="flex items-center justify-center w-8 h-8 rounded-lg hover:bg-gray-200 transition-colors">
                                          <X className="w-5 h-5 text-gray-600" />
                                        </button>
                                      </Sheet.Trigger>
                                    </div>

                                    <div className="space-y-4">
                                      <div className="space-y-2">
                                        <label className="text-sm font-medium text-gray-900">Display Name</label>
                                        <input className="w-full px-3 py-2 border border-gray-300 rounded-lg" defaultValue="John Doe" />
                                      </div>
                                      <div className="space-y-2">
                                        <label className="text-sm font-medium text-gray-900">Email</label>
                                        <input className="w-full px-3 py-2 border border-gray-300 rounded-lg" defaultValue="john.doe@teamz.com" />
                                      </div>
                                      <div className="space-y-2">
                                        <label className="text-sm font-medium text-gray-900">Bio</label>
                                        <textarea className="w-full px-3 py-2 border border-gray-300 rounded-lg h-20" defaultValue="Product designer and team lead" />
                                      </div>
                                      <div className="flex gap-2 pt-4">
                                        <button className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors">Save Changes</button>
                                        <Sheet.Trigger action="dismiss" asChild>
                                          <button className="px-4 py-2 bg-gray-200 text-gray-900 rounded-lg hover:bg-gray-300 transition-colors">Cancel</button>
                                        </Sheet.Trigger>
                                      </div>
                                    </div>
                                  </div>
                                </Sheet.Content>
                              </div>
                            </Sheet.View>
                          </Sheet.Portal>
                        </Sheet.Root>

                        <Sheet.Root license="commercial" forComponent="closest">
                          <Sheet.Trigger asChild>
                            <button className="w-full flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-gray-100 transition-colors text-left">
                              <Settings className="w-5 h-5 text-gray-600" />
                              <span className="text-gray-900">Account Settings</span>
                            </button>
                          </Sheet.Trigger>
                          <Sheet.Portal>
                            <Sheet.View contentPlacement="right" nativeEdgeSwipePrevention={true}>
                              <Sheet.Backdrop travelAnimation={{ opacity: [0, 0.3] }} />
                              <div className="p-12 h-full flex items-center justify-end">
                                <Sheet.Content
                                  className="bg-white rounded-2xl shadow-xl max-w-xs w-full"
                                  stackingAnimation={{
                                    translateX: ({ progress }: { progress: number }) =>
                                      progress <= 1
                                        ? progress * -10 + "px"
                                        : "calc(-12.5px + 2.5px *" + progress + ")",
                                    scale: [1, 0.933],
                                    transformOrigin: "0 50%",
                                  }}
                                >
                                  <div className="p-8">
                                    <div className="flex items-center justify-between mb-6">
                                      <h2 className="text-lg font-semibold text-gray-900">Account Settings</h2>
                                      <Sheet.Trigger action="dismiss" asChild>
                                        <button className="flex items-center justify-center w-8 h-8 rounded-lg hover:bg-gray-200 transition-colors">
                                          <X className="w-5 h-5 text-gray-600" />
                                        </button>
                                      </Sheet.Trigger>
                                    </div>

                                    <div className="space-y-4">
                                      <div className="space-y-2">
                                        <h3 className="font-medium text-gray-900">Privacy & Security</h3>
                                        <div className="space-y-2">
                                          <label className="flex items-center gap-2">
                                            <input type="checkbox" className="rounded" defaultChecked />
                                            <span className="text-sm text-gray-700">Two-factor authentication</span>
                                          </label>
                                          <label className="flex items-center gap-2">
                                            <input type="checkbox" className="rounded" />
                                            <span className="text-sm text-gray-700">Email notifications</span>
                                          </label>
                                        </div>
                                      </div>
                                      <div className="space-y-2">
                                        <h3 className="font-medium text-gray-900">Preferences</h3>
                                        <select className="w-full px-3 py-2 border border-gray-300 rounded-lg">
                                          <option>Light Mode</option>
                                          <option>Dark Mode</option>
                                          <option>System</option>
                                        </select>
                                      </div>
                                      <div className="flex gap-2 pt-4">
                                        <button className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors">Save Changes</button>
                                        <Sheet.Trigger action="dismiss" asChild>
                                          <button className="px-4 py-2 bg-gray-200 text-gray-900 rounded-lg hover:bg-gray-300 transition-colors">Cancel</button>
                                        </Sheet.Trigger>
                                      </div>
                                    </div>
                                  </div>
                                </Sheet.Content>
                              </div>
                            </Sheet.View>
                          </Sheet.Portal>
                        </Sheet.Root>

                        <Sheet.Root license="commercial" forComponent="closest">
                          <Sheet.Trigger asChild>
                            <button className="w-full flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-gray-100 transition-colors text-left">
                              <CreditCard className="w-5 h-5 text-gray-600" />
                              <span className="text-gray-900">Billing</span>
                            </button>
                          </Sheet.Trigger>
                          <Sheet.Portal>
                            <Sheet.View contentPlacement="right" nativeEdgeSwipePrevention={true}>
                              <Sheet.Backdrop travelAnimation={{ opacity: [0, 0.3] }} />
                              <div className="p-12 h-full flex items-center justify-end">
                                <Sheet.Content
                                  className="bg-white rounded-2xl shadow-xl max-w-xs w-full"
                                  stackingAnimation={{
                                    translateX: ({ progress }: { progress: number }) =>
                                      progress <= 1
                                        ? progress * -10 + "px"
                                        : "calc(-12.5px + 2.5px *" + progress + ")",
                                    scale: [1, 0.933],
                                    transformOrigin: "0 50%",
                                  }}
                                >
                                  <div className="p-8">
                                    <div className="flex items-center justify-between mb-6">
                                      <h2 className="text-lg font-semibold text-gray-900">Billing & Usage</h2>
                                      <Sheet.Trigger action="dismiss" asChild>
                                        <button className="flex items-center justify-center w-8 h-8 rounded-lg hover:bg-gray-200 transition-colors">
                                          <X className="w-5 h-5 text-gray-600" />
                                        </button>
                                      </Sheet.Trigger>
                                    </div>

                                    <div className="space-y-4">
                                      <div className="bg-blue-50 rounded-lg p-4">
                                        <div className="flex items-center justify-between mb-2">
                                          <span className="text-sm font-medium text-blue-900">Current Plan</span>
                                          <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">Pro</span>
                                        </div>
                                        <div className="text-2xl font-bold text-blue-900">$29/month</div>
                                        <div className="text-xs text-blue-700">Next billing: Jan 15, 2024</div>
                                      </div>

                                      <div className="space-y-2">
                                        <h3 className="font-medium text-gray-900">Usage this month</h3>
                                        <div className="space-y-2">
                                          <div className="flex justify-between text-sm">
                                            <span className="text-gray-600">API Calls</span>
                                            <span className="text-gray-900">2,450 / 10,000</span>
                                          </div>
                                          <div className="w-full bg-gray-200 rounded-full h-2">
                                            <div className="bg-blue-500 h-2 rounded-full" style={{width: '24.5%'}}></div>
                                          </div>
                                          <div className="flex justify-between text-sm">
                                            <span className="text-gray-600">Storage</span>
                                            <span className="text-gray-900">1.2 GB / 5 GB</span>
                                          </div>
                                          <div className="w-full bg-gray-200 rounded-full h-2">
                                            <div className="bg-green-500 h-2 rounded-full" style={{width: '24%'}}></div>
                                          </div>
                                        </div>
                                      </div>

                                      <div className="space-y-2">
                                        <h3 className="font-medium text-gray-900">Payment Method</h3>
                                        <div className="flex items-center gap-2 text-sm text-gray-600">
                                          <CreditCard className="w-4 h-4" />
                                          <span>•••• •••• •••• 4242</span>
                                        </div>
                                      </div>

                                      <div className="flex gap-2 pt-4">
                                        <button className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors text-sm">Upgrade Plan</button>
                                        <button className="px-4 py-2 bg-gray-200 text-gray-900 rounded-lg hover:bg-gray-300 transition-colors text-sm">View History</button>
                                      </div>
                                    </div>
                                  </div>
                                </Sheet.Content>
                              </div>
                            </Sheet.View>
                          </Sheet.Portal>
                        </Sheet.Root>

                        <hr className="my-4 border-gray-300" />

                        <button className="w-full flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-red-100 transition-colors text-left">
                          <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                          </svg>
                          <span className="text-red-600">Sign Out</span>
                        </button>
                      </div>
                    </div>
                    </Sheet.Content>
                  </div>
                </Sheet.View>
              </Sheet.Portal>
            </Sheet.Root>
          </div>
        </div>

        {/* Chat Messages Area */}
        <div className="flex-1 overflow-y-auto p-4">
          <div className="flex h-full items-center justify-center text-gray-400">
            {currentChat ? `Welcome to ${currentChat.title}` : 'Start chatting with your team...'}
          </div>
        </div>

        {/* Chat Input Bar - Fixed at bottom */}
        <div className="p-4">
          <div className="mx-auto max-w-3xl">
            <PromptInput
              value={input}
              onValueChange={setInput}
              isLoading={isLoading}
              onSubmit={handleSubmit}
              className="w-full"
            >
              {files.length > 0 && (
                <div className="flex flex-wrap gap-2 pb-2">
                  {files.map((file, index) => (
                    <div
                      key={index}
                      className="bg-blue-50 border border-blue-200 flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-blue-900"
                    >
                      <Paperclip className="size-4" />
                      <span className="max-w-[120px] truncate">{file.name}</span>
                      <button
                        onClick={() => handleRemoveFile(index)}
                        className="hover:bg-blue-100 rounded-full p-1 text-blue-700"
                      >
                        <X className="size-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <PromptInputTextarea placeholder="Type your message..." />

              <PromptInputActions className="flex items-center justify-between gap-2 pt-2">
                <PromptInputAction tooltip="Attach files">
                  <label
                    htmlFor="file-upload"
                    className="hover:bg-gray-100 flex h-8 w-8 cursor-pointer items-center justify-center rounded-2xl transition-colors"
                  >
                    <input
                      ref={uploadInputRef}
                      type="file"
                      multiple
                      onChange={handleFileChange}
                      className="hidden"
                      id="file-upload"
                    />
                    <Paperclip className="text-gray-600 size-5" />
                  </label>
                </PromptInputAction>

                <PromptInputAction
                  tooltip={isLoading ? "Stop generation" : "Send message"}
                >
                  <Button
                    variant="default"
                    size="icon"
                    className="h-8 w-8 rounded-full"
                    onClick={handleSubmit}
                  >
                    {isLoading ? (
                      <Square className="size-5 fill-current" />
                    ) : (
                      <ArrowUp className="size-5" />
                    )}
                  </Button>
                </PromptInputAction>
              </PromptInputActions>
            </PromptInput>
          </div>
        </div>
      </div>
      </div>
    </SheetStack.Root>
  )
}