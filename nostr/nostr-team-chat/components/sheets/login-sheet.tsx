'use client';

import { Sheet } from '@silk-hq/components';
import { LogIn, Sparkles } from 'lucide-react';
import { SHEET_ANIMATIONS } from '@/lib/constants/sheet-animations';

interface LoginSheetProps {
  trigger?: React.ReactNode;
  onLoginClick?: () => void;
}

export function LoginSheet({ trigger, onLoginClick }: LoginSheetProps) {
  const handleGetStartedClick = () => {
    if (onLoginClick) {
      onLoginClick();
    }
  };

  const defaultTrigger = (
    <button className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition-colors">
      <LogIn className="w-4 h-4" />
      Login
    </button>
  );

  return (
    <Sheet.Root license="commercial">
      <Sheet.Trigger asChild>
        {trigger || defaultTrigger}
      </Sheet.Trigger>

      <Sheet.Portal>
        <Sheet.View className="z-[100]" contentPlacement="center" nativeEdgeSwipePrevention={true} tracks={["top", "bottom"]}>
          <Sheet.Backdrop
            travelAnimation={{
              opacity: "1",
              backgroundColor: ({ progress }: { progress: number }) => `rgba(0, 0, 0, ${Math.min(progress * 0.33, 0.33)})`,
              backdropFilter: ({ progress }: { progress: number }) => `blur(${progress * 24}px)`,
            }}
          />
          <Sheet.Content
            className="bg-white dark:bg-gray-900 rounded-3xl shadow-2xl w-full overflow-y-auto my-12"
            stackingAnimation={{
              scale: [1, 0.95] as [number, number],
            }}
            style={{ maxWidth: '540px', height: 'auto' }}
          >
            <div className="p-8">
              <div className="mb-6">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                  Welcome to Mesh
                </h2>
                <p className="text-gray-600 dark:text-gray-400">
                  Sign in to start collaborating with your team
                </p>
              </div>

              <div className="space-y-4">
                  <button
                    onClick={handleGetStartedClick}
                    className="w-full p-6 bg-gradient-to-br from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white rounded-xl transition-all shadow-lg hover:shadow-xl group"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform">
                        <Sparkles className="w-6 h-6" />
                      </div>
                      <div className="text-left flex-1">
                        <h3 className="font-semibold text-lg mb-1">Get Started</h3>
                        <p className="text-sm text-indigo-100">
                          Create account or sign in with Nostr
                        </p>
                      </div>
                    </div>
                  </button>

                  <div className="pt-6">
                    <div className="bg-indigo-50 dark:bg-indigo-950 border border-indigo-200 dark:border-indigo-800 rounded-lg p-4">
                      <h4 className="text-sm font-semibold text-indigo-900 dark:text-indigo-100 mb-2">
                        What is Nostr?
                      </h4>
                      <p className="text-xs text-indigo-700 dark:text-indigo-300 leading-relaxed">
                        Nostr is a decentralized protocol that gives you full ownership of your identity and data.
                        No company controls your account, and you can use it across any Nostr app.
                      </p>
                    </div>
                  </div>

                  <div className="pt-4 space-y-3">
                    <h4 className="text-sm font-semibold text-gray-900 dark:text-white">
                      How it works:
                    </h4>
                    <div className="space-y-2">
                      <div className="flex gap-3">
                        <div className="w-6 h-6 bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 rounded-full flex items-center justify-center text-xs font-semibold flex-shrink-0">
                          1
                        </div>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          Click &quot;Get Started&quot; to create your Nostr identity
                        </p>
                      </div>
                      <div className="flex gap-3">
                        <div className="w-6 h-6 bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 rounded-full flex items-center justify-center text-xs font-semibold flex-shrink-0">
                          2
                        </div>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          Your keys are stored securely in a remote signer
                        </p>
                      </div>
                      <div className="flex gap-3">
                        <div className="w-6 h-6 bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 rounded-full flex items-center justify-center text-xs font-semibold flex-shrink-0">
                          3
                        </div>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          Start chatting with full privacy and ownership
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
          </Sheet.Content>
        </Sheet.View>
      </Sheet.Portal>
    </Sheet.Root>
  );
}
