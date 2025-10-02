"use client"

import { useState } from "react"
import { Sheet } from "@silk-hq/components"
import { X, Search, Plus } from "lucide-react"
import { SHEET_ANIMATIONS } from "@/lib/constants/sheet-animations"
import { UserInfoSheet } from "./user-info-sheet"
import { AddUserSheet } from "./add-user-sheet"

type User = {
  id: string | number
  name?: string
  image: string
  isAccepted?: boolean
  isInvited?: boolean
}

type AllUsersSheetProps = {
  users: User[]
  trigger: React.ReactNode
}

export function AllUsersSheet({ users, trigger }: AllUsersSheetProps) {
  const [searchQuery, setSearchQuery] = useState("")

  const filteredUsers = users.filter(user =>
    user.name?.toLowerCase().includes(searchQuery.toLowerCase())
  )

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
            <div className="p-8 flex-shrink-0">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-semibold text-gray-900">All Members</h2>
                <Sheet.Trigger action="dismiss" asChild>
                  <button className="flex items-center justify-center w-8 h-8 rounded-lg hover:bg-gray-200 transition-colors">
                    <X className="w-5 h-5 text-gray-600" />
                  </button>
                </Sheet.Trigger>
              </div>

              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search members..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <AddUserSheet
                  trigger={
                    <button className="flex items-center justify-center w-10 h-10 rounded-lg bg-blue-500 hover:bg-blue-600 transition-colors flex-shrink-0">
                      <Plus className="w-5 h-5 text-white" />
                    </button>
                  }
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-8 pb-8">
              <div className="space-y-2">
                {filteredUsers.map((user) => {
                  const isAccepted = user.isAccepted === true
                  const isPending = user.isInvited && !user.isAccepted
                  const isNotInvited = !user.isInvited

                  return (
                    <UserInfoSheet
                      key={user.id}
                      user={user}
                      trigger={
                        <div className={`flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer ${!isAccepted ? 'opacity-40' : ''}`}>
                          <div className="w-10 h-10 rounded-full overflow-hidden border border-gray-200 flex-shrink-0">
                            <img
                              src={user.image}
                              alt={user.name || "User"}
                              className="w-full h-full object-cover"
                            />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 truncate">{user.name}</p>
                            <p className="text-xs text-gray-500 truncate">{user.name?.toLowerCase().replace(' ', '.')}@teamz.com</p>
                          </div>
                          {isPending && (
                            <span className="text-xs text-orange-500 flex-shrink-0">Pending</span>
                          )}
                          {isNotInvited && (
                            <span className="text-xs text-gray-400 flex-shrink-0">Not invited</span>
                          )}
                        </div>
                      }
                    />
                  )
                })}
                {filteredUsers.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    No members found
                  </div>
                )}
              </div>
            </div>
          </Sheet.Content>
        </Sheet.View>
      </Sheet.Portal>
    </Sheet.Root>
  )
}
