"use client"

import { useState, useEffect } from "react"
import { Menu } from "lucide-react"
import { AccountSheet } from "@/components/sheets/account-sheet"
import { UserAvatars } from "@/components/ui/user-avatars"
import { createClient, setUserContext } from "@/lib/supabase/client"
import { useSession } from "@/lib/hooks/use-session"

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
  const { data: session } = useSession()

  useEffect(() => {
    async function loadChatMembers() {
      if (!currentChatId) {
        setChatUsers([])
        return
      }

      if (!session?.user?.id) {
        console.log('No session found')
        return
      }

      await setUserContext(session.user.id)

      const supabase = createClient()

      console.log('Fetching chat members for chat:', currentChatId)

      const { data: chatMemberships, error } = await supabase
        .from('chat_memberships')
        .select(`
          user_id,
          is_accepted,
          users!inner (
            id,
            display_name,
            email,
            avatar_url
          )
        `)
        .eq('chat_id', currentChatId)

      console.log('Chat memberships result:', { chatMemberships, error })

      if (error) {
        console.error('Error fetching chat members:', error)
        return
      }

      if (chatMemberships) {
        const users = chatMemberships
          .filter(m => m.users)
          .map(m => ({
            id: m.users.id,
            name: m.users.display_name || m.users.email,
            image: m.users.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${m.users.display_name || m.users.email}`,
            email: m.users.email,
            isAccepted: m.is_accepted,
            isInvited: true
          }))
        setChatUsers(users)
      }
    }

    loadChatMembers()
  }, [currentChatId, session])

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