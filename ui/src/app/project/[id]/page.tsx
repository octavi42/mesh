"use client"

import { Menu } from "lucide-react"
import { useState, use, useEffect } from "react"
import { useRouter } from "next/navigation"
import { sidebarStore } from "@/lib/sidebar-store"
import { SheetStack } from "@silk-hq/components"
import { ProjectSidebar, type Project, type Chat } from "@/components/sidebar/project-sidebar"
import { AccountSheet } from "@/components/sheets/account-sheet"
import { ChatInput } from "@/components/chat/chat-input"

export default function ProjectChat({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const [input, setInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [files, setFiles] = useState<File[]>([])
  const [isMenuOpen, setIsMenuOpen] = useState(() => sidebarStore.getIsOpen())
  const [allowAnimations, setAllowAnimations] = useState(false)

  const projectsData: Project[] = [
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

  const chatTitles: Chat[] = [
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

  const currentProject = projectsData.find(p => p.value === id) || projectsData[0]

  useEffect(() => {
    const unsubscribe = sidebarStore.subscribe((isOpen) => {
      setIsMenuOpen(isOpen)
    })

    sidebarStore.hydrate()

    const currentState = sidebarStore.getIsOpen()
    if (currentState !== isMenuOpen) {
      setIsMenuOpen(currentState)
    }

    return unsubscribe
  }, [isMenuOpen])

  const handleSubmit = () => {
    if (input.trim() || files.length > 0) {
      setIsLoading(true)
      console.log("Sending message:", input)
      console.log("Project ID:", id)

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
  }

  const handleProjectSelect = (projectValue: string) => {
    router.push(`/project/${projectValue}`)
  }

  const handleChatClick = (chatId: string) => {
    router.push(`/project/${id}/${chatId}`)
  }

  return (
    <SheetStack.Root>
      <div className="flex h-screen bg-white relative">
        <div
          className={`${
            isMenuOpen ? "w-[28em]" : "w-0"
          } ${allowAnimations ? "transition-all duration-150 ease-in-out" : ""} overflow-hidden flex-shrink-0 ${isMenuOpen ? "p-4" : "p-0"}`}
        >
          <ProjectSidebar
            isOpen={isMenuOpen}
            onClose={() => {
              setAllowAnimations(true)
              sidebarStore.setIsOpenExplicit(false)
            }}
            currentProject={currentProject}
            projects={projectsData}
            chats={chatTitles}
            onProjectChange={handleProjectSelect}
            onChatClick={handleChatClick}
            onNewChat={() => router.push(`/project/${id}`)}
            onSettingsClick={() => router.push(`/project/${id}/settings`)}
          />
        </div>

        <div className="flex-1 flex flex-col min-w-0">
          <div className="p-4">
            <div className="flex items-center justify-between w-full">
              <button
                className={`flex items-center justify-center w-10 h-10 rounded-lg hover:bg-gray-100 transition-all duration-300 ${
                  isMenuOpen ? "opacity-0 pointer-events-none" : "opacity-100"
                }`}
                onClick={() => {
                  setAllowAnimations(true)
                  sidebarStore.setIsOpen(true, false)
                }}
              >
                <Menu className="w-6 h-6 text-gray-600" />
              </button>

              <AccountSheet />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4">
            <div className="flex h-full items-center justify-center text-gray-400">
              Start chatting with your team...
            </div>
          </div>

          <ChatInput
            input={input}
            onInputChange={setInput}
            isLoading={isLoading}
            onSubmit={handleSubmit}
            files={files}
            onFileChange={handleFileChange}
            onRemoveFile={handleRemoveFile}
          />
        </div>
      </div>
    </SheetStack.Root>
  )
}