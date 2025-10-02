"use client"

import { Plus } from "lucide-react"
import Select from "@/components/ui/select"
import { SidebarHeader } from "./sidebar-header"
import { ChatList } from "./chat-list"
import { type Project, type Chat } from "@/lib/types"

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
  return (
    <div className="w-[24em] h-full bg-white/60 backdrop-blur-sm rounded-2xl p-6 shadow-sm border border-slate-200/50 flex-shrink-0 flex flex-col">
      <SidebarHeader
        onClose={onClose}
        onSettingsClick={onSettingsClick}
        currentProject={currentProject}
        projects={projects}
        onProjectChange={onProjectChange}
      />

      <div className="mb-6">
        <button
          onClick={onNewChat}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-blue-500 hover:bg-blue-600 transition-colors text-white font-normal shadow-sm"
        >
          <Plus className="w-5 h-5" />
          <span>New Chat</span>
        </button>
      </div>

      <div className="flex-1 overflow-hidden">
        <div className="h-full overflow-y-auto">
          <ChatList
            chats={chats}
            currentChatId={currentChatId}
            onChatClick={onChatClick}
          />
        </div>
      </div>
    </div>
  )
}