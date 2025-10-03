"use client"

import { createContext, useContext, ReactNode } from "react"
import { chatTitles } from "@/lib/data/chats"
import type { Project as UIProject, Chat } from "@/lib/types"
import type { Project as DBProject } from "@/lib/db/projects"

type SidebarContextType = {
  projects: UIProject[]
  chats: Chat[]
}

const SidebarContext = createContext<SidebarContextType | undefined>(undefined)

export function SidebarProvider({
  children,
  initialProjects = []
}: {
  children: ReactNode
  initialProjects?: DBProject[]
}) {
  const projects: UIProject[] = initialProjects.map(p => ({
    id: p.id,
    label: p.name,
    value: p.name.toLowerCase().replace(/\s+/g, '_'),
    description: p.name,
    icon: '📊'
  }))

  return (
    <SidebarContext.Provider
      value={{
        projects,
        chats: chatTitles,
      }}
    >
      {children}
    </SidebarContext.Provider>
  )
}

export function useSidebarData() {
  const context = useContext(SidebarContext)
  if (!context) {
    throw new Error("useSidebarData must be used within SidebarProvider")
  }
  return context
}
