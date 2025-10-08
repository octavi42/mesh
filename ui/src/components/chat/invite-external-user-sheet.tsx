"use client"

import { useState, useRef, useEffect } from "react"
import { Sheet } from "@silk-hq/components"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { X, Mail, UserPlus } from "lucide-react"

type InviteExternalUserSheetProps = {
  triggerRef: React.RefObject<HTMLButtonElement>
  projectId: string
}

export function InviteExternalUserSheet({ triggerRef, projectId }: InviteExternalUserSheetProps) {
  const [email, setEmail] = useState("")
  const [invitedEmails, setInvitedEmails] = useState<string[]>([])
  const [isInviting, setIsInviting] = useState(false)

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  const isValidEmail = emailRegex.test(email.trim())

  const handleAddEmail = () => {
    if (isValidEmail && !invitedEmails.includes(email.trim())) {
      setInvitedEmails([...invitedEmails, email.trim()])
      setEmail("")
    }
  }

  const handleRemoveEmail = (emailToRemove: string) => {
    setInvitedEmails(invitedEmails.filter(e => e !== emailToRemove))
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && isValidEmail) {
      e.preventDefault()
      handleAddEmail()
    }
  }

  const handleSendInvites = async () => {
    setIsInviting(true)
    console.log("Sending invites to:", invitedEmails)
    console.log("Project ID:", projectId)

    // TODO: Implement actual invite logic
    setTimeout(() => {
      setIsInviting(false)
      setInvitedEmails([])
    }, 1000)
  }

  const handleClose = () => {
    setEmail("")
    setInvitedEmails([])
  }

  return (
    <Sheet.Root license="commercial" forComponent="closest">
      <Sheet.Trigger asChild>
        <button ref={triggerRef} style={{ display: 'none' }} />
      </Sheet.Trigger>
      <Sheet.Portal>
        <Sheet.View
          contentPlacement="right"
          nativeEdgeSwipePrevention={true}
        >
          <Sheet.Backdrop
            travelAnimation={{
              opacity: "1",
              backgroundColor: ({ progress }) => `rgba(0, 0, 0, ${Math.min(progress * 0.33, 0.33)})`,
              backdropFilter: ({ progress }) => `blur(${progress * 20}px)`,
            }}
          />
          <Sheet.Content className="bg-white" style={{ maxWidth: '550px', width: '100%', height: '100%' }}>
            <div className="flex flex-col h-full">
              <div className="flex items-center justify-between p-6 border-b border-slate-200">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center">
                    <UserPlus className="w-5 h-5 text-slate-600" />
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold text-slate-900">Invite External Users</h2>
                    <p className="text-sm text-slate-500">Add people outside this project</p>
                  </div>
                </div>
                <button
                  onClick={handleClose}
                  className="w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center transition-colors"
                >
                  <X className="w-5 h-5 text-slate-600" />
                </button>
              </div>

              <div className="flex-1 p-6 overflow-y-auto">
                <div className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-slate-900">Email Address</label>
                    <div className="flex gap-2">
                      <Input
                        type="email"
                        placeholder="Enter email address"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        onKeyDown={handleKeyDown}
                        className="flex-1 h-11 bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-500"
                      />
                      {isValidEmail && (
                        <Button
                          onClick={handleAddEmail}
                          className="h-11 px-6 bg-slate-900 hover:bg-slate-800 text-white"
                        >
                          Add
                        </Button>
                      )}
                    </div>
                    <p className="text-xs text-slate-600">Press Enter to add multiple emails</p>
                  </div>

                  {invitedEmails.length > 0 && (
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-slate-900">
                        Invited Users ({invitedEmails.length})
                      </label>
                      <div className="space-y-2">
                        {invitedEmails.map((invitedEmail) => (
                          <div
                            key={invitedEmail}
                            className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-200"
                          >
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center">
                                <Mail className="w-4 h-4 text-slate-600" />
                              </div>
                              <span className="text-sm text-slate-900">{invitedEmail}</span>
                            </div>
                            <button
                              onClick={() => handleRemoveEmail(invitedEmail)}
                              className="w-6 h-6 rounded hover:bg-slate-200 flex items-center justify-center transition-colors"
                            >
                              <X className="w-4 h-4 text-slate-600" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="p-6 border-t border-slate-200">
                <div className="flex gap-3">
                  <Button
                    onClick={handleClose}
                    variant="outline"
                    className="flex-1 h-11 border-slate-300 text-slate-700 hover:bg-slate-100"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleSendInvites}
                    disabled={invitedEmails.length === 0 || isInviting}
                    className="flex-1 h-11 bg-slate-900 hover:bg-slate-800 text-white disabled:opacity-50"
                  >
                    {isInviting ? 'Sending...' : `Send ${invitedEmails.length} Invite${invitedEmails.length !== 1 ? 's' : ''}`}
                  </Button>
                </div>
              </div>
            </div>
          </Sheet.Content>
        </Sheet.View>
      </Sheet.Portal>
    </Sheet.Root>
  )
}
