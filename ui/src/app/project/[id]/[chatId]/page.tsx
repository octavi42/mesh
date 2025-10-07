"use client"

import { useState, use, useEffect, useCallback } from "react"
import { ProjectLayout } from "@/components/layout/project-layout"
import { ChatInput } from "@/components/chat/chat-input"
import { MessageBubble } from "@/components/chat/message-bubble"
import { LlmMessageBubble } from "@/components/chat/llm-message-bubble"
import { createClient } from "@/lib/supabase/client"
import { sendMessage } from "@/lib/actions/message-actions"
import { useRealtimeMessages } from "@/lib/hooks/use-realtime-messages"
import { useSession } from "@/lib/hooks/use-session"

interface Message {
  id: string
  content: string
  userId: string | null
  userName: string
  avatarUrl: string
  timestamp: string
  createdAt: Date
  isLlm?: boolean
  isStreaming?: boolean
  user?: {
    id: string | number
    name?: string
    image: string
    isAccepted?: boolean
    isInvited?: boolean
    integrations?: unknown[]
  }
}

export default function ChatPage({ params }: { params: Promise<{ id: string; chatId: string }> }) {
  const { id, chatId } = use(params)
  const [input, setInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [files, setFiles] = useState<File[]>([])
  const [hoveredGroupId, setHoveredGroupId] = useState<string | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [chatTitle, setChatTitle] = useState<string>('')
  const { data: session } = useSession()

  useEffect(() => {
    async function loadChatData() {
      const supabase = createClient()

      // Load chat info
      const { data: chatData } = await supabase
        .from('chats')
        .select('name')
        .eq('id', chatId)
        .single()

      if (chatData) {
        setChatTitle(chatData.name)
      }

      // Load messages
      const { data: messagesData, error } = await supabase
        .from('messages')
        .select(`
          *,
          user:users (
            id,
            display_name,
            avatar_url
          )
        `)
        .eq('chat_id', chatId)
        .order('created_at', { ascending: true })

      if (!error && messagesData) {
        const formattedMessages = messagesData.map(msg => ({
          id: msg.id,
          content: msg.content,
          userId: msg.user_id,
          userName: msg.is_llm_message ? 'AI Assistant' : msg.user?.display_name || 'Unknown',
          avatarUrl: msg.is_llm_message
            ? 'https://api.dicebear.com/7.x/bottts/svg?seed=AI'
            : msg.user?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${msg.user?.display_name}`,
          timestamp: new Date(msg.created_at).toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit'
          }),
          createdAt: new Date(msg.created_at),
          isLlm: msg.is_llm_message,
          isStreaming: false,
          user: msg.user ? {
            id: msg.user.id,
            name: msg.user.display_name || '',
            image: msg.user.avatar_url || '',
            isAccepted: true,
            integrations: []
          } : undefined
        }))
        setMessages(formattedMessages)
      }
    }

    loadChatData()
  }, [chatId])

  const handleRealtimeMessage = useCallback((newMsg: Message & { user?: { display_name?: string; avatar_url?: string } }) => {
    setMessages(prev => {
      const existingIndex = prev.findIndex(m => m.id === newMsg.id || m.id.startsWith('temp-'))

      const formattedMessage = {
        id: newMsg.id,
        content: newMsg.content,
        userId: newMsg.user_id,
        userName: newMsg.is_llm_message ? 'AI Assistant' : newMsg.user?.display_name || 'Unknown',
        avatarUrl: newMsg.is_llm_message
          ? 'https://api.dicebear.com/7.x/bottts/svg?seed=AI'
          : newMsg.user?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${newMsg.user?.display_name}`,
        timestamp: new Date(newMsg.created_at).toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit'
        }),
        createdAt: new Date(newMsg.created_at),
        isLlm: newMsg.is_llm_message,
        isStreaming: false,
        user: newMsg.user ? {
          id: newMsg.user.id,
          name: newMsg.user.display_name || '',
          image: newMsg.user.avatar_url || '',
          isAccepted: true,
          integrations: []
        } : undefined
      }

      if (existingIndex !== -1) {
        const updated = [...prev]
        updated[existingIndex] = formattedMessage
        return updated
      }

      return [...prev, formattedMessage]
    })
  }, [])

  useRealtimeMessages(chatId, handleRealtimeMessage)

  const currentUserId = session?.user?.id || ""
  const currentUserName = session?.user?.name || session?.user?.email || "You"
  const currentUserAvatar = session?.user?.image || `https://api.dicebear.com/7.x/avataaars/svg?seed=${currentUserName}`

  const handleSubmit = async () => {
    if (!input.trim() && files.length === 0) return
    if (!session?.user?.id) return

    const messageText = input
    const messageFiles = [...files]

    setInput("")
    setFiles([])

    const now = new Date()
    const tempId = `temp-${Date.now()}`
    const newMessage: Message = {
      id: tempId,
      content: messageText,
      userId: currentUserId,
      userName: currentUserName,
      avatarUrl: currentUserAvatar,
      timestamp: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      createdAt: now,
      user: {
        id: currentUserId,
        name: currentUserName,
        image: currentUserAvatar,
        isAccepted: true,
        integrations: []
      }
    }

    setMessages(prev => [...prev, newMessage])

    try {
      setIsLoading(true)

      await sendMessage({
        chatId,
        content: messageText
      })

      setIsLoading(false)
    } catch (error) {
      setIsLoading(false)
      setMessages(prev => prev.filter(msg => msg.id !== tempId))
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