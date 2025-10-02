"use client"

import { useState } from "react"
import { Sheet } from "@silk-hq/components"
import { X, UserPlus } from "lucide-react"
import { SHEET_ANIMATIONS } from "@/lib/constants/sheet-animations"

type AddUserSheetProps = {
  trigger: React.ReactNode
}

export function AddUserSheet({ trigger }: AddUserSheetProps) {
  const [email, setEmail] = useState("")
  const [role, setRole] = useState("member")

  return (
    <Sheet.Root license="commercial" forComponent="closest">
      <Sheet.Trigger asChild>
        {trigger}
      </Sheet.Trigger>
      <Sheet.Portal>
        <Sheet.View contentPlacement="right" nativeEdgeSwipePrevention={true}>
          <Sheet.Backdrop
            travelAnimation={{
              opacity: "1",
              backgroundColor: ({ progress }) => `rgba(0, 0, 0, ${Math.min(progress * 0.33, 0.33)})`,
              backdropFilter: ({ progress }) => `blur(${progress * 10}px)`,
            }}
          />
          <Sheet.Content
            className="bg-white rounded-2xl shadow-xl w-full flex flex-col overflow-hidden"
            stackingAnimation={SHEET_ANIMATIONS.rightPanel.stackingAnimation}
            style={{ maxWidth: '320px', marginRight: '48px', marginTop: '48px', marginBottom: '48px', maxHeight: 'calc(100vh - 96px)' }}
          >
            <div className="p-8">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-semibold text-gray-900">Add Member</h2>
                <Sheet.Trigger action="dismiss" asChild>
                  <button className="flex items-center justify-center w-8 h-8 rounded-lg hover:bg-gray-200 transition-colors">
                    <X className="w-5 h-5 text-gray-600" />
                  </button>
                </Sheet.Trigger>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-900">Email Address</label>
                  <input
                    type="email"
                    placeholder="user@teamz.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-900">Role</label>
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="member">Member</option>
                    <option value="admin">Admin</option>
                    <option value="viewer">Viewer</option>
                  </select>
                </div>

                <div className="pt-4 space-y-2">
                  <button className="w-full px-4 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors font-medium">
                    Send Invitation
                  </button>
                  <Sheet.Trigger action="dismiss" asChild>
                    <button className="w-full px-4 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors">
                      Cancel
                    </button>
                  </Sheet.Trigger>
                </div>
              </div>
            </div>
          </Sheet.Content>
        </Sheet.View>
      </Sheet.Portal>
    </Sheet.Root>
  )
}
