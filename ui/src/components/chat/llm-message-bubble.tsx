"use client"

import { cn } from "@/lib/utils"
import { motion } from "motion/react"

interface LlmMessageBubbleProps {
  message?: string
  isStreaming?: boolean
  avatarUrl?: string
  userName?: string
}

export function LlmMessageBubble({
  message,
  isStreaming = true,
  avatarUrl = "https://api.dicebear.com/7.x/bottts/svg?seed=AI",
  userName = "AI Assistant",
}: LlmMessageBubbleProps) {
  return (
    <div className="flex gap-3 mb-4">
      <div className="flex-shrink-0 w-10">
        <div className="w-10 h-10 rounded-full overflow-hidden border border-gray-200 bg-gradient-to-br from-purple-400 to-blue-500 flex items-center justify-center">
          <img
            src={avatarUrl}
            alt={userName}
            className="w-full h-full object-cover"
          />
        </div>
      </div>

      <div className="flex flex-col gap-1 max-w-[70%]">
        <div className="flex items-center gap-2 px-1 mb-1">
          <span className="text-xs text-gray-500">{userName}</span>
          {isStreaming && (
            <span className="text-xs text-purple-500 flex items-center gap-1">
              <motion.span
                animate={{ opacity: [0.4, 1, 0.4] }}
                transition={{ duration: 1.5, repeat: Infinity }}
              >
                ●
              </motion.span>
              <span>responding...</span>
            </span>
          )}
        </div>

        <div className="rounded-2xl rounded-tl-sm px-4 py-2.5 bg-gradient-to-br from-purple-50 to-blue-50 border border-purple-100">
          {message ? (
            <p className="text-sm whitespace-pre-wrap break-words text-gray-900">
              {message}
              {isStreaming && (
                <motion.span
                  animate={{ opacity: [0, 1, 0] }}
                  transition={{ duration: 0.8, repeat: Infinity }}
                  className="inline-block ml-0.5"
                >
                  ▊
                </motion.span>
              )}
            </p>
          ) : (
            <div className="flex items-center gap-1.5 py-1">
              <motion.div
                animate={{ scale: [1, 1.2, 1], opacity: [0.5, 1, 0.5] }}
                transition={{ duration: 1, repeat: Infinity, delay: 0 }}
                className="w-2 h-2 bg-purple-400 rounded-full"
              />
              <motion.div
                animate={{ scale: [1, 1.2, 1], opacity: [0.5, 1, 0.5] }}
                transition={{ duration: 1, repeat: Infinity, delay: 0.2 }}
                className="w-2 h-2 bg-purple-400 rounded-full"
              />
              <motion.div
                animate={{ scale: [1, 1.2, 1], opacity: [0.5, 1, 0.5] }}
                transition={{ duration: 1, repeat: Infinity, delay: 0.4 }}
                className="w-2 h-2 bg-purple-400 rounded-full"
              />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
