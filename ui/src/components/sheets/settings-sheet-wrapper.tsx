"use client"

import { ReactNode } from "react"
import { Sheet } from "@silk-hq/components"
import { X, LucideIcon } from "lucide-react"
import { SHEET_ANIMATIONS } from "@/lib/constants/sheet-animations"

type SettingsSheetWrapperProps = {
  trigger: {
    icon: LucideIcon
    label: string
  }
  title: string
  children: ReactNode
}

export function SettingsSheetWrapper({ trigger, title, children }: SettingsSheetWrapperProps) {
  const Icon = trigger.icon

  return (
    <Sheet.Root license="commercial" forComponent="closest">
      <Sheet.Trigger asChild>
        <button className="w-full flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-gray-100 transition-colors text-left">
          <Icon className="w-5 h-5 text-gray-600" />
          <span className="text-gray-900">{trigger.label}</span>
        </button>
      </Sheet.Trigger>
      <Sheet.Portal>
        <Sheet.View contentPlacement="right" nativeEdgeSwipePrevention={true}>
          <Sheet.Backdrop className="backdrop-blur-backdrop" />
          <Sheet.Content
            className="bg-white rounded-2xl shadow-xl w-full flex flex-col overflow-hidden"
            stackingAnimation={SHEET_ANIMATIONS.rightPanel.stackingAnimation}
            style={{ maxWidth: '320px', marginRight: '48px', marginTop: '48px', marginBottom: '48px', maxHeight: 'calc(100vh - 96px)' }}
          >
            <div className="p-8 flex-shrink-0">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
                <Sheet.Trigger action="dismiss" asChild>
                  <button className="flex items-center justify-center w-8 h-8 rounded-lg hover:bg-gray-200 transition-colors">
                    <X className="w-5 h-5 text-gray-600" />
                  </button>
                </Sheet.Trigger>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto px-8 pb-8">
              {children}
            </div>
          </Sheet.Content>
        </Sheet.View>
      </Sheet.Portal>
    </Sheet.Root>
  )
}