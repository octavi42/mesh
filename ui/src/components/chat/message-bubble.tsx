"use client"

import { cn } from "@/lib/utils"
import { UserInfoSheet } from "@/components/sheets/user-info-sheet"

interface MessageBubbleProps {
  message: string
  isCurrentUser: boolean
  avatarUrl: string
  userName: string
  timestamp?: string
  isConsecutive?: boolean
  showAvatar?: boolean
  isLastInGroup?: boolean
  onHoverChange?: (isHovered: boolean) => void
  showTimestamp?: boolean
  user?: {
    id: string | number
    name?: string
    image: string
    isAccepted?: boolean
    isInvited?: boolean
    integrations?: any[]
  }
}

export function MessageBubble({
  message,
  isCurrentUser,
  avatarUrl,
  userName,
  timestamp,
  isConsecutive = false,
  showAvatar = true,
  isLastInGroup = true,
  onHoverChange,
  showTimestamp = false,
  user,
}: MessageBubbleProps) {
  const getBubbleRounding = () => {
    if (isCurrentUser) {
      if (isConsecutive && !isLastInGroup) {
        return "rounded-2xl rounded-tr-md rounded-br-md"
      }
      if (isConsecutive && isLastInGroup) {
        return "rounded-2xl rounded-tr-md rounded-br-sm"
      }
      if (!isConsecutive && !isLastInGroup) {
        return "rounded-2xl rounded-tr-sm rounded-br-md"
      }
      return "rounded-2xl rounded-tr-sm"
    } else {
      if (isConsecutive && !isLastInGroup) {
        return "rounded-2xl rounded-tl-md rounded-bl-md"
      }
      if (isConsecutive && isLastInGroup) {
        return "rounded-2xl rounded-tl-md rounded-bl-sm"
      }
      if (!isConsecutive && !isLastInGroup) {
        return "rounded-2xl rounded-tl-sm rounded-bl-md"
      }
      return "rounded-2xl rounded-tl-sm"
    }
  }

  return (
    <div
      className={cn(
        "flex gap-3 group",
        isCurrentUser ? "flex-row-reverse" : "flex-row",
        isLastInGroup ? "mb-4" : "mb-0.5"
      )}
      onMouseEnter={() => onHoverChange?.(true)}
      onMouseLeave={() => onHoverChange?.(false)}
    >
      <div className="flex-shrink-0 w-10">
        {showAvatar && user && !isCurrentUser ? (
          <UserInfoSheet
            user={user}
            trigger={
              <img
                src={avatarUrl}
                alt={userName}
                className="w-10 h-10 rounded-full object-cover border border-gray-200 cursor-pointer hover:opacity-80 transition-opacity"
              />
            }
          />
        ) : showAvatar ? (
          <img
            src={avatarUrl}
            alt={userName}
            className="w-10 h-10 rounded-full object-cover border border-gray-200"
          />
        ) : null}
      </div>

      <div
        className={cn(
          "flex flex-col max-w-[70%]",
          isCurrentUser ? "items-end" : "items-start",
          !isConsecutive ? "gap-1" : "gap-0"
        )}
      >
        {!isConsecutive && (
          <div className={cn(
            "flex items-center gap-2 px-1 mb-1",
            isCurrentUser && "flex-row-reverse"
          )}>
            <span className="text-xs text-gray-500">{userName}</span>
            {timestamp && showTimestamp && (
              <span
                className={cn(
                  "text-xs text-gray-400 transition-opacity duration-200"
                )}
              >
                {timestamp}
              </span>
            )}
          </div>
        )}

        <div
          className={cn(
            "px-4 py-2.5",
            getBubbleRounding(),
            isCurrentUser
              ? "bg-blue-500 text-white"
              : "bg-gray-100 text-gray-900"
          )}
        >
          <p className="text-sm whitespace-pre-wrap break-words">{message}</p>
        </div>
      </div>
    </div>
  )
}
