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
  const [isMenuOpen, setIsMenuOpen] = useState(() => sidebarStore.getIsOpen())
  const [allowAnimations, setAllowAnimations] = useState(false)

  const currentProject = projects.find(p => p.value === projectId) || projects[0] || { id: '', label: '', value: '', description: '', icon: '' }
  const { data: chats = [] } = useChats(currentProject?.id)

  // Set user context for RLS policies
  useEffect(() => {
    if (session?.user?.id) {
      setUserContext(session.user.id)
    }
  }, [session?.user?.id])

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



  return (
    <SheetStack.Root>
      <div className="flex h-screen bg-gradient-to-b from-slate-50 via-white to-slate-50 relative">
        <div
          className={`${
            isMenuOpen ? "w-[28em]" : "w-0"
          } ${allowAnimations ? "transition-all duration-150 ease-in-out" : ""} overflow-hidden flex-shrink-0 ${isMenuOpen ? "p-4" : "p-0"}`}
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
              sidebarStore.setIsOpen(true, false)
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