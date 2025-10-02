"use client"

import { ReactNode, useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { SheetStack } from "@silk-hq/components"
import { sidebarStore } from "@/lib/sidebar-store"
import { ProjectSidebar } from "@/components/sidebar/project-sidebar"
import { ProjectHeader } from "./project-header"
import { useSidebarData } from "@/lib/contexts/sidebar-context"

type ProjectLayoutProps = {
  projectId: string
  currentChatId?: string
  headerTitle?: string
  hideUserAvatars?: boolean
  children: ReactNode
}

export function ProjectLayout({ projectId, currentChatId, headerTitle, hideUserAvatars, children }: ProjectLayoutProps) {
  const router = useRouter()
  const { projects, chats } = useSidebarData()
  const [isMenuOpen, setIsMenuOpen] = useState(() => sidebarStore.getIsOpen())
  const [allowAnimations, setAllowAnimations] = useState(false)

  const currentProject = projects.find(p => p.value === projectId) || projects[0]

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

  const handleProjectSelect = (projectValue: string) => {
    if (currentChatId) {
      router.push(`/project/${projectValue}/${currentChatId}`)
    } else {
      router.push(`/project/${projectValue}`)
    }
  }

  const handleChatClick = (chatId: string) => {
    router.push(`/project/${projectId}/${chatId}`)
  }

  return (
    <SheetStack.Root>
      <div className="flex h-screen bg-gradient-to-b from-slate-50 via-white to-slate-50 relative">
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
            projects={projects}
            chats={chats}
            currentChatId={currentChatId}
            onProjectChange={handleProjectSelect}
            onChatClick={handleChatClick}
            onNewChat={() => router.push(`/project/${projectId}`)}
            onSettingsClick={() => router.push(`/project/${projectId}/settings`)}
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