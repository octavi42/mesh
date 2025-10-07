"use client"

import { createContext, useContext, ReactNode } from "react"
import type { Project as UIProject, Chat } from "@/lib/types"
import type { Project as DBProject } from "@/lib/db/projects"
import type { Chat as DBChat } from "@/lib/db/chats"

type SidebarContextType = {
  projects: UIProject[]
  chats: Chat[]
}

const SidebarContext = createContext<SidebarContextType | undefined>(undefined)

export function SidebarProvider({
  children,
  initialProjects = [],
  initialChats = []
}: {
  children: ReactNode
  initialProjects?: DBProject[]
  initialChats?: DBChat[]
}) {
  const projects: UIProject[] = initialProjects.map(p => ({
    id: p.id,
    label: p.name,
    value: p.id,
    description: p.name,
    icon: '📊'
  }))

  const chats: Chat[] = initialChats.map(c => ({
    id: c.id,
    title: c.title
  }))

  return (
    <SidebarContext.Provider
      value={{
        projects,
        chats,
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
