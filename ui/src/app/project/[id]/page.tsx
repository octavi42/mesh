"use client"

import {
  PromptInput,
  PromptInputAction,
  PromptInputActions,
  PromptInputTextarea,
} from "@/components/ui/prompt-input"
import { Button } from "@/components/ui/button"
import Select from "@/components/ui/select"
import { ArrowUp, Menu, Paperclip, Square, X, Settings } from "lucide-react"
import { useRef, useState, use, useEffect } from "react"
import { useRouter } from "next/navigation"
// import { Sheet, VisuallyHidden } from "@silk-hq/components"

export default function ProjectChat({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const [input, setInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [files, setFiles] = useState<File[]>([])
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [isSelectOpen, setIsSelectOpen] = useState(false)
  const [isInitialLoad, setIsInitialLoad] = useState(true)
  const [isNavigating, setIsNavigating] = useState(false)
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

  // Get the current project based on the route ID
  const currentProject = projectsData.find(p => p.value === id) || projectsData[0]

  // Restore sidebar state from sessionStorage after hydration
  useEffect(() => {
    const savedState = sessionStorage.getItem('sidebarOpen')
    if (savedState === 'true') {
      setIsMenuOpen(true)
    }
    // Ensure select is closed on page load
    setIsSelectOpen(false)
    // Set initial load to false after state is restored
    setTimeout(() => setIsInitialLoad(false), 100)
  }, [])

  const handleSubmit = () => {
    if (input.trim() || files.length > 0) {
      setIsLoading(true)
      // Here you would handle the actual message sending
      console.log("Sending message:", input)
      console.log("Project ID:", id)

      setTimeout(() => {
        setIsLoading(false)
        setInput("")
        setFiles([])
      }, 2000)
    }
  }

  // Debug function
  console.log("Menu state:", isMenuOpen)

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
      // Set navigating state to prevent blur changes
      setIsNavigating(true)
      setIsSelectOpen(false)
      // Navigate to the new project
      router.push(`/project/${projectValue}`)
    }
  }

  return (
    <div className="flex h-screen bg-white">
      {/* Sidebar */}
      <div
        className={`${
          isMenuOpen ? "w-[28em]" : "w-0"
        } ${isInitialLoad ? "" : "transition-all duration-300 ease-in-out"} overflow-hidden flex-shrink-0 ${isMenuOpen ? "p-4" : "p-0"}`}
      >
        <div className="w-[28em] h-full bg-gray-50 rounded-2xl p-6 shadow-lg flex-shrink-0">
          <div className="flex items-center justify-end mb-6">
            <div className="flex items-center gap-2">
              <button
                className="flex items-center justify-center w-8 h-8 rounded-lg hover:bg-gray-200 transition-colors"
              >
                <Settings className="w-5 h-5 text-gray-600" />
              </button>
              <button
                onClick={() => {
                  setIsMenuOpen(false)
                  sessionStorage.setItem('sidebarOpen', 'false')
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
              <div className="absolute top-0 left-0 w-full">
                <Select
                  data={projectsData}
                  defaultValue={currentProject.value}
                  onOpenChange={setIsSelectOpen}
                  onChange={handleProjectSelect}
                />
              </div>
            </div>
          </div>

          <div className={`space-y-4 transition-all duration-300 ${isSelectOpen ? "blur-sm" : ""}`}>
            <div className="text-gray-700">
              <p className="font-medium mb-2">Project: {id}</p>
              <div className="text-sm text-gray-500">
                <p>Team chat interface</p>
                <p>Share files and messages</p>
              </div>
            </div>

            <div className="pt-4 border-t border-gray-200">
              <h3 className="font-medium text-gray-900 mb-2">Quick Actions</h3>
              <div className="space-y-2">
                <button className="w-full text-left px-3 py-2 rounded-lg hover:bg-gray-200 text-sm text-gray-700">
                  View Project Details
                </button>
                <button className="w-full text-left px-3 py-2 rounded-lg hover:bg-gray-200 text-sm text-gray-700">
                  Team Members
                </button>
                <button className="w-full text-left px-3 py-2 rounded-lg hover:bg-gray-200 text-sm text-gray-700">
                  Settings
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Chat Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <div className="p-4">
          <button
            className={`flex items-center justify-center w-10 h-10 rounded-lg hover:bg-gray-100 transition-all duration-300 ${
              isMenuOpen ? "opacity-0" : "opacity-100"
            }`}
            onClick={() => {
              setIsMenuOpen(true)
              sessionStorage.setItem('sidebarOpen', 'true')
            }}
          >
            <Menu className="w-6 h-6 text-gray-600" />
          </button>
        </div>

        {/* Chat Messages Area */}
        <div className="flex-1 overflow-y-auto p-4">
          <div className="flex h-full items-center justify-center text-gray-400">
            Start chatting with your team...
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
  )
}