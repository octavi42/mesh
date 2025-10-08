"use client"

import { useState, use, useEffect, useCallback } from "react"
import { ProjectLayout } from "@/components/layout/project-layout"
import { ChatInput } from "@/components/chat/chat-input"
import { MessageBubble } from "@/components/chat/message-bubble"
import { LlmMessageBubble } from "@/components/chat/llm-message-bubble"
import { createClient, setUserContext } from "@/lib/supabase/client"
import { sendMessage } from "@/lib/actions/message-actions"
import { useRealtimeMessages } from "@/lib/hooks/use-realtime-messages"
import { useSession } from "@/lib/hooks/use-session"
import { useMessages } from "@/lib/hooks/use-messages"
import { useChat } from "@/lib/hooks/use-chats"
import { useQueryClient } from "@tanstack/react-query"


export default function ChatPage({ params }: { params: Promise<{ id: string; chatId: string }> }) {
  const { id, chatId } = use(params)
  const [input, setInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [files, setFiles] = useState<File[]>([])
  const [hoveredGroupId, setHoveredGroupId] = useState<string | null>(null)
  const { data: session } = useSession()
  const queryClient = useQueryClient()
  const { data: messages = [] } = useMessages(chatId)
  const { data: chatData } = useChat(chatId)
  const chatTitle = chatData?.name || ''

  // Set user context for RLS policies
  useEffect(() => {
    if (session?.user?.id) {
      setUserContext(session.user.id)
    }
  }, [session?.user?.id])


  const handleRealtimeMessage = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['messages', chatId] })
  }, [chatId, queryClient])

  useRealtimeMessages(chatId, handleRealtimeMessage)

  const [currentUserData, setCurrentUserData] = useState<{
    name: string
    avatar: string
  } | null>(null)

  useEffect(() => {
    async function loadUserData() {
      if (!session?.user?.id) return

      const supabase = createClient()
      const { data: userData } = await supabase
        .from('users')
        .select('display_name, avatar_url')
        .eq('id', session.user.id)
        .single()

      if (userData) {
        setCurrentUserData({
          name: userData.display_name || 'Unknown',
          avatar: userData.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${userData.display_name}`
        })
      }
    }

    loadUserData()
  }, [session?.user?.id])

  const currentUserId = session?.user?.id || ""
  const currentUserName = currentUserData?.name || "You"
  const currentUserAvatar = currentUserData?.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${currentUserName}`

  const handleSubmit = async () => {
    if (!input.trim() && files.length === 0) return
    if (!session?.user?.id) return

    const messageText = input
    const messageFiles = [...files]

    setInput("")
    setFiles([])

    const tempId = `temp-${Date.now()}`
    const optimisticMessage = {
      id: tempId,
      content: messageText,
      userId: currentUserId,
      userName: currentUserName,
      avatarUrl: currentUserAvatar,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      createdAt: new Date(),
      user: {
        id: currentUserId,
        name: currentUserName,
        image: currentUserAvatar,
        isAccepted: true,
        integrations: []
      }
    }

    queryClient.setQueryData(['messages', chatId], (old: unknown = []) => [...(Array.isArray(old) ? old : []), optimisticMessage])

    try {
      setIsLoading(true)

      await sendMessage({
        chatId,
        content: messageText
      })

      queryClient.invalidateQueries({ queryKey: ['messages', chatId] })
      setIsLoading(false)
    } catch (error) {
      setIsLoading(false)
      queryClient.setQueryData(['messages', chatId], (old: unknown = []) =>
        Array.isArray(old) ? old.filter((msg: { id: string }) => msg.id !== tempId) : []
      )
      setInput(messageText)
      setFiles(messageFiles)

      console.error("Failed to send message:", error)
    }
  }

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) {
      const newFiles = Array.from(event.target.files)
      setFiles((prev) => [...prev, ...newFiles])
    }
  }

  const handleRemoveFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index))
  }

  return (
    <ProjectLayout projectId={id} currentChatId={chatId} headerTitle={chatTitle || 'Chat'}>
      <div className="flex-1 overflow-y-auto p-4">
        <div className="mx-auto max-w-3xl">
          {messages.map((message, index) => {
            if (message.isLlm) {
              return (
                <LlmMessageBubble
                  key={message.id}
                  message={message.content}
                  isStreaming={message.isStreaming}
                  avatarUrl={message.avatarUrl}
                  userName={message.userName}
                />
              )
            }

            const prevMessage = index > 0 ? messages[index - 1] : null
            const nextMessage = index < messages.length - 1 ? messages[index + 1] : null

            const isSameUserAsPrev = prevMessage?.userId === message.userId
            const timeGapFromPrev = prevMessage && prevMessage.createdAt && message.createdAt
              ? (message.createdAt.getTime() - prevMessage.createdAt.getTime()) / (1000 * 60)
              : Infinity

            const isSameUserAsNext = nextMessage?.userId === message.userId
            const timeGapToNext = nextMessage && nextMessage.createdAt && message.createdAt
              ? (nextMessage.createdAt.getTime() - message.createdAt.getTime()) / (1000 * 60)
              : Infinity

            const isConsecutive = isSameUserAsPrev && timeGapFromPrev < 2
            const isLastInGroup = !(isSameUserAsNext && timeGapToNext < 2)
            const showAvatar = !isConsecutive

            let groupId = message.id
            if (isConsecutive && prevMessage) {
              let idx = index - 1
              while (idx >= 0) {
                const msg = messages[idx]
                const prevMsg = idx > 0 ? messages[idx - 1] : null
                const isSameUser = prevMsg?.userId === msg.userId
                const timeGap = prevMsg && prevMsg.createdAt && msg.createdAt
                  ? (msg.createdAt.getTime() - prevMsg.createdAt.getTime()) / (1000 * 60)
                  : Infinity
                if (!isSameUser || timeGap >= 2) {
                  groupId = msg.id
                  break
                }
                idx--
              }
              if (idx === -1) groupId = messages[0].id
            }

            return (
              <MessageBubble
                key={message.id}
                message={message.content}
                isCurrentUser={message.userId === currentUserId}
                avatarUrl={message.avatarUrl}
                userName={message.userName}
                timestamp={message.timestamp}
                isConsecutive={isConsecutive}
                showAvatar={showAvatar}
                isLastInGroup={isLastInGroup}
                onHoverChange={(isHovered) => setHoveredGroupId(isHovered ? groupId : null)}
                showTimestamp={hoveredGroupId === groupId}
                user={message.user}
              />
            )
          })}
        </div>
      </div>

      <ChatInput
        input={input}
        onInputChange={setInput}
        isLoading={isLoading}
        onSubmit={handleSubmit}
        files={files}
        onFileChange={handleFileChange}
        onRemoveFile={handleRemoveFile}
      />
    </ProjectLayout>
  )
}