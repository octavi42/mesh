"use client"

import { useState, use } from "react"
import { ProjectLayout } from "@/components/layout/project-layout"
import { EditableChatTitle } from "@/components/chat/editable-chat-title"
import { CreateChatPanel } from "@/components/chat/create-chat-panel"

export default function ProjectChat({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const [chatTitle, setChatTitle] = useState("New Chat")

  const handleTitleChange = (newTitle: string) => {
    setChatTitle(newTitle)
  }

  const handleCreateChat = (selectedUsers: string[]) => {
    console.log("Creating chat:", chatTitle)
    console.log("Project ID:", id)
    console.log("Selected users:", selectedUsers)
  }

  return (
    <ProjectLayout
      projectId={id}
      headerTitle={
        <EditableChatTitle
          title={chatTitle}
          onTitleChange={handleTitleChange}
        />
      }
    >
      <div className="flex-1 flex items-center justify-center p-8">
        <CreateChatPanel
          projectId={id}
          onCreateChat={handleCreateChat}
        />
      </div>
    </ProjectLayout>
  )
}