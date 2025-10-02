"use client"

import { ReactNode } from "react"
import { Sheet } from "@silk-hq/components"
import { X, Mail, Shield } from "lucide-react"
import { SHEET_ANIMATIONS } from "@/lib/constants/sheet-animations"

type UserInfoSheetProps = {
  user: {
    id: string | number
    name?: string
    image: string
    isAccepted?: boolean
    isInvited?: boolean
  }
  trigger: ReactNode
}

export function UserInfoSheet({ user, trigger }: UserInfoSheetProps) {
  const isAccepted = user.isAccepted === true
  const isPending = user.isInvited && !user.isAccepted
  const isNotInvited = !user.isInvited

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
              <div className="flex items-center justify-end mb-6">
                <Sheet.Trigger action="dismiss" asChild>
                  <button className="flex items-center justify-center w-8 h-8 rounded-lg hover:bg-gray-200 transition-colors">
                    <X className="w-5 h-5 text-gray-600" />
                  </button>
                </Sheet.Trigger>
              </div>

              <div className="mb-6 flex flex-col items-center -mt-6">
                <div className="w-24 h-24 rounded-full overflow-hidden border-2 border-gray-200 mb-4">
                  <img
                    src={user.image}
                    alt={user.name || "User"}
                    className="w-full h-full object-cover"
                  />
                </div>
                <h3 className="text-xl font-semibold text-gray-900">{user.name}</h3>
              </div>

              <div className="space-y-4">
                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                  <Mail className="w-5 h-5 text-gray-600" />
                  <div>
                    <p className="text-xs text-gray-500">Email</p>
                    <p className="text-sm text-gray-900">{user.name?.toLowerCase().replace(' ', '.')}@teamz.com</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                  <Shield className="w-5 h-5 text-gray-600" />
                  <div>
                    <p className="text-xs text-gray-500">Role</p>
                    <p className="text-sm text-gray-900">Member</p>
                  </div>
                </div>

                <div className="p-3 bg-gray-50 rounded-lg">
                  <div className="flex flex-col gap-3">
                    <span className="text-xs text-gray-500">Integrations</span>
                    <div className="flex items-center justify-center gap-4">
                      <div className="flex flex-col items-center gap-1.5">
                        <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center relative flex-shrink-0">
                          <span className="text-white text-xs font-bold">SL</span>
                          <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-white"></div>
                        </div>
                        <span className="text-[10px] text-gray-600">Slack</span>
                      </div>
                      <div className="flex flex-col items-center gap-1.5">
                        <div className="w-10 h-10 bg-purple-500 rounded-lg flex items-center justify-center relative flex-shrink-0">
                          <span className="text-white text-xs font-bold">GH</span>
                          <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-white"></div>
                        </div>
                        <span className="text-[10px] text-gray-600">GitHub</span>
                      </div>
                      <div className="flex flex-col items-center gap-1.5">
                        <div className="w-10 h-10 bg-orange-500 rounded-lg flex items-center justify-center relative flex-shrink-0">
                          <span className="text-white text-xs font-bold">JR</span>
                          <div className="absolute -top-1 -right-1 w-3 h-3 bg-gray-300 rounded-full border-2 border-white"></div>
                        </div>
                        <span className="text-[10px] text-gray-600">Jira</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-6 space-y-2">
                {isAccepted && (
                  <button className="w-full px-4 py-3 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors">
                    Kick from Chat
                  </button>
                )}
                {isPending && (
                  <button className="w-full px-4 py-3 bg-orange-50 text-orange-600 rounded-lg hover:bg-orange-100 transition-colors cursor-not-allowed" disabled>
                    Pending...
                  </button>
                )}
                {isNotInvited && (
                  <button className="w-full px-4 py-3 bg-green-50 text-green-600 rounded-lg hover:bg-green-100 transition-colors">
                    Add to Chat
                  </button>
                )}
              </div>
            </div>
          </Sheet.Content>
        </Sheet.View>
      </Sheet.Portal>
    </Sheet.Root>
  )
}
