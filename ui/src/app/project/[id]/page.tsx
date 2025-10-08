"use client"

import { useState, use } from "react"
import { useRouter } from "next/navigation"
import { useQueryClient } from "@tanstack/react-query"
import { ProjectLayout } from "@/components/layout/project-layout"
import { EditableChatTitle } from "@/components/chat/editable-chat-title"
import { CreateChatPanel } from "@/components/chat/create-chat-panel"
import { createChat } from "@/lib/actions/chat-actions"

export default function ProjectChat({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const queryClient = useQueryClient()
  const [chatTitle, setChatTitle] = useState("New Chat")

  const handleTitleChange = (newTitle: string) => {
    setChatTitle(newTitle)
  }

  const handleCreateChat = async (selectedUsers: string[], externalEmails: string[]) => {
    try {
      const userIds = selectedUsers.filter(id => !id.includes('@'))
      const emails = [...selectedUsers.filter(id => id.includes('@')), ...externalEmails]

      const chat = await createChat({
        projectId: id,
        title: chatTitle,
        userIds: userIds.length > 0 ? userIds : undefined,
        externalEmails: emails.length > 0 ? emails : undefined,
      })

      queryClient.invalidateQueries({ queryKey: ['chats', id] })

      router.push(`/project/${id}/${chat.id}`)
      router.refresh()
    } catch (error) {
      console.error('Failed to create chat:', error)
    }
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