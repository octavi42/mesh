"use client"

import { MoreHorizontal } from "lucide-react"
import { ChatDropdownMenu } from "./chat-dropdown-menu"

type ChatListItemProps = {
  chatId: string
  title: string
  isActive: boolean
  isDropdownOpen: boolean
  onClick: () => void
  onDropdownToggle: () => void
  onEdit: () => void
  onRename: () => void
  onDelete: () => void
}

export function ChatListItem({
  chatId,
  title,
  isActive,
  isDropdownOpen,
  onClick,
  onDropdownToggle,
  onEdit,
  onRename,
  onDelete,
}: ChatListItemProps) {
  return (
    <div
      key={chatId}
      className={`group px-3 py-3 rounded-lg cursor-pointer relative transition-colors ${
        isActive
          ? 'bg-blue-50 border-l-2 border-blue-500'
          : 'hover:bg-slate-100'
      }`}
      onClick={onClick}
    >
      <div className="flex items-center justify-between">
        <div className={`font-normal text-sm flex-1 mr-2 ${
          isActive ? 'text-blue-600' : 'text-slate-700'
        }`}>
          {title}
        </div>

        <div className="relative chat-dropdown">
          <button
            className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 p-1 rounded hover:bg-slate-200 flex items-center justify-center"
            onClick={(e) => {
              e.stopPropagation()
              onDropdownToggle()
            }}
          >
            <MoreHorizontal className="w-4 h-4 text-slate-500" />
          </button>

          {isDropdownOpen && (
            <ChatDropdownMenu
              onEdit={onEdit}
              onRename={onRename}
              onDelete={onDelete}
            />
          )}
        </div>
      </div>
    </div>
  )
}
