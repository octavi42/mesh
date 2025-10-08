"use client"

import { ReactNode, useState, useEffect } from "react"
import { SheetStack } from "@silk-hq/components"
import { sidebarStore } from "@/lib/sidebar-store"
import { ProjectSidebar } from "@/components/sidebar/project-sidebar"
import { ProjectHeader } from "./project-header"
import { useSidebarData } from "@/lib/contexts/sidebar-context"
import { setUserContext } from "@/lib/supabase/client"
import { useSession } from "@/lib/hooks/use-session"
import { useChats } from "@/lib/hooks/use-chats"

type ProjectLayoutProps = {
  projectId: string
  currentChatId?: string
  headerTitle?: string | ReactNode
  hideUserAvatars?: boolean
  children: ReactNode
}

export function ProjectLayout({ projectId, currentChatId, headerTitle, hideUserAvatars, children }: ProjectLayoutProps) {
  const { projects } = useSidebarData()
  const { data: session } = useSession()
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [allowAnimations, setAllowAnimations] = useState(false)

  const currentProject = projects.find(p => p.value === projectId) || projects[0] || { id: '', label: '', value: '', description: '', icon: '' }
  const { data: chats = [], isLoading: isChatsLoading } = useChats(projectId)

  console.log('[ProjectLayout] ProjectId:', projectId)
  console.log('[ProjectLayout] CurrentProject:', currentProject)
  console.log('[ProjectLayout] Chats:', chats)
  console.log('[ProjectLayout] IsChatsLoading:', isChatsLoading)

  // Set user context for RLS policies
  useEffect(() => {
    if (session?.user?.id) {
      setUserContext(session.user.id)
    }
  }, [session?.user?.id])

  useEffect(() => {
    const unsubscribe = sidebarStore.subscribe((isOpen) => {
      setIsMenuOpen(isOpen)
      if (isOpen) {
        document.documentElement.classList.add('sidebar-open')
      } else {
        document.documentElement.classList.remove('sidebar-open')
      }
    })

    sidebarStore.hydrate()
    const currentState = sidebarStore.getIsOpen()
    setIsMenuOpen(currentState)

    if (currentState) {
      document.documentElement.classList.add('sidebar-open')
    } else {
      document.documentElement.classList.remove('sidebar-open')
    }

    return unsubscribe
  }, [])



  return (
    <SheetStack.Root>
      <div className="flex h-screen bg-gradient-to-b from-slate-50 via-white to-slate-50 relative">
        <div
          className={`sidebar-container ${allowAnimations ? "transition-all duration-150 ease-in-out" : ""} overflow-hidden flex-shrink-0`}
        >
          <ProjectSidebar
            onClose={() => {
              setAllowAnimations(true)
              sidebarStore.setIsOpenExplicit(false)
            }}
            currentProject={currentProject}
            projects={projects}
            chats={chats}
            currentChatId={currentChatId}
            projectId={projectId}
          />
        </div>

        <div className="flex-1 flex flex-col min-w-0">
          <ProjectHeader
            isMenuOpen={isMenuOpen}
            onMenuToggle={() => {
              setAllowAnimations(true)
              sidebarStore.setIsOpenExplicit(true)
            }}
            title={headerTitle}
            hideUserAvatars={hideUserAvatars}
            currentChatId={currentChatId}
          />

          {children}
        </div>
      </div>
    </SheetStack.Root>
  )
}