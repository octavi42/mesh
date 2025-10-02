"use client"

import { ReactNode, useState } from "react"
import { Sheet } from "@silk-hq/components"
import { X, Mail, Shield, ChevronDown, ChevronUp } from "lucide-react"
import { SHEET_ANIMATIONS } from "@/lib/constants/sheet-animations"
import "./user-info-sheet.css"

type Integration = {
  id: string
  name: string
  shortName: string
  color: string
  isConnected: boolean
}

type UserInfoSheetProps = {
  user: {
    id: string | number
    name?: string
    image: string
    isAccepted?: boolean
    isInvited?: boolean
    integrations?: Integration[]
  }
  trigger: ReactNode
}

export function UserInfoSheet({ user, trigger }: UserInfoSheetProps) {
  const isAccepted = user.isAccepted === true
  const isPending = user.isInvited && !user.isAccepted
  const isNotInvited = !user.isInvited
  const [isIntegrationsExpanded, setIsIntegrationsExpanded] = useState(false)

  const integrations = user.integrations || []
  const hasMoreThan4 = integrations.length > 4
  const displayedIntegrations = hasMoreThan4 && !isIntegrationsExpanded ? integrations.slice(0, 3) : integrations

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
            className="UserInfoSheet-content"
            stackingAnimation={SHEET_ANIMATIONS.rightPanel.stackingAnimation}
          >
            <div className="UserInfoSheet-innerContent">
            <div className="p-8 pb-4 flex-shrink-0">
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
            </div>

            <div className="flex-1 overflow-y-auto px-8">
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
                    {integrations.length > 0 ? (
                      <div className="flex items-center justify-center gap-4 flex-wrap">
                        {displayedIntegrations.map((integration) => (
                          <div key={integration.id} className="flex flex-col items-center gap-1.5">
                            <div className={`w-10 h-10 ${integration.color} rounded-lg flex items-center justify-center relative flex-shrink-0`}>
                              <span className="text-white text-xs font-bold">{integration.shortName}</span>
                              <div className={`absolute -top-1 -right-1 w-3 h-3 ${integration.isConnected ? 'bg-green-500' : 'bg-gray-300'} rounded-full border-2 border-white`}></div>
                            </div>
                            <span className="text-[10px] text-gray-600">{integration.name}</span>
                          </div>
                        ))}
                        {hasMoreThan4 && (
                          <button
                            onClick={() => setIsIntegrationsExpanded(!isIntegrationsExpanded)}
                            className="flex flex-col items-center gap-1.5"
                          >
                            <div className="w-10 h-10 bg-gray-200 rounded-lg flex items-center justify-center relative flex-shrink-0 hover:bg-gray-300 transition-colors">
                              {isIntegrationsExpanded ? (
                                <ChevronUp className="w-5 h-5 text-gray-600" />
                              ) : (
                                <ChevronDown className="w-5 h-5 text-gray-600" />
                              )}
                            </div>
                            <span className="text-[10px] text-gray-600">
                              {isIntegrationsExpanded ? 'Less' : `+${integrations.length - 3}`}
                            </span>
                          </button>
                        )}
                      </div>
                    ) : (
                      <p className="text-xs text-gray-400 text-center">No integrations</p>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="p-8 pt-4 flex-shrink-0">
              <div className="space-y-2">
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
            </div>
          </Sheet.Content>
        </Sheet.View>
      </Sheet.Portal>
    </Sheet.Root>
  )
}
