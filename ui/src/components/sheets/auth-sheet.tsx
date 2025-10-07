"use client"

import { Sheet } from "@silk-hq/components"
import { X, Mail } from "lucide-react"
import { useState } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { motion, AnimatePresence } from "framer-motion"
import { authClient } from "@/lib/auth-client"

type AuthSheetProps = {
  onBeforeOpen?: () => boolean
}

export function AuthSheet({ onBeforeOpen }: AuthSheetProps) {
  const [email, setEmail] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [emailSent, setEmailSent] = useState(false)
  const [shouldRenderSheet, setShouldRenderSheet] = useState(!onBeforeOpen)

  const handleButtonClick = () => {
    if (onBeforeOpen) {
      const didRedirect = onBeforeOpen()
      if (!didRedirect) {
        setShouldRenderSheet(true)
      }
    }
  }

  const handleSendMagicLink = async () => {
    if (!email) return

    setIsLoading(true)

    try {
      await authClient.signIn.magicLink({
        email,
        callbackURL: "/dashboard",
      })
      setEmailSent(true)
    } catch (error) {
      console.error("Failed to send magic link:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleGoogleSignIn = async () => {
    await authClient.signIn.social({
      provider: "google",
      callbackURL: "/dashboard",
    })
  }

  if (onBeforeOpen && !shouldRenderSheet) {
    return (
      <Button
        variant="ghost"
        className="text-slate-600 hover:text-slate-900"
        onClick={handleButtonClick}
      >
        Sign In
      </Button>
    )
  }

  return (
    <Sheet.Root license="commercial">
      <Sheet.Trigger asChild>
        <Button variant="ghost" className="text-slate-600 hover:text-slate-900">
          Sign In
        </Button>
      </Sheet.Trigger>

      <Sheet.Portal>
        <Sheet.View className="z-[100]" contentPlacement="center" nativeEdgeSwipePrevention={true} tracks={["top", "bottom"]}>
          <Sheet.Backdrop
            travelAnimation={{
              opacity: "1",
              backgroundColor: ({ progress }) => `rgba(0, 0, 0, ${Math.min(progress * 0.33, 0.33)})`,
              backdropFilter: ({ progress }) => `blur(${progress * 24}px)`,
            }}
          />
          <Sheet.Content
            className="bg-white rounded-3xl shadow-2xl w-full overflow-y-auto my-12"
            stackingAnimation={{
              scale: [1, 0.95] as [number, number],
            }}
            style={{ maxWidth: '540px', height: 'auto' }}
          >
            <div className="p-8">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg shadow-sm"></div>
                  <span className="font-medium text-slate-900">teamz</span>
                </div>
                <Sheet.Trigger action="dismiss" asChild>
                  <button className="flex items-center justify-center w-8 h-8 rounded-lg hover:bg-slate-100 transition-colors">
                    <X className="w-5 h-5 text-slate-400" />
                  </button>
                </Sheet.Trigger>
              </div>

              <div className="mb-6">
                <h2 className="text-2xl font-light text-slate-900 mb-2">
                  {emailSent ? "Check your email" : "Welcome to teamz"}
                </h2>
                <p className="text-sm text-slate-500">
                  {emailSent
                    ? "We've sent you a magic link to sign in"
                    : "Sign in with your email address"}
                </p>
              </div>

              <AnimatePresence mode="wait">
                {emailSent ? (
                  <motion.div
                    key="success"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ duration: 0.3 }}
                    className="space-y-4"
                  >
                    <motion.div
                      initial={{ scale: 0.9 }}
                      animate={{ scale: 1 }}
                      transition={{ delay: 0.1, type: "spring", stiffness: 200 }}
                      className="flex items-center gap-3 p-4 bg-blue-50 border border-blue-100 rounded-xl"
                    >
                      <div className="flex-shrink-0 w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center">
                        <Mail className="w-5 h-5 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-blue-900">Magic link sent!</p>
                        <p className="text-xs text-blue-700 truncate">Check {email} for your sign-in link</p>
                      </div>
                    </motion.div>

                    <div className="text-center space-y-2">
                      <p className="text-sm text-slate-500">Didn't receive the email?</p>
                      <Button
                        variant="ghost"
                        className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                        onClick={() => setEmailSent(false)}
                      >
                        Try another email
                      </Button>
                    </div>
                  </motion.div>
                ) : (
                  <motion.div
                    key="form"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ duration: 0.3 }}
                    className="space-y-4"
                  >
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-slate-700">Email address</label>
                      <Input
                        type="email"
                        placeholder="you@example.com"
                        className="bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        disabled={isLoading}
                      />
                    </div>

                    <Button
                      className="w-full rounded-full mt-2 shadow-sm"
                      size="lg"
                      disabled={isLoading || !email}
                      onClick={handleSendMagicLink}
                    >
                      {isLoading ? "Sending magic link..." : "Send magic link"}
                    </Button>

                    <div className="relative my-6">
                      <div className="absolute inset-0 flex items-center">
                        <div className="w-full border-t border-slate-200"></div>
                      </div>
                      <div className="relative flex justify-center text-xs">
                        <span className="bg-white px-2 text-slate-400">or</span>
                      </div>
                    </div>

                    <Button
                      variant="outline"
                      className="w-full rounded-full border-slate-200 hover:bg-slate-50"
                      size="lg"
                      onClick={handleGoogleSignIn}
                    >
                      <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                      </svg>
                      Continue with Google
                    </Button>

                    <div className="text-center pt-4">
                      <p className="text-xs text-slate-400">
                        No password needed • Secure email verification
                      </p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </Sheet.Content>
        </Sheet.View>
      </Sheet.Portal>
    </Sheet.Root>
  )
}
