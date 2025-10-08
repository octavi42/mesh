"use client"

import Link from "next/link"
import { Plus } from "lucide-react"
import { SidebarHeader } from "./sidebar-header"
import { ChatList } from "./chat-list"
import { type Project, type Chat } from "@/lib/types"

type ProjectSidebarProps = {
  onClose: () => void
  currentProject: Project
  projects: Project[]
  chats: Chat[]
  currentChatId?: string
  projectId: string
}

export function ProjectSidebar({
  onClose,
  currentProject,
  projects,
  chats,
  currentChatId,
  projectId,
}: ProjectSidebarProps) {
  return (
    <div className="w-[24em] h-full bg-white/60 backdrop-blur-sm rounded-2xl p-6 shadow-sm border border-slate-200/50 flex-shrink-0 flex flex-col">
      <SidebarHeader
        onClose={onClose}
        currentProject={currentProject}
        projects={projects}
        projectId={projectId}
      />

      <div className="mb-6">
        <Link
          href={`/project/${projectId}`}
          prefetch={true}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-blue-500 hover:bg-blue-600 transition-colors text-white font-normal shadow-sm"
        >
          <Plus className="w-5 h-5" />
          <span>New Chat</span>
        </Link>
      </div>

      <div className="flex-1 overflow-hidden">
        <div className="h-full overflow-y-auto">
          <ChatList
            chats={chats}
            currentChatId={currentChatId}
            projectId={projectId}
          />
        </div>
      </div>
    </div>
  )
}