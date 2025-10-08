"use client"

import { useState, useEffect } from "react"
import { Menu } from "lucide-react"
import { AccountSheet } from "@/components/sheets/account-sheet"
import { UserAvatars } from "@/components/ui/user-avatars"
import { createClient } from "@/lib/supabase/client"

type ProjectHeaderProps = {
  isMenuOpen: boolean
  onMenuToggle: () => void
  title?: string | React.ReactNode
  hideUserAvatars?: boolean
  currentChatId?: string
}

type ChatUser = {
  id: string
  name: string
  image: string
  email: string
}

export function ProjectHeader({ isMenuOpen, onMenuToggle, title, hideUserAvatars = false, currentChatId }: ProjectHeaderProps) {
  const [chatUsers, setChatUsers] = useState<ChatUser[]>([])

  useEffect(() => {
    async function loadChatMembers() {
      if (!currentChatId) {
        setChatUsers([])
        return
      }

      const supabase = createClient()

      // Get the project_id for this chat
      const { data: chatData } = await supabase
        .from('chats')
        .select('project_id')
        .eq('id', currentChatId)
        .single()

      if (!chatData) return

      // Get all members of that project
      const { data: members } = await supabase
        .from('members')
        .select(`
          user:users (
            id,
            display_name,
            email,
            avatar_url
          )
        `)
        .eq('project_id', chatData.project_id)

      if (members) {
        const users = members
          .filter(m => m.user)
          .map(m => ({
            id: m.user.id,
            name: m.user.display_name || m.user.email,
            image: m.user.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${m.user.display_name || m.user.email}`,
            email: m.user.email
          }))
        setChatUsers(users)
      }
    }

    loadChatMembers()
  }, [currentChatId])

  return (
    <div className={`p-6 ${title ? 'border-b border-slate-200/50' : ''}`}>
      <div className="flex items-center justify-between w-full">
        <div className="flex items-center gap-4">
          <button
            className={`flex items-center justify-center w-10 h-10 rounded-lg hover:bg-slate-100 transition-all duration-300 ${
              isMenuOpen ? "opacity-0 pointer-events-none" : "opacity-100"
            }`}
            onClick={onMenuToggle}
          >
            <Menu className="w-6 h-6 text-slate-600" />
          </button>
          {title && (
            typeof title === 'string' ? (
              <h1 className="text-xl font-light text-slate-900">
                {title}
              </h1>
            ) : (
              <div className="text-xl font-light text-slate-900">
                {title}
              </div>
            )
          )}
        </div>

        <div className="flex items-center gap-4 relative z-0">
          {!hideUserAvatars && chatUsers.length > 0 && (
            <UserAvatars users={chatUsers} size={40} maxVisible={5} isRightToLeft={true} />
          )}
          <div className="relative z-50">
            <AccountSheet />
          </div>
        </div>
      </div>
    </div>
  )
}