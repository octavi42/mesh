"use client"

import { useState, useEffect, useRef } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { UserPlus, MessageSquarePlus, Mail } from "lucide-react"
import { InviteExternalUserSheet } from "./invite-external-user-sheet"

type CreateChatPanelProps = {
  projectId: string
  onCreateChat: (selectedUsers: string[]) => void
}

type ProjectMember = {
  id: string
  display_name: string
  email: string
  avatar_url: string | null
}

export function CreateChatPanel({ projectId, onCreateChat }: CreateChatPanelProps) {
  const [members, setMembers] = useState<ProjectMember[]>([])
  const [selectedUsers, setSelectedUsers] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const inviteSheetTriggerRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    async function loadProjectMembers() {
      const supabase = createClient()

      const { data: membersData } = await supabase
        .from('members')
        .select(`
          user:users (
            id,
            display_name,
            email,
            avatar_url
          )
        `)
        .eq('project_id', projectId)

      if (membersData) {
        const users = membersData.map(m => m.user).filter(Boolean)
        setMembers(users as ProjectMember[])
      }
    }

    loadProjectMembers()
  }, [projectId])

  const toggleUser = (userId: string) => {
    setSelectedUsers(prev =>
      prev.includes(userId)
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    )
  }

  const handleCreateChat = () => {
    setIsLoading(true)
    onCreateChat(selectedUsers)
  }

  return (
    <div className="w-full max-w-2xl bg-white rounded-2xl shadow-lg border border-slate-200 p-8">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center">
          <MessageSquarePlus className="w-6 h-6 text-slate-600" />
        </div>
        <div>
          <h2 className="text-2xl font-light text-slate-900">Create New Chat</h2>
          <p className="text-sm text-slate-500">Select team members to start chatting</p>
        </div>
      </div>

      <div>
        {members.length === 0 ? (
          <div className="text-center py-12 text-slate-400">
            <UserPlus className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>No team members found</p>
          </div>
        ) : (
          <div className="space-y-2 mb-6 max-h-96 overflow-y-auto">
            {members.map((member) => (
              <button
                key={member.id}
                onClick={() => toggleUser(member.id)}
                className={`w-full flex items-center gap-4 p-4 rounded-xl border-2 transition-all ${
                  selectedUsers.includes(member.id)
                    ? "border-slate-900 bg-slate-50"
                    : "border-slate-200 hover:border-slate-300 bg-white"
                }`}
              >
                <div className="relative">
                  <img
                    src={member.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${member.email}`}
                    alt={member.display_name || member.email}
                    className="w-12 h-12 rounded-full"
                  />
                  {selectedUsers.includes(member.id) && (
                    <div className="absolute -top-1 -right-1 w-5 h-5 bg-slate-900 rounded-full flex items-center justify-center">
                      <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                  )}
                </div>
                <div className="flex-1 text-left">
                  <p className="font-medium text-slate-900">{member.display_name || member.email}</p>
                  <p className="text-sm text-slate-500">{member.email}</p>
                </div>
              </button>
            ))}
          </div>
        )}

        <div className="space-y-4">
          <div className="flex items-center justify-center pt-4 border-t border-slate-200">
            <Button
              onClick={() => inviteSheetTriggerRef.current?.click()}
              variant="outline"
              className="flex items-center gap-2 text-slate-700 hover:text-slate-900 border-slate-300"
            >
              <Mail className="w-4 h-4" />
              Invite External Users
            </Button>
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-slate-200">
            <p className="text-sm text-slate-600">
              {selectedUsers.length} member{selectedUsers.length !== 1 ? 's' : ''} selected
            </p>
            <Button
              onClick={handleCreateChat}
              disabled={isLoading}
              className="bg-slate-900 hover:bg-slate-800 text-white px-6 py-2 rounded-lg font-medium disabled:opacity-50"
            >
              {isLoading ? 'Creating...' : 'Create Chat'}
            </Button>
          </div>
        </div>
      </div>

      <InviteExternalUserSheet
        triggerRef={inviteSheetTriggerRef}
        projectId={projectId}
      />
    </div>
  )
}
