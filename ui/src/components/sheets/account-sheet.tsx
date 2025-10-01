"use client"

import { Sheet } from "@silk-hq/components"
import { X, User, Settings, CreditCard } from "lucide-react"
import { SettingsSheetWrapper } from "./settings-sheet-wrapper"
import { SHEET_ANIMATIONS } from "@/lib/constants/sheet-animations"

export function AccountSheet() {
  return (
    <Sheet.Root license="commercial" forComponent="closest">
      <Sheet.Trigger asChild>
        <button className="flex items-center justify-center w-10 h-10 rounded-full bg-blue-500 hover:bg-blue-600 transition-colors">
          <User className="w-5 h-5 text-white" />
        </button>
      </Sheet.Trigger>

      <Sheet.Portal>
        <Sheet.View contentPlacement="right" nativeEdgeSwipePrevention={true}>
          <Sheet.Backdrop className="backdrop-blur-backdrop" />
          <Sheet.Content
            className="bg-white rounded-2xl shadow-xl w-full"
            stackingAnimation={SHEET_ANIMATIONS.rightPanel.stackingAnimation}
            style={{ maxWidth: '320px', marginRight: '48px', marginTop: '48px', marginBottom: '48px' }}
          >
              <div className="p-8">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-lg font-semibold text-gray-900">Account</h2>
                  <Sheet.Trigger action="dismiss" asChild>
                    <button className="flex items-center justify-center w-8 h-8 rounded-lg hover:bg-gray-200 transition-colors">
                      <X className="w-5 h-5 text-gray-600" />
                    </button>
                  </Sheet.Trigger>
                </div>

                <div className="mb-6 p-4 bg-gray-50 rounded-xl">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-12 h-12 rounded-full bg-blue-500 flex items-center justify-center">
                      <User className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h3 className="font-medium text-gray-900">John Doe</h3>
                      <p className="text-sm text-gray-500">john.doe@teamz.com</p>
                    </div>
                  </div>
                  <div className="text-xs text-gray-400">
                    Member since January 2024
                  </div>
                </div>

                <div className="space-y-2">
                  <SettingsSheetWrapper
                    trigger={{ icon: User, label: "Profile Settings" }}
                    title="Profile Settings"
                  >
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-900">Display Name</label>
                        <input className="w-full px-3 py-2 border border-gray-300 rounded-lg" defaultValue="John Doe" />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-900">Email</label>
                        <input className="w-full px-3 py-2 border border-gray-300 rounded-lg" defaultValue="john.doe@teamz.com" />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-900">Bio</label>
                        <textarea className="w-full px-3 py-2 border border-gray-300 rounded-lg h-20" defaultValue="Product designer and team lead" />
                      </div>
                      <div className="flex gap-2 pt-4">
                        <button className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors">Save Changes</button>
                        <Sheet.Trigger action="dismiss" asChild>
                          <button className="px-4 py-2 bg-gray-200 text-gray-900 rounded-lg hover:bg-gray-300 transition-colors">Cancel</button>
                        </Sheet.Trigger>
                      </div>
                    </div>
                  </SettingsSheetWrapper>

                  <SettingsSheetWrapper
                    trigger={{ icon: Settings, label: "Account Settings" }}
                    title="Account Settings"
                  >
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <h3 className="font-medium text-gray-900">Privacy & Security</h3>
                        <div className="space-y-2">
                          <label className="flex items-center gap-2">
                            <input type="checkbox" className="rounded" defaultChecked />
                            <span className="text-sm text-gray-700">Two-factor authentication</span>
                          </label>
                          <label className="flex items-center gap-2">
                            <input type="checkbox" className="rounded" />
                            <span className="text-sm text-gray-700">Email notifications</span>
                          </label>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <h3 className="font-medium text-gray-900">Preferences</h3>
                        <select className="w-full px-3 py-2 border border-gray-300 rounded-lg">
                          <option>Light Mode</option>
                          <option>Dark Mode</option>
                          <option>System</option>
                        </select>
                      </div>
                      <div className="flex gap-2 pt-4">
                        <button className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors">Save Changes</button>
                        <Sheet.Trigger action="dismiss" asChild>
                          <button className="px-4 py-2 bg-gray-200 text-gray-900 rounded-lg hover:bg-gray-300 transition-colors">Cancel</button>
                        </Sheet.Trigger>
                      </div>
                    </div>
                  </SettingsSheetWrapper>

                  <SettingsSheetWrapper
                    trigger={{ icon: CreditCard, label: "Billing" }}
                    title="Billing & Usage"
                  >
                    <div className="space-y-4">
                      <div className="bg-blue-50 rounded-lg p-4">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium text-blue-900">Current Plan</span>
                          <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">Pro</span>
                        </div>
                        <div className="text-2xl font-bold text-blue-900">$29/month</div>
                        <div className="text-xs text-blue-700">Next billing: Jan 15, 2024</div>
                      </div>

                      <div className="space-y-2">
                        <h3 className="font-medium text-gray-900">Usage this month</h3>
                        <div className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-600">API Calls</span>
                            <span className="text-gray-900">2,450 / 10,000</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div className="bg-blue-500 h-2 rounded-full" style={{ width: '24.5%' }}></div>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-600">Storage</span>
                            <span className="text-gray-900">1.2 GB / 5 GB</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div className="bg-green-500 h-2 rounded-full" style={{ width: '24%' }}></div>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <h3 className="font-medium text-gray-900">Payment Method</h3>
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <CreditCard className="w-4 h-4" />
                          <span>•••• •••• •••• 4242</span>
                        </div>
                      </div>

                      <div className="flex gap-2 pt-4">
                        <button className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors text-sm">Upgrade Plan</button>
                        <button className="px-4 py-2 bg-gray-200 text-gray-900 rounded-lg hover:bg-gray-300 transition-colors text-sm">View History</button>
                      </div>
                    </div>
                  </SettingsSheetWrapper>

                  <hr className="my-4 border-gray-300" />

                  <button className="w-full flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-red-100 transition-colors text-left">
                    <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    </svg>
                    <span className="text-red-600">Sign Out</span>
                  </button>
                </div>
              </div>
            </Sheet.Content>
        </Sheet.View>
      </Sheet.Portal>
    </Sheet.Root>
  )
}