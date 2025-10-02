"use client"

import { useState, use } from "react"
import { ProjectLayout } from "@/components/layout/project-layout"
import { ChatInput } from "@/components/chat/chat-input"
import { MessageBubble } from "@/components/chat/message-bubble"
import { LlmMessageBubble } from "@/components/chat/llm-message-bubble"
import { chatTitles } from "@/lib/data/chats"

interface Message {
  id: string
  text: string
  userId: string
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
    integrations?: any[]
  }
}

export default function ChatPage({ params }: { params: Promise<{ id: string; chatId: string }> }) {
  const { id, chatId } = use(params)
  const [input, setInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [files, setFiles] = useState<File[]>([])
  const [hoveredGroupId, setHoveredGroupId] = useState<string | null>(null)
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      text: "Hey everyone! How's the project going?",
      userId: "user-2",
      userName: "Sarah Johnson",
      avatarUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=Sarah",
      timestamp: "10:30 AM",
      createdAt: new Date(Date.now() - 1000 * 60 * 30),
      user: {
        id: "user-2",
        name: "Sarah Johnson",
        image: "https://api.dicebear.com/7.x/avataaars/svg?seed=Sarah",
        isAccepted: true,
        integrations: []
      }
    },
    {
      id: "2",
      text: "The project is progressing well! We've completed the user authentication system and are now working on the chat feature. The team has been very collaborative.",
      userId: "ai-assistant",
      userName: "AI Assistant",
      avatarUrl: "https://api.dicebear.com/7.x/bottts/svg?seed=AI",
      timestamp: "10:31 AM",
      createdAt: new Date(Date.now() - 1000 * 60 * 29),
      isLlm: true,
      isStreaming: false
    },
    {
      id: "3",
      text: "Going great! Just finished the new feature.",
      userId: "current-user",
      userName: "You",
      avatarUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=You",
      timestamp: "10:32 AM",
      createdAt: new Date(Date.now() - 1000 * 60 * 28),
      user: {
        id: "current-user",
        name: "You",
        image: "https://api.dicebear.com/7.x/avataaars/svg?seed=You",
        isAccepted: true,
        integrations: []
      }
    },
    {
      id: "4",
      text: "That's awesome! Can't wait to see it in action.",
      userId: "user-3",
      userName: "Mike Chen",
      avatarUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=Mike",
      timestamp: "10:33 AM",
      createdAt: new Date(Date.now() - 1000 * 60 * 27),
      user: {
        id: "user-3",
        name: "Mike Chen",
        image: "https://api.dicebear.com/7.x/avataaars/svg?seed=Mike",
        isAccepted: true,
        integrations: []
      }
    }
  ])

  const currentUserId = "current-user"
  const currentChat = chatTitles.find(c => c.id === chatId)

  const handleSubmit = () => {
    if (input.trim() || files.length > 0) {
      setIsLoading(true)

      const now = new Date()
      const newMessage: Message = {
        id: Date.now().toString(),
        text: input,
        userId: currentUserId,
        userName: "You",
        avatarUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=You",
        timestamp: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        createdAt: now,
        user: {
          id: currentUserId,
          name: "You",
          image: "https://api.dicebear.com/7.x/avataaars/svg?seed=You",
          isAccepted: true,
          integrations: []
        }
      }

      setMessages(prev => [...prev, newMessage])

      setTimeout(() => {
        setIsLoading(false)
        setInput("")
        setFiles([])
      }, 500)
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
    <ProjectLayout projectId={id} currentChatId={chatId} headerTitle={currentChat?.title || 'Chat'}>
      <div className="flex-1 overflow-y-auto p-4">
        <div className="mx-auto max-w-3xl">
          {messages.map((message, index) => {
            if (message.isLlm) {
              return (
                <LlmMessageBubble
                  key={message.id}
                  message={message.text}
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
                message={message.text}
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