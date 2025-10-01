"use client"

import { useState, useEffect } from "react"
import { ChatListItem } from "./chat-list-item"
import { type Chat } from "@/lib/types"

type ChatListProps = {
  chats: Chat[]
  currentChatId?: string
  onChatClick: (chatId: string) => void
}

export function ChatList({ chats, currentChatId, onChatClick }: ChatListProps) {
  const [openDropdown, setOpenDropdown] = useState<string | null>(null)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (openDropdown && !(event.target as Element).closest('.chat-dropdown')) {
        setOpenDropdown(null)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [openDropdown])

  const handleChatAction = (action: string, chatId: string) => {
    console.log(`${action} action for chat:`, chatId)
    setOpenDropdown(null)

    if (action === 'edit') {
      onChatClick(chatId)
    }
  }

  return (
    <div className="flex-1 overflow-hidden">
      <div className="h-full overflow-y-auto space-y-2">
        {chats.map((chat) => (
          <ChatListItem
            key={chat.id}
            chatId={chat.id}
            title={chat.title}
            isActive={chat.id === currentChatId}
            isDropdownOpen={openDropdown === chat.id}
            onClick={() => onChatClick(chat.id)}
            onDropdownToggle={() => setOpenDropdown(openDropdown === chat.id ? null : chat.id)}
            onEdit={() => handleChatAction('edit', chat.id)}
            onRename={() => handleChatAction('rename', chat.id)}
            onDelete={() => handleChatAction('delete', chat.id)}
          />
        ))}
      </div>
    </div>
  )
}
