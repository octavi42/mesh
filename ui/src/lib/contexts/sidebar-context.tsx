"use client"

import { createContext, useContext, ReactNode } from "react"
import { projectsData } from "@/lib/data/projects"
import { chatTitles } from "@/lib/data/chats"
import type { Project, Chat } from "@/lib/types"

type SidebarContextType = {
  projects: Project[]
  chats: Chat[]
}

const SidebarContext = createContext<SidebarContextType | undefined>(undefined)

export function SidebarProvider({ children }: { children: ReactNode }) {
  return (
    <SidebarContext.Provider
      value={{
        projects: projectsData,
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
