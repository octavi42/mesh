"use client"

import { useState } from "react"
import { Sheet } from "@silk-hq/components"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Mail } from "lucide-react"

type InviteExternalUserSheetProps = {
  triggerRef: React.RefObject<HTMLButtonElement>
  projectId: string
  onAddUser: (email: string) => void
}

export function InviteExternalUserSheet({ triggerRef, projectId, onAddUser }: InviteExternalUserSheetProps) {
  const [email, setEmail] = useState("")

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  const isValidEmail = emailRegex.test(email.trim())

  const handleAdd = () => {
    if (isValidEmail) {
      onAddUser(email.trim())
      setEmail("")
    }
  }

  const handleCancel = () => {
    setEmail("")
  }

  return (
    <Sheet.Root license="commercial">
      <Sheet.Trigger asChild>
        <button ref={triggerRef} style={{ display: 'none' }} />
      </Sheet.Trigger>
      <Sheet.Portal>
        <Sheet.View
          contentPlacement="center"
          tracks={["top", "bottom"]}
          nativeEdgeSwipePrevention={true}
        >
          <Sheet.Backdrop
            travelAnimation={{
              opacity: "1",
              backgroundColor: ({ progress }) => `rgba(0, 0, 0, ${Math.min(progress * 0.33, 0.33)})`,
              backdropFilter: ({ progress }) => `blur(${progress * 20}px)`,
            }}
          />
          <Sheet.Content className="bg-white rounded-2xl" style={{ maxWidth: '500px', width: '100%', height: 'auto' }}>
            <div className="p-6 space-y-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center">
                  <Mail className="w-5 h-5 text-slate-600" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-slate-900">Invite External User</h2>
                  <p className="text-sm text-slate-500">Add someone outside this project</p>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-900">Email Address</label>
                <Input
                  type="email"
                  placeholder="Enter email address"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && isValidEmail) {
                      e.preventDefault()
                      handleAdd()
                    }
                  }}
                  className="h-11 bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-500"
                />
                {email && !isValidEmail && (
                  <p className="text-xs text-red-500">Please enter a valid email address</p>
                )}
              </div>

              <div className="flex gap-3 pt-4">
                <Button
                  onClick={handleCancel}
                  variant="outline"
                  className="flex-1 h-11 border-slate-300 text-slate-700 hover:bg-slate-100"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleAdd}
                  disabled={!isValidEmail}
                  className="flex-1 h-11 bg-slate-900 hover:bg-slate-800 text-white disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Add
                </Button>
              </div>
            </div>
          </Sheet.Content>
        </Sheet.View>
      </Sheet.Portal>
    </Sheet.Root>
  )
}
